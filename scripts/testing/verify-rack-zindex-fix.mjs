// Verifies the z-index fix: EquipmentFormModal (z-[200]) now paints above
// Rack Builder's "Power Calculations" floating panel (zIndex:50), which
// previously tied with the modal's old z-50 and could render on top of it.
import { chromium } from "playwright";
import { readFileSync } from "fs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;
const fixture = JSON.parse(readFileSync(new URL("./.fixture.json", import.meta.url), "utf8"));

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(`${APP_URL}/login`);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

  await page.goto(`${APP_URL}/designEngineering/rack-planner?project=${fixture.projectId}&room=${fixture.roomId}`);
  await page.locator("text=Power Calculations").first().waitFor({ timeout: 20000 }).catch(() => console.log("Power Calculations panel not found on load"));
  await page.locator("text=Test Amp").first().click({ button: "right" });
  await page.waitForTimeout(300);
  await page.locator("text=Edit equipment").click();
  await page.waitForTimeout(500);

  const modalZ = await page.locator("text=Edit Equipment").first().evaluate((el) => {
    let node = el;
    while (node && node.parentElement) {
      const z = getComputedStyle(node).zIndex;
      if (z && z !== "auto") return z;
      node = node.parentElement;
    }
    return null;
  });
  console.log("Modal effective z-index:", modalZ);

  await page.screenshot({ path: "scripts/testing/screenshots/rack-zindex-fix.png" });
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
