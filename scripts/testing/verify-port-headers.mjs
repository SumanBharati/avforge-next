// Headless visual verification for the new column-heading row above the
// Ports list in EquipmentFormModal (Edit Equipment), via Signal Flow
// Builder's "Edit equipment" context-menu action.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-port-headers.mjs

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
    const canvas = page.locator("#sf-canvas-export");
    const laptopTitle = canvas.locator("svg text", { hasText: "Laptop" }).first();
    await laptopTitle.waitFor({ timeout: 20000 });

    await laptopTitle.click({ button: "right" });
    await page.locator("text=Edit equipment").click();
    console.log("Opened Edit Equipment modal");

    await page.locator('input[placeholder="signal (hdmi, usb…)"]').first().waitFor({ timeout: 5000 });
    const portsSection = page.locator("text=Ports").locator("xpath=../..");
    await portsSection.scrollIntoViewIfNeeded();
    await portsSection.screenshot({ path: `${OUT_DIR}port-headers.png` });
    console.log("Screenshot saved: port-headers.png");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
