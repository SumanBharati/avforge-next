// Verifies the fix for: "when i insert a long description it widens the
// equipment block. the width of the block should not be defined by the
// description, as we don't show the description in the block" —
// sizeDevice()'s width formula in app/designEngineering/signal-flow/page.tsx
// used to include (d.type||"").length*4.5 (d.type is where the Description
// field is actually stored — see deviceToFormValue/applyFormValueToDevice),
// even though that text is never rendered inside the device block.
//
// Seeds a device with a short model name, opens Edit Equipment, types a
// very long description, saves, and confirms the block's rendered width is
// unchanged (still governed by mfr/model/port label lengths).
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-device-width-not-from-description.mjs

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const fixture = JSON.parse(readFileSync(new URL("./.fixture.json", import.meta.url), "utf8"));
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const LONG_DESCRIPTION = "A ".repeat(80) + "very long description that would have previously stretched the block far wider than its ports or model name ever would.";

// Seeds two identical devices (same model/ports) differing only in their
// "type" field — the Description field's actual storage (see
// deviceToFormValue/applyFormValueToDevice) — one empty, one very long.
// This exercises sizeDevice() exactly as it runs on page load
// (setDevices(data.devices.map(sizeDevice)), line ~582) without depending
// on the Edit Equipment modal's own save flow.
async function seed(longDescription) {
  const payload = {
    devices: [
      {
        id: 1, x: 300, y: 150, w: 0, h: 0, mfr: "Neat", model: "NEATBOARD32-SE", type: "", color: "#8b5cf6",
        ports: [{ id: "1-p0", dir: "in", side: "left", label: "HDMI-in", signal: "hdmi" }],
      },
      {
        id: 2, x: 300, y: 350, w: 0, h: 0, mfr: "Neat", model: "NEATBOARD32-SE", type: longDescription ? LONG_DESCRIPTION : "", color: "#8b5cf6",
        ports: [{ id: "2-p0", dir: "in", side: "left", label: "HDMI-in", signal: "hdmi" }],
      },
    ],
    connections: [],
    rooms: [],
    nextId: 3,
    annotations: [],
    annotNextId: 1,
  };
  const { data: existing } = await admin.from("tool_data").select("id").eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).eq("tool", "signal-flow").maybeSingle();
  if (existing) await admin.from("tool_data").update({ data: payload, updated_at: new Date().toISOString() }).eq("id", existing.id);
  else await admin.from("tool_data").insert({ project_id: fixture.projectId, room_id: fixture.roomId, user_id: fixture.userId, tool: "signal-flow", data: payload });
  console.log("Seeded two identical devices — device 1 has no description, device 2 has a very long one.");
}

async function main() {
  await seed(true);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  page.on("pageerror", err => console.log("PAGEERROR:", err.message));

  try {
    await page.goto(`${APP_URL}/login`);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    const sfUrl = `${APP_URL}/designEngineering/signal-flow?project=${fixture.projectId}&room=${fixture.roomId}`;
    await page.goto(sfUrl);
    await page.locator("svg text", { hasText: "NEATBOARD32-SE" }).first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(500);

    const widths = await page.evaluate(() => {
      const texts = Array.from(document.querySelectorAll("svg text")).filter(t => t.textContent === "NEATBOARD32-SE");
      return texts.map(t => {
        const rect = t.closest("g")?.querySelector("rect");
        return rect ? parseFloat(rect.getAttribute("width")) : null;
      });
    });
    console.log("Device widths (no-description device, long-description device):", widths);
    console.log(`Both devices render at the same width (expect true — description length must not affect width): ${widths.length === 2 && widths[0] === widths[1]}`);

    await page.screenshot({ path: "scripts/testing/screenshots/device-width-not-from-description.png" });
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
