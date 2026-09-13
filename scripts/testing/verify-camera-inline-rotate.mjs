// Verifies the follow-up UI change: "remove these rotate options [from the
// context menu]. Instead when the camera object is selected, beside the x
// button for delete, provide a rotate button. clicking on that should
// provide option to put a rotation angle, entering the rotation angle should
// rotate the camera on that angle."
//
// Checks:
//  - the right-click context menu no longer has Rotate Left/Right entries
//  - selecting a camera shows a purple rotate button next to the red delete "x"
//  - clicking it opens a small popup with a numeric input
//  - typing an angle and pressing Enter rotates the FOV cone to that exact
//    angle (not just nudging by a fixed step)
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-camera-inline-rotate.mjs

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
      { uid: 9020, id: "ptz-cam", name: "Inline Rotate Test Camera", icon: "confbar", w: 0.5, h: 0.4, wall: "front", type: "camera", color: "#22c55e", x: 8, y: 0.1, z: 5, mountWall: "north", hfov: 70 },
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
  console.log("Seeded a north-wall camera for the inline rotate test.");
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
    await page.locator("svg text", { hasText: "Inline Rotate Test Camera" }).first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(500);

    // Context menu should no longer offer Rotate.
    const iconBox = await page.evaluate(() => {
      const textEl = [...document.querySelectorAll("svg text")].find((t) => t.textContent === "Inline Rotate Test Camera");
      const group = textEl.closest("g");
      const iconRect = [...group.querySelectorAll("rect")].find((r) => r.getAttribute("width") === "16" && r.getAttribute("height") === "10");
      const rect = iconRect.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    });
    await page.mouse.click(iconBox.x, iconBox.y, { button: "right" });
    await page.waitForTimeout(300);
    const rotateInMenu = await page.locator('text=/Rotate (Left|Right)/').count();
    console.log("Rotate option still in context menu (should be 0):", rotateInMenu);
    await page.keyboard.press("Escape");
    await page.mouse.click(50, 50); // close menu

    // Select the camera (plain click) and look for the inline purple rotate button.
    await page.mouse.click(iconBox.x, iconBox.y);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT_DIR}camera-inline-rotate-selected.png` });

    const buttons = await page.evaluate(() => {
      const textEl = [...document.querySelectorAll("svg text")].find((t) => t.textContent === "Inline Rotate Test Camera");
      const group = textEl.closest("g");
      const circles = [...group.querySelectorAll("circle")].filter(c => c.getAttribute("r") === "7");
      return circles.map(c => ({ fill: c.getAttribute("fill"), cx: +c.getAttribute("cx"), cy: +c.getAttribute("cy") }));
    });
    console.log("Selection-only circular buttons found (expect red delete + purple rotate):", buttons);

    const purpleBtn = buttons.find(b => b.fill === "#8b5cf6");
    if (!purpleBtn) throw new Error("No purple rotate button found next to the selected camera.");

    // Dispatch a real click directly on the circle's parent <g> (the element
    // with the onClick handler) rather than relying on raw screen
    // coordinates, which can be thrown off by sub-pixel rounding on a small
    // 14px target.
    await page.evaluate(({ cx, cy }) => {
      const textEl = [...document.querySelectorAll("svg text")].find((t) => t.textContent === "Inline Rotate Test Camera");
      const group = textEl.closest("g");
      const circle = [...group.querySelectorAll("circle")].find(c => c.getAttribute("r") === "7" && +c.getAttribute("cx") === cx && +c.getAttribute("cy") === cy);
      const targetG = circle.parentElement;
      const rect = circle.getBoundingClientRect();
      const cxScreen = rect.x + rect.width / 2, cyScreen = rect.y + rect.height / 2;
      const opts = { bubbles: true, cancelable: true, clientX: cxScreen, clientY: cyScreen, view: window };
      targetG.dispatchEvent(new MouseEvent("mousedown", opts));
      targetG.dispatchEvent(new MouseEvent("mouseup", opts));
      targetG.dispatchEvent(new MouseEvent("click", opts));
    }, { cx: purpleBtn.cx, cy: purpleBtn.cy });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT_DIR}camera-inline-rotate-popup.png` });

    const popupInput = page.locator('text="Rotation (°)"').locator("xpath=following-sibling::input[1]");
    console.log("Rotate popup input visible:", await popupInput.count() > 0);
    await popupInput.fill("45");
    await popupInput.press("Enter");
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT_DIR}camera-inline-rotate-after.png` });

    // Confirm the FOV arc actually rotated by checking the body rect's rotate() transform.
    const bodyRotation = await page.evaluate(() => {
      const textEl = [...document.querySelectorAll("svg text")].find((t) => t.textContent === "Inline Rotate Test Camera");
      const group = textEl.closest("g");
      const rotated = [...group.querySelectorAll("g[transform*='rotate']")][0];
      return rotated ? rotated.getAttribute("transform") : null;
    });
    console.log("Camera body transform after entering 45:", bodyRotation);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
