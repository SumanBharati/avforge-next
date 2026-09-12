// One-off visual check for the device-block text change: Category above,
// then Manufacturer/Model inside, then Part Number only if present (no more
// falling back to the Description/type field). Temporarily overwrites the
// shared fixture room's Signal Flow data with three devices covering the
// cases (full mfr+model+part#, mfr+model only, and no library binding at
// all) — re-run seed-fixture.mjs afterward to restore the standard baseline
// other verify-*.mjs scripts rely on.
//
// Usage: node --env-file=.env.local scripts/testing/verify-device-block-text.mjs

import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;
const fixture = JSON.parse(readFileSync(new URL("./.fixture.json", import.meta.url), "utf8"));
const OUT_DIR = fileURLToPath(new URL("./screenshots/", import.meta.url));

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  const data = {
    devices: [
      { id: 1, type: "Extron DTP T USW 233", cat: "Transmitter", mfr: "Extron", model: "DTP T USW 233", part_number: "60-1781-01", color: "#8b5cf6", x: 300, y: 120, w: 160, h: 70, rackMounted: false, ports: [{ id: "1-p0", side: "right", signal: "hdmi", dir: "out", label: "HDMI" }] },
      { id: 2, type: "Display / TV", cat: "Display", mfr: "Samsung", model: "QM85B", color: "#8b5cf6", x: 300, y: 260, w: 160, h: 70, rackMounted: false, ports: [{ id: "2-p0", side: "left", signal: "hdmi", dir: "in", label: "HDMI" }] },
      { id: 3, type: "Custom Speaker Box", mfr: "Generic", model: "", color: "#64748b", x: 300, y: 400, w: 160, h: 70, rackMounted: false, ports: [] },
    ],
    connections: [], rooms: [], annotations: [], nextId: 4, annotNextId: 1,
  };
  await admin.from("tool_data").update({ data }).eq("project_id", fixture.projectId).eq("tool", "signal-flow").eq("room_id", fixture.roomId);
  console.log("Seeded 3 test devices: full (mfr+model+part#), mfr+model only, custom/no-binding");

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  try {
    await page.goto(`${APP_URL}/login`);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    const sfUrl = `${APP_URL}/designEngineering/signal-flow?project=${fixture.projectId}&room=${fixture.roomId}`;
    await page.goto(sfUrl);
    const canvas = page.locator("#sf-canvas-export");
    await canvas.locator("svg text", { hasText: "Extron" }).first().waitFor({ timeout: 20000 });
    await page.screenshot({ path: `${OUT_DIR}device-block-text.png`, clip: { x: 260, y: 350, width: 500, height: 420 } });
    console.log("Screenshot saved: device-block-text.png");
  } finally {
    await browser.close();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
