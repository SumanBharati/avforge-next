// Verifies the Inventory tab is now real/persisted (Supabase-backed) instead
// of client-side demo state, and that "Old Inventory Review" reflects actual
// aged inventory instead of fabricated products/statuses.
//
// Usage: node --env-file=.env.local scripts/testing/verify-real-inventory.mjs

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;
const fixture = JSON.parse(readFileSync(new URL("./.fixture.json", import.meta.url), "utf8"));
const OUT_DIR = fileURLToPath(new URL("./screenshots/", import.meta.url));
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function cleanup() {
  await admin.from("inventory_items").delete().eq("org_id", fixture.orgId);
}

async function main() {
  await cleanup();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  page.on("pageerror", (err) => console.log("PAGEERROR:", err.message));

  try {
    await page.goto(`${APP_URL}/login`);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    // 1. Landing page: empty state (no fake data)
    await page.goto(`${APP_URL}/inventory`);
    await page.locator("text=Old Inventory Review").waitFor({ timeout: 15000 });
    await page.waitForTimeout(600);
    const emptyText = await page.locator("text=Nothing to review yet").isVisible().catch(() => false);
    console.log("STEP 1: Empty state shown when no inventory exists:", emptyText);
    await page.screenshot({ path: `${OUT_DIR}inventory-landing-empty.png` });

    // 2. Add a real item via the Inventory tab UI
    await page.locator("button", { hasText: "Inventory" }).first().click();
    await page.waitForURL((url) => url.search.includes("section=inventory"), { timeout: 10000 });
    await page.locator("button", { hasText: "Add Item" }).click();
    await page.locator("text=Item Name *").waitFor({ timeout: 5000 });
    await page.locator('input[placeholder*="4K Display"]').fill("Test Old Projector");
    await page.locator('input[placeholder="e.g. Samsung"]').fill("Epson");
    await page.locator('input[placeholder="e.g. QM85B"]').fill("PowerLite X123");
    await page.locator('button:has-text("Save Item")').click();
    await page.waitForTimeout(1000);
    console.log("STEP 2: Item added via UI");

    // 3. Reload the page - item must still be there (real persistence)
    await page.reload();
    await page.locator("text=Test Old Projector").waitFor({ timeout: 10000 });
    console.log("STEP 3: Item survived a page reload (persisted, not local-only demo state)");
    await page.screenshot({ path: `${OUT_DIR}inventory-tab-real-item.png` });

    // 4. Backdate the item's created_at to 6 years ago to simulate aged stock
    const { data: rows } = await admin.from("inventory_items").select("id").eq("org_id", fixture.orgId).eq("name", "Test Old Projector");
    const sixYearsAgo = new Date(Date.now() - 6 * 365.25 * 24 * 60 * 60 * 1000).toISOString();
    await admin.from("inventory_items").update({ created_at: sixYearsAgo }).eq("id", rows[0].id);
    console.log("STEP 4: Backdated item to ~6 years old");

    // 5. Landing page should now show it under Old Inventory Review, honestly labeled
    await page.goto(`${APP_URL}/inventory`);
    await page.locator("text=Old Inventory Review").waitFor({ timeout: 15000 });
    // Wait for the async org-scoped count queries to resolve — "Loading…" /
    // "Coming soon" placeholders are the pre-resolution state, not the result.
    await page.locator("text=Loading…").waitFor({ state: "detached", timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(500);
    const widgetText = await page.locator("body").innerText();
    const showsItem = widgetText.includes("Test Old Projector") || widgetText.includes("Epson PowerLite X123");
    const showsHonestAge = /5\.\d yrs|6\.\d yrs/.test(widgetText);
    const showsFabricatedStatus = widgetText.includes("End of Support") || widgetText.includes("Discontinued");
    console.log("STEP 5: Widget shows the real backdated item:", showsItem);
    console.log("STEP 5: Widget shows an honest computed age (~6 yrs):", showsHonestAge);
    console.log("STEP 5: Widget shows NO fabricated EOL-style status:", !showsFabricatedStatus);
    await page.screenshot({ path: `${OUT_DIR}inventory-landing-aged-item.png` });

    // 6. "View all" navigates to the real inventory tab
    await page.locator("button", { hasText: "View all" }).last().click();
    await page.waitForURL((url) => url.search.includes("section=inventory"), { timeout: 10000 });
    console.log("STEP 6: 'View all' navigates to the Inventory tab");
  } finally {
    await browser.close();
    await cleanup();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
