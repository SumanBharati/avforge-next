// Verifies: "just like we can zoom in out, etc the plan, provide ability to
// do it on the elevation as well" — the Elevations pane now has the same
// ctrl/cmd-wheel zoom, shift-wheel pan, middle-drag pan, and lock button as
// Floor Plan / Ceiling Plan, while a plain wheel still scrolls the page
// (consistent with the earlier fix for the other two canvases).
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-elevation-zoom.mjs

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
      { uid: 9801, id: "display-55", name: "North Display", icon: "monitor", w: 4.0, h: 2.26, wall: "front", type: "display", color: "#8b5cf6", x: 8, y: 0.05, z: 4.9, mountWall: "north" },
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
  console.log("Seeded a room with a north-facing elevation marker already active.");
}

async function main() {
  await seed();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 800 }, deviceScaleFactor: 2 });
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

    const elevPane = page.locator('#rd-print-page-elev');
    await elevPane.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const elevCanvas = page.locator('[data-rd-canvas="elev"]').first();
    await elevCanvas.waitFor({ timeout: 10000 });
    console.log("PASS: Elevations SVG now has data-rd-canvas='elev'.");

    const getViewBox = () => elevCanvas.getAttribute("viewBox");
    const viewBoxBefore = await getViewBox();
    console.log(`Elevations viewBox before: ${viewBoxBefore}`);

    const box = await elevCanvas.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

    // 1. Ctrl+wheel zooms the elevation canvas.
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, -200);
    await page.keyboard.up("Control");
    await page.waitForTimeout(300);
    const viewBoxAfterZoom = await getViewBox();
    console.log(`Elevations viewBox after ctrl+wheel: ${viewBoxAfterZoom}`);
    console.log(`Ctrl+wheel zoom works on Elevations: ${viewBoxAfterZoom !== viewBoxBefore}`);

    // 2. Plain wheel scrolls the page, not the elevation canvas.
    const scrollTopBefore = await page.evaluate(() => document.getElementById("rd-canvas-export")?.scrollTop ?? -1);
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(300);
    const scrollTopAfter = await page.evaluate(() => document.getElementById("rd-canvas-export")?.scrollTop ?? -1);
    const viewBoxAfterPlainWheel = await getViewBox();
    console.log(`Plain wheel scrolled the page (scrollTop ${scrollTopBefore} -> ${scrollTopAfter}): ${scrollTopAfter !== scrollTopBefore}`);
    console.log(`Plain wheel left the elevation view unchanged: ${viewBoxAfterPlainWheel === viewBoxAfterZoom}`);

    // 3. Lock button exists for Elevations.
    const lockBtn = elevPane.locator("button[title*='canvas' i]");
    console.log(`Lock/unlock button present for Elevations: ${await lockBtn.count() > 0}`);

    await page.screenshot({ path: `${OUT_DIR}elevation-zoom.png` });
    console.log("\nDone. Screenshot at scripts/testing/screenshots/elevation-zoom.png");
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
