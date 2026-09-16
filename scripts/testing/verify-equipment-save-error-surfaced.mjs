// Verifies the fix for: "The create with AI tool created the equipment
// library, but it is unable to save it to the database." — investigation
// found that both equipment-library save paths in app/inventory/page.tsx
// (Org Equipment Library's insert, and the AV Forge Library admin's
// createProduct) discarded the Supabase error entirely: the modal either
// closed as if it had succeeded, or just sat there with no message, so a
// real failure (RLS, a bad value, a dropped session) looked identical to
// nothing happening. Fixed by surfacing the actual error in the modal and
// keeping it open so the user can see what went wrong and retry.
//
// This test forces a save failure by intercepting the Supabase REST insert
// call for equipment_library and returning an error, then confirms the
// error text now renders in the modal and the modal stays open (instead of
// silently closing as it used to).
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-equipment-save-error-surfaced.mjs

import { chromium } from "playwright";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.on("pageerror", err => console.log("PAGEERROR:", err.message));

  // Force the insert to fail with a realistic Postgres error shape.
  await page.route("**/rest/v1/equipment_library**", (route) => {
    if (route.request().method() === "POST") {
      route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ message: "duplicate key value violates unique constraint \"equipment_library_org_manufacturer_model_key\"", code: "23505" }),
      });
    } else {
      route.continue();
    }
  });

  try {
    await page.goto(`${APP_URL}/login`);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    await page.goto(`${APP_URL}/inventory?section=org`);
    await page.waitForTimeout(1500);

    await page.locator('button:has-text("Add Equipment")').first().click();
    await page.waitForTimeout(300);
    await page.locator('input[placeholder="e.g. Samsung"]').fill("QSC");
    await page.locator('input[placeholder="e.g. QM85B"]').fill("Core Nano");

    const saveBtn = page.locator('button:has-text("Save Item")').first();
    await saveBtn.click();
    await page.waitForTimeout(1000);

    const errorText = await page.locator('p.text-red-400').first().textContent().catch(() => null);
    console.log(`Error surfaced in modal (expect a friendly duplicate-item message): "${errorText}"`);
    console.log(`Error mentions the item already existing: ${/already exists/i.test(errorText || "")}`);

    const modalStillOpen = await page.locator('button:has-text("Save Item")').count();
    console.log(`Modal stayed open after the failed save (expect true — no silent close): ${modalStillOpen > 0}`);

    await page.screenshot({ path: "scripts/testing/screenshots/equipment-save-error-surfaced.png" });
    console.log("\nDone. Screenshot at scripts/testing/screenshots/equipment-save-error-surfaced.png");
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
