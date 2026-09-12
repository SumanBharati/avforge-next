// Headless visual verification for the new port-reorder (up/down) controls
// in EquipmentFormModal, exercised via Signal Flow Builder's "Edit
// equipment" context-menu action on the seeded Laptop (ports: HDMI, USB —
// in that order).
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-port-reorder.mjs

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
    const laptopTitle = canvas.locator("svg text", { hasText: "Laptop" }).first();
    await laptopTitle.waitFor({ timeout: 20000 });
    console.log("Canvas loaded");

    await laptopTitle.click({ button: "right" });
    await page.locator("text=Edit equipment").click();
    console.log("Opened Edit Equipment modal");

    const signalInputs = page.locator('input[placeholder="signal (hdmi, usb…)"]');
    await signalInputs.first().waitFor({ timeout: 5000 });
    const readAll = async () => {
      const els = await signalInputs.all();
      return Promise.all(els.map((el) => el.inputValue()));
    };
    const before = await readAll();
    console.log("Port order before:", before);

    // The Ports section sits below the fold in this scrollable modal —
    // screenshot that section specifically rather than the whole page.
    const portsSection = page.locator("text=Ports").locator("xpath=../..");
    await portsSection.scrollIntoViewIfNeeded();
    await portsSection.screenshot({ path: `${OUT_DIR}port-reorder-before.png` });

    // Move the first port ("hdmi") down one slot
    await page.locator('button[title="Move port down"]').first().click();
    const after = await readAll();
    console.log("Port order after moving row 1 down:", after);

    await portsSection.screenshot({ path: `${OUT_DIR}port-reorder-after.png` });

    // Save and confirm the canvas reflects the new order (USB now above HDMI)
    await page.locator("button", { hasText: "Save Item" }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT_DIR}port-reorder-saved.png` });

    const orderOk = before.length === 2 && before[0] === "hdmi" && before[1] === "usb"
      && after[0] === "usb" && after[1] === "hdmi";
    console.log(orderOk ? "PASS: port order swapped correctly" : "FAIL: unexpected port order");

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
