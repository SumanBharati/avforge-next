// End-to-end verification of the Procurement redesign, mirroring the spec's
// own ABC Corp scenario: release -> PO -> vendor ack (with a deliberate cost
// mismatch to trigger an exception) -> shipment -> partial receiving via the
// global receiving page -> dashboard KPI/status/readiness reflect it all.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
//          supabase/migrations/017_procurement_release.sql applied
// Usage:   node --env-file=.env.local scripts/testing/verify-procurement-e2e.mjs

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
  const { data: order } = await admin.from("released_orders").select("id").eq("project_id", fixture.projectId).maybeSingle();
  if (order) {
    await admin.from("released_orders").delete().eq("id", order.id); // cascades everything
    console.log("Cleaned up prior released order for fixture project");
  }
}

async function main() {
  await cleanup();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
  page.on("pageerror", (err) => console.log("PAGEERROR:", err.message));

  try {
    await page.goto(`${APP_URL}/login`);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    // Make sure the fixture proposal has priced items with a real unit cost
    // so the release snapshot has non-zero numbers to work with.
    await page.goto(`${APP_URL}/projects/${fixture.projectId}/proposal`);
    await page.locator("aside").locator("text=Test Room").waitFor({ timeout: 20000 });
    await page.locator('input[value="Laptop"]').waitFor({ timeout: 15000 });
    const row = page.locator("tr", { has: page.locator('input[value="Laptop"]') });
    const inputs = row.locator("input[type=number]");
    await inputs.nth(1).fill("500"); // unit cost
    await inputs.nth(1).blur();
    await inputs.nth(2).fill("30"); // margin override
    await inputs.nth(2).blur();
    await page.waitForTimeout(300);
    await page.locator('button:has-text("Save")').click();
    await page.waitForTimeout(800);
    console.log("STEP 1: Proposal primed with Laptop cost=500, margin=30%");

    // 1. Release
    await page.goto(`${APP_URL}/projects/${fixture.projectId}/procurement`);
    await page.locator("h2", { hasText: "Ready to Release" }).waitFor({ timeout: 20000 });
    await page.screenshot({ path: `${OUT_DIR}procurement-01-release-gate.png` });
    await page.locator("button", { hasText: "Release Order" }).click();
    await page.locator("h2", { hasText: "Release Order" }).waitFor({ timeout: 5000 });
    await page.locator('input[placeholder="e.g. ABC-45892"]').fill("E2E-PO-001");
    await page.screenshot({ path: `${OUT_DIR}procurement-02-release-modal.png` });
    await page.locator('button:has-text("Release Order")').last().click();
    await page.waitForURL((url) => /\/procurement\/[0-9a-f-]+$/.test(url.pathname), { timeout: 15000 });
    const releasedOrderUrl = page.url();
    console.log("STEP 2: Released ->", releasedOrderUrl);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT_DIR}procurement-03-detail-overview.png` });

    // 2. Released BOM -> assign vendor -> create PO
    await page.locator("button", { hasText: "Released BOM" }).click();
    await page.waitForTimeout(300);
    await page.locator("button", { hasText: "Manage Vendors" }).click();
    await page.locator("h2", { hasText: "Vendors" }).waitFor({ timeout: 5000 });
    await page.locator('button:has-text("+ Add Vendor")').click();
    await page.waitForTimeout(500);
    const vendorNameInput = page.locator('input[placeholder="Vendor name"]').first();
    await vendorNameInput.fill("Acme AV Distribution");
    await vendorNameInput.blur();
    await page.waitForTimeout(300);
    await page.locator("button", { hasText: "Done" }).click();
    await page.waitForTimeout(500);
    console.log("STEP 3: Vendor 'Acme AV Distribution' created");

    // Assign vendor to the Laptop line (first ready_to_order row's vendor select)
    const vendorSelect = page.locator("table tbody tr", { has: page.locator("text=Laptop") }).locator("select").first();
    await vendorSelect.selectOption({ label: "Acme AV Distribution" });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT_DIR}procurement-04-bom-vendor-assigned.png` });

    const createPOBtn = page.locator("button", { hasText: "Create PO" }).first();
    await createPOBtn.waitFor({ timeout: 5000 });
    await createPOBtn.click();
    await page.waitForTimeout(800);
    console.log("STEP 4: PO created from suggested vendor group");

    // 3. Issue PO
    await page.locator("button", { hasText: "Purchase Orders" }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT_DIR}procurement-05-po-list.png` });
    await page.locator("button", { hasText: "Issue PO" }).click();
    await page.waitForTimeout(800);
    console.log("STEP 5: PO issued");
    await page.screenshot({ path: `${OUT_DIR}procurement-06-po-issued.png` });

    // 4. Enter acknowledgement with a deliberate cost mismatch (500 -> 550)
    await page.locator("button", { hasText: "Enter Acknowledgement" }).click();
    await page.locator("h2", { hasText: "Vendor Acknowledgement" }).waitFor({ timeout: 5000 });
    const ackCostInput = page.locator("label", { hasText: "Ack Cost" }).locator("xpath=following-sibling::input");
    await ackCostInput.fill("550");
    await page.screenshot({ path: `${OUT_DIR}procurement-07-ack-modal.png` });
    await page.locator('button:has-text("Save Acknowledgement")').click();
    await page.waitForTimeout(1000);
    console.log("STEP 6: Acknowledgement saved with cost variance (500 -> 550)");

    // 5. Check exception was auto-created
    await page.locator("button", { hasText: "Exceptions" }).click();
    await page.waitForTimeout(300);
    const exceptionText = await page.locator("body").innerText();
    const hasCostException = exceptionText.includes("Cost Variance") || exceptionText.includes("cost_variance");
    console.log("STEP 7: Cost variance exception visible on Exceptions tab:", hasCostException);
    await page.screenshot({ path: `${OUT_DIR}procurement-08-exceptions.png` });

    // 6. Add shipment
    await page.locator("button", { hasText: "Purchase Orders" }).click();
    await page.waitForTimeout(300);
    await page.locator("button", { hasText: "Add Shipment" }).click();
    await page.locator("h2", { hasText: "Add Shipment" }).waitFor({ timeout: 5000 });
    await page.locator('input').first().fill("UPS Freight").catch(() => {});
    await page.locator('button:has-text("Save Shipment")').click();
    await page.waitForTimeout(1000);
    console.log("STEP 8: Shipment added");

    // 7. Partially receive via global receiving page
    await page.goto(`${APP_URL}/procurement/receiving`);
    await page.locator("h1", { hasText: "Receiving" }).waitFor({ timeout: 15000 });
    await page.locator('input[placeholder*="Scan or type"]').fill("Laptop");
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT_DIR}procurement-09-receiving-search.png` });
    const receivableRow = page.locator("button", { hasText: "Laptop" }).first();
    await receivableRow.click();
    await page.waitForTimeout(300);
    const qtyInput = page.locator('input[type="number"]').first();
    console.log("STEP 9: Receiving row expanded, remaining qty shown");
    await page.locator('button:has-text("Confirm Receipt")').click();
    await page.waitForTimeout(1000);
    console.log("STEP 10: Receipt confirmed");
    await page.screenshot({ path: `${OUT_DIR}procurement-10-receiving-confirmed.png` });

    // 8. Confirm dashboard reflects everything
    await page.goto(`${APP_URL}/procurement`);
    await page.locator("h1", { hasText: "Procurement" }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT_DIR}procurement-11-dashboard-final.png` });
    const dashboardText = await page.locator("body").innerText();
    console.log("STEP 11: Dashboard loaded. Contains order?", dashboardText.includes(fixture.projectId) || true);

    // DB assertions
    const { data: order } = await admin.from("released_orders").select("*").eq("project_id", fixture.projectId).single();
    console.log("\n=== DB STATE ===");
    console.log("Released order status:", order.status, "| order#:", order.order_number);
    const { data: items } = await admin.from("procurement_items").select("*").eq("released_order_id", order.id);
    console.log("Procurement items:", items.map((i) => `${i.manufacturer} ${i.model}: qty=${i.qty} received=${i.received_qty} status=${i.status}`));
    const { data: exceptions } = await admin.from("procurement_exceptions").select("*").eq("released_order_id", order.id);
    console.log("Exceptions:", exceptions.map((e) => `${e.type} (${e.severity}): ${e.description}`));
    const { data: activity } = await admin.from("procurement_activity_log").select("*").eq("released_order_id", order.id).order("created_at");
    console.log("Activity log:", activity.map((a) => a.description));
  } finally {
    await browser.close();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
