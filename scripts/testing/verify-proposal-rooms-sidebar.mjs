// Headless visual verification that the Proposal page's room sidebar now
// matches the Design Engineering sidebar's look/behavior: "+ Add Room",
// chevron + truncated name, hover-revealed rename/delete icons.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-proposal-rooms-sidebar.mjs

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

    await page.goto(`${APP_URL}/projects/${fixture.projectId}/proposal`);
    await page.locator("aside").locator("text=Test Room").waitFor({ timeout: 20000 });
    await page.waitForTimeout(500);

    // 1. Base state: chevrons + Add Room header
    await page.screenshot({ path: `${OUT_DIR}proposal-rooms-sidebar.png`, clip: { x: 0, y: 60, width: 280, height: 260 } });
    console.log("Base sidebar screenshot saved");

    // 2. Hover a room row to reveal edit/delete icons
    const testRoomRow = page.locator("aside").locator("text=Test Room").locator("xpath=../..");
    await testRoomRow.hover();
    await page.screenshot({ path: `${OUT_DIR}proposal-rooms-hover.png`, clip: { x: 0, y: 60, width: 280, height: 260 } });
    const editVisible = await testRoomRow.locator('button[title="Rename room"]').isVisible();
    const deleteVisible = await testRoomRow.locator('button[title="Delete room"]').isVisible();
    console.log(`Hover reveals edit/delete: edit=${editVisible} delete=${deleteVisible}`);

    // 3. Rename flow
    await testRoomRow.locator('button[title="Rename room"]').click();
    const input = page.locator("aside input").first();
    await input.waitFor({ timeout: 5000 });
    await input.fill("Renamed Test Room");
    await input.press("Enter");
    await page.locator("aside").locator("text=Renamed Test Room").waitFor({ timeout: 5000 });
    console.log("Rename succeeded: 'Renamed Test Room' now visible in sidebar");
    await page.screenshot({ path: `${OUT_DIR}proposal-rooms-renamed.png`, clip: { x: 0, y: 60, width: 280, height: 260 } });

    // Revert the name so re-runs stay stable
    const revertRow = page.locator("aside").locator("text=Renamed Test Room").locator("xpath=../..");
    await revertRow.hover();
    await revertRow.locator('button[title="Rename room"]').click();
    const revertInput = page.locator("aside input").first();
    await revertInput.fill("Test Room");
    await revertInput.press("Enter");
    await page.locator("aside").locator("text=Test Room").waitFor({ timeout: 5000 });
    console.log("Reverted name back to 'Test Room'");

    // 4. Add Room flow (then delete the scratch room so the fixture stays clean)
    await page.locator('button[title="Add a room — no site survey needed"]').click();
    await page.waitForTimeout(800);
    const allNames = await page.locator("aside").locator("span.truncate").allInnerTexts();
    console.log("Room names after Add Room:", allNames);
    const newRoomName = allNames[allNames.length - 1];
    const newRow = page.locator("aside").locator(`text=${newRoomName}`).last().locator("xpath=../..");
    await newRow.hover();
    await newRow.locator('button[title="Delete room"]').click();
    await page.locator("h3", { hasText: "Delete room" }).waitFor({ timeout: 5000 });
    await page.locator('button:has-text("Delete")').last().click();
    await page.waitForTimeout(500);
    console.log("Scratch room deleted, cleanup done");
  } finally {
    await browser.close();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
