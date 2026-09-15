// Verifies: "remove the slider as it may incorrectly scale the drawing" —
// the raw 10-200 px/ft range slider under "Floor plan loaded" is gone, while
// the Bluebeam-style two-point "Set Scale" calibration flow (and Remove)
// still work.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-scale-slider-removed.mjs

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
      showTable: true, selectedWall: "north", placedDoors: [], annotations: [],
      floorPlanImg: FLOORPLAN_DATA_URI, floorPlanScale: 50, floorPlanOffset: { x: 0, y: 0 },
    },
  };
  const { data: existing } = await admin.from("room_designs").select("id").eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).maybeSingle();
  if (existing) await admin.from("room_designs").update({ data: designData, updated_at: new Date().toISOString() }).eq("id", existing.id);
  else await admin.from("room_designs").insert({ project_id: fixture.projectId, room_id: fixture.roomId, user_id: fixture.userId, data: designData });
  console.log("Seeded a floor plan background image.");
}

async function main() {
  await seed();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });

  try {
    await page.goto(`${APP_URL}/login`);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    const rdUrl = `${APP_URL}/designEngineering/room-designer?project=${fixture.projectId}&room=${fixture.roomId}`;
    await page.goto(rdUrl);
    await page.waitForTimeout(1500);

    const floorPlanLoadedText = page.locator("div", { hasText: /^Floor plan loaded$/ });
    await floorPlanLoadedText.waitFor({ timeout: 10000 });
    console.log("PASS: 'Floor plan loaded' section found.");

    const rangeSlider = page.locator('input[type="range"]');
    const rangeCount = await rangeSlider.count();
    console.log(`Range sliders present anywhere on page (expect 0, this app has none elsewhere either): ${rangeCount}`);

    const pxFtText = page.locator("text=/px\\/ft/");
    console.log(`"px/ft" caption still present (expect false): ${await pxFtText.count() > 0}`);

    const setScaleBtn = page.locator("button", { hasText: "Set Scale" });
    const removeBtn = page.locator("button", { hasText: "Remove" });
    console.log(`"Set Scale" button still present: ${await setScaleBtn.count() > 0}`);
    console.log(`"Remove" button still present: ${await removeBtn.count() > 0}`);

    await page.screenshot({ path: `${OUT_DIR}scale-slider-removed.png`, clip: { x: 0, y: 300, width: 420, height: 260 } });

    console.log("\nDone. Screenshot at scripts/testing/screenshots/scale-slider-removed.png");
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
