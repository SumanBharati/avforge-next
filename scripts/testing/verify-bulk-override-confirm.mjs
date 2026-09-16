// Verifies the fix for: "when i right click on an equipment on AV Forge
// Equipment Library, I see an option of 'Add to My Organization's Equipment
// Library' however when we click on it and if that product is already
// there, it automatically skips it without adding it." — the right-click
// "Add to My Organization's Equipment Library" action (addSelectedToOrgLibrary)
// now shows the same override-confirmation dialog the single-item Add
// button already had, instead of silently skipping duplicates.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          a product that already exists (by manufacturer+model) in the
//          fixture org's equipment_library — this run seeds "Generic Media
//          Player" as one.
// Usage:   node --env-file=.env.local scripts/testing/verify-bulk-override-confirm.mjs

import { chromium } from "playwright";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.on("pageerror", err => console.log("PAGEERROR:", err.message));

  try {
    await page.goto(`${APP_URL}/login`);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    await page.goto(`${APP_URL}/inventory?section=avforge`);
    await page.waitForTimeout(1500);

    await page.locator('input[placeholder*="Search"]').fill("Generic Media Player");
    await page.waitForTimeout(600);

    const row = page.locator("tbody tr", { hasText: "Media Player" }).first();
    await row.waitFor({ timeout: 10000 });
    await row.click({ button: "right" });
    await page.waitForTimeout(300);

    await page.locator('text=Add to My Organization').first().click();
    await page.waitForTimeout(1200);

    const dialogVisible = await page.locator('text=Already in your library').count();
    console.log(`Override confirmation dialog appeared (expect true, not a silent skip): ${dialogVisible > 0}`);

    const dialogText = await page.locator('text=Already in your library').locator("..").textContent().catch(() => "");
    console.log(`Dialog mentions the product: ${/Media Player/i.test(dialogText || "")}`);

    await page.screenshot({ path: "scripts/testing/screenshots/bulk-override-confirm.png" });

    // Cancel — should not change the existing row.
    await page.locator('button:has-text("Cancel")').last().click();
    await page.waitForTimeout(300);
    console.log(`Dialog closes on Cancel: ${(await page.locator('text=Already in your library').count()) === 0}`);

    console.log("\nDone. Screenshot at scripts/testing/screenshots/bulk-override-confirm.png");
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
