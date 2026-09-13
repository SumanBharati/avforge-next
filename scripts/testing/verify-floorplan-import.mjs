// Verifies: "Provide option to import AutoCAD/DXF or PDF drawing to start
// as your background. On PDF or images import provide proper way to scale
// the background in inches. Same with AutoCAD, make sure the scale is
// inches."
//
// Covers:
//   1. DXF upload rasterizes to a background image (lib/dxf-import.ts).
//   2. PDF upload rasterizes to a background image (lib/pdf-import.ts,
//      pdfjs-dist).
//   3. The "Set Scale" calibration flow now asks for inches (not feet) and
//      actually changes the stored px/ft scale.
//   4. The background image + calibrated scale persist across a reload
//      (previously this state lived only in memory and vanished on
//      refresh/room-switch — fixed as part of this change).
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-floorplan-import.mjs

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

const DXF_PATH = fileURLToPath(new URL("./fixtures/sample-floorplan.dxf", import.meta.url));
const PDF_PATH = "D:/Suman/avforge-next/data/CTS.pdf";

async function clearFloorPlan() {
  await admin.from("room_designs").delete().eq("project_id", fixture.projectId).eq("room_id", fixture.roomId);
}

async function main() {
  await clearFloorPlan();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  try {
    await page.goto(`${APP_URL}/login`);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    const rdUrl = `${APP_URL}/designEngineering/room-designer?project=${fixture.projectId}&room=${fixture.roomId}`;
    await page.goto(rdUrl);
    await page.locator("text=Drop or upload a floor plan").waitFor({ timeout: 20000 });
    // The sidebar re-renders shortly after this text first appears (the
    // async site_surveys/room_designs load effects still settling) — acting
    // on the file input before that finishes loses a race where Playwright's
    // setInputFiles resolves against a soon-to-be-replaced element.
    await page.waitForTimeout(2000);

    // --- DXF upload ---
    const dxfInput = page.locator('input[type="file"][accept*="dxf"]');
    await dxfInput.setInputFiles(DXF_PATH);
    await page.locator("text=Floor plan loaded").waitFor({ timeout: 10000 });
    const dxfImageHref = await page.evaluate(() => document.querySelector('svg image')?.getAttribute("href"));
    console.log("DXF import produced a background image:", dxfImageHref && dxfImageHref.startsWith("data:image/png") ? "YES (fixed)" : `NO (FAIL — ${dxfImageHref?.slice(0,50)})`);
    await page.screenshot({ path: `${OUT_DIR}floorplan-dxf-import.png` });

    // --- Bluebeam-style calibration: same two points, each of the four
    // supported units (ft-in / ft / in / mm) entered as an equivalent
    // 10ft-6in reference distance — all four should converge on the same
    // resulting px/ft scale, proving the unit conversion is correct rather
    // than just "some number got parsed and applied".
    const canvasBox = await page.locator('[data-rd-canvas="plan"] svg').first().boundingBox();
    const p1 = { x: canvasBox.x + canvasBox.width * 0.3, y: canvasBox.y + canvasBox.height * 0.4 };
    const p2 = { x: canvasBox.x + canvasBox.width * 0.6, y: canvasBox.y + canvasBox.height * 0.4 };

    const calibrate = async (setup) => {
      await page.locator('button:has-text("Set Scale")').click();
      await page.locator("text=Click two points on the plan").waitFor({ timeout: 5000 });
      await page.mouse.click(p1.x, p1.y);
      await page.waitForTimeout(150);
      await page.mouse.click(p2.x, p2.y);
      await page.waitForTimeout(150);
      await setup();
      await page.locator('button:has-text("Apply Scale")').click();
      await page.waitForTimeout(300);
      return (await page.locator("text=/Scale: [\\d.]+ px\\/ft/").textContent());
    };

    const scaleFtIn = await calibrate(async () => {
      const unitPickerVisible = await page.locator('button:has-text("ft/in")').count();
      console.log("Bluebeam-style unit picker (ft/in, ft, in, mm) shown:", unitPickerVisible > 0 ? "YES (fixed)" : "NO (FAIL)");
      // ft/in is the default unit — no picker click needed.
      await page.locator('input[placeholder="10"]').fill("10");
      await page.locator('input[placeholder="6"]').fill("6");
    });
    console.log("ft-in calibration (10 ft 6 in) applied a scale:", scaleFtIn);

    const scaleFt = await calibrate(async () => {
      await page.locator('button:has-text("ft")', { hasText: /^ft$/ }).click();
      await page.locator('input[placeholder="e.g. 10"]').fill("10.5");
    });
    console.log("ft calibration (10.5 ft, same distance) applied a scale:", scaleFt, scaleFt === scaleFtIn ? "(matches ft-in — YES fixed)" : "(FAIL — should match ft-in)");

    const scaleIn = await calibrate(async () => {
      await page.locator('button', { hasText: /^in$/ }).click();
      await page.locator('input[placeholder="e.g. 120"]').fill("126");
    });
    console.log("in calibration (126 in, same distance) applied a scale:", scaleIn, scaleIn === scaleFtIn ? "(matches ft-in — YES fixed)" : "(FAIL — should match ft-in)");

    const scaleMm = await calibrate(async () => {
      await page.locator('button', { hasText: /^mm$/ }).click();
      await page.locator('input[placeholder="e.g. 3000"]').fill("3200.4"); // 126in * 25.4
    });
    console.log("mm calibration (3200.4 mm, same distance) applied a scale:", scaleMm, scaleMm === scaleFtIn ? "(matches ft-in — YES fixed)" : "(FAIL — should match ft-in)");

    await page.screenshot({ path: `${OUT_DIR}floorplan-calibrated.png` });
    const scaleAfter = scaleMm;

    // --- Persistence across reload ---
    await page.waitForTimeout(2200); // let autosave fire
    await page.reload();
    await page.locator("text=Floor plan loaded").waitFor({ timeout: 20000 });
    const reloadedImageHref = await page.evaluate(() => document.querySelector('svg image')?.getAttribute("href"));
    const reloadedScale = await page.locator("text=/Scale: \\d+ px\\/ft/").textContent();
    console.log("Background image persisted across reload:", reloadedImageHref && reloadedImageHref.startsWith("data:image/png") ? "YES (fixed)" : "NO (FAIL)");
    console.log("Calibrated scale persisted across reload:", reloadedScale === scaleAfter ? `YES (fixed — ${reloadedScale})` : `NO (FAIL — expected ${scaleAfter}, got ${reloadedScale})`);

    // --- PDF upload (fresh room, replacing the DXF background) ---
    await page.locator('button:has-text("Remove")').click();
    await page.waitForTimeout(300);
    const pdfInput = page.locator('input[type="file"][accept*="pdf"]');
    await pdfInput.setInputFiles(PDF_PATH);
    await page.locator("text=Floor plan loaded").waitFor({ timeout: 20000 });
    const pdfImageHref = await page.evaluate(() => document.querySelector('svg image')?.getAttribute("href"));
    console.log("PDF import produced a background image:", pdfImageHref && pdfImageHref.startsWith("data:image/png") ? "YES (fixed)" : `NO (FAIL — ${pdfImageHref?.slice(0,50)})`);
    await page.screenshot({ path: `${OUT_DIR}floorplan-pdf-import.png` });

    console.log("Page errors observed:", errors);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
