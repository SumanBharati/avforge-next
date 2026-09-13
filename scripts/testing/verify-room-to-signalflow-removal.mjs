// Verifies the follow-up fix to the Room Designer <-> Signal Flow sync:
// after a device syncs into Signal Flow as a block, deleting it in Room
// Designer must also remove the mirrored block (and its BOM line) — not
// leave a phantom "Generic 43in Display" sitting in the Bill of Materials
// forever, which is what the user's screenshot showed.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-room-to-signalflow-removal.mjs

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
const DISPLAY_NAME = "43in Display";
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function setRoomDevices(devices) {
  const designData = {
    devices,
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
}

async function clearSignalFlow() {
  await admin.from("tool_data").delete().eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).eq("tool", "signal-flow");
}

async function main() {
  await clearSignalFlow();
  await setRoomDevices([
    { uid: 42, id: "display-43", name: DISPLAY_NAME, icon: "monitor", w: 3.12, h: 1.77, wall: "front", type: "display", color: "#8b5cf6", x: 8, y: 0.1, z: 5, mountWall: "north" },
  ]);
  console.log("Step 1: seeded Room Designer with one display device.");

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

  try {
    await page.goto(`${APP_URL}/login`);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    // Step 2: load Signal Flow once so the device syncs in as a block.
    const sfUrl = `${APP_URL}/designEngineering/signal-flow?project=${fixture.projectId}&room=${fixture.roomId}`;
    await page.goto(sfUrl);
    await page.waitForTimeout(3000);
    const afterSync = await page.locator("svg text", { hasText: DISPLAY_NAME }).count();
    console.log("Step 2: block present in Signal Flow after first sync:", afterSync > 0);

    // Step 3: delete the device in Room Designer (simulated at the data layer,
    // same end-state as using the now-fixed delete button/key in the UI).
    await setRoomDevices([]);
    console.log("Step 3: deleted the device from Room Designer's room_designs row.");

    // Step 4: reload Signal Flow — the phantom block/BOM line should be gone.
    await page.goto(sfUrl);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${OUT_DIR}rd-to-sf-removal-after.png` });
    const afterRemoval = await page.locator("svg text", { hasText: DISPLAY_NAME }).count();
    console.log(`Step 4: block still present after source deletion: ${afterRemoval > 0 ? "YES (bug still present)" : "NO (correctly removed)"}`);

    const bomQtyText = await page.locator("text=/Bill of Materials/").count();
    console.log("BOM panel found on page:", bomQtyText > 0);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
