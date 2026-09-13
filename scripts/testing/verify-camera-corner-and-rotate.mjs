// Verifies: "outside the room boundary it does not render well" — a camera
// placed very close to a room corner produced a degenerate, loopy FOV arc
// instead of a clean cone, because the arc's sweep angles were derived from
// the *clipped* line endpoints — which collapse to (near) zero length right
// at a corner, making their direction numerically meaningless. Fixed by
// computing the arc directly from facingA±halfAngle (always well-defined)
// instead of from the clipped points.
//
// (The "add a manual rotate option" half of that same conversation turn was
// superseded by a later request — an inline rotate button next to a selected
// camera's delete "x", not context-menu entries — see
// verify-camera-inline-rotate.mjs for that.)
//
// Seeds a camera right at the top-right corner of an 8x10 custom-drawn room
// (mounted on the top wall, positioned almost exactly at the corner with the
// right wall) and checks the FOV arc path doesn't contain a degenerate/
// looping shape (both arc endpoints are a normal, finite distance from the
// camera — arcR=20px — rather than collapsing to the same point as cpx/cpy).
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-camera-corner-and-rotate.mjs

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
  // Right at the top-right corner, mounted on the top wall.
  const camera = {
    id: "ptz-cam", name: "Corner Test Camera", icon: "confbar", w: 0.5, h: 0.4, wall: "front", type: "camera", color: "#22c55e",
    uid: 9012, x: 9.85, y: 2.3, z: 5, mountWall: "drawn", wallUid: 9001, rotation: 0, hfov: 120,
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
  console.log("Seeded a camera right at the top-right corner of a custom-drawn room.");
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
    await page.locator("svg text", { hasText: "Corner Test Camera" }).first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT_DIR}camera-corner-before-rotate.png` });

    const arcInfo = await page.evaluate(() => {
      const textEl = [...document.querySelectorAll("svg text")].find((t) => t.textContent === "Corner Test Camera");
      const group = textEl.closest("g");
      const path = group.querySelector("path[stroke]");
      const d = path.getAttribute("d");
      // Parse "M ax1 ay1 A r r 0 large sweep ax2 ay2"
      const nums = d.match(/-?[\d.]+/g).map(Number);
      const [ax1, ay1, r, , large, sweep, ax2, ay2] = nums;
      return { ax1, ay1, r, large, sweep, ax2, ay2 };
    });
    console.log("Arc path components:", arcInfo);
    const arcSpan = Math.hypot(arcInfo.ax2 - arcInfo.ax1, arcInfo.ay2 - arcInfo.ay1);
    console.log("Distance between arc endpoints (should be a normal, non-zero chord, not near 0):", arcSpan.toFixed(2), "px");
    console.log("Arc looks non-degenerate:", arcSpan > 5 ? "YES (fixed)" : "NO (still broken)");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
