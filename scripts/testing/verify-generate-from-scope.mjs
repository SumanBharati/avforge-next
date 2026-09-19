// Verifies the new "Generate from Scope" feature: seeded scope text
// ("A display at the front wall, two ceiling speakers, a front camera,
// and a wall mounted touch panel. Also a DSP for audio processing.")
// should produce Display, 2x Ceiling Speaker, Camera, Touch Panel, and
// a generic "DSP..." block (category:"other"), all inside a
// "Generated from Scope of Work" bounding box, persisted after reload.
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

  await page.goto(`${APP_URL}/designEngineering/signal-flow?project=${fixture.projectId}&room=${fixture.roomId}`);
  await page.locator("text=Generate from").first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(800);

  await page.locator("text=Generate from").first().click();
  console.log("Clicked Generate from Scope — waiting for AI response...");
  await page.waitForSelector("text=Added", { timeout: 30000 }).catch(() => console.log("Toast 'Added...' not seen within 30s"));
  await page.waitForTimeout(1000);

  await page.screenshot({ path: "scripts/testing/screenshots/generate-from-scope.png" });

  const deviceLabels = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("svg text")).map(t => t.textContent).filter(Boolean);
  });
  console.log("\nText labels on canvas:", JSON.stringify(deviceLabels));

  console.log("\nPage errors:", errors.length ? errors : "none");

  await page.waitForTimeout(2000); // allow the 1.5s debounced autosave to fire
  // Reload and confirm persistence.
  await page.reload();
  await page.waitForTimeout(2000);
  const labelsAfterReload = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("svg text")).map(t => t.textContent).filter(Boolean);
  });
  console.log("\nText labels after reload:", JSON.stringify(labelsAfterReload));

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
