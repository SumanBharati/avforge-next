// Verifies two fixes reported together:
//  1. Fuzzy-search bug: searching "i12" pulled in unrelated Extron
//     transmitters (part numbers 60-1421-12 / 60-1531-12) because a lone
//     "-12" suffix token scored a near-perfect Dice-coefficient match against
//     the query "i12" — fixed in lib/fuzzy-search.ts by ignoring tokens
//     shorter than 3 characters in the approximate-match path (exact
//     substring matches of any length are unaffected).
//  2. Room Designer's Add Equipment modal never searched the org's own
//     Equipment Library at all — only the global AV Forge product database —
//     unlike Signal Flow Builder. Brought to parity: org library first, with
//     an explicit "Search in Global Library" fallback, same as Signal Flow.
//
// Usage: node --env-file=.env.local scripts/testing/verify-room-designer-search.mjs

import { chromium } from "playwright";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;
const fixture = JSON.parse(readFileSync(new URL("./.fixture.json", import.meta.url), "utf8"));

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

    const rdUrl = `${APP_URL}/designEngineering/room-designer?project=${fixture.projectId}&room=${fixture.roomId}`;
    await page.goto(rdUrl);
    await page.waitForTimeout(1500);

    await page.locator('[title="Add equipment to canvas"]').first().click();
    await page.waitForTimeout(300);
    const searchBox = page.locator('input[placeholder^="Search displays"]');
    await searchBox.waitFor({ timeout: 5000 });

    // Org library search happens by default now — confirm the header says so.
    await searchBox.fill("i12");
    await page.waitForTimeout(700);
    const orgHeader = await page.locator("text=/My Organization's Equipment Library/").count();
    console.log("Org library searched by default:", orgHeader > 0);
    await page.screenshot({ path: `${OUT_DIR}rd-search-org-i12.png` });

    // Fall through to global library (org library has no Crestron I12 seeded
    // in this fixture) and confirm the fuzzy-match fix there.
    const globalBtn = page.locator('button:has-text("Search in Global Library")');
    if (await globalBtn.count()) {
      await globalBtn.click();
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${OUT_DIR}rd-search-global-i12.png` });
      const extronJunk = await page.locator("text=/Extron DTP T HWP 4K 231 D/").count();
      const crestronMatch = await page.locator("text=/Crestron/").count();
      console.log("Unrelated Extron transmitter still showing for \"i12\":", extronJunk > 0 ? "YES (bug)" : "NO (fixed)");
      console.log("Crestron I12 camera found:", crestronMatch > 0);
    } else {
      console.log("Org library already had a match for i12 — global fallback button not shown.");
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
