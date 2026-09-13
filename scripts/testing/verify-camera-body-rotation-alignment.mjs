// Verifies the fix for: "the angle dotted lines seem to be rotating well,
// however the camera rectangle does not rotate correctly."
//
// Root cause: the body rect's rotation used `camRot = 90 - facingA_deg`.
// That formula only coincidentally matches the geometrically-correct
// `camRot = facingA_deg - 90` at the four cardinal angles (0/90/180/270,
// where they're equal mod 180° — meaning visually identical, since the rect
// is point-symmetric) — which is exactly why cardinal-wall cameras always
// looked right. At any other angle, such as one produced by the new manual
// rotate popup, the two formulas diverge by 90°, so the body rendered
// perpendicular to its actual facing direction instead of aligned with it.
//
// Checks the body's long axis is aligned with the FOV cone's own bisector
// direction (facingA) at a genuinely non-cardinal angle (north + 45°),
// not just at the four cardinal mounts where the old bug was invisible.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-camera-body-rotation-alignment.mjs

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
  // North-mounted (facingA=90°) with a +45° manual override -> facingA=135°,
  // a genuinely non-cardinal angle where the old bug diverged.
  const designData = {
    devices: [
      { uid: 9022, id: "ptz-cam", name: "Body Alignment Test Camera", icon: "confbar", w: 0.5, h: 0.4, wall: "front", type: "camera", color: "#22c55e", x: 8, y: 0.1, z: 5, mountWall: "north", hfov: 70, facingOverrideDeg: 45 },
    ],
    config: {
      roomType: "medium", roomW: 16, roomL: 20, roomH: 9,
      tableShape: "rectangular", tableSeats: 8, tableWidth: 4, tableWallDist: 4,
      showTable: true, selectedWall: "north", placedDoors: [], annotations: [],
    },
  };
  const { data: existing } = await admin.from("room_designs").select("id").eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).maybeSingle();
  if (existing) await admin.from("room_designs").update({ data: designData, updated_at: new Date().toISOString() }).eq("id", existing.id);
  else await admin.from("room_designs").insert({ project_id: fixture.projectId, room_id: fixture.roomId, user_id: fixture.userId, data: designData });
  console.log("Seeded a camera at facingA=135° (north wall + 45° manual override).");
}

async function main() {
  await seed();

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

  try {
    await page.goto(`${APP_URL}/login`);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    const rdUrl = `${APP_URL}/designEngineering/room-designer?project=${fixture.projectId}&room=${fixture.roomId}`;
    await page.goto(rdUrl);
    await page.locator("svg text", { hasText: "Body Alignment Test Camera" }).first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT_DIR}camera-body-alignment.png` });

    const info = await page.evaluate(() => {
      const textEl = [...document.querySelectorAll("svg text")].find((t) => t.textContent === "Body Alignment Test Camera");
      const group = textEl.closest("g");
      // The body's rotate() transform (on the inner <g> wrapping the 16x10 rect).
      const rotatedGroups = [...group.querySelectorAll("g[transform*='rotate']")];
      const bodyG = rotatedGroups.find(g => g.querySelector("rect[width='16']"));
      const transform = bodyG.getAttribute("transform");
      const camRot = +transform.match(/rotate\(([-\d.]+)/)[1];
      // The FOV dashed lines' actual directions, to derive the true facingA independently.
      const lines = [...group.querySelectorAll("line[stroke-dasharray]")];
      const dirs = lines.map(l => {
        const x1 = +l.getAttribute("x1"), y1 = +l.getAttribute("y1"), x2 = +l.getAttribute("x2"), y2 = +l.getAttribute("y2");
        return Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
      });
      // facingA (degrees) is the bisector of the two line directions.
      let [a1, a2] = dirs;
      let mid = (a1 + a2) / 2;
      // handle wraparound
      if (Math.abs(a1 - a2) > 180) mid += 180;
      return { camRot, lineDirs: dirs, facingA: mid };
    });
    console.log("Camera body rotate() angle:", info.camRot);
    console.log("FOV line directions:", info.lineDirs, "-> derived facingA (bisector):", info.facingA);

    // The body's long axis (originally at screen-angle 0°) after rotating by
    // camRot should be perpendicular to facingA, i.e. camRot ≡ facingA±90 (mod 180).
    const diff = ((info.camRot - (info.facingA - 90)) % 180 + 180) % 180;
    const aligned = diff < 2 || diff > 178;
    console.log("Body axis correctly perpendicular to facing direction (aligned):", aligned ? "YES (fixed)" : `NO (off by ~${Math.min(diff,180-diff).toFixed(1)}°)`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
