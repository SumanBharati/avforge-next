// Verifies: "mouse roller should trigger the spanning of the whole page
// 'floor and ceiling plan and elevation' not individual views." — a plain
// mouse wheel over Floor Plan or Ceiling Plan used to always pan that one
// canvas's internal view (capturing the wheel entirely), making it
// impossible to just scroll down the page to see Elevations. Now a plain
// wheel scrolls the page; only ctrl/cmd-wheel (zoom) and shift-wheel
// (horizontal pan) still act on the individual canvas.
//
// Checks, scoped to the Floor Plan canvas (same code path covers Ceiling
// Plan too):
//   1. Plain wheel over Floor Plan scrolls the outer page container
//      (rd-canvas-export scrollTop increases) and leaves the canvas's own
//      pan/zoom state untouched.
//   2. Ctrl+wheel over Floor Plan still zooms that canvas (unchanged
//      behavior), and does NOT scroll the page.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-wheel-page-scroll.mjs

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
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function seed() {
  const designData = {
    devices: [],
    config: {
      roomType: "medium", roomW: 16, roomL: 20, roomH: 9,
      tableShape: "rectangular", tableSeats: 8, tableWidth: 4, tableWallDist: 4,
      showTable: false, selectedWall: "north", placedDoors: [], annotations: [],
    },
  };
  const { data: existing } = await admin.from("room_designs").select("id").eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).maybeSingle();
  if (existing) await admin.from("room_designs").update({ data: designData, updated_at: new Date().toISOString() }).eq("id", existing.id);
  else await admin.from("room_designs").insert({ project_id: fixture.projectId, room_id: fixture.roomId, user_id: fixture.userId, data: designData });
  console.log("Seeded an empty room.");
}

async function main() {
  await seed();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 700 }, deviceScaleFactor: 2 });
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

    const planCanvas = page.locator('[data-rd-canvas="plan"]').first();
    const box = await planCanvas.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

    const getScrollTop = () => page.evaluate(() => document.getElementById("rd-canvas-export")?.scrollTop ?? -1);
    const getPlanViewBox = () => page.locator('[data-rd-canvas="plan"] svg').first().getAttribute("viewBox");

    const scrollBefore = await getScrollTop();
    const viewBoxBefore = await getPlanViewBox();
    console.log(`Container scrollTop before: ${scrollBefore}`);
    console.log(`Floor Plan viewBox before: ${viewBoxBefore}`);

    // 1. Plain wheel — should scroll the page, not pan the canvas.
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(300);

    const scrollAfterPlain = await getScrollTop();
    const viewBoxAfterPlain = await getPlanViewBox();
    console.log(`\nAfter plain wheel — container scrollTop: ${scrollAfterPlain} (expect > ${scrollBefore})`);
    console.log(`Floor Plan viewBox unchanged (expect true): ${viewBoxAfterPlain === viewBoxBefore}`);
    console.log(`Page scrolled instead of panning the canvas: ${scrollAfterPlain > scrollBefore}`);

    // Scroll back up before testing ctrl+wheel, for a clean comparison.
    await page.evaluate(() => { const el = document.getElementById("rd-canvas-export"); if (el) el.scrollTop = 0; });
    await page.waitForTimeout(200);

    // 2. Ctrl+wheel — should still zoom the canvas, and NOT scroll the page.
    const scrollBeforeCtrl = await getScrollTop();
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, -200); // zoom in
    await page.keyboard.up("Control");
    await page.waitForTimeout(300);

    const scrollAfterCtrl = await getScrollTop();
    const viewBoxAfterCtrl = await getPlanViewBox();
    console.log(`\nAfter ctrl+wheel — container scrollTop: ${scrollAfterCtrl} (expect unchanged: ${scrollBeforeCtrl})`);
    console.log(`Floor Plan viewBox changed (zoom still works, expect true): ${viewBoxAfterCtrl !== viewBoxBefore}`);
    console.log(`Page did NOT scroll during ctrl+wheel: ${scrollAfterCtrl === scrollBeforeCtrl}`);

    console.log("\nDone.");
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
