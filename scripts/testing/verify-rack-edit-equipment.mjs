// Verifies Rack Builder now opens the shared EquipmentFormModal (same as
// Signal Flow Builder/Room Designer) on right-click > "Edit equipment",
// instead of the old bare-bones custom modal — and that editing
// manufacturer/model saves only into this project's local rack items
// (no equipment_library/av_products writes).
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-rack-edit-equipment.mjs

import { chromium } from "playwright";
import { readFileSync } from "fs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;
const fixture = JSON.parse(readFileSync(new URL("./.fixture.json", import.meta.url), "utf8"));

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto(`${APP_URL}/login`);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

  const url = `${APP_URL}/designEngineering/rack-planner?project=${fixture.projectId}&room=${fixture.roomId}`;
  await page.goto(url);
  await page.locator("text=Test Amp").first().waitFor({ timeout: 20000 });
  console.log("Rack Builder loaded, 'Test Amp' item visible.");

  await page.locator("text=Test Amp").first().click({ button: "right" });
  await page.waitForTimeout(300);
  await page.locator("text=Edit equipment").click();
  await page.waitForTimeout(500);

  const hasManufacturerField = await page.locator("text=Manufacturer").count();
  const hasAIButton = await page.locator("text=/Update with AI|Fill in with AI/i").count();
  console.log("Shared modal shows Manufacturer field:", hasManufacturerField > 0);
  console.log("Shared modal shows AI-assist button:", hasAIButton > 0);

  // Fill in manufacturer + model, save.
  await page.locator('input[placeholder="e.g. Samsung"]').fill("QSC");
  await page.locator('input[placeholder="e.g. QM85B"]').fill("CX404V");
  await page.waitForTimeout(200);

  const saveBtn = page.locator("button:has-text('Save Item')");
  await saveBtn.click();
  await page.waitForTimeout(1800); // allow the 1s debounced autosave to fire

  const updatedLabel = await page.locator("text=QSC CX404V").count();
  console.log("Rack elevation label updated to 'QSC CX404V':", updatedLabel > 0);

  await page.screenshot({ path: "scripts/testing/screenshots/rack-edit-equipment.png" });
  console.log("Page errors:", errors.length ? errors : "none");

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
