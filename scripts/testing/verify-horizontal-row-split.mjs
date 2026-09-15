// Verifies: "provide a horizontal slider as well to resize the plan and
// elevation as required. Just like we have the vertical slider to divide
// floor and ceiling plan" — a drag-to-resize divider between the
// Floor+Ceiling row and the Elevations row below it.
//
// Checks:
//   1. Default 50/50 split (both rows ~equal height).
//   2. Dragging the horizontal divider down makes the top row taller.
//   3. Double-clicking resets to 50/50.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-horizontal-row-split.mjs

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
    await page.waitForTimeout(1500);

    const topRow = page.locator("#rd-print-page-plan");
    const elevRow = page.locator("#rd-print-page-elev");
    await elevRow.scrollIntoViewIfNeeded();

    const topBoxBefore = await topRow.boundingBox();
    const elevBoxBefore = await elevRow.boundingBox();
    console.log(`Before drag — top row height: ${topBoxBefore.height.toFixed(0)}, elevations height: ${elevBoxBefore.height.toFixed(0)} (expect roughly equal)`);

    await page.screenshot({ path: `${OUT_DIR}row-split-before.png` });

    // The horizontal divider sits right at the boundary between the two rows.
    const dividerY = topBoxBefore.y + topBoxBefore.height + 4;
    const dividerX = topBoxBefore.x + topBoxBefore.width / 2;
    await page.mouse.move(dividerX, dividerY);
    await page.mouse.down();
    await page.mouse.move(dividerX, dividerY + 150, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    const topBoxAfter = await topRow.boundingBox();
    const elevBoxAfter = await elevRow.boundingBox();
    console.log(`After dragging divider down 150px — top row height: ${topBoxAfter.height.toFixed(0)} (expect > ${topBoxBefore.height.toFixed(0)}), elevations height: ${elevBoxAfter.height.toFixed(0)} (expect smaller)`);
    console.log(`Top row grew: ${topBoxAfter.height > topBoxBefore.height}`);
    console.log(`Elevations shrank: ${elevBoxAfter.height < elevBoxBefore.height}`);

    await page.screenshot({ path: `${OUT_DIR}row-split-dragged.png` });

    // Double-click resets to 50/50 — divider moved, so recompute its position.
    const newDividerY = topBoxAfter.y + topBoxAfter.height + 4;
    await page.mouse.dblclick(dividerX, newDividerY);
    await page.waitForTimeout(300);
    const topBoxReset = await topRow.boundingBox();
    const elevBoxReset = await elevRow.boundingBox();
    console.log(`After double-click reset — top row: ${topBoxReset.height.toFixed(0)}, elevations: ${elevBoxReset.height.toFixed(0)} (expect roughly equal again)`);

    console.log("\nDone. Screenshots at scripts/testing/screenshots/row-split-*.png");
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
