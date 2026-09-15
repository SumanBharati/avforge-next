// Verifies: "i tries increasing the scale for testing, it hid the half
// portion of the floor plan" — the background <image> was clipped to the
// room's own rectangle (clipPath="url(#roomClip)"), which was harmless
// before (image was always force-sized to exactly match the room) but
// started silently cropping the image the moment it could legitimately be
// larger than the room (a real floor plan almost always is).
//
// Seeds a floor plan image calibrated to be WIDER than the room and checks
// that the rendered <image> element still reports its full, uncropped
// width/height, with no clip-path applied.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-floorplan-no-clip.mjs

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

const FLOORPLAN_DATA_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

async function seed() {
  const designData = {
    devices: [],
    config: {
      roomType: "medium", roomW: 16, roomL: 20, roomH: 9,
      tableShape: "rectangular", tableSeats: 8, tableWidth: 4, tableWallDist: 4,
      showTable: false, selectedWall: "north", placedDoors: [], annotations: [],
      floorPlanImg: FLOORPLAN_DATA_URI,
      // Deliberately larger than the 16ft-wide room, simulating a floor
      // plan that shows a whole building level, not just this one room.
      floorPlanWidthFt: 40,
      floorPlanOffset: { x: -5, y: -5 },
    },
  };
  const { data: existing } = await admin.from("room_designs").select("id").eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).maybeSingle();
  if (existing) await admin.from("room_designs").update({ data: designData, updated_at: new Date().toISOString() }).eq("id", existing.id);
  else await admin.from("room_designs").insert({ project_id: fixture.projectId, room_id: fixture.roomId, user_id: fixture.userId, data: designData });
  console.log("Seeded a floor plan calibrated to 40ft wide (much larger than the 16ft room).");
}

async function main() {
  await seed();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  page.on("pageerror", err => console.log("PAGEERROR:", err.message));

  try {
    await page.goto(`${APP_URL}/login`);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    const rdUrl = `${APP_URL}/designEngineering/room-designer?project=${fixture.projectId}&room=${fixture.roomId}`;
    await page.goto(rdUrl);
    await page.waitForTimeout(1800);

    const planSvg = page.locator('[data-rd-canvas="plan"] svg').first();
    const image = planSvg.locator("image").first();
    await image.waitFor({ timeout: 10000 });

    const width = parseFloat(await image.getAttribute("width"));
    const clipPath = await image.getAttribute("clip-path");
    const planScale = Math.min(380 / 16, 270 / 20);
    const expectedWidth = 40 * planScale;

    console.log(`Image width attribute: ${width.toFixed(1)} (expected, uncropped: ${expectedWidth.toFixed(1)})`);
    console.log(`Full uncropped width is what's rendered (not shrunk to room bounds): ${Math.abs(width - expectedWidth) < 1}`);
    console.log(`clip-path attribute present (expect null/none): ${clipPath}`);

    await page.screenshot({ path: `${OUT_DIR}floorplan-no-clip.png` });
    console.log("\nDone. Screenshot at scripts/testing/screenshots/floorplan-no-clip.png");
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
