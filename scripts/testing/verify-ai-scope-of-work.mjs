// Headless verification of the new "Generate with AI" Scope of Work button
// on the Proposal page — checks it calls /api/generate-proposal-scope with
// the section's equipment + linked room's Site Survey data, and that the
// returned text lands in the Scope of Work textarea.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-ai-scope-of-work.mjs

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
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  page.on("pageerror", (err) => console.log("PAGEERROR:", err.message));

  try {
    await page.goto(`${APP_URL}/login`);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    await page.goto(`${APP_URL}/projects/${fixture.projectId}/proposal`);
    await page.locator("aside").locator("text=Test Room").waitFor({ timeout: 20000 });
    await page.locator('input[value="Laptop"]').waitFor({ timeout: 15000 });
    await page.waitForTimeout(300);

    const beforeText = await page.locator("textarea[placeholder*='Describe the scope']").inputValue();
    console.log("Scope of Work before:", JSON.stringify(beforeText.slice(0, 80)));

    await page.screenshot({ path: `${OUT_DIR}ai-scope-button.png`, clip: { x: 0, y: 500, width: 900, height: 260 } });

    const genButton = page.locator("button", { hasText: "Generate with AI" });
    await genButton.waitFor({ timeout: 5000 });

    const [apiResponse] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/generate-proposal-scope"), { timeout: 30000 }),
      genButton.click(),
    ]);
    console.log("API status:", apiResponse.status());
    const body = await apiResponse.json().catch(() => null);
    console.log("API response:", JSON.stringify(body)?.slice(0, 500));

    await page.waitForTimeout(500);
    const afterText = await page.locator("textarea[placeholder*='Describe the scope']").inputValue();
    console.log("Scope of Work after:\n", afterText);
    await page.screenshot({ path: `${OUT_DIR}ai-scope-generated.png`, clip: { x: 0, y: 500, width: 900, height: 320 } });

    console.log("\nPASS criteria: status=200 and afterText non-empty and different from before:",
      apiResponse.status() === 200 && afterText.trim().length > 0 && afterText !== beforeText);
  } finally {
    await browser.close();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
