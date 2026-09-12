import { chromium } from "playwright";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;
const fixture = JSON.parse(readFileSync(new URL("./.fixture.json", import.meta.url), "utf8"));
const OUT_DIR = fileURLToPath(new URL("./screenshots/", import.meta.url));
async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (err) => console.log("PAGEERROR:", err.message));
  try {
    await page.goto(`${APP_URL}/login`);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    await page.goto(`${APP_URL}/projects/${fixture.projectId}`);
    await page.locator("h3", { hasText: "Margins" }).waitFor({ timeout: 20000 });
    await page.waitForTimeout(500);
    const marginsText = await page.locator("h3", { hasText: "Margins" }).locator("xpath=..").innerText();
    console.log("Dashboard Margins card:\n", marginsText);

    await page.goto(`${APP_URL}/projects/${fixture.projectId}/proposal`);
    await page.locator("aside").locator("text=Test Room").waitFor({ timeout: 20000 });
    await page.waitForTimeout(500);
    console.log("Proposal page loaded OK");
  } finally {
    await browser.close();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
