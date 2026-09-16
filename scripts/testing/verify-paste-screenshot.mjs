// Verifies: "take a snip and then Ctrl+C, then paste it on our app" — the AI
// photo-import panel now accepts a clipboard paste (Ctrl+V) of an image,
// e.g. straight out of the Windows Snipping Tool, instead of requiring the
// user to save the snip to a file first and then use the Photo upload
// button.
//
// Playwright can't drive the real OS clipboard/Snipping Tool, so this
// simulates what that produces: a synthetic ClipboardEvent carrying an
// image File, dispatched on `document` (matching how the app's own listener
// is attached) via CDP's Input.dispatchKeyEvent-free DOM-level dispatch.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-paste-screenshot.mjs

import { chromium } from "playwright";
import { readFileSync } from "fs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
  page.on("pageerror", err => console.log("PAGEERROR:", err.message));

  const imgBase64 = readFileSync(new URL("./screenshots/ai-scope-button.png", import.meta.url)).toString("base64");

  try {
    await page.goto(`${APP_URL}/login`);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    await page.goto(`${APP_URL}/inventory?section=org`);
    await page.waitForTimeout(1500);
    await page.locator('button:has-text("Add Equipment")').first().click();
    await page.waitForTimeout(400);

    console.log(`Photo count before paste: ${await page.locator('.group.relative.h-14.w-14').count()}`);

    // Dispatch a synthetic paste event carrying an image File, same shape a
    // real clipboard paste of a screenshot produces.
    await page.evaluate(async (b64) => {
      const res = await fetch(`data:image/png;base64,${b64}`);
      const blob = await res.blob();
      const file = new File([blob], "snip.png", { type: "image/png" });
      const dt = new DataTransfer();
      dt.items.add(file);
      const evt = new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: dt });
      document.dispatchEvent(evt);
    }, imgBase64);
    await page.waitForTimeout(800);

    const photoCount = await page.locator('.group.relative.h-14.w-14').count();
    console.log(`Photo count after simulated Ctrl+V paste (expect 1): ${photoCount}`);
    console.log(`"Analyze Photos" is now enabled: ${await page.locator('button:has-text("Analyze Photos")').isEnabled()}`);

    await page.screenshot({ path: "scripts/testing/screenshots/paste-screenshot.png" });
    console.log("\nDone. Screenshot at scripts/testing/screenshots/paste-screenshot.png");
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
