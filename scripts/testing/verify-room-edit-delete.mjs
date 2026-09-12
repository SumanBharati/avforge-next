// Headless visual verification for renaming and deleting a room from the
// Design Engineering sidebar (previously only "create" was possible there).
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-room-edit-delete.mjs

import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;
const fixture = JSON.parse(readFileSync(new URL("./.fixture.json", import.meta.url), "utf8"));
const OUT_DIR = fileURLToPath(new URL("./screenshots/", import.meta.url));

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function resetRoomName() {
  const { data } = await admin.from("site_surveys").select("data").eq("project_id", fixture.projectId).maybeSingle();
  if (!data?.data?.buildings) return;
  const nextData = {
    ...data.data,
    buildings: data.data.buildings.map((b) => ({
      ...b,
      rooms: b.rooms.map((r) => (r.id === fixture.roomId ? { ...r, name: "Test Room", data: { ...r.data, room_name: "Test Room" } } : r)),
    })),
  };
  await admin.from("site_surveys").update({ data: nextData }).eq("project_id", fixture.projectId);
}

async function main() {
  await resetRoomName();
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
    const testRoomRow = page.locator("aside").locator("text=Test Room").locator("xpath=../..");
    await testRoomRow.waitFor({ timeout: 20000 });
    await testRoomRow.hover();
    await page.screenshot({ path: `${OUT_DIR}room-row-hover.png`, clip: { x: 0, y: 90, width: 340, height: 250 } });
    console.log("Hovered Test Room row (icons should be visible)");

    // Rename "Test Room" -> "Boardroom"
    await testRoomRow.locator('button[title="Rename room"]').click();
    const input = page.locator("aside input").first();
    await input.waitFor({ timeout: 5000 });
    await input.fill("Boardroom");
    await input.press("Enter");
    await page.locator("aside").locator("text=Boardroom").waitFor({ timeout: 5000 });
    console.log("Renamed Test Room -> Boardroom (visible in sidebar)");
    await page.screenshot({ path: `${OUT_DIR}room-renamed.png`, clip: { x: 0, y: 90, width: 340, height: 250 } });

    const { data: afterRename } = await admin.from("site_surveys").select("data").eq("project_id", fixture.projectId).maybeSingle();
    const renamedRoom = afterRename?.data?.buildings?.[0]?.rooms?.find((r) => r.id === fixture.roomId);
    console.log("DB check after rename:", renamedRoom?.name, renamedRoom?.data?.room_name);

    // Create a throwaway room to delete, so we don't destroy the shared fixture room
    await page.locator('button[title="Add a room — no site survey needed"]').click();
    await page.waitForURL((url) => url.searchParams.get("room") !== fixture.roomId, { timeout: 10000 });
    const scratchRoomId = new URL(page.url()).searchParams.get("room");
    console.log("Created scratch room to delete:", scratchRoomId);

    const scratchRow = page.locator(`aside a[href*="room=${scratchRoomId}"]`).first().locator("xpath=../..").first();
    // Simpler: find the row whose expand toggle is currently active (last added, auto-expanded)
    const allRoomButtons = page.locator("aside button svg + span.truncate");
    const lastRoomText = await allRoomButtons.last().innerText();
    console.log("Last room in list:", lastRoomText);
    const lastRow = page.locator("aside").locator(`text=${lastRoomText}`).first().locator("xpath=../..");
    await lastRow.hover();
    await lastRow.locator('button[title="Delete room"]').click();
    await page.locator("h3", { hasText: "Delete room" }).waitFor({ timeout: 5000 });
    await page.screenshot({ path: `${OUT_DIR}room-delete-confirm.png` });
    await page.locator('button:has-text("Delete")').last().click();
    await page.waitForTimeout(500);
    console.log(`Deleted room, still present in sidebar: ${await page.locator("aside").locator(`text=${lastRoomText}`).count()} (expect 0)`);

    const { data: afterDelete } = await admin.from("site_surveys").select("data").eq("project_id", fixture.projectId).maybeSingle();
    const stillThere = afterDelete?.data?.buildings?.[0]?.rooms?.some((r) => r.id === scratchRoomId);
    console.log(`Room still in site_surveys after delete: ${stillThere} (expect false)`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
