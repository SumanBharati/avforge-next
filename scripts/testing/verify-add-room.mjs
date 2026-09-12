// Headless visual verification for the new "+ Add Room" button in the
// Design Engineering sidebar — lets a room be created without ever visiting
// Site Survey, then jumps straight into Room Designer for it.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-add-room.mjs

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

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const consoleErrors = [];
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));
  page.on("response", (res) => {
    if (res.status() >= 400) console.log(`HTTP ${res.status()} ${res.request().method()} ${res.url()}`);
  });

  try {
    await page.goto(`${APP_URL}/login`);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    const rdUrl = `${APP_URL}/designEngineering/room-designer?project=${fixture.projectId}&room=${fixture.roomId}`;
    await page.goto(rdUrl);
    await page.locator("text=Test Room").waitFor({ timeout: 20000 });
    console.log("Sidebar loaded, existing room visible");

    const roomCountBefore = await page.locator("aside >> text=/^Room \\d+$|^Test Room$/").count();
    await page.screenshot({ path: `${OUT_DIR}add-room-before.png`, clip: { x: 0, y: 90, width: 340, height: 400 } });

    await page.locator('button[title="Add a room — no site survey needed"]').click();
    console.log("Clicked Add Room");

    // Should navigate into Room Designer for the freshly created room
    await page.waitForURL((url) => url.searchParams.get("room") !== fixture.roomId, { timeout: 10000 });
    const newRoomId = new URL(page.url()).searchParams.get("room");
    console.log("Navigated to new room id:", newRoomId);

    await page.locator(`text=Room ${roomCountBefore + 1}`).waitFor({ timeout: 5000 });
    await page.screenshot({ path: `${OUT_DIR}add-room-after.png`, clip: { x: 0, y: 90, width: 340, height: 400 } });

    // Confirm it actually persisted into site_surveys, not just local state
    const { data: surveyRow } = await admin.from("site_surveys").select("data").eq("project_id", fixture.projectId).maybeSingle();
    const rooms = surveyRow?.data?.buildings?.[0]?.rooms || [];
    const persisted = rooms.some((r) => r.id === newRoomId);
    console.log(`Room persisted in site_surveys: ${persisted} (total rooms now: ${rooms.length})`);

    if (consoleErrors.length) {
      console.warn("Console errors observed:");
      consoleErrors.forEach((e) => console.warn(" -", e));
    } else {
      console.log("No console errors observed.");
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
