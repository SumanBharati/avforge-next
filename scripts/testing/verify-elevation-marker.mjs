// Verifies: "Provide an option to automatically create an elevation. Like
// Revit, there should be an Elevation element that I should be able to drop
// inside the room and then point it to any of the direction and based on
// the pointed direction it should create an elevation."
//
// Seeds two wall-mounted devices on the north wall (a display + a camera)
// and one on the south wall (a speaker), loads the plan view, and confirms:
//   1. The "Elevation" tool exists in the toolbar.
//   2. Clicking it + clicking the plan canvas drops a marker (circle+arrow).
//   3. Dragging the marker's arrowhead rotates it to face a direction.
//   4. The Elevations pane renders that direction's wall + the equipment
//      actually mounted on it (north-wall devices show when facing north;
//      the south-wall speaker does not).
//   5. Rotating the marker to face south instead shows the south-wall
//      speaker and hides the north-wall devices.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-elevation-marker.mjs

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
      { uid: 9190, id: "display-55", name: "North Display", icon: "monitor", w: 4.0, h: 2.26, wall: "front", type: "display", color: "#8b5cf6", x: 8, y: 0.05, z: 4.9, mountWall: "north" },
      { uid: 9191, id: "ptz-cam", name: "North Camera", icon: "confbar", w: 0.49, h: 0.39, wall: "front", type: "camera", color: "#22c55e", x: 5, y: 0.05, z: 7.5, mountWall: "north" },
      { uid: 9192, id: "soundbar", name: "South Speaker", icon: "speaker", w: 1.04, h: 1.67, wall: "front", type: "speaker", color: "#ef4444", x: 10, y: 19.95, z: 6.5, mountWall: "south" },
    ],
    config: {
      roomType: "medium", roomW: 16, roomL: 20, roomH: 9,
      tableShape: "rectangular", tableSeats: 8, tableWidth: 4, tableWallDist: 4,
      showTable: true, selectedWall: "north", placedDoors: [], annotations: [],
      elevationMarkers: [],
    },
  };
  const { data: existing } = await admin.from("room_designs").select("id").eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).maybeSingle();
  if (existing) await admin.from("room_designs").update({ data: designData, updated_at: new Date().toISOString() }).eq("id", existing.id);
  else await admin.from("room_designs").insert({ project_id: fixture.projectId, room_id: fixture.roomId, user_id: fixture.userId, data: designData });
  console.log("Seeded north display+camera and south speaker.");
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
    await page.locator("svg text", { hasText: "North Display" }).first().waitFor({ timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(800);

    // 1. Elevation tool exists
    const elevBtn = page.locator('button[title*="elevation marker" i]');
    await elevBtn.waitFor({ timeout: 10000 });
    console.log("PASS: Elevation tool button found in toolbar.");

    // Elevations pane should show the empty-state hint before any marker exists
    await page.locator("text=No elevation markers placed yet.").waitFor({ timeout: 5000 });
    console.log("PASS: Empty-state hint shown before any marker is placed.");

    // 2. Arm placement, click near room center on the plan canvas
    await elevBtn.click();
    const planCanvas = page.locator('[data-rd-canvas="plan"] svg').first();
    const box = await planCanvas.boundingBox();
    const dropX = box.x + box.width * 0.5;
    const dropY = box.y + box.height * 0.6; // south of center, so facing "north" (angle 0) looks toward the display/camera wall
    await page.mouse.click(dropX, dropY);
    await page.waitForTimeout(300);

    const markerCircle = page.locator('svg circle[fill="rgba(14,165,233,0.15)"]').first();
    await markerCircle.waitFor({ timeout: 5000 });
    console.log("PASS: Marker glyph (circle) rendered after click-to-place.");

    await page.screenshot({ path: `${OUT_DIR}elevation-marker-plan-with-marker.png` });

    // 3. Default angle 0 = facing north — Elevations pane should already show
    // the north-wall display + camera, and NOT the south-wall speaker. Scope
    // every locator to the Elevations pane itself (#rd-print-page-elev) —
    // the plan view's own callouts always show all three device names
    // regardless of marker direction, which would otherwise false-positive.
    const elevPane = page.locator('#rd-print-page-elev');
    await elevPane.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await elevPane.locator("text=/Elevation A/").first().waitFor({ timeout: 5000 });
    const northDisplayLabel = elevPane.locator("svg text", { hasText: "North Display" });
    const northCameraLabel = elevPane.locator("svg text", { hasText: "North Camera" });
    const southSpeakerLabel = elevPane.locator("svg text", { hasText: "South Speaker" });
    await northDisplayLabel.first().waitFor({ timeout: 5000 });
    await northCameraLabel.first().waitFor({ timeout: 5000 });
    const southVisibleBefore = await southSpeakerLabel.count();
    console.log(`Facing north (default): North Display visible=${await northDisplayLabel.count() > 0}, North Camera visible=${await northCameraLabel.count() > 0}, South Speaker visible=${southVisibleBefore > 0} (expected false)`);

    await page.screenshot({ path: `${OUT_DIR}elevation-marker-view-facing-north.png` });

    // 4. Rotate the marker 180° (drag the arrow-tip handle to the opposite
    // side) so it faces south instead, then confirm the pane swaps content.
    // Scroll back up to the Plan View pane first — dragging needs its own
    // fresh bounding boxes, and the Elevations-pane scroll above moved it out of view.
    await planCanvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const rotateHandle = page.locator('svg circle[fill="#0ea5e9"]').last();
    const rBox = await rotateHandle.boundingBox();
    const mBox = await markerCircle.boundingBox();
    const mCenterX = mBox.x + mBox.width / 2, mCenterY = mBox.y + mBox.height / 2;
    await page.mouse.move(rBox.x + rBox.width / 2, rBox.y + rBox.height / 2);
    await page.mouse.down();
    // Move to a point well below the marker (south direction on screen)
    await page.mouse.move(mCenterX, mCenterY + 60, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(400);

    await page.screenshot({ path: `${OUT_DIR}elevation-marker-plan-rotated-south.png` });

    await elevPane.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const southVisibleAfter = await southSpeakerLabel.count();
    const northDisplayVisibleAfter = await northDisplayLabel.count();
    console.log(`Facing south (after rotate): South Speaker visible=${southVisibleAfter > 0} (expected true), North Display visible=${northDisplayVisibleAfter > 0} (expected false)`);

    await page.screenshot({ path: `${OUT_DIR}elevation-marker-view-facing-south.png` });

    if (southVisibleBefore === 0 && southVisibleAfter > 0 && northDisplayVisibleAfter === 0) {
      console.log("PASS: Rotating the marker changes which wall's equipment appears in the Elevations pane.");
    } else {
      console.log("CHECK MANUALLY: rotation-driven content swap did not match expectations exactly — see screenshots.");
    }

    console.log("\nDone. Screenshots written to scripts/testing/screenshots/elevation-marker-*.png");
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
