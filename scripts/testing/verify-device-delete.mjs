// Diagnoses a reported bug: "unable to delete objects like camera and
// display" in Room Designer. Seeds a placed camera directly into
// room_designs (bypassing the equipment-search modal, which needs real
// library data), then drives the actual UI: click the device to select it,
// press Delete, and check whether it's actually removed from the canvas.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-device-delete.mjs

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

async function seedCamera() {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const designData = {
    devices: [
      { uid: 1, id: "test-camera", name: "Test Camera", icon: "confbar", w: 0.5, h: 0.4, wall: "front", type: "camera", color: "#22c55e", x: 8, y: 0.1, z: 5, mountWall: "north", hfov: 70 },
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
  console.log("Seeded room_designs with one Test Camera device");
}

async function main() {
  await seedCamera();

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

    const rdUrl = `${APP_URL}/designEngineering/room-designer?project=${fixture.projectId}&room=${fixture.roomId}`;
    await page.goto(rdUrl);

    // Wait for the seeded camera to render (its FOV label or the device group)
    await page.locator("svg text", { hasText: "Test Camera" }).first().waitFor({ timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${OUT_DIR}device-delete-before.png` });

    // Click the camera device to select it. Find the label's ancestor <g>
    // (the device group with the onMouseDown handler) and click its actual
    // rendered center in real page coordinates, rather than the text glyph
    // itself, which can sit right at the group's edge.
    const cameraLabelOrIcon = page.locator("svg text", { hasText: "Test Camera" }).first();
    const found = await cameraLabelOrIcon.count();
    console.log("Camera label found on canvas:", found > 0);
    if (found > 0) {
      // The camera's actual icon is a small 16x10 <rect> (the little camera
      // body), a sibling of the FOV-cone lines inside the same group — find
      // that specific rect rather than clicking the group's bounding box
      // (which spans the whole FOV cone and mostly hits empty canvas).
      const iconBox = await page.evaluate(() => {
        const textEl = [...document.querySelectorAll("svg text")].find((t) => t.textContent === "Test Camera");
        if (!textEl) return null;
        const group = textEl.closest("g");
        const iconRect = [...group.querySelectorAll("rect")].find((r) => r.getAttribute("width") === "16" && r.getAttribute("height") === "10");
        if (!iconRect) return { noIconRect: true, allRects: [...group.querySelectorAll("rect")].map(r => ({ w: r.getAttribute("width"), h: r.getAttribute("height") })) };
        const rect = iconRect.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      });
      console.log("Camera icon box:", iconBox);
      if (iconBox && !iconBox.noIconRect) {
        await page.evaluate(() => {
          window.__mousedowns = [];
          document.addEventListener("mousedown", (e) => {
            window.__mousedowns.push({ x: e.clientX, y: e.clientY, tag: e.target.tagName, w: e.target.getAttribute && e.target.getAttribute("width"), cls: e.target.getAttribute && e.target.getAttribute("class") });
          }, true);
        });
        const cx = iconBox.x + iconBox.width / 2;
        const cy = iconBox.y + iconBox.height / 2;
        await page.mouse.click(cx, cy);
        const clicks = await page.evaluate(() => window.__mousedowns);
        console.log("Captured mousedown events:", JSON.stringify(clicks));
        // What element is actually at that exact point right now?
        const elementAtPoint = await page.evaluate(({ x, y }) => {
          const el = document.elementFromPoint(x, y);
          return el ? { tag: el.tagName, w: el.getAttribute("width"), h: el.getAttribute("height"), parentTag: el.parentElement?.tagName } : null;
        }, { x: cx, y: cy });
        console.log("elementFromPoint at click coords:", elementAtPoint);
      } else {
        console.error("Could not find the camera's 16x10 icon rect — rects in group:", iconBox?.allRects);
      }
    } else {
      console.error("Could not locate the seeded camera on the canvas at all.");
    }
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT_DIR}device-delete-after-click.png` });

    // Press Delete
    await page.keyboard.press("Delete");
    await page.waitForTimeout(500);

    const stillPresent = await page.locator("svg text", { hasText: "Test Camera" }).count();
    console.log("Camera still present after pressing Delete:", stillPresent > 0 ? "YES (bug reproduced)" : "NO (deleted successfully)");
    await page.screenshot({ path: `${OUT_DIR}device-delete-after.png` });

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
