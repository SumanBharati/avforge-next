// Headless verification that "Export PDF" on Signal Flow and Room Designer
// prints with the light palette even while the app is in dark theme, and
// that the dark theme comes back once printing finishes.
//
// window.print() is stubbed so no dialog opens: the stub fires beforeprint
// (as the browser would), records the theme/colors at that moment, and
// screenshots the page in print media before firing afterprint.
//
// Prereqs: node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-print-light-theme.mjs

import { chromium } from "playwright";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;
const fixture = JSON.parse(readFileSync(new URL("./.fixture.json", import.meta.url), "utf8"));

if (!EMAIL || !PASSWORD) {
  console.error("Missing PLAYWRIGHT_TEST_EMAIL/PASSWORD — run with node --env-file=.env.local");
  process.exit(1);
}

const OUT_DIR = fileURLToPath(new URL("./screenshots/", import.meta.url));

const PAGES = [
  { name: "signal-flow", path: "/designEngineering/signal-flow", ready: (page) => page.locator("svg text", { hasText: "Laptop" }) },
  { name: "room-designer", path: "/designEngineering/room-designer", ready: (page) => page.locator("#rd-canvas-export") },
];

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const consoleErrors = [];
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  let failed = false;
  try {
    // Sign-in lives in the header's "Log In" popup; /login only redirects.
    await page.goto(`${APP_URL}/`);
    await page.evaluate(() => localStorage.setItem("avgenix-theme", "dark"));
    await page.locator("button", { hasText: /^Log In$/ }).first().click();
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.locator("button", { hasText: /^Log In$/ }).first().waitFor({ state: "detached", timeout: 15000 });

    for (const p of PAGES) {
      await page.goto(`${APP_URL}${p.path}?project=${fixture.projectId}&room=${fixture.roomId}`);
      await p.ready(page).first().waitFor({ timeout: 20000 }).catch(async (err) => {
        await page.screenshot({ path: `${OUT_DIR}print-light-${p.name}-not-ready.png` });
        throw err;
      });
      await page.waitForTimeout(1000);

      const readColors = () => page.evaluate(() => {
        const root = document.documentElement;
        const cs = getComputedStyle(root);
        return {
          theme: root.getAttribute("data-theme"),
          surface: cs.getPropertyValue("--forge-surface").trim(),
          text: cs.getPropertyValue("--text-body").trim(),
        };
      });

      const onScreen = await readColors();
      await page.evaluate(() => {
        window.__printSnap = null;
        window.print = () => {
          window.dispatchEvent(new Event("beforeprint"));
          const root = document.documentElement;
          const cs = getComputedStyle(root);
          window.__printSnap = {
            theme: root.getAttribute("data-theme"),
            surface: cs.getPropertyValue("--forge-surface").trim(),
            text: cs.getPropertyValue("--text-body").trim(),
          };
        };
      });

      await page.locator("button", { hasText: "Export PDF" }).first().click();
      await page.waitForFunction(() => window.__printSnap !== null, null, { timeout: 5000 });
      const whilePrinting = await page.evaluate(() => window.__printSnap);

      await page.emulateMedia({ media: "print" });
      await page.screenshot({ path: `${OUT_DIR}print-light-${p.name}.png` });
      await page.emulateMedia({ media: "screen" });

      await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
      await page.waitForTimeout(300);
      const afterPrint = await readColors();

      const ok = onScreen.theme === "dark" && whilePrinting.theme === "light"
        && whilePrinting.surface !== onScreen.surface && afterPrint.theme === "dark"
        && afterPrint.surface === onScreen.surface;
      if (!ok) failed = true;
      console.log(`${ok ? "PASS" : "FAIL"} ${p.name}`, JSON.stringify({ onScreen, whilePrinting, afterPrint }));
      await page.screenshot({ path: `${OUT_DIR}print-light-${p.name}-after.png` });
    }
  } finally {
    await browser.close();
  }

  if (consoleErrors.length) console.log("CONSOLE ERRORS:", consoleErrors);
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
