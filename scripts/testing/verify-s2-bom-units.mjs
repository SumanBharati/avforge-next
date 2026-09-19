// S2: the BOM must count PHYSICAL UNITS, not appearances, and must read the
// same on all three tool pages even on a hard refresh.
//
// Seeds ONE unit (itemId "s2-unit-a") into all three stores, then loads each
// page cold and reads the rendered panel. Before this change the same unit
// produced qty 3 (one per tool it appeared in), and a page loaded directly
// only knew about its own tool. Expected now: a single row, qty 1, carrying
// all three location chips, identical on every page.
//
// Snapshots and restores the fixture room's real rows so it leaves no residue.
import { chromium } from "playwright";
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;
const fx = JSON.parse(readFileSync(new URL("./.fixture.json", import.meta.url), "utf8"));
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const ITEM = "s2-unit-a";
const NAME = "Acme AX-100";

const getTool = async (t) => (await admin.from("tool_data").select("data")
  .eq("project_id", fx.projectId).eq("tool", t).eq("room_id", fx.roomId).maybeSingle()).data?.data ?? null;
const setTool = async (t, data) => {
  const { data: row } = await admin.from("tool_data").select("id")
    .eq("project_id", fx.projectId).eq("tool", t).eq("room_id", fx.roomId).maybeSingle();
  if (row) await admin.from("tool_data").update({ data }).eq("id", row.id);
  else await admin.from("tool_data").insert({ project_id: fx.projectId, user_id: fx.userId, tool: t, room_id: fx.roomId, data });
};
const getRoom = async () => (await admin.from("room_designs").select("data")
  .eq("project_id", fx.projectId).eq("room_id", fx.roomId).maybeSingle()).data?.data ?? null;
const setRoom = async (data) => {
  const { data: row } = await admin.from("room_designs").select("id")
    .eq("project_id", fx.projectId).eq("room_id", fx.roomId).maybeSingle();
  if (row) await admin.from("room_designs").update({ data }).eq("id", row.id);
  else await admin.from("room_designs").insert({ project_id: fx.projectId, room_id: fx.roomId, user_id: fx.userId, data });
};

async function main() {
  const backup = {
    room: await getRoom(),
    sf: await getTool("signal-flow"),
    rack: await getTool("rack-planner"),
  };
  console.log("Backed up existing rows.");

  let ok = true;
  const check = (c, m) => { console.log(`${c ? "PASS" : "FAIL"}  ${m}`); if (!c) ok = false; };

  try {
    await setRoom({
      devices: [{
        itemId: ITEM, uid: 9001, id: "seed-display", name: NAME, icon: "monitor",
        mfr: "Acme", model: "AX-100", price: 1000, part_number: "AX100",
        w: 4, h: 2.26, wall: "front", type: "display", color: "#8b5cf6",
        x: 5, y: 0.02, z: 4, mountWall: "north", rack_units: 2, cat: "Displays",
      }],
      config: { roomType: "medium", roomW: 16.4, roomL: 19.7, roomH: 8.86 },
    });
    await setTool("signal-flow", {
      devices: [{
        itemId: ITEM, id: 9001, type: "Display", mfr: "Acme", model: "AX-100",
        price: 1000, part_number: "AX100", cat: "Displays", color: "#8b5cf6",
        x: 100, y: 100, w: 130, h: 78, ports: [], rack_units: 2,
      }],
      connections: [], rooms: [], nextId: 9002, annotations: [], annotNextId: 1,
    });
    await setTool("rack-planner", {
      items: [{
        itemId: ITEM, sourceDeviceId: 9001, name: NAME, ru: 2, color: "#8b5cf6",
        mfr: "Acme", model: "AX-100", rackMounted: true, rackStartRU: 1, rackId: 1,
      }],
      annotations: [], rackRUCapacity: 42, rackCount: 1,
      additionalRackRUCapacities: [], rackVoltages: [120],
    });
    console.log("Seeded one unit into all three stores under a single itemId.\n");

    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto(`${APP_URL}/login`);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 15000 });

    for (const t of ["room-designer", "signal-flow", "rack-planner"]) {
      // Hard navigation each time: the point is that a cold page still shows
      // the full cross-tool BOM, not just its own tool's slice.
      await page.goto(`${APP_URL}/designEngineering/${t}?project=${fx.projectId}&room=${fx.roomId}`);
      await page.waitForTimeout(5000);

      // The panel collapses to a 44px rail that hides its own title, so expand
      // it by its header chevron rather than waiting for text that isn't there.
      if (await page.locator("text=Equipment Schedule").count() === 0) {
        // force: the chevron's own <svg> sits over the polyline; the click
        // still lands inside the header, whose onClick does the toggling.
        await page.locator('polyline[points="9 18 15 12 9 6"]').last().click({ force: true });
        await page.waitForTimeout(800);
      }
      await page.locator("text=Equipment Schedule").first().waitFor({ timeout: 15000 });

      const row = page.locator("tr", { hasText: NAME }).first();
      const present = await row.count() > 0;
      check(present, `${t}: BOM contains a row for "${NAME}"`);
      if (!present) continue;

      const text = (await row.textContent()) || "";
      const chips = ["SIG", "ROOM", "RACK"].filter(c => text.includes(c));
      const totalText = (await page.locator("text=Bill of Materials").first().textContent()) || "";

      check(chips.length === 3, `${t}: row shows all three location chips (got ${chips.join("+") || "none"})`);
      check(/\(1\)/.test(totalText), `${t}: header total is 1 unit, not one per appearance (header read "${totalText.trim()}")`);

      const rowCount = await page.locator("tbody tr").count();
      check(rowCount === 1, `${t}: exactly one BOM line item (got ${rowCount})`);

      await page.screenshot({ path: `scripts/testing/screenshots/s2-bom-${t}.png` });
    }

    check(errors.length === 0, `no page errors${errors.length ? ` — ${errors.slice(0, 3).join(" | ")}` : ""}`);
    await browser.close();
  } finally {
    if (backup.room) await setRoom(backup.room);
    if (backup.sf) await setTool("signal-flow", backup.sf);
    if (backup.rack) await setTool("rack-planner", backup.rack);
    console.log("\nRestored original rows.");
  }

  console.log(`\n${ok ? "S2 BOM UNIT-COUNT CHECK PASSED" : "S2 BOM UNIT-COUNT CHECK FAILED"}`);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
