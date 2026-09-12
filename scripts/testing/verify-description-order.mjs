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
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  try {
    await page.goto(`${APP_URL}/login`);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    const sfUrl = `${APP_URL}/designEngineering/signal-flow?project=${fixture.projectId}&room=${fixture.roomId}`;
    await page.goto(sfUrl);
    const canvas = page.locator("#sf-canvas-export");
    const usbPort = canvas.locator("svg text", { hasText: /^USB$/ }).first();
    await usbPort.waitFor({ timeout: 20000 });
    await usbPort.click({ button: "right" });
    await page.locator("text=Edit equipment").click();

    await page.locator("text=Manufacturer").waitFor({ timeout: 5000 });
    const modalTop = page.locator("text=Manufacturer").first().locator("xpath=../../..");
    await modalTop.screenshot({ path: `${OUT_DIR}description-order.png` });
    console.log("Screenshot saved: description-order.png");
  } finally {
    await browser.close();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
