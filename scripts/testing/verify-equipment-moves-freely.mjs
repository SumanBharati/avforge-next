// Verifies the fix for: "The room designer's equipment like camera display
// etc do not move freely around the entire canvas."
//
// Root cause: two separate bugs compounded.
//  1. handleSvgMouseMove's drag logic for cardinal-wall (north/south/west/
//     east) devices only ever let mic/speaker/control slide along whichever
//     wall they started on (flipping to the exact opposite parallel wall at
//     the room's midline) — never reaching an adjacent wall or open floor —
//     and, from the previous "invisible wall" fix, made cameras always snap
//     to the nearest wall with zero tolerance for resting away from one.
//     Neither could actually be dragged to an arbitrary point.
//  2. Independently, even after unifying that drag logic, camera/control
//     rendering for the four cardinal mounts hardcoded the on-canvas
//     position to sit exactly on that wall's line (e.g. `cpy=pY(0.1)` for
//     north) instead of using the device's own tracked x/y — so a camera
//     genuinely dragged into open floor space (mountWall unchanged, since
//     free-floating doesn't re-snap) still rendered glued to the wall.
//
// Seeds a north-wall camera and drags it diagonally toward open floor space
// in the middle of the room; confirms it actually lands near the drop point
// (not still hugging the wall it started on) and that mountWall is
// preserved as informational metadata rather than forcing the render back
// to the wall line.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-equipment-moves-freely.mjs

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
      { uid: 9050, id: "ptz-cam", name: "Free Drag Test Camera", icon: "confbar", w: 0.5, h: 0.4, wall: "front", type: "camera", color: "#22c55e", x: 8, y: 0.1, z: 5, mountWall: "north", hfov: 70 },
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
  console.log("Seeded a north-wall camera.");
}

function getIcon(label) {
  const textEl = [...document.querySelectorAll("svg text")].find((t) => t.textContent === label);
  const group = textEl.closest("g");
  const iconRect = [...group.querySelectorAll("rect")].find((r) => r.getAttribute("width") === "16" && r.getAttribute("height") === "10");
  const rect = (iconRect || group.querySelector("rect")).getBoundingClientRect();
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
    await page.locator("svg text", { hasText: "Free Drag Test Camera" }).first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(500);

    const before = await page.evaluate(getIcon, "Free Drag Test Camera");
    console.log("Camera initial screen pos:", before);

    // Drag well into open floor space, away from every wall.
    const targetX = before.x + 350, targetY = before.y + 280;
    await page.mouse.move(before.x, before.y);
    await page.mouse.down();
    const steps = 15;
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(before.x + (targetX - before.x) * (i / steps), before.y + (targetY - before.y) * (i / steps), { steps: 2 });
    }
    await page.mouse.up();
    await page.waitForTimeout(2200); // let autosave fire
    await page.screenshot({ path: `${OUT_DIR}equipment-moves-freely.png` });

    const after = await page.evaluate(getIcon, "Free Drag Test Camera");
    console.log("Camera position after dragging into open floor space:", after);

    const targetDist = Math.hypot(targetX - before.x, targetY - before.y);
    const movedDist = Math.hypot(after.x - before.x, after.y - before.y);
    console.log(`Moved ${movedDist.toFixed(1)}px of a ${targetDist.toFixed(1)}px drag`);
    // A device stuck sliding along its original wall would only move along
    // one axis; genuinely free movement should track both axes of the drag.
    const movedX = Math.abs(after.x - before.x), movedY = Math.abs(after.y - before.y);
    console.log("Moved in both X and Y (not just sliding along one wall):", movedX > 100 && movedY > 100 ? "YES (fixed)" : "NO (still restricted)");
    console.log("Reached most of the target drag distance:", movedDist > targetDist * 0.7 ? "YES (fixed)" : `NO (only ${((movedDist/targetDist)*100).toFixed(0)}%)`);

    const { data } = await admin.from("room_designs").select("data").eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).maybeSingle();
    const dbDev = data?.data?.devices?.find((d) => d.uid === 9050);
    console.log("Stored world position:", { x: dbDev?.x, y: dbDev?.y, mountWall: dbDev?.mountWall });
    console.log("Stored position is well off the original wall (y > 1.5):", dbDev && dbDev.y > 1.5 ? "YES" : "NO");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
