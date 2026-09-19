// Verifies right-clicking a device's TEXT LABEL (not its icon) opens the
// context menu — "control" type devices (touch panels, cable cubby, etc.)
// rendered their label outside the icon's own clickable bounds with no
// hit-area padding connecting them, so a right-click precisely on the text
// fell through to the canvas instead of opening Edit/Replace/Delete.
import { chromium } from "playwright";
import { readFileSync } from "fs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;
const fixture = JSON.parse(readFileSync(new URL("./.fixture.json", import.meta.url), "utf8"));

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

  await page.goto(`${APP_URL}/login`);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

  await page.goto(`${APP_URL}/designEngineering/room-designer?project=${fixture.projectId}&room=${fixture.roomId}`);
  await page.locator("text=Logitech Tap IP").first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(1500);

  // Get the EXACT screen coords of the text label element itself. Use a
  // separate mouse.down/wait/up (not the atomic .click() shorthand) so
  // there's real time for React's mousedown-triggered state update (which
  // used to fire on ANY button, including right-click) to actually flush
  // to the DOM before the browser dispatches contextmenu — matching a real
  // user's timing, where this race previously let the click land on
  // newly-appeared selection-decoration elements instead of the device.
  const box = await page.locator("text=Logitech Tap IP").first().boundingBox();
  console.log("Text label bounding box:", box);
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down({ button: "right" });
  await page.waitForTimeout(150);
  await page.mouse.up({ button: "right" });
  await page.waitForTimeout(500);

  const menuVisible = await page.locator("text=Edit equipment").count() > 0;
  console.log("Context menu opened from a real click on the text label:", menuVisible);
  console.log("Replace option present:", await page.locator("text=Replace").count() > 0);

  await page.screenshot({ path: "scripts/testing/screenshots/text-label-context-menu.png" });
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
