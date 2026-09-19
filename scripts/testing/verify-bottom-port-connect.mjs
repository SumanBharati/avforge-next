// Directly tests the reported bug: clicking the bottom-most port on a
// multi-port device connects to the port ABOVE it instead. Starts a
// connection from a source device's single output port, then clicks
// precisely on "Input 6" (the last/bottom port of the 6-port amp) and
// inspects the resulting connection record's actual portId + label.
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
  await page.locator("svg text", { hasText: "Input 6" }).first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(800);

  // Get exact screen coords of the "Out 1" port dot (small circle next to its label).
  const outPortCoords = await page.evaluate(() => {
    const texts = Array.from(document.querySelectorAll("svg text"));
    const label = texts.find(t => t.textContent === "Out 1");
    const g = label.closest("g");
    const circle = g.querySelector("circle");
    const r = circle.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  const in6Coords = await page.evaluate(() => {
    const texts = Array.from(document.querySelectorAll("svg text"));
    const label = texts.find(t => t.textContent === "Input 6");
    const g = label.closest("g");
    const circle = g.querySelector("circle");
    const r = circle.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  console.log("Out 1 port screen coords:", outPortCoords);
  console.log("Input 6 port screen coords:", in6Coords);

  await page.screenshot({ path: "scripts/testing/screenshots/bottom-port-connect-0-before.png" });

  // Click Out 1 to start the connection.
  await page.mouse.click(outPortCoords.x, outPortCoords.y);
  await page.waitForTimeout(300);
  await page.screenshot({ path: "scripts/testing/screenshots/bottom-port-connect-1-afterstart.png" });
  // Click Input 6 to complete it.
  await page.mouse.click(in6Coords.x, in6Coords.y);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "scripts/testing/screenshots/bottom-port-connect-2-afterend.png" });

  const { data: row } = await admin.from("tool_data").select("data").eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).eq("tool", "signal-flow").maybeSingle();
  console.log("\nConnections in DB:", JSON.stringify(row.data.connections));
  const conn = row.data.connections[row.data.connections.length - 1];
  if (conn) {
    const toDev = row.data.devices.find(d => d.id === conn.to.deviceId);
    const toPort = toDev.ports.find(p => p.id === conn.to.portId);
    console.log("Connection actually landed on port:", toPort ? toPort.label : "UNKNOWN/" + conn.to.portId);
    console.log("Expected: Input 6.  Bug reproduced if this says Input 5 or anything else.");
  } else {
    console.log("No connection was created at all.");
  }

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
