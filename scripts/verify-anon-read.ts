import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(__dirname, "..");
const env: Record<string, string> = {};
for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
  if (m) env[m[1]] = m[2];
}
// Anon key — same access level the app's browser client has
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

async function main() {
  const { count, error: cntErr } = await supabase.from("av_products").select("*", { count: "exact", head: true });
  console.log(`Anon-visible product count: ${count ?? "NULL"} ${cntErr ? "ERROR: " + cntErr.message : ""}`);

  const { data, error } = await supabase
    .from("av_products")
    .select("manufacturer, model_name, category")
    .or(`type.ilike.%QIO%,model_name.ilike.%QIO%`)
    .limit(5);
  if (error) { console.log(`Search ERROR: ${error.message}`); return; }
  console.log(`Sample search for "QIO": ${data.length} results`);
  data.forEach(p => console.log(`  ${p.manufacturer} ${p.model_name} (${p.category})`));
}
main().catch(e => { console.error(e); process.exit(1); });
