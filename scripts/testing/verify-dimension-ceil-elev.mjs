// Verifies: "provide option to add dimension on ceiling plan and elevation
// as well" — the Dimension tool (and the rest of the Annotate toolbar) now
// works on Ceiling Plan and Elevations too, not just Floor Plan. Each canvas
// keeps its own separate set of annotations (tagged internally by which
// canvas they were drawn on), so a dimension drawn on Ceiling Plan doesn't
// leak onto Floor Plan or vice versa.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-dimension-ceil-elev.mjs

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
      { uid: 9901, id: "ceiling-spk", name: "Ceiling Speaker", icon: "speaker", w: 0.5, h: 0.5, wall: "ceiling", type: "speaker", color: "#a855f7", x: 8, y: 6, z: 9 },
      { uid: 9902, id: "display-55", name: "North Display", icon: "monitor", w: 4.0, h: 2.26, wall: "front", type: "display", color: "#8b5cf6", x: 8, y: 0.05, z: 4.9, mountWall: "north" },
    ],
    config: {
      roomType: "medium", roomW: 16, roomL: 20, roomH: 9,
      tableShape: "rectangular", tableSeats: 8, tableWidth: 4, tableWallDist: 4,
      showTable: false, selectedWall: "north", placedDoors: [], annotations: [],
      elevationMarkers: [{ id: 1, x: 8, y: 11, label: "A", directions: ["n"] }],
    },
  };
  const { data: existing } = await admin.from("room_designs").select("id").eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).maybeSingle();
  if (existing) await admin.from("room_designs").update({ data: designData, updated_at: new Date().toISOString() }).eq("id", existing.id);
  else await admin.from("room_designs").insert({ project_id: fixture.projectId, room_id: fixture.roomId, user_id: fixture.userId, data: designData });
  console.log("Seeded a room with a ceiling speaker and a north elevation.");
}

async function drawDimension(page, canvasKey) {
  const canvas = page.locator(`[data-rd-canvas="${canvasKey}"]`).first();
  const box = await canvas.boundingBox();
  const p1 = { x: box.x + box.width * 0.3, y: box.y + box.height * 0.5 };
  const p2 = { x: box.x + box.width * 0.6, y: box.y + box.height * 0.5 };
  const p3 = { x: box.x + box.width * 0.6, y: box.y + box.height * 0.4 };
  await page.mouse.click(p1.x, p1.y);
  await page.waitForTimeout(150);
  await page.mouse.click(p2.x, p2.y);
  await page.waitForTimeout(150);
  await page.mouse.click(p3.x, p3.y);
  await page.waitForTimeout(300);
}

async function main() {
  await seed();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 2 });
  page.on("pageerror", err => console.log("PAGEERROR:", err.message));

  try {
    await page.goto(`${APP_URL}/login`);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    const rdUrl = `${APP_URL}/designEngineering/room-designer?project=${fixture.projectId}&room=${fixture.roomId}`;
    await page.goto(rdUrl);
    await page.waitForTimeout(1500);

    const dimBtn = page.locator('button[title*="Dimension" i]').first();
    await dimBtn.waitFor({ timeout: 10000 });

    // 1. Draw a dimension on Ceiling Plan.
    await dimBtn.click();
    await drawDimension(page, "ceil");
    const ceilDimCount = await page.locator('[data-rd-canvas="ceil"] text').filter({ hasText: /′/ }).count();
    console.log(`Dimension label rendered on Ceiling Plan: ${ceilDimCount > 0}`);

    // Re-arm the tool (it auto-stays active across dimensions, but be safe).
    if (!(await dimBtn.getAttribute("style"))?.includes("8b5cf6")) await dimBtn.click();

    // 2. Draw a dimension on Elevations.
    await page.locator("#rd-print-page-elev").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await drawDimension(page, "elev");
    const elevDimCount = await page.locator('[data-rd-canvas="elev"] text').filter({ hasText: /′/ }).count();
    console.log(`Dimension label rendered on Elevations: ${elevDimCount > 0}`);

    // 3. Floor Plan should NOT have picked up either of those (separate tags).
    const planDimCount = await page.locator('[data-rd-canvas="plan"] text').filter({ hasText: /′/ }).count();
    console.log(`Floor Plan dimension count (expect 0, canvases stay separate): ${planDimCount}`);

    await page.screenshot({ path: `${OUT_DIR}dimension-ceil-elev.png`, fullPage: true });
    console.log("\nDone. Screenshot at scripts/testing/screenshots/dimension-ceil-elev.png");
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
