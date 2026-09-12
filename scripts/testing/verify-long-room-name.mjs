// Headless visual verification that a long room name still leaves the
// rename/delete icons reachable (previously: a flex-1 child without
// min-width:0 let long text overflow instead of truncating, pushing the
// icon buttons out of view).
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-long-room-name.mjs

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

async function setRoomName(name) {
  const { data } = await admin.from("site_surveys").select("data").eq("project_id", fixture.projectId).maybeSingle();
  const nextData = {
    ...data.data,
    buildings: data.data.buildings.map((b) => ({
      ...b,
      rooms: b.rooms.map((r) => (r.id === fixture.roomId ? { ...r, name, data: { ...r.data, room_name: name } } : r)),
    })),
  };
  await admin.from("site_surveys").update({ data: nextData }).eq("project_id", fixture.projectId);
}

async function main() {
  await setRoomName("Training Room - Crestron Camera System");
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
    const roomRow = page.locator("aside").locator("text=/Training Room/").locator("xpath=../..");
    await roomRow.waitFor({ timeout: 20000 });
    await roomRow.hover();
    await page.screenshot({ path: `${OUT_DIR}long-room-name.png`, clip: { x: 0, y: 175, width: 340, height: 120 } });

    const editBtn = roomRow.locator('button[title="Rename room"]');
    const deleteBtn = roomRow.locator('button[title="Delete room"]');
    const editVisible = await editBtn.isVisible();
    const deleteVisible = await deleteBtn.isVisible();
    console.log(`Edit button visible: ${editVisible}, Delete button visible: ${deleteVisible} (expect both true)`);
    const editBox = await editBtn.boundingBox();
    console.log("Edit button bounding box (should be within sidebar's ~300 CSS px width):", editBox);
  } finally {
    await browser.close();
    await setRoomName("Test Room");
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
