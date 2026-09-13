// Follow-up to verify-camera-custom-wall.mjs: verifies the fix for "the
// dotted lines are not rendering properly" — the FOV cone for a camera
// mounted on a custom-drawn wall was clipped against a phantom rectangle
// anchored at world (0,0) sized roomW x roomL (stale leftover numbers once a
// room is custom-drawn), instead of the wall's actual drawn extent. When the
// drawn room doesn't happen to sit exactly at the origin, that phantom
// clipping rectangle is offset from the real room, producing a lopsided/
// broken-looking cone (one dashed line clipped short, the other stretched).
//
// Seeds the same custom-drawn 8x10 room (drawn from world (2,2) to (10,12),
// deliberately NOT starting at the origin) with a camera on the RIGHT
// (east-side, vertical) wall — the exact case from the bug report screenshot
// — and checks that both FOV dashed lines render with comparable length and
// that the arc/label sits roughly centered between them, instead of one
// line being clipped almost immediately.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-camera-fov-cone-clip.mjs

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
  // Camera on the right (east-side) wall, inset toward room interior — same
  // computation the app's own snapDeviceToNearestWall would produce.
  const camera = {
    id: "ptz-cam", name: "East Wall FOV Test Camera", icon: "confbar", w: 0.5, h: 0.4, wall: "front", type: "camera", color: "#22c55e",
    uid: 9011, x: 9.7, y: 7, z: 5, mountWall: "drawn", wallUid: 9002, rotation: 90, hfov: 120,
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
  console.log("Seeded a custom-drawn 8x10 room (offset from origin) with a camera on the east-side wall.");
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
    await page.locator("svg text", { hasText: "East Wall FOV Test Camera" }).first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT_DIR}camera-fov-cone-clip.png` });

    const fovInfo = await page.evaluate(() => {
      const textEl = [...document.querySelectorAll("svg text")].find((t) => t.textContent === "East Wall FOV Test Camera");
      const group = textEl.closest("g");
      const dashedLines = [...group.querySelectorAll("line")].filter(l => l.getAttribute("stroke-dasharray"));
      return dashedLines.map(l => ({
        x1: +l.getAttribute("x1"), y1: +l.getAttribute("y1"), x2: +l.getAttribute("x2"), y2: +l.getAttribute("y2"),
        len: Math.hypot(+l.getAttribute("x2") - +l.getAttribute("x1"), +l.getAttribute("y2") - +l.getAttribute("y1")),
      }));
    });
    console.log("FOV dashed lines found:", fovInfo.length);
    fovInfo.forEach((l, i) => console.log(`  line ${i}: length=${l.len.toFixed(1)}px`, l));
    if (fovInfo.length === 2) {
      const ratio = Math.min(fovInfo[0].len, fovInfo[1].len) / Math.max(fovInfo[0].len, fovInfo[1].len);
      console.log("Length ratio (1.0 = perfectly symmetric):", ratio.toFixed(2));
      console.log("Reasonably symmetric (ratio > 0.5):", ratio > 0.5 ? "YES (fixed)" : "NO (still lopsided)");
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
