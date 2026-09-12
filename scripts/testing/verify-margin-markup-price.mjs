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
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
  try {
    await page.goto(`${APP_URL}/login`);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    await page.goto(`${APP_URL}/projects/${fixture.projectId}/proposal`);
    await page.locator("aside").locator("text=Test Room").waitFor({ timeout: 30000 });
    await page.locator("aside").locator("text=Test Room").click();
    await page.locator('input[value="Laptop"]').waitFor({ timeout: 20000 });
    await page.waitForTimeout(300);

    await page.screenshot({ path: `${OUT_DIR}proposal-table-margin-markup.png`, fullPage: false, clip: { x: 260, y: 190, width: 1340, height: 260 } });
    console.log("Table screenshot saved");

    // Set unit cost on the Laptop row, then set an explicit Margin override
    const row = page.locator("tr", { has: page.locator('input[value="Laptop"]') });
    const costInput = row.locator('input[type="number"]').nth(0); // qty is nth(0)? let's just grab by column order
    const inputs = row.locator("input[type=number]");
    const count = await inputs.count();
    console.log("Number inputs in row:", count);
    // order: Qty, UnitCost, Margin, Markup, UnitPrice, LaborHours
    await inputs.nth(1).fill("100");
    await inputs.nth(1).blur();
    await page.waitForTimeout(200);
    const marginVal = await inputs.nth(2).inputValue();
    const markupVal = await inputs.nth(3).inputValue();
    const priceVal = await inputs.nth(4).inputValue();
    console.log(`After setting Cost=100 -> Margin=${marginVal} Markup=${markupVal} Price=${priceVal}`);

    // Now explicitly override margin to 50
    await inputs.nth(2).fill("50");
    await inputs.nth(2).blur();
    await page.waitForTimeout(200);
    const marginVal2 = await inputs.nth(2).inputValue();
    const markupVal2 = await inputs.nth(3).inputValue();
    const priceVal2 = await inputs.nth(4).inputValue();
    console.log(`After overriding Margin=50 -> Markup=${markupVal2} Price=${priceVal2} (margin field shows ${marginVal2})`);

    await page.screenshot({ path: `${OUT_DIR}proposal-table-after-override.png`, fullPage: false, clip: { x: 260, y: 190, width: 1340, height: 260 } });
  } finally {
    await browser.close();
  }
}
main().catch((err) => { console.error(err); process.exit(1); });
