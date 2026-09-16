// Visual/behavioral check of the rewritten Dante Bandwidth calculator page
// (no auth required — calculators are public). Confirms the default
// 64ch/48kHz/24-bit/1 receiver/unicast/no-redundancy case renders the
// corrected figures (not the old 92.16/737.28/73.7%/10G), and that toggling
// redundancy and switching to multicast update the UI as expected.
//
// Usage: node scripts/testing/verify-dante-bandwidth-ui.mjs

import { chromium } from "playwright";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("pageerror", err => console.log("PAGEERROR:", err.message));

  try {
    await page.goto(`${APP_URL}/calculators/dante-bandwidth`);
    await page.waitForTimeout(800);

    // ResultCard/label text is CSS uppercase-transformed, which innerText
    // reflects — compare case-insensitively for anything that targets a
    // label rather than plain paragraph copy.
    const bodyText = await page.locator("body").innerText();
    const has = (s) => bodyText.toLowerCase().includes(s.toLowerCase());
    console.log(`Shows corrected ~96 Mbps figure: ${bodyText.includes("~96")}`);
    console.log(`Shows required TX flows = 16: ${has("required tx flows") && /16/.test(bodyText)}`);
    console.log(`Shows 1 GbE recommendation: ${bodyText.includes("1 GbE")}`);
    console.log(`Does NOT show the old broken 737.28: ${!bodyText.includes("737.28")}`);
    console.log(`Does NOT show the old broken 92.16: ${!bodyText.includes("92.16")}`);
    console.log(`Does NOT show old "10G" wrong recommendation: ${!bodyText.includes("10G")}`);

    await page.screenshot({ path: "scripts/testing/screenshots/dante-bandwidth-default.png", fullPage: true });

    // Enable redundancy.
    await page.locator("select").nth(3).selectOption("yes"); // Redundant Network select (last one for unicast)
    await page.waitForTimeout(300);
    const redundantText = await page.locator("body").innerText();
    const hasR = (s) => redundantText.toLowerCase().includes(s.toLowerCase());
    console.log(`\nWith redundancy — shows Secondary Network: ${hasR("Secondary Network")}`);
    console.log(`Shows aggregate note (not as a utilization figure): ${hasR("Aggregate across both networks")}`);
    console.log(`Does NOT claim 19.2% utilization: ${!redundantText.includes("19.2")}`);
    await page.screenshot({ path: "scripts/testing/screenshots/dante-bandwidth-redundant.png", fullPage: true });

    // Switch to multicast.
    await page.locator("select").first().selectOption("multicast");
    await page.waitForTimeout(300);
    const multicastText = await page.locator("body").innerText();
    const hasM = (s) => multicastText.toLowerCase().includes(s.toLowerCase());
    console.log(`\nMulticast — Receiving Devices input hidden: ${!hasM("Receiving Devices")}`);
    console.log(`Multicast — shows IGMP/topology note: ${hasM("IGMP snooping")}`);
    console.log(`Multicast — flows shown as device-dependent: ${hasM("Varies by device")}`);
    await page.screenshot({ path: "scripts/testing/screenshots/dante-bandwidth-multicast.png", fullPage: true });

    // Switch to AES67.
    await page.locator("select").first().selectOption("aes67");
    await page.waitForTimeout(300);
    const aesText = await page.locator("body").innerText();
    const hasA = (s) => aesText.toLowerCase().includes(s.toLowerCase());
    console.log(`\nAES67 — shows AES67 Flows: ${hasA("AES67 Flows")}`);
    console.log(`AES67 — shows packet time selector: ${hasA("AES67 Packet Time")}`);
    await page.screenshot({ path: "scripts/testing/screenshots/dante-bandwidth-aes67.png", fullPage: true });

    // Fanout advisory: set unicast + receivers > 2.
    await page.locator("select").first().selectOption("unicast");
    await page.waitForTimeout(200);
    const receiversInput = page.locator('input[type="number"]').nth(1);
    await receiversInput.fill("4");
    await page.waitForTimeout(300);
    const fanoutText = await page.locator("body").innerText();
    console.log(`\nFanout (4 receivers) — advisory shown: ${fanoutText.includes("Consider multicast")}`);
    console.log(`Fanout — 64 total TX flows: ${/64/.test(fanoutText)}`);
    console.log(`Fanout — ~384 Mbps primary: ${fanoutText.includes("384")}`);
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
