import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(__dirname, "..");
const env: Record<string, string> = {};
for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
  if (m) env[m[1]] = m[2];
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function main() {
  const { count } = await supabase.from("av_products").select("*", { count: "exact", head: true });
  console.log(`Total products: ${count}`);

  const checks = [
    ["QSC", "QIO-ML4I"],
    ["Generic", "Laptop"],
    ["Extron", "XTP R HWP 201 4K"],
    ["Crestron", "DM-NVX-350"],
  ];
  for (const [mfr, model] of checks) {
    const { data, error } = await supabase
      .from("av_products")
      .select("manufacturer, model_name, category, price, color, ports")
      .eq("manufacturer", mfr)
      .eq("model_name", model)
      .single();
    if (error) { console.log(`\n${mfr} ${model}: ERROR ${error.message}`); continue; }
    console.log(`\n${data.manufacturer} ${data.model_name} | ${data.category} | $${data.price} | ${data.color}`);
    console.log(`  ports: ${JSON.stringify(data.ports).slice(0, 140)}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
