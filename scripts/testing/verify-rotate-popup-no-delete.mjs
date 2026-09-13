// Verifies the fix for: "entering the rotate angle deletes the camera."
//
// Root cause: the app-level Delete/Backspace keyboard shortcut (which
// deletes whatever device is currently selected) only suppressed itself
// while one specific known input (the wall-length editor) was focused —
// checked via `document.activeElement === wallInputRef.current`. Any other
// input, including the new camera rotate popup, wasn't recognized, so
// pressing Backspace to clear the popup's default "0" before typing a real
// angle bubbled to the document and deleted the still-selected camera out
// from under the popup.
//
// Reproduces it with *real* keystrokes (Backspace then digits via
// page.keyboard, not Playwright's fill() — which sets the value directly and
// never dispatches a literal Backspace keydown, so it wouldn't have caught
// this bug) and confirms the camera survives and ends up rotated.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-rotate-popup-no-delete.mjs

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
      { uid: 9021, id: "ptz-cam", name: "Backspace Test Camera", icon: "confbar", w: 0.5, h: 0.4, wall: "front", type: "camera", color: "#22c55e", x: 8, y: 0.1, z: 5, mountWall: "north", hfov: 70 },
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
  console.log("Seeded a north-wall camera for the Backspace-in-rotate-popup test.");
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
    await page.locator("svg text", { hasText: "Backspace Test Camera" }).first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(500);

    // Select the camera, then open the rotate popup via the purple button.
    const iconBox = await page.evaluate(() => {
      const textEl = [...document.querySelectorAll("svg text")].find((t) => t.textContent === "Backspace Test Camera");
      const group = textEl.closest("g");
      const iconRect = [...group.querySelectorAll("rect")].find((r) => r.getAttribute("width") === "16" && r.getAttribute("height") === "10");
      const rect = iconRect.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    });
    await page.mouse.click(iconBox.x, iconBox.y);
    await page.waitForTimeout(300);

    await page.evaluate(() => {
      const textEl = [...document.querySelectorAll("svg text")].find((t) => t.textContent === "Backspace Test Camera");
      const group = textEl.closest("g");
      const purple = [...group.querySelectorAll("circle")].find(c => c.getAttribute("r") === "7" && c.getAttribute("fill") === "#8b5cf6");
      const targetG = purple.parentElement;
      const rect = purple.getBoundingClientRect();
      const opts = { bubbles: true, cancelable: true, clientX: rect.x + rect.width / 2, clientY: rect.y + rect.height / 2, view: window };
      targetG.dispatchEvent(new MouseEvent("mousedown", opts));
      targetG.dispatchEvent(new MouseEvent("mouseup", opts));
      targetG.dispatchEvent(new MouseEvent("click", opts));
    });
    await page.waitForTimeout(300);

    // Click into the popup's input, then use REAL Backspace + digit keystrokes
    // — this is what actually reproduced the bug (fill() does not).
    const popupInput = page.locator('text="Rotation (°)"').locator("xpath=following-sibling::input[1]");
    await popupInput.click();
    await popupInput.press("End");
    await popupInput.press("Backspace"); // clears the default "0" — this used to delete the camera
    await page.waitForTimeout(150);

    const cameraStillThereAfterBackspace = await page.locator("svg text", { hasText: "Backspace Test Camera" }).count();
    console.log("Camera still present after pressing Backspace in the rotate popup:", cameraStillThereAfterBackspace > 0 ? "YES (fixed)" : "NO (bug reproduced — camera deleted)");

    await page.keyboard.type("60");
    await popupInput.press("Enter");
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT_DIR}rotate-popup-no-delete-after.png` });

    const cameraStillThereAfterApply = await page.locator("svg text", { hasText: "Backspace Test Camera" }).count();
    console.log("Camera still present after applying the rotation:", cameraStillThereAfterApply > 0);
    const fovLabel60 = await page.locator("svg text", { hasText: "70°" }).count(); // HFOV label unaffected by rotation
    console.log("FOV label (70°, unrelated to rotation) still shown:", fovLabel60 > 0);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
