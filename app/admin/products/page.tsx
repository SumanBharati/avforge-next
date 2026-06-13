"use client";

import { useState, useEffect, useCallback } from "react";
import { searchProducts, upsertProducts, deleteProduct, getProductCount, type AVProduct } from "@/lib/av-products";

// CSV columns (all optional except Type and Ports):
// Category, Type, Manufacturer, Model, Price, Color, Ports,
// Amp, Volt, Watts, BTU, RackMounted, RackUnits, WidthIn, HeightIn, DepthIn
function parseCSV(csvText: string): { products: Omit<AVProduct, "id">[]; errors: string[] } {
  const errors: string[] = [];
  const products: Omit<AVProduct, "id">[] = [];
  const lines = csvText.split("\n").map(l => l.trim()).filter(l => l);
  if (lines.length < 2) return { products, errors: ["CSV has no data rows"] };

  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, "").trim());
  const col = (name: string) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());

  const catIdx    = col("category");
  const typeIdx   = col("type");
  const mfrIdx    = col("manufacturer");
  const modelIdx  = col("model");
  const priceIdx  = col("price");
  const colorIdx  = col("color");
  const portsIdx  = col("ports");
  const ampIdx    = col("amp");
  const voltIdx   = col("volt");
  const wattsIdx  = col("watts");
  const btuIdx    = col("btu");
  const rackMtdIdx = col("rackmounted");
  const rackUIdx  = col("rackunits");
  const widthIdx  = col("widthin");
  const heightIdx = col("heightin");
  const depthIdx  = col("depthin");

  if (typeIdx === -1) return { products, errors: ['Missing required "Type" column'] };
  if (portsIdx === -1) return { products, errors: ['Missing required "Ports" column'] };

  for (let i = 1; i < lines.length; i++) {
    const row: string[] = [];
    let cur = "", inQ = false;
    for (const ch of lines[i]) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { row.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    row.push(cur.trim());

    const type = typeIdx >= 0 ? row[typeIdx] : "";
    if (!type) continue;

    const get = (idx: number) => (idx >= 0 ? row[idx] || "" : "");
    const num = (idx: number) => { const v = parseFloat(get(idx)); return isNaN(v) ? null : v; };
    const bool = (idx: number) => { const v = get(idx).toLowerCase(); return v === "yes" || v === "true" || v === "1"; };

    const portsStr = get(portsIdx);
    const ports = portsStr.split("|").filter(p => p.trim()).map(p => {
      const parts = p.split(":");
      if (parts.length < 4) { errors.push(`Row ${i + 1}: invalid port "${p}"`); return null; }
      return { side: parts[0], signal: parts[1], dir: parts[2], label: parts.slice(3).join(":") };
    }).filter(Boolean) as AVProduct["ports"];

    products.push({
      manufacturer: get(mfrIdx) || "Generic",
      model_name:   get(modelIdx) || type,
      category:     get(catIdx) || "Other",
      type,
      price:        num(priceIdx) ?? 0,
      color:        get(colorIdx) || "#64748b",
      ports,
      amp_draw:     num(ampIdx),
      voltage:      num(voltIdx),
      power_watts:  num(wattsIdx),
      btu_hr:       num(btuIdx),
      rack_mounted: rackMtdIdx >= 0 ? bool(rackMtdIdx) : false,
      rack_units:   num(rackUIdx),
      width_in:     num(widthIdx),
      height_in:    num(heightIdx),
      depth_in:     num(depthIdx),
      rd_type:      null,
      rd_wall:      null,
      rd_width_ft:  null,
      rd_height_ft: null,
      rd_icon:      null,
    });
  }
  return { products, errors };
}

const TD: React.CSSProperties = { padding: "7px 10px", borderBottom: "1px solid rgb(var(--border))", color: "rgb(var(--text-muted))", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 };
const TH: React.CSSProperties = { padding: "6px 10px", textAlign: "left", color: "rgb(var(--text-subtle))", borderBottom: "1px solid rgb(var(--border))", fontWeight: 600, fontSize: 9, textTransform: "uppercase", whiteSpace: "nowrap" };

function fmt(v: number | null, unit = "", decimals = 2) {
  if (v === null || v === undefined) return "—";
  return v.toFixed(decimals).replace(/\.?0+$/, "") + (unit ? " " + unit : "");
}

export default function AdminProductsPage() {
  const [csvText, setCsvText]         = useState("");
  const [importing, setImporting]     = useState(false);
  const [importResult, setImportResult] = useState<string>("");
  const [productCount, setProductCount] = useState<number | null>(null);
  const [query, setQuery]             = useState("");
  const [results, setResults]         = useState<AVProduct[]>([]);
  const [searching, setSearching]     = useState(false);
  const [deleting, setDeleting]       = useState<string | null>(null);

  const refreshCount = useCallback(async () => {
    setProductCount(await getProductCount());
  }, []);

  useEffect(() => { refreshCount(); }, [refreshCount]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try { setResults(await searchProducts(query, 50)); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function handleImport() {
    if (!csvText.trim()) { setImportResult("Paste CSV data first."); return; }
    setImporting(true);
    setImportResult("");
    try {
      const { products, errors } = parseCSV(csvText);
      if (products.length === 0) { setImportResult("No valid products found. " + errors.join("; ")); return; }

      // Deduplicate by manufacturer+model_name — keep last occurrence
      const seen = new Map<string, typeof products[0]>();
      for (const p of products) {
        seen.set(`${p.manufacturer}::${p.model_name}`, p);
      }
      const deduped = Array.from(seen.values());
      const dupeCount = products.length - deduped.length;

      // Import in batches of 100 to avoid request size limits
      let totalImported = 0;
      for (let i = 0; i < deduped.length; i += 100) {
        const batch = deduped.slice(i, i + 100);
        const { count, error } = await upsertProducts(batch);
        if (error) { setImportResult("Import error: " + error); return; }
        totalImported += count;
      }

      setImportResult(
        `✓ Imported ${totalImported} product${totalImported !== 1 ? "s" : ""}` +
        (dupeCount > 0 ? ` · ${dupeCount} duplicate row${dupeCount !== 1 ? "s" : ""} skipped` : "") +
        (errors.length > 0 ? ` · ${errors.length} warning(s)` : "")
      );
      setCsvText("");
      refreshCount();
    } finally { setImporting(false); }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await deleteProduct(id);
    setResults(prev => prev.filter(p => p.id !== id));
    refreshCount();
    setDeleting(null);
  }

  const placeholder = [
    "Category,Type,Manufacturer,Model,Price,Color,Ports,Amp,Volt,Watts,BTU,RackMounted,RackUnits,WidthIn,HeightIn,DepthIn",
    "Sources,Laptop,Generic,,0,#3b82f6,right:hdmi:out:HDMI|right:usb:out:USB,,,,,No,,,,,",
    "Audio,QSC Core 110f,QSC,Core 110f,0,#22c55e,left:dante:in:Dante In|right:dante:out:Dante Out,1.5,120,180,614,Yes,1,19,1.75,16",
  ].join("\n");

  return (
    <div className="min-h-screen" style={{ background: "rgb(var(--forge-bg))", padding: "32px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "rgb(var(--text-body))", marginBottom: 4 }}>AV Product Library</h1>
          <p style={{ fontSize: 13, color: "rgb(var(--text-subtle))" }}>
            {productCount === null ? "Loading…" : `${productCount.toLocaleString()} product${productCount !== 1 ? "s" : ""} in database`}
          </p>
        </div>

        {/* Import */}
        <div style={{ background: "rgb(var(--forge-panel))", border: "1px solid rgb(var(--border))", borderRadius: 10, padding: 20, marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "rgb(var(--text-body))", marginBottom: 6 }}>Import via CSV</h2>

          <div style={{ fontSize: 11, color: "rgb(var(--text-subtle))", marginBottom: 12, lineHeight: 1.8 }}>
            <div><strong style={{ color: "rgb(var(--text-muted))" }}>Required:</strong> <code style={{ background: "rgb(var(--forge-surface))", padding: "1px 5px", borderRadius: 3 }}>Type</code>, <code style={{ background: "rgb(var(--forge-surface))", padding: "1px 5px", borderRadius: 3 }}>Ports</code></div>
            <div><strong style={{ color: "rgb(var(--text-muted))" }}>Optional:</strong> Category · Manufacturer · Model · Price · Color · Amp · Volt · Watts · BTU · RackMounted (Yes/No) · RackUnits · WidthIn · HeightIn · DepthIn</div>
            <div><strong style={{ color: "rgb(var(--text-muted))" }}>Ports:</strong> <code style={{ background: "rgb(var(--forge-surface))", padding: "1px 5px", borderRadius: 3 }}>side:signal:dir:label</code> — pipe-separated. Side: left/right · Signal: hdmi/dante/usb/cat6/analog/speaker/control/fiber/sdi · Dir: in/out</div>
          </div>

          <textarea
            value={csvText}
            onChange={e => setCsvText(e.target.value)}
            placeholder={placeholder}
            style={{ width: "100%", height: 130, padding: "10px 12px", background: "rgb(var(--forge-surface))", border: "1px solid rgb(var(--border))", borderRadius: 6, color: "rgb(var(--text-body))", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", resize: "vertical", outline: "none", boxSizing: "border-box", marginBottom: 10 }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={handleImport} disabled={importing}
              style={{ padding: "8px 18px", background: "#2563eb", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600, cursor: importing ? "not-allowed" : "pointer", opacity: importing ? 0.6 : 1 }}>
              {importing ? "Importing…" : "Import CSV"}
            </button>
            {importResult && <span style={{ fontSize: 12, color: importResult.startsWith("✓") ? "#4ade80" : "#f87171" }}>{importResult}</span>}
          </div>
        </div>

        {/* Browse */}
        <div style={{ background: "rgb(var(--forge-panel))", border: "1px solid rgb(var(--border))", borderRadius: 10, padding: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "rgb(var(--text-body))", marginBottom: 12 }}>Browse & Manage</h2>
          <div style={{ position: "relative", marginBottom: 14 }}>
            <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "rgb(var(--text-subtle))", pointerEvents: "none" }}
              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products…"
              style={{ width: "100%", padding: "8px 12px 8px 30px", background: "rgb(var(--forge-surface))", border: "1px solid rgb(var(--border))", borderRadius: 6, color: "rgb(var(--text-body))", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
          </div>

          {!query.trim() ? (
            <p style={{ fontSize: 12, color: "rgb(var(--text-subtle))", textAlign: "center", padding: "20px 0" }}>Type to search products</p>
          ) : searching ? (
            <p style={{ fontSize: 12, color: "rgb(var(--text-subtle))", textAlign: "center", padding: "20px 0" }}>Searching…</p>
          ) : results.length === 0 ? (
            <p style={{ fontSize: 12, color: "rgb(var(--text-subtle))", textAlign: "center", padding: "20px 0" }}>No results for &ldquo;{query}&rdquo;</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr>
                    <th style={TH}>Cat</th>
                    <th style={TH}>Type</th>
                    <th style={TH}>Manufacturer</th>
                    <th style={TH}>Model</th>
                    <th style={{ ...TH, textAlign: "right" }}>Price</th>
                    <th style={{ ...TH, textAlign: "right" }}>Amp</th>
                    <th style={{ ...TH, textAlign: "right" }}>Volt</th>
                    <th style={{ ...TH, textAlign: "right" }}>Watts</th>
                    <th style={{ ...TH, textAlign: "right" }}>BTU/hr</th>
                    <th style={TH}>Rack</th>
                    <th style={{ ...TH, textAlign: "right" }}>U</th>
                    <th style={{ ...TH, textAlign: "right" }}>W×H×D (in)</th>
                    <th style={TH}>Ports</th>
                    <th style={TH}></th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((p, i) => (
                    <tr key={p.id} style={{ background: i % 2 === 0 ? "transparent" : "rgb(var(--forge-surface) / 0.3)" }}>
                      <td style={{ ...TD, color: "rgb(var(--text-subtle))", fontFamily: "inherit" }}>{p.category}</td>
                      <td style={{ ...TD, color: "rgb(var(--text-body))", fontWeight: 500, fontFamily: "inherit" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 7, height: 7, borderRadius: 2, background: p.color, flexShrink: 0 }} />
                          {p.type}
                        </div>
                      </td>
                      <td style={{ ...TD, fontFamily: "inherit" }}>{p.manufacturer}</td>
                      <td style={{ ...TD, fontFamily: "inherit" }}>{p.model_name}</td>
                      <td style={{ ...TD, textAlign: "right" }}>{p.price > 0 ? "$" + p.price.toLocaleString() : "—"}</td>
                      <td style={{ ...TD, textAlign: "right" }}>{fmt(p.amp_draw, "A", 3)}</td>
                      <td style={{ ...TD, textAlign: "right" }}>{fmt(p.voltage, "V", 0)}</td>
                      <td style={{ ...TD, textAlign: "right" }}>{fmt(p.power_watts, "W", 0)}</td>
                      <td style={{ ...TD, textAlign: "right" }}>{fmt(p.btu_hr, "", 0)}</td>
                      <td style={{ ...TD, fontFamily: "inherit" }}>
                        <span style={{ padding: "2px 7px", borderRadius: 10, fontSize: 10, fontFamily: "inherit", background: p.rack_mounted ? "rgba(59,130,246,0.12)" : "rgba(100,116,139,0.1)", color: p.rack_mounted ? "#60a5fa" : "rgb(var(--text-subtle))" }}>
                          {p.rack_mounted ? "Yes" : "No"}
                        </span>
                      </td>
                      <td style={{ ...TD, textAlign: "right" }}>{p.rack_units ? p.rack_units + "U" : "—"}</td>
                      <td style={{ ...TD, textAlign: "right", whiteSpace: "nowrap" }}>
                        {(p.width_in || p.height_in || p.depth_in)
                          ? `${fmt(p.width_in, "", 2)} × ${fmt(p.height_in, "", 2)} × ${fmt(p.depth_in, "", 2)}`
                          : "—"}
                      </td>
                      <td style={{ ...TD, textAlign: "center", fontFamily: "inherit" }}>{p.ports.length}</td>
                      <td style={{ ...TD, fontFamily: "inherit" }}>
                        <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                          style={{ padding: "3px 8px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 4, color: "#f87171", fontSize: 10, cursor: "pointer" }}>
                          {deleting === p.id ? "…" : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
