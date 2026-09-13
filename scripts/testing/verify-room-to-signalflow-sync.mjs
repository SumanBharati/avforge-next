// Verifies the fix for: "I added a 43in display in Room Designer, and it
// showed up in the BOM ... but on Signal Flow Builder it was showing up in
// the BOM only — it should automatically show the block on the canvas."
//
// Seeds a room_designs row with one display device (bypassing the Room
// Designer UI itself, which needs real catalog interaction), clears out any
// existing signal-flow tool-data for the same room so the sync effect has
// something new to import, then loads Signal Flow Builder and checks that a
// device block for "43in Display" actually renders on the canvas (not just
// in the BOM panel).
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-room-to-signalflow-sync.mjs

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

if (!EMAIL || !PASSWORD) {
  console.error("Missing PLAYWRIGHT_TEST_EMAIL/PASSWORD — run with node --env-file=.env.local");
  process.exit(1);
}

const OUT_DIR = fileURLToPath(new URL("./screenshots/", import.meta.url));
const DISPLAY_NAME = '43in Display';

async function seed() {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

  const designData = {
    devices: [
      { uid: 42, id: "display-43", name: DISPLAY_NAME, icon: "monitor", w: 3.12, h: 1.77, wall: "front", type: "display", color: "#8b5cf6", x: 8, y: 0.1, z: 5, mountWall: "north" },
    ],
    config: {
      roomType: "medium", roomW: 16, roomL: 20, roomH: 9,
      tableShape: "rectangular", tableSeats: 8, tableWidth: 4, tableWallDist: 4,
      showTable: true, selectedWall: "north", placedDoors: [], annotations: [],
    },
  };
  const { data: existing } = await admin.from("room_designs").select("id").eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).maybeSingle();
  if (existing) {
    await admin.from("room_designs").update({ data: designData, updated_at: new Date().toISOString() }).eq("id", existing.id);
  } else {
    await admin.from("room_designs").insert({ project_id: fixture.projectId, room_id: fixture.roomId, user_id: fixture.userId, data: designData });
  }
  console.log("Seeded room_designs with one display device (not yet synced to signal-flow)");

  // Clear any existing signal-flow tool-data for this room so the sync effect
  // has a clean slate to import into (a prior test run may have already
  // synced it, which would make this run a false negative for "does it sync").
  const { error: delErr } = await admin.from("tool_data")
    .delete()
    .eq("project_id", fixture.projectId)
    .eq("room_id", fixture.roomId)
    .eq("tool", "signal-flow");
  if (delErr) console.log("(no prior signal-flow tool_data to clear, or delete failed harmlessly:", delErr.message, ")");
  else console.log("Cleared prior signal-flow tool_data for this room");
}

async function main() {
  await seed();

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const consoleErrors = [];
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  try {
    await page.goto(`${APP_URL}/login`);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    const sfUrl = `${APP_URL}/designEngineering/signal-flow?project=${fixture.projectId}&room=${fixture.roomId}`;
    await page.goto(sfUrl);

    // Give the load effect + the async room_designs fetch + the sync effect
    // time to run (network round trip, not just a render tick).
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${OUT_DIR}rd-to-sf-sync-after.png`, fullPage: false });

    const blockText = await page.locator("svg text", { hasText: DISPLAY_NAME }).count();
    console.log(`Signal Flow canvas block for "${DISPLAY_NAME}" found:`, blockText > 0 ? "YES (synced correctly)" : "NO (bug still present)");

    const noticeText = await page.locator("text=/imported \\d+ device/i").count();
    console.log("Import confirmation toast shown:", noticeText > 0);

    if (consoleErrors.length) {
      console.warn("Console errors observed during the run:");
      consoleErrors.forEach((e) => console.warn(" -", e));
    } else {
      console.log("No console errors observed.");
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
