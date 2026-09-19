// Verifies Room Designer's new "Replace" context-menu option: right-click
// a placed device, click Replace, search the AVGenix library, pick a
// product, confirm — the device should get the new name/type/icon while
// keeping its x/y/z/mountWall/uid (position unchanged).
import { chromium } from "playwright";
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;
const fixture = JSON.parse(readFileSync(new URL("./.fixture.json", import.meta.url), "utf8"));
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

  await page.goto(`${APP_URL}/login`);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

  await page.goto(`${APP_URL}/designEngineering/room-designer?project=${fixture.projectId}&room=${fixture.roomId}`);
  await page.locator("text=OldBrand Display").first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(1500);

  await page.locator("text=OldBrand Display").first().click({ button: "right", force: true });
  await page.waitForTimeout(300);
  const replaceBtn = page.locator("text=Replace");
  console.log("Replace button visible:", await replaceBtn.count() > 0);
  await replaceBtn.click();
  await page.waitForTimeout(400);
  console.log("Modal shows 'Replace Equipment':", await page.locator("text=Replace Equipment").count() > 0);

  await page.locator('input[placeholder*="Search"]').fill("Generic Projector");
  await page.waitForTimeout(700);
  const globalBtn = page.locator("text=Search in Global Library, text=AVGenix Equipment Library, text=Search Global Library");
  await page.waitForTimeout(300);
  // Try clicking a global-search toggle if present.
  const globalToggle = page.locator("button", { hasText: /global/i });
  if (await globalToggle.count()) { await globalToggle.first().click(); await page.waitForTimeout(700); }

  await page.locator("text=Generic Projector").first().click();
  await page.waitForTimeout(300);
  await page.locator("button:has-text('Replace')").last().click();
  await page.waitForTimeout(2000);

  const { data } = await admin.from("room_designs").select("data").eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).maybeSingle();
  const dev = data.data.devices.find(d => d.uid === 111);
  console.log("\nDevice after replace:", JSON.stringify({ name: dev?.name, type: dev?.type, x: dev?.x, y: dev?.y, z: dev?.z, mountWall: dev?.mountWall }));
  console.log("Position preserved (x=8,y=0.02,mountWall=north):", dev?.x === 8 && dev?.y === 0.02 && dev?.mountWall === "north");

  await page.screenshot({ path: "scripts/testing/screenshots/rd-replace-equipment.png" });
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
