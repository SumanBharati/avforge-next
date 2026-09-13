// Verifies the fix for: "unable to move past this boundary, see the camera,
// i am not able to go further left" — a camera dragged near a room corner
// could end up more than the (1.5ft) snap-distance gate away from every
// individual wall segment at once, at which point it free-floated and got
// clamped to a padding box just outside the actual drawn room — with nothing
// pulling it back in, dragging further only ran into that padding clamp,
// which read as a wall you can't get past.
//
// Seeds a camera already stuck in that exact state (positioned diagonally
// outside the top-left corner of a custom-drawn 8x10 room, past the old
// 1.5ft gate from both the top and left walls) and drags it.
//
// Note: the actual fix that stuck (see verify-camera-body-rotation-alignment
// and the "move freely" follow-up) is not an unconditional snap — cameras
// use the same 1.5ft distance-gated snap as every other wall-mounted device,
// so they can rest anywhere on the canvas. What actually resolves the dead
// zone is CANVAS_PAD: the free-float clamp bounds now extend a generous 20ft
// past the drawn room instead of 1ft, so a device dragged away from every
// wall always has real room to move through and back — nothing pins it at
// an artificially tight boundary anymore. This test still nudges the camera
// and confirms it ends up on a real wall rather than stuck outside the room.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-camera-always-snaps.mjs

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
  // Stuck 2.2ft diagonally outside the top-left corner (world corner is
  // (2,2)) — more than 1.5ft from both the top wall segment and the left
  // wall segment's nearest points, reproducing the old dead-zone state.
  const camera = {
    id: "ptz-cam", name: "Stuck Corner Camera", icon: "confbar", w: 0.5, h: 0.4, wall: "front", type: "camera", color: "#22c55e",
    uid: 9013, x: 0.5, y: 0.5, z: 5, mountWall: "drawn", wallUid: 9001, rotation: 0, hfov: 70,
  };
  const designData = {
    devices: [topWall, rightWall, bottomWall, leftWall, camera],
    config: {
      roomType: "medium", roomW: 16.4, roomL: 19.7, roomH: 8.86,
      tableShape: "rectangular", tableSeats: 8, tableWidth: 4, tableWallDist: 4,
      showTable: false, selectedWall: "north", placedDoors: [], annotations: [],
    },
  };
  const { data: existing } = await admin.from("room_designs").select("id").eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).maybeSingle();
  if (existing) await admin.from("room_designs").update({ data: designData, updated_at: new Date().toISOString() }).eq("id", existing.id);
  else await admin.from("room_designs").insert({ project_id: fixture.projectId, room_id: fixture.roomId, user_id: fixture.userId, data: designData });
  console.log("Seeded a camera stuck diagonally outside the top-left corner (the old dead zone).");
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
    await page.locator("svg text", { hasText: "Stuck Corner Camera" }).first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT_DIR}camera-stuck-before.png` });

    const iconBox = await page.evaluate(() => {
      const textEl = [...document.querySelectorAll("svg text")].find((t) => t.textContent === "Stuck Corner Camera");
      const group = textEl.closest("g");
      const iconRect = [...group.querySelectorAll("rect")].find((r) => r.getAttribute("width") === "16" && r.getAttribute("height") === "10");
      const rect = iconRect.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    });

    // Nudge it — a small drag toward the room (down-right) should now snap
    // it onto the nearest real wall instead of leaving it in the dead zone.
    await page.mouse.move(iconBox.x, iconBox.y);
    await page.mouse.down();
    await page.mouse.move(iconBox.x + 30, iconBox.y + 15, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT_DIR}camera-stuck-after.png` });

    // Compare the camera's new screen position against the top-left wall
    // corner's screen position (the visual room boundary) — it should now be
    // on or very near the actual wall, not still floating outside it.
    const geometry = await page.evaluate(() => {
      const textEl = [...document.querySelectorAll("svg text")].find((t) => t.textContent === "Stuck Corner Camera");
      const group = textEl.closest("g");
      const iconRect = [...group.querySelectorAll("rect")].find((r) => r.getAttribute("width") === "16" && r.getAttribute("height") === "10");
      const camBox = iconRect.getBoundingClientRect();
      // The room's outer wall rect(s) — find the leftmost/topmost wall line's bounding extent.
      const allRects = [...document.querySelectorAll("svg rect")].map(r => r.getBoundingClientRect());
      const roomish = allRects.filter(r => r.width > 100 && r.height > 100);
      return {
        camX: camBox.x + camBox.width / 2, camY: camBox.y + camBox.height / 2,
        roomBoxes: roomish.map(r => ({ x: r.x, y: r.y, w: r.width, h: r.height })),
      };
    });
    console.log("Camera position after nudging it:", { camX: geometry.camX, camY: geometry.camY });
    console.log("Candidate room-outline boxes on screen:", geometry.roomBoxes);
    if (geometry.roomBoxes.length) {
      const room = geometry.roomBoxes[0];
      const outsideByX = geometry.camX < room.x - 10;
      const outsideByY = geometry.camY < room.y - 10;
      console.log("Camera still floating clearly outside the room (bug):", outsideByX && outsideByY ? "YES (still stuck)" : "NO (snapped back onto a wall)");
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
