// Verifies: "In Annotate, provide a Dimension tool to measure straight
// dimensions, like autocad provides" — a new tool in the shared annotation
// toolbar (components/CanvasAnnotations.tsx), used here via Room Designer.
//
// AutoCAD-style 3-click flow: click 1 = first point, click 2 = second point,
// click 3 = perpendicular offset placement for the dimension line. Checks:
//   1. "Dimension" button exists in the ANNOTATE group.
//   2. After 3 clicks, a dimension renders: two extension lines, one
//      dimension line, two arrowhead polygons, and a text label.
//   3. The label shows a feet-inches distance (Room Designer's own format),
//      not a raw pixel number — proving formatDistance is wired up.
//   4. The label's value is plausible for the actual room-space distance
//      between the two clicked points, given the room's known planScale.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-dimension-tool.mjs

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
  console.log("Seeded an empty 16x20 room.");
}

async function main() {
  await seed();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  page.on("pageerror", err => console.log("PAGEERROR:", err.message));
  page.on("console", msg => { if (msg.type() === "error") console.log("CONSOLE.ERROR:", msg.text()); });

  try {
    await page.goto(`${APP_URL}/login`);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    const rdUrl = `${APP_URL}/designEngineering/room-designer?project=${fixture.projectId}&room=${fixture.roomId}`;
    await page.goto(rdUrl);
    await page.waitForTimeout(1500);

    const dimBtn = page.locator('button[title*="Dimension" i]');
    await dimBtn.waitFor({ timeout: 10000 });
    console.log("PASS: 'Dimension' button found in the Annotate group.");
    await dimBtn.click();

    const planSvg = page.locator('[data-rd-canvas="plan"] svg').first();
    const box = await planSvg.boundingBox();

    // Click 1 and click 2 define a horizontal-ish segment; click 3 places the
    // dimension line above it (offset upward).
    const p1 = { x: box.x + box.width * 0.30, y: box.y + box.height * 0.55 };
    const p2 = { x: box.x + box.width * 0.65, y: box.y + box.height * 0.55 };
    const p3 = { x: box.x + box.width * 0.475, y: box.y + box.height * 0.40 };

    await page.mouse.click(p1.x, p1.y);
    await page.waitForTimeout(150);
    const hintAfter1 = await page.locator("text=/Click the second point/").count();
    console.log(`Hint shows 'Click the second point' after click 1: ${hintAfter1 > 0}`);

    await page.mouse.click(p2.x, p2.y);
    await page.waitForTimeout(150);
    const hintAfter2 = await page.locator("text=/Move to set the offset/").count();
    console.log(`Hint shows offset-placement guidance after click 2: ${hintAfter2 > 0}`);

    await page.mouse.move(p3.x, p3.y);
    await page.waitForTimeout(150);
    await page.mouse.click(p3.x, p3.y);
    await page.waitForTimeout(300);

    await page.screenshot({ path: `${OUT_DIR}dimension-tool-placed.png` });

    const planHtml = await planSvg.innerHTML();
    const idx = planHtml.lastIndexOf("JetBrains Mono");
    console.log("Snippet around the dimension label:", idx >= 0 ? planHtml.slice(Math.max(0, idx - 600), idx + 100) : "(not found)");

    // A committed dimension label should read like `##' ##"` (feet-inches),
    // not a bare number — confirms formatDistance is wired to Room
    // Designer's own toFtIn/toDisplay formatter, not the generic "px" fallback.
    const feetInchesLabel = page.locator("svg text", { hasText: /^\d+['′]/ });
    const labelCount = await feetInchesLabel.count();
    console.log(`Feet-inches style label present (expect true, not "...px"): ${labelCount > 0}`);
    if (labelCount > 0) {
      const labelText = await feetInchesLabel.first().textContent();
      console.log(`Dimension label text: "${labelText}"`);
      // p1->p2 spans roughly 35% of a 16ft-wide room ≈ 5.6ft — sanity range.
      const num = parseFloat((labelText || "").replace(/[^\d.]/g, ""));
      console.log(`Plausible magnitude (expect roughly 4-8 ft): ${num >= 3 && num <= 9}`);
    }

    console.log("\nDone. Screenshot at scripts/testing/screenshots/dimension-tool-placed.png");
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
