import * as XLSX from "xlsx";
import * as path from "path";

const DATA_DIR = path.resolve(__dirname, "..", "data");
const ambiguous = new Set(["appliance", "gateway", "hub", "button", "byod interface", "kit", "paging", "sensor", "video conferencing system", "collaboration board", "whiteboard camera", "speakerphone", "video bar", "touch controller"]);

for (const file of ["5. Biamp Devices.xlsx", "6. Logitech Devices.xlsx"]) {
  const wb = XLSX.readFile(path.join(DATA_DIR, file));
  console.log(`\n=== ${file}`);
  for (const sheetName of wb.SheetNames) {
    const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });
    const header = rows[0].map((h: any) => String(h ?? "").trim().toLowerCase());
    const col = (n: string) => header.indexOf(n);
    const [ci, ti, moi, pi] = ["category", "type", "model", "price"].map(col);
    // sample ambiguous categories + non-numeric prices
    const priceSamples = new Set<string>();
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.every((c: any) => c === null)) continue;
      const cat = String(r[ci] ?? "").trim();
      if (ambiguous.has(cat.toLowerCase())) {
        console.log(`  [${cat}] type="${r[ti]}" model="${r[moi]}" price=${JSON.stringify(r[pi])}`);
      }
      if (r[pi] !== null && typeof r[pi] !== "number" && priceSamples.size < 10) {
        priceSamples.add(String(r[pi]));
      }
    }
    if (priceSamples.size) console.log(`  Non-numeric price samples: ${[...priceSamples].join(" ; ")}`);
  }
}
