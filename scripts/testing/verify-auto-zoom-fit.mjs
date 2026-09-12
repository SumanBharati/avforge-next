// Headless visual verification that Signal Flow Builder auto zoom-fits its
// content on load, instead of always starting at the fixed x:0,y:0,zoom:1
// default (which can point at empty space depending on where the diagram
// actually sits).
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-auto-zoom-fit.mjs

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

    const sfUrl = `${APP_URL}/designEngineering/signal-flow?project=${fixture.projectId}&room=${fixture.roomId}`;
    await page.goto(sfUrl);
    const canvas = page.locator("#sf-canvas-export");
    await canvas.locator('svg path[stroke="#8b5cf6"]').first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT_DIR}auto-zoom-fit-on-load.png` });
    console.log("Screenshot saved: auto-zoom-fit-on-load.png (fresh page load, no manual interaction)");
  } finally {
    await browser.close();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
