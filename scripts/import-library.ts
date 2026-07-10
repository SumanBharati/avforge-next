/**
 * AV Forge Library import — reads data/*.xlsx and upserts into av_products.
 *
 * Usage:
 *   npx tsx scripts/import-library.ts           # dry run: validate + preview, no DB writes
 *   npx tsx scripts/import-library.ts --apply   # actually upsert into Supabase
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const APPLY = process.argv.includes("--apply");

// ---------- category normalization ----------
const CATEGORY_MAP: Record<string, string> = {
  "sources": "Sources",
  "switchers": "Switchers",
  "distribution amplifier": "Distribution Amplifiers",
  "distribution amplifiers": "Distribution Amplifiers",
  "transmitter": "Transmitters",
  "transmitters": "Transmitters",
  "receiver": "Receivers",
  "receivers": "Receivers",
  "avoip": "AVoIP",
  "encoder": "AVoIP",
  "decoder": "AVoIP",
  "dsp": "DSP",
  "processor": "DSP",
  "amplifier": "Amplifiers",
  "amplifiers": "Amplifiers",
  "control": "Control",
  "controls": "Control",
  "control io": "Control",
  "controller": "Control",
  "control systems": "Control",
  "control software": "Software",
  "software": "Software",
  "speakers": "Speakers",
  "network speaker": "Speakers",
  "ceiling speaker": "Speakers",
  "surface speaker": "Speakers",
  "column speaker": "Speakers",
  "pendant speaker": "Speakers",
  "landscape speaker": "Speakers",
  "line array": "Speakers",
  "point source": "Speakers",
  "coaxial speaker": "Speakers",
  "subwoofer": "Subwoofers",
  "subwoofers": "Subwoofers",
  "multi-window processor": "Video Processing",
  "video ai accelerator": "Video Processing",
  "streaming and recording": "Streaming & Recording",
  "usb switchers and extenders": "USB",
  "usb interface": "USB",
  "usb extenders": "USB",
  "displays": "Displays",
  "microphone": "Microphones",
  "audio io": "Audio",
  "audio": "Audio",
  "touch panel": "Touch Panels",
  "touch panels": "Touch Panels",
  "user interface": "Touch Panels",
  "scheduler": "Scheduling",
  "scheduling": "Scheduling",
  "camera": "Cameras",
  "cameras": "Cameras",
  "collaboration": "Wireless Presentation",
  "wireless presentation": "Wireless Presentation",
  "video": "Video",
  "digitalmedia": "Video",
  "unified communications": "Unified Communications",
  "conferencing": "Unified Communications",
  "accessories": "Accessories",
  "enclosures & hardware": "Accessories",
  "custom category": "Accessories",
  "climate control": "Building Systems",
  "shading": "Building Systems",
  "sensors": "Building Systems",
  "lighting & control": "Building Systems",
  "mixer": "Mixers",
  // Biamp file
  "microphone": "Microphones",
  "speaker": "Speakers",
  "paging": "Paging",
  // Logitech file
  "appliance": "Unified Communications",
  "byod interface": "Unified Communications",
  "collaboration board": "Unified Communications",
  "video bar": "Unified Communications",
  "video conferencing system": "Unified Communications",
  "speakerphone": "Unified Communications",
  "whiteboard camera": "Cameras",
  "touch controller": "Touch Panels",
  "gateway": "Building Systems",
  "sensor": "Building Systems",
  "accessory": "Accessories",
  "cable": "Accessories",
  "connector": "Accessories",
  "cover": "Accessories",
  "mount": "Accessories",
  "tv mount": "Accessories",
  "stand": "Accessories",
  "cart": "Accessories",
  "charger": "Accessories",
  "dongle": "Accessories",
  "kit": "Accessories",
  "button": "Accessories",
  "hub": "Accessories",
};

// ---------- port signal inference (for "SIDE: LABEL" format rows) ----------
const SIGNAL_RULES: Array<[RegExp, string]> = [
  [/dante/i, "dante"],
  [/hdmi/i, "hdmi"],
  [/\bsdi\b/i, "sdi"],
  [/rj45|q-lan|\blan\b|network|ethernet|poe|hdbaset|\bcat ?\d|\bcat\b|wireless|avb/i, "cat6"],
  [/usb/i, "usb"],
  [/fiber|sfp/i, "fiber"],
  [/vga/i, "vga"],
  [/rs-?232|rs-?485|serial/i, "serial"],
  [/\bir\b|infrared/i, "ir"],
  [/gpio|gpi\b|relay/i, "control"],
  [/bluetooth/i, "bluetooth"],
  [/speaker|speakon|amplifier output|70v|100v|8 ?(ohm|Ω)|amplified/i, "speaker"],
  [/power|24v|48v|100–240|ac in|dc in/i, "power"],
  [/aes3|aes\/ebu|s\/pdif|toslink|optical audio/i, "audio"],
  [/mic|line|xlr|euroblock|analog|phoenix|flex|trs|rca|headphone/i, "analog"],
];

function inferSignal(label: string): string {
  for (const [re, sig] of SIGNAL_RULES) if (re.test(label)) return sig;
  return "control";
}

function inferDir(label: string, side: string): "in" | "out" {
  if (/\b(out|output|outputs|thru)\b/i.test(label)) return "out";
  if (/\b(in|input|inputs)\b/i.test(label)) return "in";
  return side === "right" ? "out" : "in";
}

// ---------- mojibake repair ----------
// UTF-8 bytes mis-read as Windows-1252; Node's latin1 can't round-trip the
// cp1252-only characters (€ ” ™ …), so replace known sequences explicitly.
const MOJIBAKE: Array<[string, string]> = [
  ["â€”", "—"], // — em dash
  ["â€“", "–"], // – en dash
  ["â€™", "'"],      // ' apostrophe
  ["â€˜", "'"],      // ' left quote
  ["â€œ", "\""],     // " left dquote
  ["â€¦", "…"], // … ellipsis
  ["Ã—", "×"],       // × multiply
  ["Â°", "°"],       // ° degree
  ["Â±", "±"],       // ± plus-minus
  ["Âµ", "µ"],       // µ micro
  ["Â®", "®"],       // ® registered
  ["Â©", "©"],       // © copyright
  ["â€", "\""],           // " right dquote — prefix of sequences above, must be last
];
function fixEncoding(s: string): string {
  if (!/â€|Ã|Â/.test(s)) return s;
  let out = s;
  for (const [bad, good] of MOJIBAKE) out = out.split(bad).join(good);
  return out;
}

interface Port { side: string; signal: string; dir: string; label: string }

const stats = {
  portsFormatA: 0,       // side:signal:dir:label
  portsFormatB: 0,       // SIDE: LABEL (signal/dir inferred)
  signalFallbacks: [] as string[],
  encodingFixes: 0,
  genericModelFixes: 0,
  dupesSkipped: [] as string[],
  revRowsSkipped: 0,
  unmappedCategories: new Map<string, number>(),
};

function parsePorts(raw: string): Port[] {
  const ports: Port[] = [];
  let isFormatB = false;
  for (const seg of raw.split("|")) {
    const trimmed = seg.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(":").map(p => p.trim());
    if (parts.length >= 3 && /^(left|right)$/i.test(parts[0]) && /^(in|out)$/i.test(parts[2])) {
      // Format A: side:signal:dir:label (label may itself contain colons)
      ports.push({
        side: parts[0].toLowerCase(),
        signal: parts[1].toLowerCase(),
        dir: parts[2].toLowerCase(),
        label: parts.slice(3).join(":") || parts[1].toUpperCase(),
      });
    } else {
      // Format B: "SIDE: LABEL" — infer signal and direction from the label
      isFormatB = true;
      const rawSide = (parts[0] || "").toLowerCase();
      const label = parts.slice(1).join(":").trim() || trimmed;
      if (/^n\/a$/i.test(label)) continue;
      const dir = inferDir(label, rawSide);
      // Only left/right exist in the schema; REAR (and the "EFT" typo) map by direction
      const side = rawSide === "right" ? "right" : rawSide === "left" ? "left" : dir === "out" ? "right" : "left";
      const signal = inferSignal(label);
      if (signal === "control" && !/gpio|relay|control/i.test(label)) {
        stats.signalFallbacks.push(label);
      }
      ports.push({ side, signal, dir, label });
    }
  }
  if (isFormatB) stats.portsFormatB++; else stats.portsFormatA++;
  return ports;
}

// QSC rows use color names; the app expects hex values
const COLOR_MAP: Record<string, string> = {
  "black": "#1e293b",
  "black / white": "#1e293b",
  "white": "#e2e8f0",
  "green": "#22c55e",
};
function normalizeColor(raw: string): string {
  const c = raw.trim();
  if (/^#[0-9a-f]{3,8}$/i.test(c)) return c.toLowerCase();
  return COLOR_MAP[c.toLowerCase()] ?? "#3b82f6";
}

function normalizeCategory(raw: string): string {
  const mapped = CATEGORY_MAP[raw.trim().toLowerCase()];
  if (mapped) return mapped;
  stats.unmappedCategories.set(raw, (stats.unmappedCategories.get(raw) ?? 0) + 1);
  return raw.trim();
}

// ---------- read + transform ----------
interface ProductRow {
  manufacturer: string;
  model_name: string;
  category: string;
  type: string;
  price: number;
  color: string;
  ports: Port[];
}

function loadAll(): ProductRow[] {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith(".xlsx")).sort();
  const byKey = new Map<string, { row: ProductRow; file: string }>();

  for (const file of files) {
    const wb = XLSX.readFile(path.join(DATA_DIR, file));
    for (const sheetName of wb.SheetNames) {
      const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });
      if (rows.length < 2) continue;
      const header = rows[0].map((h: any) => String(h ?? "").trim().toLowerCase());
      const col = (name: string) => header.indexOf(name);
      const [ci, ti, mi, moi, pi, coi, poi] =
        ["category", "type", "manufacturer", "model", "price", "color", "ports"].map(col);

      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || r.every((c: any) => c === null || String(c).trim() === "")) continue;

        const cell = (idx: number) => {
          const v = String(r[idx] ?? "").trim();
          const fixed = fixEncoding(v);
          if (fixed !== v) stats.encodingFixes++;
          return fixed;
        };

        const manufacturer = cell(mi);
        const type = cell(ti);
        let model = cell(moi);
        if (!model || /^(n\/a|—|–|-)$/i.test(model)) {
          model = type;
          stats.genericModelFixes++;
        }

        // Biamp file repeats its 20 products with sequential "Rev1"–"Rev80"
        // suffixes — generation artifacts, not real revisions. Skip them.
        if (/ Rev\d+$/.test(model)) {
          stats.revRowsSkipped++;
          continue;
        }

        const key = `${manufacturer.toLowerCase()}||${model.toLowerCase()}`;
        if (byKey.has(key)) {
          stats.dupesSkipped.push(`${manufacturer} ${model} (${file} — kept ${byKey.get(key)!.file})`);
          continue;
        }

        byKey.set(key, {
          file,
          row: {
            manufacturer,
            model_name: model,
            category: normalizeCategory(cell(ci)),
            type,
            price: typeof r[pi] === "number" ? r[pi] : 0,
            color: normalizeColor(cell(coi)),
            ports: parsePorts(cell(poi)),
          },
        });
      }
    }
  }
  return [...byKey.values()].map(v => v.row);
}

// ---------- main ----------
async function main() {
  const products = loadAll();

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Parsed products: ${products.length}`);
  console.log(`Duplicates skipped: ${stats.dupesSkipped.length}`);
  console.log(`"RevN" artifact rows skipped: ${stats.revRowsSkipped}`);
  console.log(`Encoding fixes applied: ${stats.encodingFixes}`);
  console.log(`Generic model names filled from type: ${stats.genericModelFixes}`);
  console.log(`Ports already structured: ${stats.portsFormatA} rows; inferred from labels: ${stats.portsFormatB} rows`);
  if (stats.signalFallbacks.length) {
    console.log(`\nPort labels where signal type defaulted to "control" (${stats.signalFallbacks.length}):`);
    [...new Set(stats.signalFallbacks)].slice(0, 15).forEach(l => console.log(`  - ${l}`));
  }
  if (stats.unmappedCategories.size) {
    console.log(`\nCategories with no mapping (kept as-is):`);
    stats.unmappedCategories.forEach((n, c) => console.log(`  - "${c}" (${n})`));
  }

  const byMfr = new Map<string, number>();
  const byCat = new Map<string, number>();
  products.forEach(p => {
    byMfr.set(p.manufacturer, (byMfr.get(p.manufacturer) ?? 0) + 1);
    byCat.set(p.category, (byCat.get(p.category) ?? 0) + 1);
  });
  console.log(`\nBy manufacturer:`);
  byMfr.forEach((n, m) => console.log(`  ${m}: ${n}`));
  console.log(`\nBy category (normalized, ${byCat.size} total):`);
  [...byCat.entries()].sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${c}: ${n}`));

  const previewPath = path.join(DATA_DIR, "import-preview.json");
  fs.writeFileSync(previewPath, JSON.stringify(products, null, 2), "utf8");
  console.log(`\nFull preview written to: ${previewPath}`);

  if (!APPLY) {
    console.log(`\nDRY RUN — no database writes. Re-run with --apply to import.`);
    return;
  }

  // ---- apply ----
  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m) env[m[1]] = m[2];
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  console.log(`\nUpserting ${products.length} products into av_products…`);
  const BATCH = 200;
  let imported = 0;
  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH);
    const { data, error } = await supabase
      .from("av_products")
      .upsert(batch, { onConflict: "manufacturer,model_name" })
      .select("id");
    if (error) {
      console.error(`Batch ${i / BATCH + 1} failed: ${error.message}`);
      process.exit(1);
    }
    imported += data?.length ?? 0;
    console.log(`  batch ${i / BATCH + 1}: ${data?.length} rows`);
  }

  const { count } = await supabase.from("av_products").select("*", { count: "exact", head: true });
  console.log(`\nDone. Upserted ${imported} rows. Table now has ${count} products total.`);
}

main().catch(e => { console.error(e); process.exit(1); });
