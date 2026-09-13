// Verifies: "On the mobile version simplify things... I don't want to have
// ability to modify signal flow... I should be able to just see them zoomed
// extent. Then user should have ability to zoom in or out as needed."
//
// At a phone-width viewport (<768px, matching lib/useIsMobile.ts), Signal
// Flow Builder should:
//   1. Replace the full editing ribbon with a plain "view only" message —
//      no Add Equipment/Location/Flag/Text/Shape/Pencil/etc tool buttons.
//   2. Hide the Undo/Redo/canvas-lock buttons (nothing to undo in a
//      read-only view) but keep Zoom Extent, and add new Zoom In/Out buttons.
//   3. Block editing interactions: clicking a device must NOT open its
//      selection/edit UI.
//   4. Still allow single-finger drag-to-pan (the new transparent overlay
//      div, intercepting pointer events ahead of the SVG).
//
// At a desktop viewport, none of this should change — the full ribbon and
// normal editing interactions must still work (isMobile is viewport-based).
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-signal-flow-mobile-view.mjs

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
      { uid: 9080, id: "display-55", name: "Mobile View Test Display", icon: "monitor", w: 4.0, h: 2.26, wall: "front", type: "display", color: "#8b5cf6", x: 8, y: 0.1, z: 5, mountWall: "north" },
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
  console.log("Seeded a display so the signal-flow canvas has content to view/pan/zoom.");
}

async function login(page) {
  await page.goto(`${APP_URL}/login`);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
}

async function main() {
  await seed();
  const browser = await chromium.launch();
  const sfUrl = `${APP_URL}/designEngineering/signal-flow?project=${fixture.projectId}&room=${fixture.roomId}`;

  try {
    // ---- Mobile viewport ----
    const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    await login(mobilePage);
    await mobilePage.goto(sfUrl);
    await mobilePage.locator("#sf-canvas-export").waitFor({ timeout: 20000 });
    // Wait for the seeded device specifically (not a fixed timeout) — the
    // Room Designer -> Signal Flow auto-sync effect can take a moment after
    // the canvas container itself first appears.
    await mobilePage.locator("svg text", { hasText: "Mobile View Test Display" }).first().waitFor({ timeout: 20000 });
    await mobilePage.waitForTimeout(300);

    const viewOnlyMsg = await mobilePage.locator("text=Signal Flow Builder — view only on mobile").count();
    console.log("Mobile: view-only ribbon message shown:", viewOnlyMsg > 0 ? "YES" : "NO (FAIL)");

    const addEquipBtn = await mobilePage.locator("text=Export PDF").count();
    console.log("Mobile: full-ribbon 'Export PDF' button absent:", addEquipBtn === 0 ? "YES (correct)" : "NO (FAIL — still present)");

    const undoBtn = await mobilePage.locator('button[title="Undo (Ctrl+Z)"]').count();
    console.log("Mobile: Undo button hidden:", undoBtn === 0 ? "YES (correct)" : "NO (FAIL)");

    const lockBtn = await mobilePage.locator('button[title*="canvas — "]').count();
    console.log("Mobile: canvas-lock button hidden:", lockBtn === 0 ? "YES (correct)" : "NO (FAIL)");

    const zoomInBtn = await mobilePage.locator('button[title="Zoom in"]').count();
    const zoomOutBtn = await mobilePage.locator('button[title="Zoom out"]').count();
    const zoomExtentBtn = await mobilePage.locator('button[title*="Zoom Extent"]').count();
    console.log("Mobile: Zoom In/Out/Extent buttons present:", zoomInBtn > 0 && zoomOutBtn > 0 && zoomExtentBtn > 0 ? "YES" : `NO (FAIL — in=${zoomInBtn} out=${zoomOutBtn} extent=${zoomExtentBtn})`);

    await mobilePage.screenshot({ path: `${OUT_DIR}signal-flow-mobile-view-initial.png` });

    const canvasRect = await mobilePage.evaluate(() => document.getElementById("sf-canvas-export")?.getBoundingClientRect());
    console.log("Canvas #sf-canvas-export bounding rect:", canvasRect);
    const svgTextContents = await mobilePage.evaluate(() => [...document.querySelectorAll("#sf-canvas-export svg text")].map(t => t.textContent));
    console.log("All <text> content currently on the canvas:", svgTextContents);

    // Try clicking on the device — should NOT open selection/edit UI (the
    // pan overlay intercepts the pointerdown before it reaches the SVG).
    const deviceBox = await mobilePage.evaluate(() => {
      const textEl = [...document.querySelectorAll("svg text")].find((t) => t.textContent && t.textContent.includes("Mobile View Test Display"));
      if (!textEl) return null;
      const rect = textEl.closest("g").getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    });
    console.log("Mobile: device block found on canvas:", deviceBox ? "YES" : "NO (FAIL — nothing rendered)");
    if (deviceBox) {
      await mobilePage.mouse.click(deviceBox.x, deviceBox.y);
      await mobilePage.waitForTimeout(300);
      // A selected device normally shows a red delete "x" (circle r=7, fill starting with #e or similar) — check no purple/red inline buttons appeared.
      const selectionCircles = await mobilePage.locator('svg circle[r="7"]').count();
      console.log("Mobile: clicking device did NOT open edit/selection UI:", selectionCircles === 0 ? "YES (correct)" : `NO (FAIL — ${selectionCircles} selection button(s) appeared)`);
    }

    // Single-finger drag-to-pan via the overlay — use a fixed point well
    // inside the canvas and away from the top-right control cluster, rather
    // than the device's own on-screen position (which shifts around
    // depending on where zoom-to-fit lands it). The canvas is often taller
    // than the mobile viewport itself (the page scrolls), so pick a point
    // near the top of the canvas rather than a fraction of its full height —
    // a fraction can land below the fold, outside the actual viewport,
    // where elementFromPoint / pointer dispatch silently no-ops.
    const panStart = { x: canvasRect.x + canvasRect.width * 0.3, y: canvasRect.y + 80 };
    const beforePanTransform = await mobilePage.evaluate(() => document.querySelector("#sf-canvas-export svg g")?.getAttribute("transform"));
    await mobilePage.mouse.move(panStart.x, panStart.y);
    await mobilePage.mouse.down();
    await mobilePage.mouse.move(panStart.x - 60, panStart.y - 40, { steps: 8 });
    await mobilePage.mouse.up();
    await mobilePage.waitForTimeout(200);
    const afterPanTransform = await mobilePage.evaluate(() => document.querySelector("#sf-canvas-export svg g")?.getAttribute("transform"));
    console.log("Mobile: single-finger drag panned the canvas:", beforePanTransform !== afterPanTransform ? "YES (correct)" : `NO (FAIL — before=${beforePanTransform} after=${afterPanTransform})`);
    await mobilePage.screenshot({ path: `${OUT_DIR}signal-flow-mobile-view-after-pan.png` });

    // Zoom In button changes the view's zoom.
    await mobilePage.locator('button[title="Zoom in"]').click();
    await mobilePage.waitForTimeout(200);
    const afterZoomTransform = await mobilePage.evaluate(() => document.querySelector("#sf-canvas-export svg g")?.getAttribute("transform"));
    console.log("Mobile: Zoom In button changed the view:", afterZoomTransform !== afterPanTransform ? "YES (correct)" : `NO (FAIL — transform unchanged: ${afterZoomTransform})`);
    await mobilePage.screenshot({ path: `${OUT_DIR}signal-flow-mobile-view-after-zoomin.png` });

    await mobilePage.close();

    // ---- Desktop viewport — confirm nothing regressed ----
    const desktopPage = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await login(desktopPage);
    await desktopPage.goto(sfUrl);
    await desktopPage.locator("#sf-canvas-export").waitFor({ timeout: 20000 });
    await desktopPage.waitForTimeout(500);
    const desktopAddEquip = await desktopPage.locator("text=Export PDF").count();
    const desktopUndo = await desktopPage.locator('button[title="Undo (Ctrl+Z)"]').count();
    const desktopLock = await desktopPage.locator('button[title*="canvas — "]').count();
    const desktopViewOnlyMsg = await desktopPage.locator("text=Signal Flow Builder — view only on mobile").count();
    console.log("Desktop: full ribbon still present (Export PDF):", desktopAddEquip > 0 ? "YES (correct)" : "NO (FAIL — regression)");
    console.log("Desktop: Undo button still present:", desktopUndo > 0 ? "YES (correct)" : "NO (FAIL — regression)");
    console.log("Desktop: canvas-lock button still present:", desktopLock > 0 ? "YES (correct)" : "NO (FAIL — regression)");
    console.log("Desktop: mobile view-only message absent:", desktopViewOnlyMsg === 0 ? "YES (correct)" : "NO (FAIL — regression)");
    await desktopPage.screenshot({ path: `${OUT_DIR}signal-flow-desktop-unaffected.png` });
    await desktopPage.close();
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
