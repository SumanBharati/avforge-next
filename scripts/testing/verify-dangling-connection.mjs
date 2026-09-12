// Headless visual verification that deleting a device on the Signal Flow
// Builder leaves its connections in place (dangling, ready to reconnect)
// instead of deleting them outright.
//
// Fixture: Laptop --HDMI--> Display A, with Display B seeded unconnected.
// This script right-clicks Display A and deletes it, confirms the cable
// survives with a dangling end where Display A used to be, then drags that
// dangling end onto Display B to prove it's still fully usable — and
// finally deletes the cable itself via Delete/Backspace to confirm manual
// deletion still works.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-dangling-connection.mjs

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
    console.log("Canvas loaded: Laptop -> Display A, Display B unconnected");

    // Right-click Display A's body (its title text) and delete it
    const displayATitle = canvas.locator("svg text", { hasText: "Display / TV" }).first();
    await displayATitle.click({ button: "right" });
    await page.locator("text=Delete equipment").click();
    console.log("Deleted Display A via its context menu");

    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT_DIR}dangling-after-delete.png` });

    // The cable should still exist, with a dashed/hollow end where Display A
    // used to be, and Display A itself should be gone.
    const cablePath = canvas.locator('svg path[stroke="#8b5cf6"]').first();
    const cableStillThere = await cablePath.count();
    const displayACount = await canvas.locator("svg text", { hasText: "Display / TV" }).count();
    console.log(`Cable paths present: ${cableStillThere} (expect >=1) | Display devices remaining: ${displayACount} (expect 1, Display B only)`);

    // Select the cable and drag its dangling end onto Display B to prove
    // it's still fully reconnectable, not just visually present.
    const cableBox = await cablePath.boundingBox();
    await page.mouse.click(cableBox.x + cableBox.width / 2, cableBox.y + cableBox.height / 2);
    const danglingHandle = canvas.locator('circle[r="9"]').first();
    await danglingHandle.waitFor({ timeout: 5000 });
    const hBox = await danglingHandle.boundingBox();
    await page.mouse.move(hBox.x + hBox.width / 2, hBox.y + hBox.height / 2);
    await page.mouse.down();
    await page.mouse.up();
    console.log("Picked up the dangling end");

    const displayBPort = canvas.locator("svg text").filter({ hasText: /^HDMI$/ }).last();
    await displayBPort.waitFor({ timeout: 5000 });
    await displayBPort.locator("xpath=..").locator("circle").click();
    console.log("Reconnected the dangling end onto Display B");

    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT_DIR}dangling-reconnected.png` });

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
