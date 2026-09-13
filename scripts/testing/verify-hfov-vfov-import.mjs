// Verifies the fix for: "on Crestron I12, I saved HFOV/VFOV in my
// organization library, but when I imported it to Signal Flow, it didn't
// show that value."
//
// Root cause: every place Signal Flow Builder turns an org-library or
// AV Forge Library product into a canvas device (initial search-add, both
// global and org-scoped, and both "Refresh from Library" actions) built the
// new device object field-by-field and simply omitted hfov_deg/vfov_deg/
// coverage_* — even though the Edit Equipment modal already reads and writes
// those exact fields (deviceToFormValue/applyFormValueToDevice), so editing
// a device manually always worked, but importing one from the library
// silently dropped its FOV/coverage spec.
//
// Seeds a camera-type item with real HFOV/VFOV into the fixture org's
// equipment_library, adds it via Signal Flow's "Add Equipment" search, opens
// Edit Equipment on the newly-placed device, and checks the HFOV/VFOV inputs
// actually show the saved values instead of being blank.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
//          node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-hfov-vfov-import.mjs

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

if (!EMAIL || !PASSWORD) {
  console.error("Missing PLAYWRIGHT_TEST_EMAIL/PASSWORD — run with node --env-file=.env.local");
  process.exit(1);
}

const OUT_DIR = fileURLToPath(new URL("./screenshots/", import.meta.url));
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const MODEL = "I12-TEST";

async function seed() {
  const { data: existing } = await admin.from("equipment_library").select("id").eq("org_id", fixture.orgId).eq("model", MODEL).maybeSingle();
  const row = {
    org_id: fixture.orgId, user_id: fixture.userId,
    category: "Camera", manufacturer: "Crestron", model: MODEL,
    description: `Crestron ${MODEL}`, unit_cost: 3500, part_number: null,
    ports: [{ side: "right", signal: "hdmi", dir: "out", label: "HDMI" }],
    hfov_deg: 111, vfov_deg: 63,
  };
  if (existing) await admin.from("equipment_library").update(row).eq("id", existing.id);
  else await admin.from("equipment_library").insert(row);
  console.log(`Seeded Crestron ${MODEL} with HFOV=111 VFOV=63 in the org library.`);

  // Clear this room's signal-flow canvas so the device we add is the only one.
  await admin.from("tool_data").delete().eq("project_id", fixture.projectId).eq("room_id", fixture.roomId).eq("tool", "signal-flow");
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

    const sfUrl = `${APP_URL}/designEngineering/signal-flow?project=${fixture.projectId}&room=${fixture.roomId}`;
    await page.goto(sfUrl);
    await page.waitForTimeout(1500);

    await page.locator('[title="Add equipment to canvas"]').first().click();
    await page.waitForTimeout(300);
    const searchBox = page.locator('input[placeholder="Search by Make, Model, Part#..."]');
    await searchBox.fill(MODEL);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT_DIR}hfov-import-search.png` });

    const resultRow = page.locator(`text=/${MODEL}/`).first();
    await resultRow.click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("+ Add")').click();
    await page.waitForTimeout(500);

    // Open Edit Equipment on the newly placed device via right-click context menu.
    const deviceGroup = page.locator("svg text", { hasText: MODEL }).first();
    await deviceGroup.click({ button: "right" });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT_DIR}hfov-import-contextmenu.png` });

    const editOption = page.locator('text=/Edit Equipment/i').first();
    if (await editOption.count()) {
      await editOption.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${OUT_DIR}hfov-import-editmodal.png` });
      const hfovVal = await page.evaluate(() => {
        const label = [...document.querySelectorAll('label')].find(el => el.textContent?.trim().startsWith('HFOV'));
        const input = label && label.nextElementSibling;
        return input && input.tagName === 'INPUT' ? input.value : null;
      });
      const vfovVal = await page.evaluate(() => {
        const label = [...document.querySelectorAll('label')].find(el => el.textContent?.trim().startsWith('VFOV'));
        const input = label && label.nextElementSibling;
        return input && input.tagName === 'INPUT' ? input.value : null;
      });
      console.log("HFOV field value after import:", hfovVal, hfovVal === "111" ? "(correct)" : "(BUG - missing/wrong)");
      console.log("VFOV field value after import:", vfovVal, vfovVal === "63" ? "(correct)" : "(BUG - missing/wrong)");
    } else {
      console.error("Could not find 'Edit Equipment' context menu option.");
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
