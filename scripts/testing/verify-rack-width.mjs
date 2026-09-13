// Verifies: "Rack elevation needs to populate better. If the equipment is
// half rack width, or quarter rack width or any other custom width it
// should fill it up based on the actual size, currently it looks like it
// takes up the whole width."
//
// Root cause: RackItem had no width concept at all — every faceplate was
// hardcoded to flex:1 (the full rail-to-rail bay), regardless of the
// equipment's real physical width. Fixed via a new widthIn field (inches,
// from the equipment library's own width_in, editable manually) and
// rackWidthFraction() = widthIn / RACK_USABLE_WIDTH_IN (17.75", the actual
// EIA-310 usable front-panel width), used to size the visible colored
// faceplate as a fraction of the bay instead of always 100%.
//
// Seeds three manual 1U rack items — full width (no widthIn, the common
// case), half-rack (8.5"), and quarter-rack (4.25") — and confirms their
// rendered faceplate widths are proportionally different, in the expected
// order, and that the DXF export reflects the same narrowing.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-rack-width.mjs

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
  const payload = {
    items: [
      { manual: true, name: "Full Width Amp", ru: 1, color: "#3b82f6", rackMounted: true, rackId: 1, rackStartRU: 3, widthIn: null },
      { manual: true, name: "Half Rack DSP", ru: 1, color: "#8b5cf6", rackMounted: true, rackId: 1, rackStartRU: 2, widthIn: 8.5 },
      { manual: true, name: "Quarter Rack Relay", ru: 1, color: "#22c55e", rackMounted: true, rackId: 1, rackStartRU: 1, widthIn: 4.25 },
    ],
    rackRUCapacity: 6,
  };
  const { data: existing } = await admin.from("tool_data").select("id").eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).eq("tool", "rack-planner").maybeSingle();
  if (existing) await admin.from("tool_data").update({ data: payload, updated_at: new Date().toISOString() }).eq("id", existing.id);
  else await admin.from("tool_data").insert({ project_id: fixture.projectId, room_id: fixture.roomId, user_id: fixture.userId, tool: "rack-planner", data: payload });
  // rack-planner also cross-references signal-flow's tool_data on load —
  // clear it so no rack-mounted signal-flow devices interfere with this
  // test's three purely-manual items.
  await admin.from("tool_data").delete().eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).eq("tool", "signal-flow");
  console.log("Seeded full/half/quarter-rack-width manual items.");
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

    const rpUrl = `${APP_URL}/designEngineering/rack-planner?project=${fixture.projectId}&room=${fixture.roomId}`;
    await page.goto(rpUrl);
    await page.locator("text=Full Width Amp").waitFor({ timeout: 20000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT_DIR}rack-width-elevation.png` });

    const widths = await page.evaluate(() => {
      const names = ["Full Width Amp", "Half Rack DSP", "Quarter Rack Relay"];
      return names.map(name => {
        const label = [...document.querySelectorAll("div")].find(d => d.textContent === name && d.children.length === 0);
        // The faceplate is the label's grandparent (label -> flex text wrapper -> faceplate).
        const faceplate = label?.parentElement?.parentElement;
        const bay = faceplate?.parentElement; // the flex:1 slot spanning the full bay
        if (!faceplate || !bay) return null;
        return { faceplateWidth: faceplate.getBoundingClientRect().width, bayWidth: bay.getBoundingClientRect().width };
      });
    });
    console.log("Measured widths:", JSON.stringify(widths, null, 2));

    const [full, half, quarter] = widths;
    const fullOk = full && Math.abs(full.faceplateWidth - full.bayWidth) < 1.5;
    console.log("Full-width item's faceplate fills the whole bay:", fullOk ? "YES (correct)" : "NO (FAIL)");

    const halfRatio = half ? half.faceplateWidth / half.bayWidth : null;
    const quarterRatio = quarter ? quarter.faceplateWidth / quarter.bayWidth : null;
    console.log(`Half-rack item's faceplate ratio (expect ~${(8.5/17.75).toFixed(2)}):`, halfRatio?.toFixed(3));
    console.log(`Quarter-rack item's faceplate ratio (expect ~${(4.25/17.75).toFixed(2)}):`, quarterRatio?.toFixed(3));
    const halfOk = halfRatio !== null && Math.abs(halfRatio - 8.5/17.75) < 0.03;
    const quarterOk = quarterRatio !== null && Math.abs(quarterRatio - 4.25/17.75) < 0.03;
    console.log("Half-rack faceplate is proportionally narrower:", halfOk ? "YES (fixed)" : "NO (FAIL)");
    console.log("Quarter-rack faceplate is proportionally narrower still:", quarterOk ? "YES (fixed)" : "NO (FAIL)");
    console.log("Widths are strictly ordered full > half > quarter:", (full?.faceplateWidth > half?.faceplateWidth && half?.faceplateWidth > quarter?.faceplateWidth) ? "YES (correct)" : "NO (FAIL)");

    // --- DXF export reflects the same narrowing ---
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 10000 }),
      page.locator('button[title="Export rack elevation as DXF (for AutoCAD)"]').click(),
    ]);
    const dxfPath = await download.path();
    const dxf = dxfPath ? readFileSync(dxfPath, "utf8") : "";
    // Each EQUIPMENT rect's first LINE entity is its bottom edge — group
    // code 10/20 (x1,y1) followed by 11/21 (x2,y2) — immediately preceding
    // the item's own name, on the very next LINE block after the previous
    // entity. Match that exact shape directly rather than guessing from
    // nearby line offsets.
    const widthBeforeText = (name) => {
      const textPos = dxf.indexOf(`\n1\n${name}\n`);
      if (textPos < 0) return null;
      const before = dxf.slice(0, textPos);
      const lineRe = /0\nLINE\n8\nEQUIPMENT\n10\n([\d.]+)\n20\n([\d.]+)\n30\n0\n11\n([\d.]+)\n21\n([\d.]+)\n/g;
      let match, lastHorizontal = null;
      while ((match = lineRe.exec(before))) {
        const [, x1, y1, , y2] = match;
        if (y1 === y2) lastHorizontal = match; // the rect's top/bottom edge, not its vertical sides
      }
      if (!lastHorizontal) return null;
      return Math.abs(parseFloat(lastHorizontal[3]) - parseFloat(lastHorizontal[1]));
    };
    const dxfFullW = widthBeforeText("Full Width Amp");
    const dxfHalfW = widthBeforeText("Half Rack DSP");
    const dxfQuarterW = widthBeforeText("Quarter Rack Relay");
    console.log("DXF widths (in):", { dxfFullW, dxfHalfW, dxfQuarterW });
    console.log("DXF export also narrows half/quarter-rack items:", (dxfFullW > dxfHalfW && dxfHalfW > dxfQuarterW) ? "YES (fixed)" : "NO (FAIL)");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
