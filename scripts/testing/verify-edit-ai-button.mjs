// Verifies the "Update with AI" button is now visible in the shared
// Edit Equipment modal for all three canvas tools (Signal Flow Builder,
// Room Designer, Rack Builder) — showAIImport was previously omitted
// from Signal Flow's and Room Designer's EquipmentFormModal render, so
// the button never actually appeared there despite reusing the shared
// component.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-edit-ai-button.mjs

import { chromium } from "playwright";
import { readFileSync } from "fs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;
const fixture = JSON.parse(readFileSync(new URL("./.fixture.json", import.meta.url), "utf8"));

async function checkTool(page, label, url, deviceTextSelector) {
  await page.goto(url);
  await page.locator(deviceTextSelector).first().waitFor({ timeout: 20000 });
  await page.locator(deviceTextSelector).first().click({ button: "right" });
  await page.waitForTimeout(300);
  await page.locator("text=Edit equipment").click();
  await page.waitForTimeout(500);
  const hasAI = await page.locator("text=/Update with AI|Fill in with AI/i").count();
  console.log(`${label}: AI-assist button visible = ${hasAI > 0}`);
  await page.locator("button:has-text('Cancel')").first().click().catch(() => {});
  await page.waitForTimeout(300);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(`${APP_URL}/login`);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

  await checkTool(page, "Signal Flow Builder", `${APP_URL}/designEngineering/signal-flow?project=${fixture.projectId}&room=${fixture.roomId}`, "svg text");
  await checkTool(page, "Rack Builder", `${APP_URL}/designEngineering/rack-planner?project=${fixture.projectId}&room=${fixture.roomId}`, "text=QSC CX404V");

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
