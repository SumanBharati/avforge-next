// Verifies the new "Replace" context-menu option: right-click a device,
// click Replace, search the AVGenix library, pick a product, confirm —
// the device should get the new mfr/model/ports while keeping its x/y
// position and id, the matching "HDMI" port's connection should survive
// (same port label carries over), and the non-matching "RS232" port's
// connection should be pruned.
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
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

  await page.goto(`${APP_URL}/login`);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

  await page.goto(`${APP_URL}/designEngineering/signal-flow?project=${fixture.projectId}&room=${fixture.roomId}`);
  await page.locator("svg text", { hasText: "OldModel" }).first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(800);

  await page.locator("svg text", { hasText: "OldModel" }).first().click({ button: "right" });
  await page.waitForTimeout(300);
  const replaceBtn = page.locator("text=Replace");
  console.log("Replace button visible in context menu:", await replaceBtn.count() > 0);
  await replaceBtn.click();
  await page.waitForTimeout(400);

  const modalTitle = await page.locator("text=Replace Equipment").count();
  console.log("Modal shows 'Replace Equipment' title:", modalTitle > 0);

  await page.locator('input[placeholder="Search by Make, Model, Part#..."]').fill("Generic Projector");
  await page.waitForTimeout(700);
  await page.screenshot({ path: "scripts/testing/screenshots/replace-equipment-0-search.png" });
  const globalBtn = page.locator("text=Search in Global Library");
  if (await globalBtn.count()) {
    await globalBtn.click();
    await page.waitForTimeout(700);
  }
  await page.screenshot({ path: "scripts/testing/screenshots/replace-equipment-1-results.png" });
  await page.locator("text=Generic Projector").first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "scripts/testing/screenshots/replace-equipment-2-selected.png" });
  await page.locator("button:has-text('Replace')").last().click();
  await page.waitForTimeout(1000);

  await page.screenshot({ path: "scripts/testing/screenshots/replace-equipment.png" });

  await page.waitForTimeout(2000); // allow autosave debounce
  const { data: row } = await admin.from("tool_data").select("data").eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).eq("tool", "signal-flow").maybeSingle();
  const dev2 = row.data.devices.find(d => d.id === 2);
  console.log("\nDevice 2 after replace:", JSON.stringify({ mfr: dev2.mfr, model: dev2.model, x: dev2.x, y: dev2.y, ports: dev2.ports.map(p=>({id:p.id,label:p.label})) }));
  console.log("Position preserved (x=500,y=500):", dev2.x === 500 && dev2.y === 500);

  console.log("\nConnections after replace:", JSON.stringify(row.data.connections));
  const hdmiConnSurvived = row.data.connections.some(c => c.id === 9001);
  const rs232ConnPruned = !row.data.connections.some(c => c.id === 9002);
  console.log("HDMI connection (9001) survived:", hdmiConnSurvived);
  console.log("RS232 connection (9002) pruned (no matching port on new device):", rs232ConnPruned);

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
