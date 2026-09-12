// Headless visual verification for the new "Includes rack ears" checkbox in
// EquipmentFormModal's Physical section, via Signal Flow Builder's "Edit
// equipment" context-menu action (which only touches the in-canvas device
// object, not any DB table — safe to test even before the equipment_library
// migration for this field has been applied).
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-rack-ears.mjs

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
    const laptopTitle = canvas.locator("svg text", { hasText: "Laptop" }).first();
    await laptopTitle.waitFor({ timeout: 20000 });

    await laptopTitle.click({ button: "right" });
    await page.locator("text=Edit equipment").click();
    console.log("Opened Edit Equipment modal");

    const rackEarsLabel = page.locator("text=Includes rack ears");
    await rackEarsLabel.waitFor({ timeout: 5000 });
    await rackEarsLabel.scrollIntoViewIfNeeded();

    const physicalSection = page.locator("text=PHYSICAL").locator("xpath=..");
    await physicalSection.screenshot({ path: `${OUT_DIR}rack-ears-checkbox.png` });
    console.log("Screenshot saved: rack-ears-checkbox.png");

    // Toggle it and confirm the checked state actually changes
    const checkbox = rackEarsLabel.locator("xpath=preceding-sibling::input[@type='checkbox']");
    const before = await checkbox.isChecked();
    await checkbox.click();
    const after = await checkbox.isChecked();
    console.log(`Checkbox toggled: ${before} -> ${after}`);
    await physicalSection.screenshot({ path: `${OUT_DIR}rack-ears-checked.png` });
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
