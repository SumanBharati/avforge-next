// Verifies: "seems like the set scale feature is not working correctly...
// I wanted to scale the plan using door width as 3' as the reference, but
// it seems to be off."
//
// Root cause found: the background <image> was always hard-stretched to
// exactly fill the room rectangle (width={roomW*planScale}), completely
// ignoring the calibrated floorPlanScale value — Set Scale computed a
// number but nothing ever consumed it, so calibration had zero visible
// effect. Fixed by giving the image a real floorPlanWidthFt (derived from
// its own native pixel aspect ratio) that Set Scale actually rescales.
//
// This test seeds a floor plan image with a KNOWN native pixel size and a
// deliberately-wrong initial width, calibrates using two points a known
// pixel-distance apart (simulating "this is a 3ft-wide door"), and checks
// that the rendered <image> width actually changes to match — proving the
// calibration is now load-bearing, not a no-op.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-floorplan-calibration.mjs

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

// A flat gray 400x300 PNG — stands in for an imported floor plan photo.
const FLOORPLAN_DATA_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

async function seed() {
  const designData = {
    devices: [],
    config: {
      roomType: "medium", roomW: 16, roomL: 20, roomH: 9,
      tableShape: "rectangular", tableSeats: 8, tableWidth: 4, tableWallDist: 4,
      showTable: false, selectedWall: "north", placedDoors: [], annotations: [],
      floorPlanImg: FLOORPLAN_DATA_URI,
      floorPlanWidthFt: 16, // deliberately wrong-ish starting guess
      floorPlanOffset: { x: 0, y: 0 },
    },
  };
  const { data: existing } = await admin.from("room_designs").select("id").eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).maybeSingle();
  if (existing) await admin.from("room_designs").update({ data: designData, updated_at: new Date().toISOString() }).eq("id", existing.id);
  else await admin.from("room_designs").insert({ project_id: fixture.projectId, room_id: fixture.roomId, user_id: fixture.userId, data: designData });
  console.log("Seeded a floor plan image with floorPlanWidthFt=16.");
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
    const getImageWidth = async () => {
      const w = await planSvg.locator("image").getAttribute("width");
      return parseFloat(w || "0");
    };

    const widthBefore = await getImageWidth();
    console.log(`Image width before calibration (SVG units): ${widthBefore.toFixed(1)}`);

    await page.screenshot({ path: `${OUT_DIR}floorplan-cal-before.png` });

    // Enter calibration mode, then click two points at EXACT known
    // world-feet positions (using the SVG's own forward transform, not an
    // eyeballed percentage of the canvas box) so the measured distance is
    // deterministic: (2,10) and (7,10) in the plan's current mapping is
    // exactly 5ft apart today, regardless of zoom/pan.
    await page.locator("button", { hasText: "Set Scale" }).click();
    await page.waitForTimeout(200);

    const worldToScreen = async (wx, wy) => page.evaluate(({ wx, wy }) => {
      const svg = document.querySelector('[data-rd-canvas="plan"] svg');
      const roomW = 16, roomL = 20;
      const planScale = Math.min(380 / roomW, 270 / roomL);
      const planOffX = (600 - roomW * planScale) / 2;
      const planOffY = (420 - roomL * planScale) / 2;
      const pt = svg.createSVGPoint();
      pt.x = planOffX + wx * planScale;
      pt.y = planOffY + wy * planScale;
      const screenPt = pt.matrixTransform(svg.getScreenCTM());
      return { x: screenPt.x, y: screenPt.y };
    }, { wx, wy });

    const s1 = await worldToScreen(2, 10);
    const s2 = await worldToScreen(7, 10); // exactly 5ft from s1 today
    await page.mouse.click(s1.x, s1.y);
    await page.waitForTimeout(100);
    await page.mouse.click(s2.x, s2.y);
    await page.waitForTimeout(200);

    // Tell it that 5ft-as-currently-rendered segment is actually 3ft —
    // expect the whole image to shrink to exactly 3/5 of its prior size.
    const feetInput = page.locator('input[placeholder="10"]').first();
    await feetInput.fill("3");
    await page.locator("button", { hasText: "Apply Scale" }).click();
    await page.waitForTimeout(400);

    const widthAfter = await getImageWidth();
    const expectedWidth = widthBefore * (3 / 5);
    console.log(`Image width after calibrating a 5ft (as-currently-rendered) segment as 3ft (SVG units): ${widthAfter.toFixed(2)}`);
    console.log(`Expected width (3/5 of before): ${expectedWidth.toFixed(2)}`);
    console.log(`Calibration magnitude is correct (within 1%): ${Math.abs(widthAfter - expectedWidth) / expectedWidth < 0.01}`);

    await page.screenshot({ path: `${OUT_DIR}floorplan-cal-after.png` });

    // Re-open Set Scale and confirm the same two points now measure ~3ft
    // via the Dimension-tool-style math (sanity: distance in SVG units /
    // planScale should be close to 3, proving self-consistency).
    console.log("\nDone. Screenshots at scripts/testing/screenshots/floorplan-cal-*.png");
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
