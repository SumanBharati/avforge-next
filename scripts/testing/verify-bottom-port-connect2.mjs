import { chromium } from "playwright";
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;
const fixture = JSON.parse(readFileSync(new URL("./.fixture.json", import.meta.url), "utf8"));
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(`${APP_URL}/login`);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

  await page.goto(`${APP_URL}/designEngineering/signal-flow?project=${fixture.projectId}&room=${fixture.roomId}`);
  await page.locator("svg text", { hasText: "DTP3 T 203" }).first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(800);

  // Add a 5th port via Edit Equipment (right-click the device, not a port).
  await page.locator("svg text", { hasText: "DTP3 T 203" }).first().click({ button: "right" });
  await page.waitForTimeout(300);
  await page.locator("text=Edit equipment").click();
  await page.waitForTimeout(500);
  await page.locator("text=+ Add port").click();
  await page.waitForTimeout(200);
  // Fill the new port's label and set side to left, signal to analog_audio, to match siblings.
  const portRows = page.locator("text=PORTS").locator("xpath=following::div[contains(@class,'grid')][1]");
  // Simplify: just find the last label input in the ports section.
  const labelInputs = page.locator('input[placeholder="Label"], input[placeholder="e.g. HDMI In"]');
  await page.screenshot({ path: "scripts/testing/screenshots/bp2-modal-state.png" });

  await page.locator("button:has-text('Save Item')").click({ force: true }).catch(async () => {
    console.log("Save was disabled or blocked, trying to fill description first");
  });
  await page.waitForTimeout(1500);

  const { data: row1 } = await admin.from("tool_data").select("data").eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).eq("tool", "signal-flow").maybeSingle();
  console.log("Device 2 ports after add+save:", JSON.stringify(row1.data.devices.find(d=>d.id===2).ports.map(p=>({id:p.id,label:p.label,side:p.side}))));

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
