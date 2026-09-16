// Verifies: "provide an Update with AI button on the products that are
// already in the library, so that if the user wants to update using
// screenshots, they can. It should function the same way as Create with AI
// work for creating equipment database." — the AI photo-import panel, which
// used to show only on the Add modals, now also shows on both Edit modals
// (Org Equipment Library's Edit Item, and the AV Forge Library admin's Edit
// Product), labeled "Update with AI" instead of "Fill in with AI".
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-update-with-ai.mjs

import { chromium } from "playwright";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.on("pageerror", err => console.log("PAGEERROR:", err.message));

  try {
    await page.goto(`${APP_URL}/login`);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    // 1. Org Equipment Library — Edit Item.
    await page.goto(`${APP_URL}/inventory?section=org`);
    await page.waitForTimeout(1500);
    await page.locator('tbody tr').first().dblclick();
    await page.waitForTimeout(400);
    console.log(`Org library Edit modal shows "Update with AI": ${await page.locator('text=Update with AI').count() > 0}`);
    await page.screenshot({ path: "scripts/testing/screenshots/update-with-ai-org.png" });
    await page.locator('button:has-text("Cancel")').first().click();
    await page.waitForTimeout(300);

    // 2. AV Forge Library (admin) — Edit Product.
    await page.goto(`${APP_URL}/inventory?section=avforge`);
    await page.waitForTimeout(1500);
    await page.locator('tbody tr').first().locator('button[title="Edit"]').click();
    await page.waitForTimeout(400);
    console.log(`AV Forge Library Edit modal shows "Update with AI": ${await page.locator('text=Update with AI').count() > 0}`);
    await page.screenshot({ path: "scripts/testing/screenshots/update-with-ai-avforge.png" });

    console.log("\nDone. Screenshots at scripts/testing/screenshots/update-with-ai-*.png");
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
