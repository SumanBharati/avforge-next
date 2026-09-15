// Verifies the redesigned Elevation Marker: a standard architectural
// interior-elevation tag (black/white diamond + circle, one flag per
// compass direction) instead of the old drag-to-rotate arrow. Checks:
//   1. Placing one shows a diamond glyph with only the North flag active.
//   2. Right-clicking it opens a menu listing North/East/South/West.
//   3. Toggling East on adds a second tab ("A2") to the Elevations pane
//      without removing the first ("A1"), and the glyph now shows two
//      filled wedges, each with its own view number (1 for North, since it
//      was enabled first; 2 for East, enabled second).
//   4. The glyph is drawn in black/white, not the old cyan (#0ea5e9).
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-elevation-marker-diamond.mjs

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
      { uid: 9601, id: "display-55", name: "North Display", icon: "monitor", w: 4.0, h: 2.26, wall: "front", type: "display", color: "#8b5cf6", x: 8, y: 0.05, z: 4.9, mountWall: "north" },
      { uid: 9602, id: "soundbar", name: "East Speaker", icon: "speaker", w: 1.04, h: 1.67, wall: "front", type: "speaker", color: "#ef4444", x: 15.95, y: 10, z: 6.5, mountWall: "east" },
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
  console.log("Seeded a north-wall display + east-wall speaker, no elevation markers.");
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

    const elevBtn = page.locator('button[title*="elevation marker" i]');
    await elevBtn.click();
    const planSvg = page.locator('[data-rd-canvas="plan"] svg').first();
    const box = await planSvg.boundingBox();
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.55);
    await page.waitForTimeout(400);

    // 1. Diamond glyph present, drawn in black — no cyan left anywhere on the marker.
    const blackWedges = await planSvg.locator('polygon[fill="#000"]').count();
    const cyanAnything = await planSvg.locator('[fill="#0ea5e9"], [stroke="#0ea5e9"]').count();
    console.log(`Black filled wedges (expect 1, North only): ${blackWedges}`);
    console.log(`Any leftover cyan elements on the marker (expect 0): ${cyanAnything}`);

    await page.screenshot({ path: `${OUT_DIR}elev-diamond-north-only.png` });

    // 2 & 3. Right-click opens the menu; toggle East on.
    const markerGroup = planSvg.locator("g", { has: page.locator('circle[r="13"]') }).first();
    const gBox = await markerGroup.boundingBox();
    await page.mouse.click(gBox.x + gBox.width / 2, gBox.y + gBox.height / 2, { button: "right" });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT_DIR}elev-diamond-context-menu.png` });

    const menuHasAllFour = await page.locator("text=North").count() > 0
      && await page.locator("text=East").count() > 0
      && await page.locator("text=South").count() > 0
      && await page.locator("text=West").count() > 0;
    console.log(`Context menu lists all 4 directions: ${menuHasAllFour}`);

    await page.locator("button", { hasText: /^East$/ }).click();
    await page.waitForTimeout(200);
    // The menu deliberately stays open after a toggle (so several directions
    // can be checked in one right-click), so dismiss it explicitly now.
    await page.mouse.click(5, 5);
    await page.waitForTimeout(400);

    const blackWedgesAfter = await planSvg.locator('polygon[fill="#000"]').count();
    console.log(`Black filled wedges after enabling East (expect 2): ${blackWedgesAfter}`);

    // View numbers "1" and "2" should now be printed next to the North and
    // East tips respectively (order of activation, not a fixed compass slot).
    const markerNumbers = await markerGroup.locator("text").allTextContents();
    console.log(`Numbers/labels drawn on the marker glyph: ${JSON.stringify(markerNumbers)} (expect to include "A", "1", "2")`);

    await page.screenshot({ path: `${OUT_DIR}elev-diamond-north-and-east.png` });

    const elevPane = page.locator('#rd-print-page-elev');
    await elevPane.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const tabN = await elevPane.locator("button", { hasText: /^A1$/ }).count();
    const tabE = await elevPane.locator("button", { hasText: /^A2$/ }).count();
    console.log(`Elevations pane has both A1 (North, enabled first) and A2 (East, enabled second) tabs: A1=${tabN > 0}, A2=${tabE > 0}`);

    await elevPane.locator("button", { hasText: /^A2$/ }).click();
    await page.waitForTimeout(300);
    const eastSpeakerVisible = await elevPane.locator("svg text", { hasText: "East Speaker" }).count();
    console.log(`East Speaker visible in the A2 (East) elevation view: ${eastSpeakerVisible > 0}`);
    const paneTitle = await elevPane.locator("svg text").first().textContent();
    console.log(`Pane title: "${paneTitle}" (expect "Elevation A2 — East")`);

    await page.screenshot({ path: `${OUT_DIR}elev-diamond-pane-two-tabs.png` });

    console.log("\nDone. Screenshots written to scripts/testing/screenshots/elev-diamond-*.png");
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
