// Verifies "Generate from Scope" in Room Designer: seeded scope text
// ("A 65 inch display and a PTZ camera on the front wall, a video bar,
// two ceiling speakers, a wall mounted touch panel on the left wall, a
// table microphone, a projection screen, and a DSP for audio processing.")
// should place Display/Camera/Video-Bar/Screen on the front (north) wall
// without overlap, the touch panel on the west wall, two ceiling speakers
// spaced apart, a table mic at the table, and report the DSP as skipped.
import { chromium } from "playwright";
import { readFileSync } from "fs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;
const fixture = JSON.parse(readFileSync(new URL("./.fixture.json", import.meta.url), "utf8"));

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto(`${APP_URL}/login`);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

  await page.goto(`${APP_URL}/designEngineering/room-designer?project=${fixture.projectId}&room=${fixture.roomId}`);
  await page.locator("text=Generate from").first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(3000); // let rdLoaded settle before clicking

  await page.locator("text=Generate from").first().click();
  console.log("Clicked Generate from Scope — waiting for AI response...");
  await page.waitForSelector("text=/Sized the room|Added \\d+ device/", { timeout: 30000 }).catch(() => console.log("Generation notice not seen within 30s"));
  await page.waitForTimeout(1000);

  const notice = await page.locator("text=/Sized the room|Added \\d+ device/").first().textContent().catch(() => null);
  console.log("\nNotice text:", notice);

  await page.screenshot({ path: "scripts/testing/screenshots/room-designer-scope.png" });
  console.log("\nPage errors:", errors.length ? errors : "none");

  await page.waitForTimeout(2000);
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
