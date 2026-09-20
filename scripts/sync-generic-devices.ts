/**
 * Makes sure every generic device Room Designer / Signal Flow ship with exists in
 * the AVGenix library (av_products) WITH its Room Designer placement info.
 *
 *   npx tsx scripts/sync-generic-devices.ts           # dry run — prints what would change
 *   npx tsx scripts/sync-generic-devices.ts --apply   # writes it
 *
 * The list lives in lib/generic-devices.ts. Existing rows are only ever PATCHED
 * (placement columns, camera FOV / speaker dispersion, and a colour if the row
 * has none or the import's black default) — ports, prices, categories and
 * everything else on them are left alone. A device with no row yet is inserted.
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (same as import-library.ts).
 */
import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { GENERIC_DEVICES } from "../lib/generic-devices";

const APPLY = process.argv.includes("--apply");
const ROOT = path.resolve(__dirname, "..");
const env: Record<string, string> = {};
for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
  if (m) env[m[1]] = m[2];
}
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const BLANK_COLORS = new Set([null, undefined, "", "#000000"]);

async function main() {
  const { data: rows, error } = await supabase.from("av_products").select("*").eq("manufacturer", "Generic");
  if (error) { console.error("Could not read av_products:", error.message); process.exit(1); }
  const byModel = new Map((rows ?? []).map(r => [r.model_name as string, r]));

  let patched = 0, inserted = 0, unchanged = 0, failed = 0;
  for (const g of GENERIC_DEVICES) {
    const want: Record<string, unknown> = {};
    if (g.rd) {
      want.rd_type = g.rd.type; want.rd_wall = g.rd.wall;
      want.rd_width_ft = g.rd.width_ft; want.rd_height_ft = g.rd.height_ft; want.rd_icon = g.rd.icon;
    }
    if (g.hfov_deg != null) want.hfov_deg = g.hfov_deg;
    if (g.coverage_angle_deg != null) want.coverage_angle_deg = g.coverage_angle_deg;

    const existing = byModel.get(g.model_name);
    if (!existing) {
      const row = {
        manufacturer: "Generic", model_name: g.model_name, category: g.category,
        type: `Generic ${g.model_name}`, price: 0, color: g.color, ports: g.ports ?? [],
        rack_mounted: false, ...want,
      };
      console.log(`+ ADD    ${g.model_name}  (${g.category})`);
      if (APPLY) {
        const { error: insErr } = await supabase.from("av_products").insert(row);
        if (insErr) { console.log(`    FAILED: ${insErr.message}`); failed++; continue; }
      }
      inserted++;
      continue;
    }

    // Patch only what differs, so a re-run is a no-op.
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(want)) {
      if (existing[k] == null || Number(existing[k]) !== Number(v) && typeof v === "number" || (typeof v === "string" && existing[k] !== v)) patch[k] = v;
    }
    if (BLANK_COLORS.has(existing.color)) patch.color = g.color;

    if (Object.keys(patch).length === 0) { unchanged++; continue; }
    console.log(`~ PATCH  ${g.model_name}: ${Object.entries(patch).map(([k, v]) => `${k}=${v}`).join(", ")}`);
    if (APPLY) {
      const { error: updErr } = await supabase.from("av_products")
        .update({ ...patch, updated_at: new Date().toISOString() }).eq("id", existing.id);
      if (updErr) { console.log(`    FAILED: ${updErr.message}`); failed++; continue; }
    }
    patched++;
  }

  console.log(`\n${APPLY ? "APPLIED" : "DRY RUN"}: ${inserted} to add, ${patched} to patch, ${unchanged} already correct${failed ? `, ${failed} FAILED` : ""}.`);
  if (!APPLY) console.log("Re-run with --apply to write these changes.");
}
main().catch(e => { console.error(e); process.exit(1); });
