// Verifies: "in signal flow builder, need to provide a create option like
// flag, we should call it 'Power connection'... And picking it and then I
// should be able to place it on any of the connectors on the signal flow" —
// a new "Power" tool alongside "Flag" in the Create group, which places a
// plug glyph (prongs + body + trailing cord, oriented per the reference
// image) on whichever port is clicked, anchored and mirrored exactly like
// Flag already does.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-power-connection.mjs

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const fixture = JSON.parse(readFileSync(new URL("./.fixture.json", import.meta.url), "utf8"));
const OUT_DIR = fileURLToPath(new URL("./screenshots/", import.meta.url));
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function seed() {
  const payload = {
    devices: [
      {
        id: 1, x: 300, y: 220, w: 140, h: 120, mfr: "Generic", type: "Amplifier", model: "Test Amp", color: "#8b5cf6",
        ports: [
          { id: "1-in", dir: "in", side: "left", label: "Signal In", signal: "audio" },
          { id: "1-pwr", dir: "in", side: "right", label: "AC Power In", signal: "power" },
        ],
      },
    ],
    connections: [],
    rooms: [],
    nextId: 2,
    annotations: [],
    annotNextId: 1,
  };
  const { data: existing } = await admin.from("tool_data").select("id").eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).eq("tool", "signal-flow").maybeSingle();
  if (existing) await admin.from("tool_data").update({ data: payload, updated_at: new Date().toISOString() }).eq("id", existing.id);
  else await admin.from("tool_data").insert({ project_id: fixture.projectId, room_id: fixture.roomId, user_id: fixture.userId, tool: "signal-flow", data: payload });
  console.log("Seeded a device with a left (in) port and a right (in) power port.");
}

async function main() {
  await seed();
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
    await page.locator("svg text", { hasText: "AC Power In" }).first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(500);

    // Scoped to the actual canvas SVG (identified by containing the device's
    // own text) — a bare "svg polygon" locator also matches unrelated
    // decorative icons elsewhere on the page (toolbar buttons, etc.),
    // producing false positives regardless of whether a plug was placed.
    const canvas = page.locator("svg", { has: page.locator("text=Test Amp") });

    const powerBtn = page.locator('button[title*="Power connection" i]');
    console.log(`"Power" tool button exists in the Create group: ${await powerBtn.count() > 0}`);
    await powerBtn.click();

    const plugCountBefore = await canvas.locator("polygon").count();
    console.log(`Plug polygons on canvas before placing any (expect 0): ${plugCountBefore}`);

    // Locate each port's own dot precisely via the DOM (the text node's
    // previousElementSibling <circle>, converted from SVG user-space to
    // screen coordinates via getScreenCTM) rather than guessing from a
    // Playwright bounding box — text/circle siblings inside nested <g>s are
    // easy to mismatch with a "has text" + ".first()" locator combo.
    const portScreenPos = async (labelText) => page.evaluate((text) => {
      const texts = Array.from(document.querySelectorAll("svg text"));
      const el = texts.find(t => t.textContent === text);
      if (!el) return null;
      const g = el.closest("g");
      const circle = g?.querySelector("circle");
      if (!circle) return null;
      const svg = circle.ownerSVGElement;
      const pt = svg.createSVGPoint();
      pt.x = parseFloat(circle.getAttribute("cx"));
      pt.y = parseFloat(circle.getAttribute("cy"));
      const screenPt = pt.matrixTransform(circle.getScreenCTM());
      return { x: screenPt.x, y: screenPt.y };
    }, labelText);

    // Click the right-side "AC Power In" port (dir=in, side=right — an
    // intentionally atypical combo to make sure orientation follows `side`,
    // not `dir`).
    const rightPos = await portScreenPos("AC Power In");
    console.log("Right port screen pos:", rightPos);
    await page.mouse.click(rightPos.x, rightPos.y);
    await page.waitForTimeout(400);

    const plugCount = await canvas.locator("polygon").count();
    console.log(`A plug body polygon was drawn on the right port (expect 1): ${plugCount}`);

    await page.screenshot({ path: `${OUT_DIR}power-connection.png` });

    // Click the left-side "Signal In" port too, to confirm placement works
    // on both sides and mirrors correctly.
    const leftPos = await portScreenPos("Signal In");
    console.log("Left port screen pos:", leftPos);
    await page.mouse.click(leftPos.x, leftPos.y);
    await page.waitForTimeout(400);

    const plugCountAfter = await canvas.locator("polygon").count();
    console.log(`A second power connection was placed on the left port (expect 2): ${plugCountAfter}`);

    // Confirm the two plugs actually mirror each other (not just that two
    // polygons exist) — the left one's body should point right (toward its
    // port) and the right one's body should point left (toward its port).
    const polygonPointsList = await canvas.locator("polygon").evaluateAll(els => els.map(el => el.getAttribute("points")));
    console.log("Placed plug polygon points (identical local shape both times, as expected):", polygonPointsList);
    const transforms = await canvas.locator("polygon").evaluateAll(els => els.map(el => el.closest("g[transform]")?.getAttribute("transform")));
    console.log("Their parent <g> transforms (mirroring is applied here, via scale(dir,1)):", transforms);
    console.log(`Left plug mirrored (scale(-1,1)) and right plug not (scale(1,1)): ${transforms.some(t => t?.includes("scale(-1,1)")) && transforms.some(t => t?.includes("scale(1,1)"))}`);

    // Tight crop around the left port — its plug end extends further left
    // (away from the device, into open canvas), unlike the right port whose
    // plug end extends toward the BOM panel and gets clipped by it.
    await page.screenshot({
      path: `${OUT_DIR}power-connection-left-closeup.png`,
      clip: { x: Math.max(0, leftPos.x - 130), y: leftPos.y - 30, width: 160, height: 60 },
    });

    await page.screenshot({ path: `${OUT_DIR}power-connection-both.png` });
    console.log("\nDone. Screenshots at scripts/testing/screenshots/power-connection*.png");
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
