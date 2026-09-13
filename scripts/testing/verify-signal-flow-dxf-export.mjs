// Verifies the fix for: "Fix DXF output, for example on the signal flow,
// currently the texts don't show as they look on the app. Also the location
// boundaries don't show."
//
// Root cause: exportDXF() in app/designEngineering/signal-flow/page.tsx only
// ever walked `devices` and `connections` — Location boundaries (`rooms`)
// and every annotation type (Text/Flag/Shape/Pencil/Highlight) were silently
// dropped from the export entirely, so a diagram full of notes and location
// outlines opened in AutoCAD with none of them. Centered/right-aligned Text
// annotations also needs a DXF horizontal-justification code (group 72) or
// they'd all render left-aligned instead of matching the app.
//
// Seeds a signal-flow tool_data row with one device, one rectangular
// Location, one centered Text annotation, and one Flag on the device's port,
// then triggers the real "Export DXF" button and inspects the downloaded
// file for the entities/labels/justification code that should now be there.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-signal-flow-dxf-export.mjs

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
  const payload = {
    devices: [
      {
        id: 1, x: 300, y: 220, w: 120, h: 99, mfr: "Generic", type: "Laptop", model: "—", color: "#8b5cf6",
        ports: [{ id: "1-p0", dir: "out", side: "right", label: "HDMI", signal: "hdmi" }],
      },
    ],
    connections: [],
    rooms: [
      { id: "r1", label: "Conference Room A", x: 40, y: 400, w: 300, h: 200, color: "#4b5563" },
    ],
    nextId: 2,
    annotations: [
      { id: "a1", type: "text", x: 500, y: 100, text: "DXF Text Test", size: 16, align: "center", color: "#374151" },
      { id: "a2", type: "flag", deviceId: 1, portId: "1-p0", text: "Flag Test Label" },
    ],
    annotNextId: 3,
  };
  const { data: existing } = await admin.from("tool_data").select("id").eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).eq("tool", "signal-flow").maybeSingle();
  if (existing) await admin.from("tool_data").update({ data: payload, updated_at: new Date().toISOString() }).eq("id", existing.id);
  else await admin.from("tool_data").insert({ project_id: fixture.projectId, room_id: fixture.roomId, user_id: fixture.userId, tool: "signal-flow", data: payload });
  console.log("Seeded a device, a Location boundary, a centered Text annotation, and a Flag.");
}

async function main() {
  await seed();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

  try {
    await page.goto(`${APP_URL}/login`);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    const sfUrl = `${APP_URL}/designEngineering/signal-flow?project=${fixture.projectId}&room=${fixture.roomId}`;
    await page.goto(sfUrl);
    await page.locator("svg text", { hasText: "Conference Room A" }).first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(500);

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 10000 }),
      page.locator('button[title="Export diagram as DXF (for AutoCAD)"]').click(),
    ]);
    const dxfPath = await download.path();
    const dxf = dxfPath ? readFileSync(dxfPath, "utf8") : "";
    console.log("Downloaded as:", download.suggestedFilename(), "-", dxf.length, "bytes");

    const lines = dxf.split("\n");
    const hasLine = (needle) => lines.some((l) => l.trim() === needle);
    const countLayer = (layer) => lines.filter((l) => l.trim() === layer).length;

    console.log("Has LOCATION layer for the room label:", hasLine("LOCATION_CONFERENCE_ROOM_A") ? "YES (fixed)" : "NO (FAIL)");
    console.log("Room label text present:", dxf.includes("Conference Room A") ? "YES (fixed)" : "NO (FAIL)");
    // A closed rectangle boundary is 4 LINE entities on that layer.
    console.log("Room boundary drawn as 4 lines:", countLayer("LOCATION_CONFERENCE_ROOM_A") >= 4 ? `YES (${countLayer("LOCATION_CONFERENCE_ROOM_A")} refs, fixed)` : "NO (FAIL)");

    console.log("Text annotation content present:", dxf.includes("DXF Text Test") ? "YES (fixed)" : "NO (FAIL)");
    // Centered text must carry a group-72 justification code (1 = center) —
    // otherwise it silently renders left-aligned instead of matching the app.
    const textEntityIdx = lines.findIndex((l) => l.trim() === "DXF Text Test");
    const surroundingHas72 = textEntityIdx >= 0 && lines.slice(Math.max(0, textEntityIdx - 8), textEntityIdx + 6).some((l) => l.trim() === "72");
    console.log("Centered text carries horizontal-justification code (group 72):", surroundingHas72 ? "YES (fixed)" : "NO (FAIL)");

    console.log("Flag label text present:", dxf.includes("Flag Test Label") ? "YES (fixed)" : "NO (FAIL)");
    console.log("FLAG layer present (leader line):", hasLine("FLAG") ? "YES (fixed)" : "NO (FAIL)");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
