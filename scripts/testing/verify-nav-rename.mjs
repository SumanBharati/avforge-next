import { chromium } from "playwright";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;
const OUT_DIR = new URL("./screenshots/", import.meta.url).pathname.replace(/^\/([A-Za-z]):/, "$1:");

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 200 }, deviceScaleFactor: 2 });
  try {
    await page.goto(`${APP_URL}/login`);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT_DIR}nav-order-management.png`, clip: { x: 0, y: 0, width: 1440, height: 72 } });
    const navText = await page.locator("header nav").innerText();
    console.log("Nav items:", navText.replace(/\n/g, " | "));
  } finally {
    await browser.close();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
