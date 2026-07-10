import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

const dataDir = "d:/Suman/avforge-next/data";
const files = fs.readdirSync(dataDir).filter(f => f.endsWith(".xlsx"));

interface Row { file: string; category: string; type: string; manufacturer: string; model: string; price: any; color: string; ports: string }
const all: Row[] = [];

for (const file of files) {
  const wb = XLSX.readFile(path.join(dataDir, file));
  for (const sheetName of wb.SheetNames) {
    const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });
    const header = rows[0].map((h: any) => String(h ?? "").trim().toLowerCase());
    const idx = (name: string) => header.indexOf(name);
    const [ci, ti, mi, moi, pi, coi, poi] = ["category","type","manufacturer","model","price","color","ports"].map(idx);
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.every((c: any) => c === null || String(c).trim() === "")) continue;
      all.push({
        file,
        category: String(r[ci] ?? "").trim(),
        type: String(r[ti] ?? "").trim(),
        manufacturer: String(r[mi] ?? "").trim(),
        model: String(r[moi] ?? "").trim(),
        price: r[pi],
        color: String(r[coi] ?? "").trim(),
        ports: String(r[poi] ?? "").trim(),
      });
    }
  }
}

console.log(`TOTAL ROWS: ${all.length}\n`);

// Per file counts
const byFile = new Map<string, number>();
all.forEach(r => byFile.set(r.file, (byFile.get(r.file) ?? 0) + 1));
console.log("Rows per file:");
byFile.forEach((n, f) => console.log(`  ${f}: ${n}`));

// Manufacturers
const mfrs = new Map<string, number>();
all.forEach(r => mfrs.set(r.manufacturer, (mfrs.get(r.manufacturer) ?? 0) + 1));
console.log("\nManufacturers:");
mfrs.forEach((n, m) => console.log(`  "${m}": ${n}`));

// Categories
const cats = new Map<string, number>();
all.forEach(r => cats.set(r.category, (cats.get(r.category) ?? 0) + 1));
console.log("\nCategories:");
cats.forEach((n, c) => console.log(`  "${c}": ${n}`));

// Odd models
const oddModels = new Set<string>();
all.forEach(r => { if (!r.model || /^(n\/a|—|â€.|-)$/i.test(r.model)) oddModels.add(`${r.manufacturer} | ${r.type} | model="${r.model}"`); });
console.log(`\nRows with empty/placeholder model (${oddModels.size}):`);
[...oddModels].slice(0, 30).forEach(m => console.log(`  ${m}`));

// Duplicates on (manufacturer, model)
const seen = new Map<string, Row[]>();
all.forEach(r => {
  const k = `${r.manufacturer.toLowerCase()}||${r.model.toLowerCase()}`;
  if (!seen.has(k)) seen.set(k, []);
  seen.get(k)!.push(r);
});
const dupes = [...seen.entries()].filter(([, v]) => v.length > 1);
console.log(`\nDuplicate (manufacturer, model) keys: ${dupes.length}`);
dupes.slice(0, 25).forEach(([k, v]) => {
  console.log(`  ${k}  x${v.length}  [${v.map(r => `${r.file.slice(0,12)}:${r.type}`).join(" / ")}]`);
});

// Encoding issues
const enc = all.filter(r => /â€|Ã|Â/.test(JSON.stringify(r)));
console.log(`\nRows with likely encoding artifacts: ${enc.length}`);
enc.slice(0, 10).forEach(r => console.log(`  ${r.file.slice(0,12)}: ${r.type} | model="${r.model}" | ports snippet="${r.ports.slice(0, 60)}"`));

// Missing ports / color / price checks
console.log(`\nRows missing ports: ${all.filter(r => !r.ports).length}`);
console.log(`Rows missing color: ${all.filter(r => !r.color).length}`);
console.log(`Rows with non-numeric price: ${all.filter(r => r.price !== null && typeof r.price !== "number").length}`);
console.log(`Rows with null price: ${all.filter(r => r.price === null).length}`);

// Ports format validation: side:signal:dir:label segments separated by |
let badPorts = 0;
const badSamples: string[] = [];
all.forEach(r => {
  if (!r.ports) return;
  const segs = r.ports.split("|");
  for (const s of segs) {
    const parts = s.split(":");
    if (parts.length < 3) { badPorts++; if (badSamples.length < 8) badSamples.push(`${r.type}: "${s}" (full: ${r.ports.slice(0,80)})`); break; }
  }
});
console.log(`\nRows with malformed port segments: ${badPorts}`);
badSamples.forEach(s => console.log(`  ${s}`));

// Distinct port sides/signals/dirs
const sides = new Set<string>(), signals = new Set<string>(), dirs = new Set<string>();
all.forEach(r => r.ports && r.ports.split("|").forEach(s => {
  const p = s.split(":");
  if (p.length >= 3) { sides.add(p[0].trim().toLowerCase()); signals.add(p[1].trim().toLowerCase()); dirs.add(p[2].trim().toLowerCase()); }
}));
console.log(`\nPort sides: ${[...sides].join(", ")}`);
console.log(`Port signals: ${[...signals].join(", ")}`);
console.log(`Port dirs: ${[...dirs].join(", ")}`);
