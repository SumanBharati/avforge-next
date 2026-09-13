// Verifies the fix for: "The display snaps only on the inside wall of the
// room, I need ability to snap it on the outside wall of the room as well."
//
// Root cause: snapDeviceToNearestWall always inset the snapped position
// toward the room's interior (for a standard rectangular room, always
// y=0.02 just inside the north wall etc; for a hand-drawn wall, always
// flipped toward drawnBounds' center) — there was no way to land on a
// wall's exterior face at all, regardless of which side the cursor was
// actually on. Fixed to pick whichever side (inside or outside) the cursor
// is actually dragged to.
//
// Seeds a display just inside the room near the north wall and drags it up,
// crossing the wall to the exterior side — confirms it actually ends up
// outside (world y < 0) instead of being pulled back through to the inside,
// which is only possible at all now that free dragging beyond the room
// boundary works (see verify-equipment-moves-freely.mjs).
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-outside-wall-snap.mjs

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
  // Just inside the room, close to the north wall — a large negative-y seed
  // would render outside the visible canvas viewport entirely (the same
  // clipping this session already found for a south-wall device near the
  // room's far edge), so the drag below starts from a visible spot and
  // crosses the wall threshold itself.
  const designData = {
    devices: [
      { uid: 9060, id: "display-55", name: "Outside Snap Test Display", icon: "monitor", w: 4.0, h: 2.26, wall: "front", type: "display", color: "#8b5cf6", x: 8, y: 2, z: 5, mountWall: "north" },
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
  console.log("Seeded a display 2ft inside the room, near the north wall.");
}

function getIcon(label) {
  const textEl = [...document.querySelectorAll("svg text")].find((t) => t.textContent === label);
  const group = textEl.closest("g");
  const rects = [...group.querySelectorAll("rect")];
  const bezel = rects.find((r) => r.getAttribute("fill") !== "transparent" && r.getAttribute("fill") !== "none");
  const rect = (bezel || rects[0]).getBoundingClientRect();
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
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
    await page.locator("svg text", { hasText: "Outside Snap Test Display" }).first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT_DIR}outside-wall-snap-before.png` });

    const box = await page.evaluate(getIcon, "Outside Snap Test Display");
    console.log("Display initial screen pos:", box);

    // Drag it up, crossing the wall from the inside to the exterior side —
    // it should end up outside (world y < 0), not get pulled back through
    // to the inside the way it always used to.
    await page.mouse.move(box.x, box.y);
    await page.mouse.down();
    const steps = 12;
    const dyPx = -160; // comfortably past the wall and outside the old 1.5ft snap gate
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(box.x, box.y + dyPx * (i / steps), { steps: 2 });
    }
    await page.mouse.up();
    await page.waitForTimeout(2200); // let autosave fire
    await page.screenshot({ path: `${OUT_DIR}outside-wall-snap-after.png` });

    const { data } = await admin.from("room_designs").select("data").eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).maybeSingle();
    const dbDev = data?.data?.devices?.find((d) => d.uid === 9060);
    console.log("Stored position after dragging outside:", { x: dbDev?.x, y: dbDev?.y, mountWall: dbDev?.mountWall });
    console.log("Ended up on the OUTSIDE of the wall (y < 0):", dbDev && dbDev.y < 0 ? "YES (fixed)" : `NO (y=${dbDev?.y})`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
