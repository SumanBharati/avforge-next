// Headless visual verification that clicking a port to start/finish a new
// connection no longer also selects the device it belongs to.
//
// Fixture: Laptop's USB port is unconnected; Display B's HDMI port is
// unconnected. This script clicks Laptop's USB port (starts a connection),
// then Display B's HDMI port (finishes it), and checks neither device shows
// the selection outline (a dashed #8b5cf6 rect drawn 4px outside the device
// body when selected).
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-port-click-no-select.mjs

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
  const consoleErrors = [];
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  try {
    await page.goto(`${APP_URL}/login`);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    const sfUrl = `${APP_URL}/designEngineering/signal-flow?project=${fixture.projectId}&room=${fixture.roomId}`;
    await page.goto(sfUrl);
    const canvas = page.locator("#sf-canvas-export");
    await canvas.locator("svg text", { hasText: "Laptop" }).first().waitFor({ timeout: 20000 });
    console.log("Canvas loaded");

    // Click Laptop's USB port to start a connection
    const usbLabel = canvas.locator("svg text", { hasText: /^USB$/ }).first();
    await usbLabel.locator("xpath=..").locator("circle").click();
    console.log("Clicked Laptop's USB port (start)");

    // Click Display B's HDMI port (the last "HDMI" match) to finish it
    const displayBPort = canvas.locator("svg text").filter({ hasText: /^HDMI$/ }).last();
    await displayBPort.locator("xpath=..").locator("circle").click();
    console.log("Clicked Display B's HDMI port (finish)");

    await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT_DIR}port-click-no-select.png` });

    // A selected device draws a dashed #8b5cf6 outline rect (strokeDasharray
    // "5 3") a few px outside its body — check none exists.
    const selectionOutlines = await canvas.locator('svg rect[stroke="#8b5cf6"][stroke-dasharray="5 3"]').count();
    console.log(`Device selection outlines present: ${selectionOutlines} (expect 0)`);

    if (consoleErrors.length) {
      console.warn("Console errors observed during the run:");
      consoleErrors.forEach((e) => console.warn(" -", e));
    } else {
      console.log("No console errors observed.");
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
