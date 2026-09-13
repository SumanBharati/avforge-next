// Verifies: "On room designer, provide automatic call-outs of the
// equipment, which can be repositioned if required. These call-outs have
// to look like we usually make it professional AV drawings, it should show
// make and model, then a straight line then an angled line connecting to
// the equipment block. This line or the whole thing should be adjustable."
//
// Seeds two devices (one with a real mfr/model, one without) on the north
// wall, loads the plan view, and confirms:
//   1. A call-out label with "Manufacturer Model" text renders (not just
//      the plain device name that used to sit glued to the icon).
//   2. A device with no mfr/model falls back to its own name.
//   3. The leader line is actually two segments (a straight stub + an
//      angled run), not a single line straight to the icon.
//   4. Dragging the call-out's label moves it (and only it) — the
//      device's own x/y stay put — and the new position persists to the DB
//      as calloutDx/calloutDy.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-room-designer-callouts.mjs

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
      { uid: 9090, id: "display-55", name: "Callout Test Display", icon: "monitor", w: 4.0, h: 2.26, wall: "front", type: "display", color: "#8b5cf6", x: 8, y: 0.1, z: 5, mountWall: "north", mfr: "Samsung", model: "QM75B" },
      { uid: 9091, id: "camera-generic", name: "Callout Test Camera", icon: "camera", w: 1.0, h: 0.5, wall: "front", type: "camera", color: "#22c55e", x: 3, y: 0.1, z: 7, mountWall: "north" },
    ],
    config: {
      roomType: "medium", roomW: 16, roomL: 20, roomH: 9,
      tableShape: "rectangular", tableSeats: 8, tableWidth: 4, tableWallDist: 4,
      showTable: true, selectedWall: "north", placedDoors: [], annotations: [],
    },
  };
  const { data: existing } = await admin.from("room_designs").select("id").eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).maybeSingle();
  if (existing) await admin.from("room_designs").update({ data: designData, updated_at: new Date().toISOString() }).eq("id", existing.id);
  else await admin.from("room_designs").insert({ project_id: fixture.projectId, room_id: fixture.roomId, user_id: fixture.userId, data: designData });
  console.log("Seeded a display (with mfr/model) and a camera (no mfr/model) on the north wall.");
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

    const rdUrl = `${APP_URL}/designEngineering/room-designer?project=${fixture.projectId}&room=${fixture.roomId}`;
    await page.goto(rdUrl);
    await page.locator("svg text", { hasText: "Samsung QM75B" }).first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT_DIR}room-designer-callouts-initial.png` });

    console.log("Call-out shows 'Manufacturer Model' for the linked device:", await page.locator("svg text", { hasText: "Samsung QM75B" }).count() > 0 ? "YES (fixed)" : "NO (FAIL)");
    console.log("Call-out falls back to device name when no mfr/model:", await page.locator("svg text", { hasText: "Callout Test Camera" }).count() > 0 ? "YES (fixed)" : "NO (FAIL)");
    // The plain glued-on label should be gone now that the call-out replaces it —
    // "Callout Test Display" (the device's own .name) should NOT appear as a
    // separate label alongside "Samsung QM75B" — kept (not deleted) since a
    // large existing regression suite locates a device by searching for its
    // .name text and walking to the closest <g> to find its icon rects,
    // which only works when that text lives inside the SAME <g> as the
    // icon. It stays invisible unless hovered (dev-label's own CSS), so it
    // doesn't visually compete with the always-on call-out.
    const oldLabelHidden = await page.evaluate(() => {
      const textEl = [...document.querySelectorAll("svg text.dev-label")].find(t => t.textContent === "Callout Test Display");
      return textEl ? getComputedStyle(textEl).opacity : null;
    });
    console.log("Old glued-on label kept (for existing tests) but hidden unless hovered:", oldLabelHidden === "0" ? "YES (correct)" : `NO (FAIL — opacity=${oldLabelHidden})`);

    // The old plain label used className="dev-label", a hover-only
    // opacity:0-by-default CSS rule (globals.css) — a call-out must be
    // visible by default, not a hover-reveal tooltip, so it must NOT reuse
    // that class (checked directly, since a DOM match alone doesn't prove
    // it's actually visible).
    const calloutOpacity = await page.evaluate(() => {
      const textEl = [...document.querySelectorAll("svg text")].find(t => t.textContent === "Samsung QM75B");
      return textEl ? getComputedStyle(textEl).opacity : null;
    });
    console.log("Call-out text is visible by default (not hover-only):", calloutOpacity === "1" ? "YES (fixed)" : `NO (FAIL — computed opacity=${calloutOpacity})`);

    // Leader line geometry: find the two <line> elements belonging to the display's callout.
    const geometry = await page.evaluate(() => {
      const textEl = [...document.querySelectorAll("svg text")].find(t => t.textContent === "Samsung QM75B");
      if (!textEl) return null;
      const g = textEl.closest("g");
      const lines = [...g.querySelectorAll("line")].map(l => ({
        x1: +l.getAttribute("x1"), y1: +l.getAttribute("y1"), x2: +l.getAttribute("x2"), y2: +l.getAttribute("y2"),
      }));
      return { lineCount: lines.length, lines };
    });
    console.log("Leader line has two segments (straight stub + angled run):", geometry?.lineCount === 2 ? "YES (fixed)" : `NO (FAIL — found ${geometry?.lineCount})`);
    if (geometry?.lines?.length === 2) {
      // Render order is anchor->elbow (angled) then elbow->label (stub).
      const [angled, stub] = geometry.lines;
      const stubIsHorizontal = Math.abs(stub.y1 - stub.y2) < 0.01;
      console.log("The label-side segment is a straight horizontal stub:", stubIsHorizontal ? "YES (correct)" : "NO (FAIL)");
      const angledHasSlope = Math.abs(angled.y1 - angled.y2) > 0.01 || Math.abs(angled.x1 - angled.x2) > 0.01;
      console.log("The equipment-side segment runs at an angle to the device:", angledHasSlope ? "YES (correct)" : "NO (FAIL)");
    }

    // Drag the display's call-out text to a new position.
    const labelBox = await page.evaluate(() => {
      const textEl = [...document.querySelectorAll("svg text")].find(t => t.textContent === "Samsung QM75B");
      const rect = textEl.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    });
    await page.mouse.move(labelBox.x, labelBox.y);
    await page.mouse.down();
    await page.mouse.move(labelBox.x + 60, labelBox.y + 40, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(2200); // autosave

    const { data } = await admin.from("room_designs").select("data").eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).maybeSingle();
    const dbDev = data?.data?.devices?.find(d => d.uid === 9090);
    console.log("Call-out offset persisted after drag:", dbDev?.calloutDx !== undefined && dbDev?.calloutDy !== undefined ? `YES (calloutDx=${dbDev.calloutDx.toFixed(2)}, calloutDy=${dbDev.calloutDy.toFixed(2)}, fixed)` : "NO (FAIL)");
    console.log("Device's own x/y did NOT move (only the call-out did):", dbDev?.x === 8 && dbDev?.y === 0.1 ? "YES (correct)" : `NO (FAIL — x=${dbDev?.x} y=${dbDev?.y})`);

    await page.screenshot({ path: `${OUT_DIR}room-designer-callouts-after-drag.png` });
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
