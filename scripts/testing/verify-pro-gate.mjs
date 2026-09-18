// One-off verification for the AVGenix Pro paywall: confirms org loading
// still works after the 021_org_subscription.sql migration, PRO badges
// render in the nav for a free org, clicking a Pro nav item shows the
// upgrade modal without navigating, and hitting a Pro URL directly
// redirects to /home with the modal open.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-pro-gate.mjs

import { chromium } from "playwright";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });

  await page.goto(`${APP_URL}/login`);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
  await page.waitForTimeout(1500);

  console.log("Landed on:", page.url());

  const orgSwitcherText = await page.locator("header").innerText().catch(() => "");
  console.log("Header text snippet:", orgSwitcherText.slice(0, 200).replace(/\n/g, " | "));

  const proBadgeCount = await page.locator("header nav >> text=Pro").count();
  console.log("PRO badges visible in nav:", proBadgeCount);

  await page.locator("header nav a", { hasText: "Projects" }).first().click();
  await page.waitForTimeout(800);
  const urlAfterClick = page.url();
  const modalVisible = await page.locator("text=Unlock project tools").count();
  console.log("URL after clicking Projects nav item:", urlAfterClick);
  console.log("Upgrade modal visible:", modalVisible > 0);

  await page.screenshot({ path: "scripts/testing/screenshots/pro-gate-check.png" });

  await page.locator("text=Continue with free tools").click().catch(() => {});
  await page.goto(`${APP_URL}/projects`);
  await page.waitForTimeout(1000);
  console.log("URL after direct /projects visit:", page.url());
  const modalVisible2 = await page.locator("text=Unlock project tools").count();
  console.log("Upgrade modal visible after direct visit:", modalVisible2 > 0);

  console.log("Console/page errors captured:", errors.length ? errors : "none");

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
