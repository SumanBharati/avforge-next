// Headless visual verification for the new Cost / Margin % / Markup % /
// Price / MSRP pricing row in EquipmentFormModal, via Signal Flow Builder's
// "Edit equipment" context-menu action (in-memory device object only, no DB
// write — safe to test regardless of migration status).
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-margin-markup.mjs

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
  page.on("console", (msg) => { if (msg.type() === "error") console.log("CONSOLE ERROR:", msg.text()); });
  page.on("pageerror", (err) => console.log("PAGE ERROR:", String(err)));

  try {
    await page.goto(`${APP_URL}/login`);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    const sfUrl = `${APP_URL}/designEngineering/signal-flow?project=${fixture.projectId}&room=${fixture.roomId}`;
    await page.goto(sfUrl);
    const canvas = page.locator("#sf-canvas-export");
    // The seeded Laptop device has no mfr/model/category set, so (per the
    // recent device-block-text change) it shows no text of its own anymore —
    // only its ports do. Its USB port is unique to it, so right-click that
    // instead; context menu events (unlike pointerdown) aren't stopped on
    // ports, so it still bubbles up to the device's own onContextMenu.
    const usbPort = canvas.locator("svg text", { hasText: /^USB$/ }).first();
    await usbPort.waitFor({ timeout: 20000 });
    await usbPort.click({ button: "right" });
    await page.locator("text=Edit equipment").click();
    console.log("Opened Edit Equipment modal");

    const field = (label) => page.locator(`text=${label}`).locator("xpath=following-sibling::input");
    const cost = field("Cost");
    const marginF = field("Margin %");
    const markupF = field("Markup %");
    const price = field("Price");

    await cost.waitFor({ timeout: 5000 });
    const pricingRow = page.locator("text=Cost").first().locator("xpath=../..");
    const priceRow = page.locator("text=Price").first().locator("xpath=../..");
    await pricingRow.screenshot({ path: `${OUT_DIR}pricing-initial.png` });

    // Step 1: Cost=100, Margin%=20 -> Price should be 125.00, Markup% -> 25
    await cost.fill("100");
    await marginF.fill("20");
    await page.waitForTimeout(100);
    console.log("Cost=100, Margin=20 -> Price:", await price.inputValue(), "Markup:", await markupF.inputValue(), "(expect Price=125, Markup=25)");
    await pricingRow.screenshot({ path: `${OUT_DIR}pricing-after-margin.png` });

    // Step 2: Markup%=50 -> Price should recompute to 150.00, Margin% -> 33.33
    await markupF.fill("50");
    await page.waitForTimeout(100);
    console.log("Markup=50 -> Price:", await price.inputValue(), "Margin:", await marginF.inputValue(), "(expect Price=150, Margin=33.33)");
    await pricingRow.screenshot({ path: `${OUT_DIR}pricing-after-markup.png` });

    // Step 3: edit Price directly -> 200 -> Margin/Markup should both recompute
    await price.fill("200");
    await page.waitForTimeout(100);
    console.log("Price=200 (direct) -> Margin:", await marginF.inputValue(), "Markup:", await markupF.inputValue(), "(expect Margin=50, Markup=100)");
    await pricingRow.screenshot({ path: `${OUT_DIR}pricing-after-price-edit.png` });
    await priceRow.screenshot({ path: `${OUT_DIR}price-msrp-row.png` });
  } finally {
    await browser.close();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
