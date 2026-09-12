// Headless visual verification for the Flag annotation editing-state fix on
// the Signal Flow Builder. Logs in as the dedicated Claude E2E test user,
// opens the seeded fixture room, creates a flag on the seeded device's HDMI
// port, and screenshots both the live-editing state (placeholder "Label")
// and the committed state, so the two can be compared side by side.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-flag.mjs

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
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3 });
  const consoleErrors = [];
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  try {
    await page.goto(`${APP_URL}/login`);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
    console.log("Logged in, landed on:", page.url());

    const sfUrl = `${APP_URL}/designEngineering/signal-flow?project=${fixture.projectId}&room=${fixture.roomId}`;
    await page.goto(sfUrl);

    // Wait for the seeded device to render
    await page.locator("svg text", { hasText: "Laptop" }).first().waitFor({ timeout: 20000 });
    console.log("Signal Flow canvas loaded with seeded device");

    // Activate the Flag tool
    await page.locator('button[title="Flag a connector — click a port to label it"]').click();

    // Click the HDMI port's connector dot to create a flag there
    const portLabel = page.locator("svg text").filter({ hasText: /^HDMI$/ }).first();
    await portLabel.waitFor({ timeout: 10000 });
    const portGroup = portLabel.locator("xpath=..");
    await portGroup.locator("circle").click();

    // Editing state: pill shows the "Label" placeholder, not yet committed
    const flagInput = page.locator('input[placeholder="Label"]');
    await flagInput.waitFor({ timeout: 5000 });

    const measurements = await page.evaluate(() => {
      const input = document.querySelector('input[placeholder="Label"]');
      const rect = input.closest("g").querySelector("rect");
      const fo = input.closest("foreignObject");
      const cs = getComputedStyle(input);
      return {
        inputBox: input.getBoundingClientRect().toJSON(),
        rectBox: rect.getBoundingClientRect().toJSON(),
        foreignObjectBox: fo.getBoundingClientRect().toJSON(),
        inputInlineStyle: input.getAttribute("style"),
        computed: { height: cs.height, lineHeight: cs.lineHeight, fontSize: cs.fontSize, paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, boxSizing: cs.boxSizing, display: cs.display },
      };
    });
    console.log("MEASUREMENTS:", JSON.stringify(measurements, null, 2));

    await page.screenshot({ path: `${OUT_DIR}flag-editing.png` });
    const clip = { x: 560, y: 440, width: 320, height: 100 };
    await page.screenshot({ path: `${OUT_DIR}flag-editing-zoom.png`, clip });
    console.log("Screenshot saved: flag-editing.png / flag-editing-zoom.png (live-editing state, empty text)");

    // Type a label and commit
    await page.keyboard.type("Test Flag");
    await page.keyboard.press("Enter");
    await page.locator('input[placeholder="Label"]').waitFor({ state: "detached", timeout: 5000 });
    await page.screenshot({ path: `${OUT_DIR}flag-committed.png` });
    await page.screenshot({ path: `${OUT_DIR}flag-committed-zoom.png`, clip });
    console.log("Screenshot saved: flag-committed.png (committed state)");

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
