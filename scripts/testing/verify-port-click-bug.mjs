// Reproduces: "difficulty connecting to a newly added port, or the bottom
// most port" in Signal Flow Builder. Opens the seeded device (6 left
// ports), inspects each port's actual DOM geometry, checks what element
// is topmost at the last port's screen coordinates (elementFromPoint),
// then adds a 7th port via the Edit Equipment modal and re-checks.
import { chromium } from "playwright";
import { readFileSync } from "fs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;
const fixture = JSON.parse(readFileSync(new URL("./.fixture.json", import.meta.url), "utf8"));

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

  await page.goto(`${APP_URL}/login`);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

  await page.goto(`${APP_URL}/designEngineering/signal-flow?project=${fixture.projectId}&room=${fixture.roomId}`);
  await page.locator("svg text", { hasText: "CX404V" }).first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(800);

  // Click the device to select it (matches a common real-world state:
  // device selected while trying to wire it up).
  await page.locator("svg text", { hasText: "CX404V" }).first().click();
  await page.waitForTimeout(300);

  const report = await page.evaluate(() => {
    const ports = Array.from(document.querySelectorAll("svg circle")).filter((c) => {
      const r = parseFloat(c.getAttribute("r"));
      return r === 5 || r === 6;
    });
    return ports.map((c) => {
      const cx = parseFloat(c.getAttribute("cx"));
      const cy = parseFloat(c.getAttribute("cy"));
      const rect = c.getBoundingClientRect();
      const screenX = rect.left + rect.width / 2;
      const screenY = rect.top + rect.height / 2;
      const topEl = document.elementFromPoint(screenX, screenY);
      const topElDesc = topEl ? `${topEl.tagName}${topEl.getAttribute("fill") ? "[fill=" + topEl.getAttribute("fill") + "]" : ""}` : "none";
      const isPortCircle = topEl === c;
      return { cx, cy, screenX: Math.round(screenX), screenY: Math.round(screenY), topElDesc, clickHitsThisCircle: isPortCircle };
    });
  });
  console.log("Port circles found:", report.length);
  report.forEach((p, i) => console.log(`  Port ${i}: cy=${p.cy} screenY=${p.screenY} topmostElementHere=${p.topElDesc} clickReachesPort=${p.clickHitsThisCircle}`));

  await page.screenshot({ path: "scripts/testing/screenshots/port-click-bug-before.png" });

  // Now add a 7th port via Edit Equipment and re-check.
  await page.locator("svg text", { hasText: "CX404V" }).first().click({ button: "right" });
  await page.waitForTimeout(300);
  await page.locator("text=Edit equipment").click();
  await page.waitForTimeout(500);
  await page.locator("text=+ Add port").click();
  await page.waitForTimeout(300);
  await page.locator("button:has-text('Save Item')").click();
  await page.waitForTimeout(1500);

  const report2 = await page.evaluate(() => {
    const ports = Array.from(document.querySelectorAll("svg circle")).filter((c) => {
      const r = parseFloat(c.getAttribute("r"));
      return r === 5 || r === 6;
    });
    return ports.map((c) => {
      const rect = c.getBoundingClientRect();
      const screenX = rect.left + rect.width / 2;
      const screenY = rect.top + rect.height / 2;
      const topEl = document.elementFromPoint(screenX, screenY);
      const isPortCircle = topEl === c;
      return { cy: parseFloat(c.getAttribute("cy")), screenY: Math.round(screenY), clickReachesPort: isPortCircle, topEl: topEl ? topEl.outerHTML.slice(0, 120) : "none" };
    });
  });
  console.log("\nAfter adding a 7th port:");
  report2.forEach((p, i) => console.log(`  Port ${i}: cy=${p.cy} screenY=${p.screenY} clickReachesPort=${p.clickReachesPort}${p.clickReachesPort ? "" : "  <-- BLOCKED by: " + p.topEl}`));

  await page.screenshot({ path: "scripts/testing/screenshots/port-click-bug-after.png" });

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
