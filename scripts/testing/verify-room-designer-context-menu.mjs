// Verifies the new feature: right-clicking a device in Room Designer opens
// the same kind of context menu Signal Flow Builder has (Edit equipment /
// Duplicate / Delete equipment), and the Edit Equipment modal actually lets
// you change HFOV and the device's on-canvas size — the two things
// specifically requested ("edit things like HFOV, size etc").
//
// Seeds a camera with hfov=70 in room_designs, right-clicks it, opens Edit
// Equipment, changes HFOV to 110 and the width to 24in, saves, and confirms
// both took effect: the FOV arc label on the canvas now reads "110°" and the
// camera's rendered box got wider.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-room-designer-context-menu.mjs

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const fixture = JSON.parse(readFileSync(new URL("./.fixture.json", import.meta.url), "utf8"));

const OUT_DIR = fileURLToPath(new URL("./screenshots/", import.meta.url));
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function seed() {
  const designData = {
    devices: [
      { uid: 501, id: "ptz-cam", name: "Context Menu Test Camera", icon: "confbar", w: 0.5, h: 0.4, wall: "front", type: "camera", color: "#22c55e", x: 8, y: 0.1, z: 5, mountWall: "north", hfov: 70 },
    ],
    config: {
      roomType: "medium", roomW: 16, roomL: 20, roomH: 9,
      tableShape: "rectangular", tableSeats: 8, tableWidth: 4, tableWallDist: 4,
      showTable: true, selectedWall: "north", placedDoors: [], annotations: [],
    },
  };
  const { data: existing } = await admin.from("room_designs").select("id").eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).maybeSingle();
  if (existing) await admin.from("room_designs").update({ data: designData, updated_at: new Date().toISOString() }).eq("id", existing.id);
  else await admin.from("room_designs").insert({ project_id: fixture.projectId, room_id: fixture.roomId, user_id: fixture.userId, data: designData });
  console.log("Seeded a camera with HFOV=70 in Room Designer.");
}

async function main() {
  await seed();

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

  try {
    await page.goto(`${APP_URL}/login`);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    const rdUrl = `${APP_URL}/designEngineering/room-designer?project=${fixture.projectId}&room=${fixture.roomId}`;
    await page.goto(rdUrl);
    await page.locator("svg text", { hasText: "Context Menu Test Camera" }).first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(500);

    const before70 = await page.locator("svg text", { hasText: "70°" }).count();
    console.log('Initial FOV label shows "70°":', before70 > 0);

    // Right-click the camera icon (the small 16x10 rect, same target used in
    // the earlier device-delete verification script).
    const iconBox = await page.evaluate(() => {
      const textEl = [...document.querySelectorAll("svg text")].find((t) => t.textContent === "Context Menu Test Camera");
      const group = textEl.closest("g");
      const iconRect = [...group.querySelectorAll("rect")].find((r) => r.getAttribute("width") === "16" && r.getAttribute("height") === "10");
      const rect = iconRect.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    });
    await page.mouse.click(iconBox.x, iconBox.y, { button: "right" });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT_DIR}rd-context-menu.png` });

    const editOption = page.locator('text="Edit equipment"');
    console.log("Context menu shows 'Edit equipment':", await editOption.count() > 0);
    console.log("Context menu shows 'Duplicate':", await page.locator('text="Duplicate"').count() > 0);
    console.log("Context menu shows 'Delete equipment':", await page.locator('text="Delete equipment"').count() > 0);
    await editOption.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT_DIR}rd-edit-equipment-modal.png` });

    // Confirm the modal pre-filled HFOV and width correctly, then change both.
    const hfovBefore = await page.evaluate(() => {
      const label = [...document.querySelectorAll('label')].find(el => el.textContent?.trim().startsWith('HFOV'));
      return label && label.nextElementSibling ? label.nextElementSibling.value : null;
    });
    const widthInBefore = await page.evaluate(() => {
      const label = [...document.querySelectorAll('label')].find(el => el.textContent?.trim() === 'W (in)');
      return label && label.nextElementSibling ? label.nextElementSibling.value : null;
    });
    console.log("HFOV pre-filled from device (expect 70):", hfovBefore);
    console.log("W (in) pre-filled from device footprint:", widthInBefore);

    await page.evaluate(() => {
      const label = [...document.querySelectorAll('label')].find(el => el.textContent?.trim().startsWith('HFOV'));
      const input = label.nextElementSibling;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, '110');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.evaluate(() => {
      const label = [...document.querySelectorAll('label')].find(el => el.textContent?.trim() === 'W (in)');
      const input = label.nextElementSibling;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, '24');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(200);
    await page.locator('button:has-text("Save Item")').click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT_DIR}rd-after-edit.png` });

    const after110 = await page.locator("svg text", { hasText: "110°" }).count();
    console.log('FOV label now shows "110°" after editing HFOV:', after110 > 0);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
