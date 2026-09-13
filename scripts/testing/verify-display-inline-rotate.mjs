// Verifies: "Provide rotate on Display equipment as well like we have on
// camera" — the same inline purple rotate button + numeric-angle popup added
// for cameras now also appears next to a selected display's delete "x", and
// entering a value rotates the display's icon directly (displays already
// render straight from `rotation`, unlike cameras' additive facing offset).
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-display-inline-rotate.mjs

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
      { uid: 9070, id: "display-55", name: "Display Rotate Test", icon: "monitor", w: 4.0, h: 2.26, wall: "front", type: "display", color: "#8b5cf6", x: 8, y: 0.1, z: 5, mountWall: "north" },
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
  console.log("Seeded a north-wall display for the inline rotate test.");
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
    await page.locator("svg text", { hasText: "Display Rotate Test" }).first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(500);

    // Select the display.
    const iconBox = await page.evaluate(() => {
      const textEl = [...document.querySelectorAll("svg text")].find((t) => t.textContent === "Display Rotate Test");
      const group = textEl.closest("g");
      const rects = [...group.querySelectorAll("rect")];
      const bezel = rects.find((r) => r.getAttribute("fill") !== "transparent" && r.getAttribute("fill") !== "none");
      const rect = (bezel || rects[0]).getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    });
    await page.mouse.click(iconBox.x, iconBox.y);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT_DIR}display-inline-rotate-selected.png` });

    const buttons = await page.evaluate(() => {
      const textEl = [...document.querySelectorAll("svg text")].find((t) => t.textContent === "Display Rotate Test");
      const group = textEl.closest("g");
      return [...group.querySelectorAll("circle")].filter((c) => c.getAttribute("r") === "7").map((c) => ({ fill: c.getAttribute("fill"), cx: +c.getAttribute("cx"), cy: +c.getAttribute("cy") }));
    });
    console.log("Selection-only circular buttons found (expect red delete + purple rotate):", buttons);
    const purpleBtn = buttons.find((b) => b.fill === "#8b5cf6");
    if (!purpleBtn) throw new Error("No purple rotate button found next to the selected display.");

    // Dispatch a real click on the rotate button's <g>.
    await page.evaluate(({ cx, cy }) => {
      const textEl = [...document.querySelectorAll("svg text")].find((t) => t.textContent === "Display Rotate Test");
      const group = textEl.closest("g");
      const circle = [...group.querySelectorAll("circle")].find((c) => c.getAttribute("r") === "7" && +c.getAttribute("cx") === cx && +c.getAttribute("cy") === cy);
      const targetG = circle.parentElement;
      const rect = circle.getBoundingClientRect();
      const opts = { bubbles: true, cancelable: true, clientX: rect.x + rect.width / 2, clientY: rect.y + rect.height / 2, view: window };
      targetG.dispatchEvent(new MouseEvent("mousedown", opts));
      targetG.dispatchEvent(new MouseEvent("mouseup", opts));
      targetG.dispatchEvent(new MouseEvent("click", opts));
    }, { cx: purpleBtn.cx, cy: purpleBtn.cy });
    await page.waitForTimeout(300);

    const popupInput = page.locator('text="Rotation (°)"').locator("xpath=following-sibling::input[1]");
    console.log("Rotate popup input visible:", (await popupInput.count()) > 0);
    const prefill = await popupInput.inputValue();
    console.log("Pre-filled rotation value (expect 0, the north-wall default):", prefill);

    await popupInput.click();
    await popupInput.selectText();
    await popupInput.press("Backspace"); // regression check: must not delete the display
    await page.waitForTimeout(150);
    const stillThereAfterBackspace = await page.locator("svg text", { hasText: "Display Rotate Test" }).count();
    console.log("Display still present after Backspace in the popup:", stillThereAfterBackspace > 0 ? "YES (correct)" : "NO (regression!)");

    await page.keyboard.type("30");
    await popupInput.press("Enter");
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT_DIR}display-inline-rotate-after.png` });

    const rotation = await page.evaluate(() => {
      const textEl = [...document.querySelectorAll("svg text")].find((t) => t.textContent === "Display Rotate Test");
      const group = textEl.closest("g");
      return group.getAttribute("transform");
    });
    console.log("Display group transform after entering 30:", rotation);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
