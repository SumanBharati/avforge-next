// S0 regression gate for the cross-tool identity layer.
//
// The backfill in lib/design-identity.ts stamps an itemId onto every piece of
// equipment already saved in Room Designer, Signal Flow and Rack Builder. The
// risk is that it either (a) changes what is stored, (b) mints ids that collide,
// or (c) derives DIFFERENT ids on each side for the same physical unit, which
// would split it into two BOM rows forever.
//
// So: snapshot all three stores, open all three tools, snapshot again, and
// assert counts are identical, every unit has a unique id, and the units that
// are linked across tools ended up sharing one id.
import { chromium } from "playwright";
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;
const fx = JSON.parse(readFileSync(new URL("./.fixture.json", import.meta.url), "utf8"));
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const tool = async (name) => {
  const { data } = await admin.from("tool_data").select("data")
    .eq("project_id", fx.projectId).eq("tool", name).eq("room_id", fx.roomId).maybeSingle();
  return data?.data || null;
};
const roomDesign = async () => {
  const { data } = await admin.from("room_designs").select("data")
    .eq("project_id", fx.projectId).eq("room_id", fx.roomId).maybeSingle();
  return data?.data || null;
};

async function snapshot(label) {
  const [rd, sf, rack] = await Promise.all([roomDesign(), tool("signal-flow"), tool("rack-planner")]);
  const snap = {
    rd: (rd?.devices || []),
    sf: (sf?.devices || []),
    rack: (rack?.items || []),
  };
  console.log(`\n--- ${label} ---`);
  console.log(`room-designer devices: ${snap.rd.length}  (with itemId: ${snap.rd.filter(d => d.itemId).length})`);
  console.log(`signal-flow devices:   ${snap.sf.length}  (with itemId: ${snap.sf.filter(d => d.itemId).length})`);
  console.log(`rack items:            ${snap.rack.length}  (with itemId: ${snap.rack.filter(d => d.itemId).length})`);
  return snap;
}

const dupes = (ids) => ids.filter((v, i) => ids.indexOf(v) !== i);

async function main() {
  const before = await snapshot("BEFORE");

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(`${APP_URL}/login`);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 15000 });

  const q = `project=${fx.projectId}&room=${fx.roomId}`;
  for (const t of ["room-designer", "signal-flow", "rack-planner"]) {
    await page.goto(`${APP_URL}/designEngineering/${t}?${q}`);
    await page.waitForTimeout(6000); // let load + backfill + 1.5s autosave land
    console.log(`visited ${t}`);
  }
  await browser.close();

  const after = await snapshot("AFTER");

  let ok = true;
  const check = (cond, msg) => { console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`); if (!cond) ok = false; };

  console.log("\n--- assertions ---");
  check(after.rd.length === before.rd.length, `room-designer count unchanged (${before.rd.length} -> ${after.rd.length})`);
  check(after.sf.length === before.sf.length, `signal-flow count unchanged (${before.sf.length} -> ${after.sf.length})`);
  check(after.rack.length === before.rack.length, `rack count unchanged (${before.rack.length} -> ${after.rack.length})`);

  for (const [k, list] of Object.entries(after)) {
    const ids = list.map(d => d.itemId).filter(Boolean);
    check(ids.length === list.length, `${k}: every entry has an itemId (${ids.length}/${list.length})`);
    const d = dupes(ids);
    check(d.length === 0, `${k}: itemIds unique${d.length ? ` — duplicated: ${[...new Set(d)].join(", ")}` : ""}`);
  }

  // The real prize: a Signal Flow block imported from Room Designer must carry
  // the SAME itemId as its Room Designer source, or the BOM counts it twice.
  const rdByUid = new Map(after.rd.map(d => [String(d.uid), d]));
  const linked = after.sf.filter(d => d.roomDesignerUid != null);
  const mismatched = linked.filter(d => {
    const src = rdByUid.get(String(d.roomDesignerUid));
    return src && src.itemId !== d.itemId;
  });
  check(mismatched.length === 0,
    `signal-flow blocks synced from Room Designer share their source's itemId (${linked.length} linked, ${mismatched.length} mismatched)`);
  if (mismatched.length) {
    mismatched.slice(0, 5).forEach(d => console.log(`      block ${d.id}: ${d.itemId} vs rd ${rdByUid.get(String(d.roomDesignerUid))?.itemId}`));
  }

  // Same for rack rows derived from a Signal Flow block.
  const sfById = new Map(after.sf.map(d => [String(d.id), d]));
  const rackLinked = after.rack.filter(i => i.sourceDeviceId != null);
  const rackMismatched = rackLinked.filter(i => {
    const src = sfById.get(String(i.sourceDeviceId));
    return src && src.itemId !== i.itemId;
  });
  check(rackMismatched.length === 0,
    `rack rows derived from Signal Flow share that block's itemId (${rackLinked.length} linked, ${rackMismatched.length} mismatched)`);

  check(errors.length === 0, `no page errors${errors.length ? ` — ${errors.slice(0, 3).join(" | ")}` : ""}`);

  console.log(`\n${ok ? "S0 REGRESSION GATE PASSED" : "S0 REGRESSION GATE FAILED"}`);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
