// Verifies: "pressing shift should do straight dimensions" — holding Shift
// while placing the second point of a Dimension snaps it to horizontal/
// vertical/45° from the first point, same convention as the existing
// line/arrow shape tools.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-dimension-shift-snap.mjs

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
  console.log("Seeded an empty room, no annotations.");
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

    await page.locator('button[title*="Dimension" i]').click();
    const planSvg = page.locator('[data-rd-canvas="plan"] svg').first();
    const box = await planSvg.boundingBox();

    const p1 = { x: box.x + box.width * 0.30, y: box.y + box.height * 0.45 };
    // Deliberately NOT horizontal or vertical from p1 — a few px off on the
    // y-axis so a snap is unambiguously visible if it happens.
    const p2raw = { x: box.x + box.width * 0.62, y: box.y + box.height * 0.53 };
    const p3 = { x: box.x + box.width * 0.46, y: box.y + box.height * 0.35 };

    await page.mouse.click(p1.x, p1.y);
    await page.waitForTimeout(120);

    await page.keyboard.down("Shift");
    await page.mouse.move(p2raw.x, p2raw.y, { steps: 5 });
    await page.waitForTimeout(120);
    await page.mouse.click(p2raw.x, p2raw.y);
    await page.keyboard.up("Shift");
    await page.waitForTimeout(120);

    await page.mouse.click(p3.x, p3.y);
    await page.waitForTimeout(300);

    await page.screenshot({ path: `${OUT_DIR}dimension-shift-snap.png` });

    const planHtml = await planSvg.innerHTML();
    // Pull out the dimension-line <line> (stroke-width 2, matches the sw=2
    // default) and check its endpoints share the same y (horizontal snap).
    const lineMatches = [...planHtml.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)" stroke="#8b5cf6" stroke-width="2"/g)];
    console.log(`Dimension-line <line> elements found: ${lineMatches.length}`);
    if (lineMatches.length > 0) {
      const [, x1, y1, x2, y2] = lineMatches[0];
      console.log(`Dimension line: y1=${y1}, y2=${y2} (expect equal — horizontal snap held)`);
      console.log(`Horizontal snap confirmed: ${Math.abs(parseFloat(y1) - parseFloat(y2)) < 0.5}`);
    }

    console.log("\nDone. Screenshot at scripts/testing/screenshots/dimension-shift-snap.png");
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
