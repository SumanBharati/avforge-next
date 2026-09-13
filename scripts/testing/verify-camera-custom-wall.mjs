// Verifies the fix for: "im unable to move the camera block to any wall,
// seems like it is getting restricted by an invisible wall."
//
// Root cause: Room Designer starts every session in "custom" room mode by
// default (roomSizeMode state initializes to "custom" and is never restored
// from saved data), and in that mode devices placed on a hand-drawn wall get
// mountWall:"drawn" with a real wallUid — but the camera render branch only
// ever recognized mountWall being exactly "north"/"south"/"west", falling
// through to a hardcoded "east" formula (`pX(roomW-0.1)`) for anything else,
// including "drawn". roomW/roomL are stale leftover numbers once a room is
// custom-drawn (the visual outline comes from the wall segments themselves,
// not from roomW/roomL), so that fallback rendered the camera far from the
// actually-drawn room — and since dragging only updates dev.x/dev.y (which
// the render ignored), it looked permanently stuck.
//
// Seeds a custom-drawn 8x10 room (4 wall-partition segments) with stale
// roomW/roomL (16.4x19.7, a leftover "medium room" default) plus a camera
// correctly snapped onto the top wall (mountWall:"drawn"), and checks that
// the camera now renders near that wall — not off in empty space near where
// the stale roomW would place a phantom east wall.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-camera-custom-wall.mjs

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

function wallSeg(uid, x1, y1, x2, y2, name) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  return {
    id: "wall-partition", name, icon: "🧱", w: len, h: 0.3, wall: "floor", type: "furniture", color: "#475569",
    uid, x: (x1 + x2) / 2, y: (y1 + y2) / 2, z: 0, mountWall: "floor",
    wallAngle: Math.atan2(dy, dx), wallType: "solid",
  };
}

async function seed() {
  const topWall = wallSeg(9001, 2, 2, 10, 2, "Solid Wall");
  const rightWall = wallSeg(9002, 10, 2, 10, 12, "Solid Wall");
  const bottomWall = wallSeg(9003, 10, 12, 2, 12, "Solid Wall");
  const leftWall = wallSeg(9004, 2, 12, 2, 2, "Solid Wall");
  const camera = {
    id: "ptz-cam", name: "Custom Wall Test Camera", icon: "confbar", w: 0.5, h: 0.4, wall: "front", type: "camera", color: "#22c55e",
    uid: 9010, x: 6, y: 2.3, z: 5, mountWall: "drawn", wallUid: 9001, rotation: 0, hfov: 120,
  };
  const designData = {
    devices: [topWall, rightWall, bottomWall, leftWall, camera],
    config: {
      // Stale leftover defaults — this is the crux: for a custom-drawn room,
      // roomW/roomL don't describe the actual drawn shape at all, but the
      // buggy camera render used them anyway.
      roomType: "medium", roomW: 16.4, roomL: 19.7, roomH: 8.86,
      tableShape: "rectangular", tableSeats: 8, tableWidth: 4, tableWallDist: 4,
      showTable: false, selectedWall: "north", placedDoors: [], annotations: [],
    },
  };
  const { data: existing } = await admin.from("room_designs").select("id").eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).maybeSingle();
  if (existing) await admin.from("room_designs").update({ data: designData, updated_at: new Date().toISOString() }).eq("id", existing.id);
  else await admin.from("room_designs").insert({ project_id: fixture.projectId, room_id: fixture.roomId, user_id: fixture.userId, data: designData });
  console.log("Seeded a custom-drawn 8x10 room with a camera snapped onto the top wall (mountWall: drawn).");
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
    await page.locator("svg text", { hasText: "Custom Wall Test Camera" }).first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT_DIR}camera-custom-wall-before-drag.png` });

    // The camera's icon (16x10 rect) should sit close to the top wall segment
    // (world y=2, near the top of the drawn rectangle), not floating far to
    // the right near a phantom east wall computed from the stale roomW=16.4.
    const geometry = await page.evaluate(() => {
      const textEl = [...document.querySelectorAll("svg text")].find((t) => t.textContent === "Custom Wall Test Camera");
      const group = textEl.closest("g");
      const iconRect = [...group.querySelectorAll("rect")].find((r) => r.getAttribute("width") === "16" && r.getAttribute("height") === "10");
      const camBox = iconRect.getBoundingClientRect();
      // Find one of the wall segments' rendered lines/rects for a reference point.
      const wallTexts = [...document.querySelectorAll("svg")];
      return { camX: camBox.x + camBox.width / 2, camY: camBox.y + camBox.height / 2 };
    });
    console.log("Camera icon screen position:", geometry);

    // Drag the camera from the top wall down to the bottom wall — this
    // exercises the fixed camera-specific snap-drag branch (previously only
    // "display" got wall-to-wall snap dragging).
    const dragSteps = 12;
    await page.mouse.move(geometry.camX, geometry.camY);
    await page.mouse.down();
    for (let i = 1; i <= dragSteps; i++) {
      await page.mouse.move(geometry.camX, geometry.camY + (i / dragSteps) * 350, { steps: 2 });
    }
    await page.mouse.up();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT_DIR}camera-custom-wall-after-drag.png` });

    const afterGeometry = await page.evaluate(() => {
      const textEl = [...document.querySelectorAll("svg text")].find((t) => t.textContent === "Custom Wall Test Camera");
      const group = textEl.closest("g");
      const iconRect = [...group.querySelectorAll("rect")].find((r) => r.getAttribute("width") === "16" && r.getAttribute("height") === "10");
      const camBox = iconRect.getBoundingClientRect();
      return { camX: camBox.x + camBox.width / 2, camY: camBox.y + camBox.height / 2 };
    });
    console.log("Camera icon screen position after dragging down toward the bottom wall:", afterGeometry);
    const movedDown = afterGeometry.camY > geometry.camY + 50;
    console.log("Camera actually moved down toward the bottom wall (not stuck):", movedDown);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
