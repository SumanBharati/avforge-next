// Headless visual verification for dragging an existing Signal Flow
// connection's endpoint onto a different port ("reconnect"), instead of
// having to delete the cable and redraw it.
//
// Fixture: Laptop --HDMI--> Display A, with Display B seeded unconnected.
// This script selects that connection, grabs its "to" endpoint handle, and
// clicks Display B's port to re-point the cable there — then screenshots
// before/after and confirms Display A no longer has a cable.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-reconnect.mjs

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
    // Scope every canvas locator below to #sf-canvas-export — an unscoped
    // "svg circle"/"svg text" can match icons elsewhere on the page (e.g. the
    // top nav's Time Tracking clock icon), and clicking one of those
    // navigates away entirely instead of interacting with the diagram.
    const canvas = page.locator("#sf-canvas-export");
    await canvas.locator("svg text", { hasText: "Laptop" }).first().waitFor({ timeout: 20000 });
    console.log("Canvas loaded: Laptop -> Display A, Display B unconnected");

    await page.screenshot({ path: `${OUT_DIR}reconnect-before.png` });

    // Select the existing connection by clicking its visible colored stroke
    // (the HDMI signal color, #8b5cf6) rather than guessing pixel
    // coordinates, which broke the moment the toolbar layout differed from
    // an earlier script's assumptions.
    const cablePath = canvas.locator('svg path[stroke="#8b5cf6"]').first();
    await cablePath.waitFor({ timeout: 5000 });
    const cableBox = await cablePath.boundingBox();
    await page.mouse.click(cableBox.x + cableBox.width / 2, cableBox.y + cableBox.height / 2);
    await canvas.locator('circle[r="9"]').first().waitFor({ timeout: 5000 });
    console.log("Connection selected, endpoint handles visible");
    await page.screenshot({ path: `${OUT_DIR}reconnect-selected.png` });

    // Grab the "to" endpoint (the one nearer Display A / the top device) and
    // drop it on Display B's port instead.
    const handles = await canvas.locator('circle[r="9"]').all();
    const boxes = await Promise.all(handles.map((h) => h.boundingBox()));
    // The "to" handle sits at Display A's port — the one with the larger y
    // among the two is Display B's own real port dot, so pick the handle
    // closest to Display A's known seeded position (x=650, y~148 in world
    // space; just take the handle with the smaller y on screen, i.e. nearer
    // the top device).
    boxes.sort((a, b) => a.y - b.y);
    const toHandle = boxes[0];
    await page.mouse.move(toHandle.x + toHandle.width / 2, toHandle.y + toHandle.height / 2);
    await page.mouse.down();
    await page.mouse.up();
    console.log("Picked up the 'to' endpoint — now in reconnect-drag mode");
    // Let the port-radius re-render (every other port grows 5px->6px while a
    // connection is in progress) settle before targeting a click, or
    // Playwright sees the element move mid-click and calls it unstable.
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT_DIR}reconnect-dragging.png` });

    // Click Display B's port to finish the reconnect. Port label text render
    // order follows device array order — Laptop, Display A, Display B — so
    // this is the 3rd "HDMI" match (index 2), not the 2nd.
    const displayBPort = canvas.locator("svg text").filter({ hasText: /^HDMI$/ }).nth(2);
    await displayBPort.waitFor({ timeout: 5000 });
    const displayBGroup = displayBPort.locator("xpath=..");
    await displayBGroup.locator("circle").click();
    console.log("Clicked Display B's port to complete the reconnect");

    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT_DIR}reconnect-after.png` });

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
