// Verifies: "The BOM on the proposal is repeating equipment. I noticed it
// repeated equipment from the Rack builder. While those products were
// already captured once."
//
// Root cause: Rack Planner auto-mirrors any Signal Flow device flagged
// rack-mounted into its own `items` array (linked back via sourceDeviceId)
// purely so it can be positioned in a U-slot — it's the same physical unit.
// fetchRoomBomItems() in the proposal page counted it twice: once from
// Signal Flow's devices, once from Rack Planner's mirrored item.
//
// Seeds a Signal Flow device (rackMounted: true) AND a matching Rack Planner
// item with sourceDeviceId pointing at it (exactly what Rack Planner itself
// would have saved), plus one genuinely rack-only manual item, then confirms
// the proposal's re-synced BOM has ONE row for the mirrored device and one
// row for the manual-only rack item — not two rows for the mirrored device.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-proposal-no-dup-rack-items.mjs

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

async function upsertToolData(tool, data) {
  const { data: existing } = await admin.from("tool_data").select("id")
    .eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).eq("tool", tool).maybeSingle();
  if (existing) {
    await admin.from("tool_data").update({ data, updated_at: new Date().toISOString() }).eq("id", existing.id);
  } else {
    await admin.from("tool_data").insert({ project_id: fixture.projectId, room_id: fixture.roomId, tool, user_id: fixture.userId, data });
  }
}

async function seed() {
  await upsertToolData("signal-flow", {
    devices: [
      { id: "dsp-1", uid: 9401, name: "QSC DSP", mfr: "QSC", model: "Core 110f", part_number: "CORE110F", cat: "Audio", type: "DSP", price: 4200, rackMounted: true, rack_units: 2, x: 50, y: 50, w: 120, h: 60, ports: [] },
    ],
    connections: [],
  });
  await upsertToolData("rack-planner", {
    items: [
      // Mirrored from the Signal Flow device above — Rack Planner itself
      // would have written this exact shape (sourceDeviceId + rackMounted).
      { sourceDeviceId: "dsp-1", rackMounted: true, rackId: 1, rackStartRU: 10, ru: 2, name: "QSC Core 110f", color: "#f59e0b" },
      // A genuinely rack-only manual item with no Signal Flow counterpart.
      { manual: true, rackMounted: true, rackId: 1, rackStartRU: 5, ru: 1, name: "Blank Panel 1U", color: "#64748b" },
    ],
    rackRUCapacity: 42,
    rackCount: 1,
  });
  console.log("Seeded a rack-mounted Signal Flow DSP + its Rack Planner mirror + one manual rack-only item.");
}

async function clearProposal() {
  await admin.from("proposals").delete().eq("project_id", fixture.projectId);
  console.log("Cleared any existing proposal for this project.");
}

async function main() {
  await seed();
  await clearProposal();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });

  try {
    await page.goto(`${APP_URL}/login`);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    await page.goto(`${APP_URL}/projects/${fixture.projectId}/proposal`);
    await page.waitForTimeout(2500);

    await page.screenshot({ path: `${OUT_DIR}proposal-no-dup-rack-items.png` });

    const dspRows = page.locator("input[value='Core 110f']");
    const dspRowCount = await dspRows.count();
    const manualRows = page.locator("input[value='Blank Panel 1U']");
    const manualRowCount = await manualRows.count();

    console.log(`QSC Core 110f rows: ${dspRowCount} (expected 1, was 2 before the fix)`);
    console.log(`Manual rack-only item rows: ${manualRowCount} (expected 1)`);

    if (dspRowCount === 1 && manualRowCount === 1) {
      console.log("PASS: mirrored rack item no longer double-counted; manual rack-only item still captured.");
    } else {
      console.log("FAIL: unexpected row counts — see screenshot.");
    }
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
