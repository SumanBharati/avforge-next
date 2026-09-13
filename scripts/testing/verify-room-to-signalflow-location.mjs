// Verifies the follow-up request: instead of scattering auto-synced Room
// Designer devices randomly on the Signal Flow canvas, they should land
// inside a dedicated Location named "Equipment synced from Room designer",
// arranged side by side.
//
// Seeds a camera + a display, loads Signal Flow, and checks: the Location
// label renders, both device blocks render, and they sit at the same Y
// (side-by-side row) with the camera's right edge roughly at the display's
// left edge (not overlapping, not stacked).
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-room-to-signalflow-location.mjs

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

if (!EMAIL || !PASSWORD) {
  console.error("Missing PLAYWRIGHT_TEST_EMAIL/PASSWORD — run with node --env-file=.env.local");
  process.exit(1);
}

const OUT_DIR = fileURLToPath(new URL("./screenshots/", import.meta.url));
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function seed() {
  const designData = {
    devices: [
      { uid: 101, id: "ptz-cam", name: "Generic PTZ Camera", icon: "confbar", w: 0.5, h: 0.4, wall: "front", type: "camera", color: "#8b5cf6", x: 6, y: 0.1, z: 5, mountWall: "north" },
      { uid: 102, id: "display-55", name: '55" Display', icon: "monitor", w: 4.0, h: 2.26, wall: "front", type: "display", color: "#8b5cf6", x: 10, y: 0.1, z: 5, mountWall: "north" },
    ],
    config: {
      roomType: "medium", roomW: 16, roomL: 20, roomH: 9,
      tableShape: "rectangular", tableSeats: 8, tableWidth: 4, tableWallDist: 4,
      showTable: true, selectedWall: "north", placedDoors: [], annotations: [],
    },
  };
  const { data: existing } = await admin.from("room_designs").select("id").eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).maybeSingle();
  if (existing) {
    await admin.from("room_designs").update({ data: designData, updated_at: new Date().toISOString() }).eq("id", existing.id);
  } else {
    await admin.from("room_designs").insert({ project_id: fixture.projectId, room_id: fixture.roomId, user_id: fixture.userId, data: designData });
  }
  await admin.from("tool_data").delete().eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).eq("tool", "signal-flow");
  console.log("Seeded a camera + a display in Room Designer, cleared signal-flow tool_data.");
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

    const sfUrl = `${APP_URL}/designEngineering/signal-flow?project=${fixture.projectId}&room=${fixture.roomId}`;
    await page.goto(sfUrl);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${OUT_DIR}rd-to-sf-location.png` });

    const locationLabel = await page.locator("svg text", { hasText: "Equipment synced from Room designer" }).count();
    console.log('Location label "Equipment synced from Room designer" found:', locationLabel > 0);

    const camBox = await page.evaluate(() => {
      const el = [...document.querySelectorAll("svg text")].find(t => t.textContent === "Generic PTZ Camera");
      return el ? el.closest("g")?.querySelector("rect")?.getBoundingClientRect() : null;
    });
    const dispBox = await page.evaluate(() => {
      const el = [...document.querySelectorAll("svg text")].find(t => t.textContent === '55" Display');
      return el ? el.closest("g")?.querySelector("rect")?.getBoundingClientRect() : null;
    });
    console.log("Camera block box:", camBox);
    console.log("Display block box:", dispBox);
    if (camBox && dispBox) {
      const sameRow = Math.abs(camBox.y - dispBox.y) < 5;
      const sideBySide = dispBox.x >= camBox.x + camBox.width - 5; // display starts at/after camera's right edge
      const noOverlap = !(camBox.x < dispBox.x + dispBox.width && dispBox.x < camBox.x + camBox.width);
      console.log("Same row (aligned Y):", sameRow);
      console.log("Side by side (not stacked):", sideBySide);
      console.log("No overlap:", noOverlap);
    } else {
      console.error("Could not locate one or both device blocks.");
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
