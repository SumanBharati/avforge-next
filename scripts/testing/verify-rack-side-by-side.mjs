// Verifies: "if the device is any less than full rack width is it moveable,
// so that ... I want to put two half width rack devices side by side, I'm
// able to do that" — the follow-up to the rack-width-proportional-sizing
// feature, which only changed how wide a faceplate rendered, not whether it
// could be repositioned horizontally.
//
// Adds: RackItem.xOffsetIn (inches, left edge of the faceplate within the
// 17.75" usable width; null = centered, the old default), horizontal-aware
// occupancy checks in getRackDropStart/getDropStartForRack (a RU row only
// blocks a drop when faceplates would actually overlap, not just because
// something else is anywhere in that row), and faceplate rendering/DXF
// export positioned by xOffsetIn instead of always centered.
//
// This test covers two things:
//   1. Static: two half-rack items seeded in the SAME RU row at explicit
//      left/right xOffsetIn values render side by side without overlapping,
//      and the DXF export places them at the same two X positions.
//   2. Interactive: dragging a half-rack item via native HTML5 DnD
//      (Playwright's dragTo) onto the same row as another half-rack item
//      actually succeeds (previously blocked outright, since the old
//      occupancy check treated the whole row as taken by any one item).
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-rack-side-by-side.mjs

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

async function seed(items) {
  const payload = { items, rackRUCapacity: 6 };
  const { data: existing } = await admin.from("tool_data").select("id").eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).eq("tool", "rack-planner").maybeSingle();
  let writeErr;
  if (existing) ({ error: writeErr } = await admin.from("tool_data").update({ data: payload, updated_at: new Date().toISOString() }).eq("id", existing.id));
  else ({ error: writeErr } = await admin.from("tool_data").insert({ project_id: fixture.projectId, room_id: fixture.roomId, user_id: fixture.userId, tool: "rack-planner", data: payload }));
  await admin.from("tool_data").delete().eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).eq("tool", "signal-flow");
  const { data: verify } = await admin.from("tool_data").select("data").eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).eq("tool", "rack-planner").maybeSingle();
  console.log("seed() wrote:", items.map(i=>i.name), "writeErr:", writeErr, "verified names in DB:", verify?.data?.items?.map(i=>i.name));
}

async function login(page) {
  await page.goto(`${APP_URL}/login`);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

  try {
    // ---- Part 1: static side-by-side placement ----
    await seed([
      { manual: true, name: "Left DSP", ru: 1, color: "#8b5cf6", rackMounted: true, rackId: 1, rackStartRU: 1, widthIn: 8.5, xOffsetIn: 0 },
      { manual: true, name: "Right DSP", ru: 1, color: "#22c55e", rackMounted: true, rackId: 1, rackStartRU: 1, widthIn: 8.5, xOffsetIn: 9.25 },
    ]);
    await login(page);
    const rpUrl = `${APP_URL}/designEngineering/rack-planner?project=${fixture.projectId}&room=${fixture.roomId}`;
    await page.goto(rpUrl);
    await page.locator("text=Left DSP").waitFor({ timeout: 20000 });
    await page.locator("text=Right DSP").waitFor({ timeout: 5000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT_DIR}rack-side-by-side.png` });

    const rects = await page.evaluate(() => {
      const find = (name) => [...document.querySelectorAll("div")].find(d => d.textContent === name && d.children.length === 0);
      const left = find("Left DSP")?.parentElement?.parentElement?.getBoundingClientRect();
      const right = find("Right DSP")?.parentElement?.parentElement?.getBoundingClientRect();
      return { left: left && { x: left.x, width: left.width }, right: right && { x: right.x, width: right.width } };
    });
    console.log("Rendered rects:", rects);
    const noOverlap = rects.left && rects.right && (rects.left.x + rects.left.width <= rects.right.x + 1 || rects.right.x + rects.right.width <= rects.left.x + 1);
    console.log("Both half-rack items render side by side without overlapping:", noOverlap ? "YES (fixed)" : "NO (FAIL)");
    console.log("Right item is actually to the right of the left item:", (rects.left && rects.right && rects.right.x > rects.left.x) ? "YES (correct)" : "NO (FAIL)");

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 10000 }),
      page.locator('button[title="Export rack elevation as DXF (for AutoCAD)"]').click(),
    ]);
    const dxfPath = await download.path();
    const dxf = dxfPath ? readFileSync(dxfPath, "utf8") : "";
    const xBeforeText = (name) => {
      const textPos = dxf.indexOf(`\n1\n${name}\n`);
      if (textPos < 0) return null;
      const before = dxf.slice(0, textPos);
      const lineRe = /0\nLINE\n8\nEQUIPMENT\n10\n([\d.]+)\n20\n([\d.]+)\n30\n0\n11\n([\d.]+)\n21\n([\d.]+)\n/g;
      let match, lastHorizontal = null;
      while ((match = lineRe.exec(before))) { if (match[2] === match[4]) lastHorizontal = match; }
      return lastHorizontal ? Math.min(parseFloat(lastHorizontal[1]), parseFloat(lastHorizontal[3])) : null;
    };
    const dxfLeftX = xBeforeText("Left DSP"), dxfRightX = xBeforeText("Right DSP");
    console.log("DXF X positions:", { dxfLeftX, dxfRightX });
    console.log("DXF export places them side by side too (not both centered):", (dxfLeftX !== null && dxfRightX !== null && dxfRightX > dxfLeftX + 5) ? "YES (fixed)" : "NO (FAIL)");

    // ---- Part 2: drag a small item next to another, landing in the same
    // row's remaining free space, via native HTML5 DnD ----
    // A *fresh* page/tab, not a reload of Part 1's — Part 1's page can still
    // have a pending autosave timer (RackPlanner debounces 1s after any
    // items[] change, including the one its own load effect triggers) that
    // would otherwise fire during/after the reload and clobber this fresh
    // seed with Part 1's stale in-memory data.
    await page.close();
    await new Promise(r=>setTimeout(r,500));
    await seed([
      { manual: true, name: "Existing Tiny", ru: 1, color: "#8b5cf6", rackMounted: true, rackId: 1, rackStartRU: 2, widthIn: 2, xOffsetIn: 0 },
      { manual: true, name: "Draggable Tiny", ru: 1, color: "#22c55e", rackMounted: true, rackId: 1, rackStartRU: 4, widthIn: 2, xOffsetIn: null },
    ]);
    const page2 = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await login(page2);
    await page2.goto(rpUrl);
    await page2.waitForTimeout(500);
    console.log("page2 loaded text snippet:", (await page2.evaluate(()=>document.body.innerText)).slice(0,300));
    await page2.locator("text=Existing Tiny").waitFor({ timeout: 20000 });
    await page2.locator("text=Draggable Tiny").waitFor({ timeout: 5000 });
    await page2.waitForTimeout(300);

    // Raw mouse.down/move/up does NOT fire native HTML5 dragstart/dragover/
    // drop (a separate event family Chromium only synthesizes from a real
    // drag gesture) — Playwright's own dragTo() drives the proper sequence.
    // `div.filter({hasText})` matches every ancestor whose text CONTAINS the
    // name, not just the actual leaf label — tag the real elements directly
    // (leaf div = no children, for the label; nearest [draggable] ancestor
    // for the row; that row's own parent for the RU-rows container) so
    // every subsequent locator/boundingBox call is unambiguous.
    const geometry = await page2.evaluate(() => {
      const tag = (name, attr) => {
        const label = [...document.querySelectorAll("div")].find(d => d.textContent === name && d.children.length === 0);
        let row = label;
        while (row && !row.hasAttribute("draggable")) row = row.parentElement;
        row?.setAttribute(attr, "1");
        row?.parentElement?.setAttribute("data-testid", "rack-drop-zone");
        const labelRect = label.getBoundingClientRect();
        const containerRect = row.parentElement.getBoundingClientRect();
        return { labelRect: { x: labelRect.x, y: labelRect.y, width: labelRect.width, height: labelRect.height }, containerRect: { x: containerRect.x, y: containerRect.y, width: containerRect.width, height: containerRect.height } };
      };
      const existing = tag("Existing Tiny", "data-testid-existing");
      tag("Draggable Tiny", "data-testid-draggable");
      return existing;
    });
    console.log("geometry:", geometry);
    const dragHandle = page2.locator('[data-testid-draggable="1"]');
    const dropTarget = page2.locator('[data-testid="rack-drop-zone"]').first();
    // A point well past "Existing Tiny"'s own narrow faceplate but still
    // inside the container, at the same row height.
    const targetX = (geometry.labelRect.x - geometry.containerRect.x) + geometry.labelRect.width + 60;
    const targetY = (geometry.labelRect.y - geometry.containerRect.y) + geometry.labelRect.height / 2;
    try {
      await dragHandle.dragTo(dropTarget, { targetPosition: { x: targetX, y: targetY }, force: true });
    } catch (err) {
      console.log("dragTo threw:", err.message);
    }
    await page2.waitForTimeout(1500); // autosave

    const { data } = await admin.from("tool_data").select("data").eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).eq("tool", "rack-planner").maybeSingle();
    const savedItems = data?.data?.items ?? [];
    const draggable = savedItems.find(i => i.name === "Draggable Tiny");
    const existing = savedItems.find(i => i.name === "Existing Tiny");
    console.log("After drag, saved items:", { draggable, existing });
    const samePos = draggable?.rackStartRU === existing?.rackStartRU;
    const gotXOffset = typeof draggable?.xOffsetIn === "number";
    console.log("Dragged item landed in the same RU row as the existing item:", samePos ? "YES (fixed — previously blocked outright)" : `NO (still at RU ${draggable?.rackStartRU} vs ${existing?.rackStartRU})`);
    console.log("Dragged item picked up a real horizontal position:", gotXOffset ? `YES (xOffsetIn=${draggable.xOffsetIn.toFixed(2)})` : "NO (FAIL)");
    const noOverlapAfterDrag = samePos && gotXOffset && !(draggable.xOffsetIn < (existing.xOffsetIn??0)+2 && (existing.xOffsetIn??0) < draggable.xOffsetIn+2);
    console.log("The two items don't overlap after the drag:", noOverlapAfterDrag ? "YES (correct)" : "N/A or FAIL");
    await page2.screenshot({ path: `${OUT_DIR}rack-drag-side-by-side-after.png` });
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
