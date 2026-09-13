// Verifies the fix for: "search equipment is not providing good results, it
// throws any devices — it should provide results based on Manufacturer,
// Model, or Part Number, nothing else."
//
// Root cause: searchOrgLibrary/searchProducts fuzzy-matched against Category,
// Type, and Description/Notes too, so a query like "Display" would literally
// substring-match every product whose category field is "Display", regardless
// of manufacturer/model — exactly the "throws any devices" symptom. Fixed by
// restricting both the SQL ILIKE filter and the fuzzy ranking fields to
// manufacturer/model/part_number only.
//
// This test drives the real Signal Flow "Add Equipment" modal (org library
// search, the modal's default mode) and checks:
//  - searching a pure category word ("Display") that matches no manufacturer
//    or model in the fixture org's library returns no results (previously it
//    would have returned every "Display"-category item)
//  - searching an actual manufacturer name ("Samsung") still finds its item
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
//          the fixture org's equipment_library must contain at least one
//          "Display"-category item with a manufacturer that does NOT contain
//          the word "display" (e.g. Samsung QM85R) — true for this project
//          as of this writing.
// Usage:   node --env-file=.env.local scripts/testing/verify-equipment-search-fields.mjs

import { chromium } from "playwright";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;
const fixture = JSON.parse(readFileSync(new URL("./.fixture.json", import.meta.url), "utf8"));

if (!EMAIL || !PASSWORD) {
  console.error("Missing PLAYWRIGHT_TEST_EMAIL/PASSWORD — run with node --env-file=.env.local");
  process.exit(1);
}

const OUT_DIR = fileURLToPath(new URL("./screenshots/", import.meta.url));

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

  try {
    await page.goto(`${APP_URL}/login`);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    const sfUrl = `${APP_URL}/designEngineering/signal-flow?project=${fixture.projectId}&room=${fixture.roomId}`;
    await page.goto(sfUrl);
    await page.waitForTimeout(1500);

    await page.locator('[title="Add equipment to canvas"]').first().click();
    await page.waitForTimeout(300);

    const searchBox = page.locator('input[placeholder="Search by Make, Model, Part#..."]');
    await searchBox.waitFor({ timeout: 5000 });

    // Category-word search: should NOT surface Display-category items whose
    // manufacturer/model don't literally relate to the word "Display".
    await searchBox.fill("Display");
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT_DIR}equip-search-category.png` });
    const categoryResultsText = await page.locator('text=/No results for/').count();
    const categoryResultRows = await page.locator('div[style*="cursor: pointer"]').count();
    console.log('Search "Display" (category word) — "No results" shown:', categoryResultsText > 0);

    // Manufacturer search: should still find the Samsung display.
    await searchBox.fill("Samsung");
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT_DIR}equip-search-mfr.png` });
    const samsungFound = await page.locator("text=/Samsung/").count();
    console.log('Search "Samsung" (manufacturer) — result found:', samsungFound > 0);

    // Part number search (Extron switcher has a real part number in the sample data).
    await searchBox.fill("60-1663-01");
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT_DIR}equip-search-pn.png` });
    const pnFound = await page.locator("text=/Extron/").count();
    console.log('Search "60-1663-01" (part number) — Extron result found:', pnFound > 0);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
