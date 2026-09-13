// Verifies: "On display sizing calculator, while calculating for Display
// height, provide diagonal as well as the result... Now make sure to show
// the Diagonal based on the Aspect ratio selected."
//
// Room Designer's "Display Size Guide" already showed a "Calc. diagonal"
// row, but it was hardcoded to 16:9 with no way to change it — a 21:9
// videowall or a 4:3 legacy display needs a different diagonal for the same
// required image height, and there was no selector at all. Adds a Display
// aspect ratio preset picker (16:9/16:10/4:3/21:9) that the diagonal
// calculation, and the "AVIXA DISCAS ..." caption, now actually respond to.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-display-diagonal-aspect.mjs

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
    await page.locator("text=Display Size Guide").waitFor({ timeout: 20000 });
    await page.waitForTimeout(500);

    console.log("Aspect ratio preset picker shown:", await page.locator("text=Display aspect ratio").count() > 0 ? "YES (fixed)" : "NO (FAIL)");
    for (const label of ["16:9", "16:10", "4:3", "21:9"]) {
      console.log(`  preset "${label}" present:`, await page.locator(`button:has-text("${label}")`).count() > 0);
    }

    const readPanel = async () => {
      const diagText = await page.locator("text=Calc. diagonal").locator("xpath=following-sibling::span").first().textContent();
      const captionText = await page.locator("text=/AVIXA DISCAS/").textContent();
      return { diagText, captionText };
    };

    const before = await readPanel();
    console.log("Default (16:9) state:", before);

    await page.locator('button:has-text("21:9")').click();
    await page.waitForTimeout(200);
    const after21x9 = await readPanel();
    console.log("After selecting 21:9:", after21x9);
    console.log("Diagonal changed when switching aspect ratio:", after21x9.diagText !== before.diagText ? "YES (fixed)" : "NO (FAIL)");
    console.log("Caption reflects the selected ratio (21:9):", after21x9.captionText.includes("21:9") ? "YES (fixed)" : "NO (FAIL)");

    await page.locator('button:has-text("4:3")').click();
    await page.waitForTimeout(200);
    const after4x3 = await readPanel();
    console.log("After selecting 4:3:", after4x3);
    console.log("Caption reflects 4:3:", after4x3.captionText.includes("4:3") ? "YES (fixed)" : "NO (FAIL)");
    // A narrower aspect ratio (4:3) needs a LARGER diagonal than 16:9 for
    // the same required image height (same height, more width-equivalent
    // relative to height... actually verify via direct math instead of
    // assuming direction, since it depends on exact formula):
    // diag = height * sqrt(ar^2+1) — ar for 4:3 (1.33) < 16:9 (1.78) < 21:9 (2.33)
    // so diag(4:3) < diag(16:9) < diag(21:9) for the SAME height.
    const parseIn = (s) => parseFloat(s.replace(/["\s]/g, ""));
    const d43 = parseIn(after4x3.diagText), d169 = parseIn(before.diagText), d219 = parseIn(after21x9.diagText);
    console.log("Diagonal ordering matches the aspect-ratio formula (4:3 < 16:9 < 21:9):", (d43 < d169 && d169 < d219) ? "YES (correct)" : `NO (FAIL — ${d43}, ${d169}, ${d219})`);

    await page.screenshot({ path: `${OUT_DIR}display-size-guide-aspect-ratio.png` });
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
