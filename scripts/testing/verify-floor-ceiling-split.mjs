// Verifies: "Need to reduce the number of plan views... limit to Two plan
// views and they should be side by side splitting the space in the middle.
// With a slider in the middle using which any of the view can be expanded
// larger if needed. Call the views FLOOR PLAN and CEILING PLAN"
//
// Checks:
//   1. Only one combined row exists (no separate Ceiling Speakers/Ceiling
//      Microphones/Wall Speakers/Wall Microphones panes) — Elevations still
//      exists below, untouched, per explicit correction mid-session.
//   2. Floor Plan and Ceiling Plan render side by side (roughly 50/50 by
//      default) inside one shared row.
//   3. Dragging the divider resizes the split (Floor Plan gets wider).
//   4. Double-clicking the divider resets to 50/50.
//   5. A ceiling-mounted mic AND a ceiling-mounted speaker both show up in
//      the single Ceiling Plan (proving the merge of the two old panes).
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-floor-ceiling-split.mjs

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
      { uid: 9701, id: "ceiling-spk", name: "Ceiling Speaker A", icon: "🔊", w: 0.67, h: 0.67, wall: "ceiling", type: "speaker", color: "#ef4444", x: 5, y: 5, z: 8.5, mountWall: "ceiling", dispersion: 90 },
      { uid: 9702, id: "ceiling-mic", name: "Ceiling Mic A", icon: "🎙", w: 2, h: 2, wall: "ceiling", type: "mic", color: "#f59e0b", x: 11, y: 15, z: 8.5, mountWall: "ceiling" },
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
  console.log("Seeded a ceiling speaker + a ceiling mic (should both show in one merged Ceiling Plan).");
}

async function main() {
  await seed();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });

  try {
    await page.goto(`${APP_URL}/login`);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    const rdUrl = `${APP_URL}/designEngineering/room-designer?project=${fixture.projectId}&room=${fixture.roomId}`;
    await page.goto(rdUrl);
    await page.waitForTimeout(1800);

    // 1. Removed panes are gone; Elevations remains.
    const removedTitles = ["Ceiling Speakers", "Ceiling Microphones", "Wall Speakers", "Wall Microphones"];
    for (const t of removedTitles) {
      const count = await page.locator("div", { hasText: new RegExp(`^${t}$`) }).count();
      console.log(`"${t}" pane title present (expect false): ${count > 0}`);
    }
    const elevCount = await page.locator("#rd-print-title-elev").count();
    console.log(`Elevations section still present (expect true): ${elevCount > 0}`);

    // 2. Floor Plan / Ceiling Plan side by side.
    const floorLabel = page.locator("div", { hasText: /^Floor Plan$/ });
    const ceilLabel = page.locator("div", { hasText: /^Ceiling Plan$/ });
    console.log(`"Floor Plan" label present: ${await floorLabel.count() > 0}`);
    console.log(`"Ceiling Plan" label present: ${await ceilLabel.count() > 0}`);

    const planCanvas = page.locator('[data-rd-canvas="plan"]').first();
    const ceilCanvas = page.locator('[data-rd-canvas="ceil"]').first();
    const planBox = await planCanvas.boundingBox();
    const ceilBox = await ceilCanvas.boundingBox();
    console.log(`Floor Plan box: x=${planBox.x.toFixed(0)} w=${planBox.width.toFixed(0)}`);
    console.log(`Ceiling Plan box: x=${ceilBox.x.toFixed(0)} w=${ceilBox.width.toFixed(0)}`);
    console.log(`Side by side (ceil starts right of plan's end, roughly equal widths): ${ceilBox.x > planBox.x + planBox.width - 20 && Math.abs(planBox.width - ceilBox.width) < 40}`);

    await page.screenshot({ path: `${OUT_DIR}floor-ceiling-split-default.png` });

    // 3. Drag the divider to widen Floor Plan.
    const rowBox = await page.locator("#rd-print-page-plan").boundingBox();
    const dividerX = rowBox.x + rowBox.width * 0.5;
    const dividerY = rowBox.y + rowBox.height * 0.5;
    await page.mouse.move(dividerX, dividerY);
    await page.mouse.down();
    await page.mouse.move(rowBox.x + rowBox.width * 0.72, dividerY, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    const planBoxAfter = await planCanvas.boundingBox();
    console.log(`Floor Plan width after dragging divider right (expect wider than ${planBox.width.toFixed(0)}): ${planBoxAfter.width.toFixed(0)}`);
    await page.screenshot({ path: `${OUT_DIR}floor-ceiling-split-dragged.png` });

    // 4. Double-click resets to 50/50 — the divider itself moved after the
    // drag, so find its new position rather than reusing the pre-drag one.
    const newDividerX = planBoxAfter.x + planBoxAfter.width + 4;
    await page.mouse.dblclick(newDividerX, dividerY);
    await page.waitForTimeout(300);
    const planBoxReset = await planCanvas.boundingBox();
    const ceilBoxReset = await ceilCanvas.boundingBox();
    console.log(`After double-click reset — Floor Plan width: ${planBoxReset.width.toFixed(0)}, Ceiling Plan width: ${ceilBoxReset.width.toFixed(0)} (expect roughly equal)`);

    // 5. Both a ceiling speaker and ceiling mic show in the merged Ceiling Plan.
    const ceilSpeakerLabel = page.locator('[data-rd-canvas="ceil"] text', { hasText: "Ceiling Speaker A" });
    const ceilMicLabel = page.locator('[data-rd-canvas="ceil"] text', { hasText: "Ceiling Mic A" });
    console.log(`Ceiling Speaker visible in Ceiling Plan: ${await ceilSpeakerLabel.count() > 0}`);
    console.log(`Ceiling Mic visible in the SAME Ceiling Plan (proves the merge): ${await ceilMicLabel.count() > 0}`);

    await page.screenshot({ path: `${OUT_DIR}floor-ceiling-plan-merged-devices.png` });

    console.log("\nDone. Screenshots written to scripts/testing/screenshots/floor-ceiling-*.png");
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
