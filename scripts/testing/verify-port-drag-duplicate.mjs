// Verifies: "currently, we can only move the connectors up or down one by
// one, and it is not easy to use. can we use something like click and drag
// options... Also provide an option to duplicate an already present
// connector" — the Ports editor in EquipmentFormModal.tsx now has a drag
// handle (grip icon) per row for HTML5 drag-and-drop reordering, replacing
// the old one-step-at-a-time up/down arrows, plus a Duplicate button next
// to Delete.
//
// Prereqs: node --env-file=.env.local scripts/testing/create-test-user.mjs
// Usage:   node --env-file=.env.local scripts/testing/verify-port-drag-duplicate.mjs

import { chromium } from "playwright";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  page.on("pageerror", err => console.log("PAGEERROR:", err.message));

  try {
    await page.goto(`${APP_URL}/login`);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    await page.goto(`${APP_URL}/inventory?section=org`);
    await page.waitForTimeout(1500);
    await page.locator('button:has-text("Add Equipment")').first().click();
    await page.waitForTimeout(400);

    // Add 3 ports with distinct labels.
    const addPortBtn = page.locator('button:has-text("+ Add port")');
    for (const label of ["Port A", "Port B", "Port C"]) {
      await addPortBtn.click();
    }
    await page.waitForTimeout(200);
    const labelInputs = page.locator('input[placeholder="label"]');
    for (let i = 0; i < 3; i++) {
      await labelInputs.nth(i).fill(["Port A", "Port B", "Port C"][i]);
    }

    const getLabels = async () => await labelInputs.evaluateAll(els => els.map(e => e.value));
    console.log("Before drag:", await getLabels());

    // Drag row 0 (Port A) onto row 2 (Port C) using the grip handle.
    const handles = page.locator('span[title="Drag to reorder"]');
    const handle0 = handles.nth(0);
    const row2 = page.locator('input[placeholder="label"]').nth(2);
    const h0box = await handle0.boundingBox();
    const r2box = await row2.boundingBox();
    await page.mouse.move(h0box.x + h0box.width / 2, h0box.y + h0box.height / 2);
    await page.mouse.down();
    await page.mouse.move(r2box.x, r2box.y + r2box.height / 2, { steps: 10 });
    await page.mouse.move(r2box.x, r2box.y + r2box.height / 2, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    console.log("After dragging Port A onto Port C's row:", await getLabels());

    // Duplicate the (now) first port.
    const dupBtn = page.locator('button[title="Duplicate port"]').first();
    await dupBtn.click();
    await page.waitForTimeout(300);
    const countAfterDup = await labelInputs.count();
    console.log(`Port count after duplicate (expect 4): ${countAfterDup}`);
    console.log("Labels after duplicate:", await getLabels());

    await page.screenshot({ path: "scripts/testing/screenshots/port-drag-duplicate.png" });
    console.log("\nDone. Screenshot at scripts/testing/screenshots/port-drag-duplicate.png");
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
