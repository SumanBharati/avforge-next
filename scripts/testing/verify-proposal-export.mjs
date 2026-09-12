// Headless visual verification of the new Export button (CSV/PDF) on the
// project Proposal page.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-proposal-export.mjs

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

    await page.goto(`${APP_URL}/projects/${fixture.projectId}/proposal`);
    await page.locator("h1", { hasText: "Proposal" }).waitFor({ timeout: 20000 });
    // Sections populate asynchronously after rooms/proposal load — wait for the
    // sidebar room list before exporting, otherwise we'd race the empty initial state.
    await page.locator("aside").locator("text=Test Room").waitFor({ timeout: 20000 });
    await page.locator("aside").locator("text=Test Room").click();
    await page.locator('input[value="Laptop"]').waitFor({ timeout: 15000 });

    const exportBtn = page.locator('button:has-text("Export")').first();
    await exportBtn.waitFor({ timeout: 10000 });
    await exportBtn.click();
    await page.locator('button:has-text("Export as CSV")').waitFor({ timeout: 5000 });
    await page.screenshot({ path: `${OUT_DIR}proposal-export-menu.png`, clip: { x: 900, y: 60, width: 540, height: 220 } });
    console.log("Export dropdown opened with CSV/PDF options — screenshot saved");

    // CSV download
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 10000 }),
      page.locator('button:has-text("Export as CSV")').click(),
    ]);
    const csvPath = await download.path();
    const csvContent = csvPath ? readFileSync(csvPath, "utf8") : "";
    console.log("CSV downloaded as:", download.suggestedFilename());
    console.log("CSV first 300 chars:\n", csvContent.slice(0, 300));

    // PDF (print window) — reopen the export menu, then check a new page/tab opens
    await exportBtn.click();
    await page.locator('button:has-text("Export as PDF")').waitFor({ timeout: 5000 });
    const [popup] = await Promise.all([
      page.waitForEvent("popup", { timeout: 10000 }),
      page.locator('button:has-text("Export as PDF")').click(),
    ]);
    await popup.waitForLoadState("domcontentloaded");
    await popup.waitForTimeout(600);
    const title = await popup.title();
    console.log("PDF print window opened, title:", title);
    await popup.screenshot({ path: `${OUT_DIR}proposal-export-pdf.png`, fullPage: true });
    console.log("Screenshot of print-preview HTML saved");
  } finally {
    await browser.close();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
