"use client";

import { useState } from "react";

const POE_DEVICES = [
  { name: "Shure MXA920",            type: "Ceiling Mic",       poeClass: 4, draw: 25.5,  standard: "802.3at" },
  { name: "Shure MXA910",            type: "Ceiling Mic",       poeClass: 4, draw: 25.5,  standard: "802.3at" },
  { name: "Shure MXA710",            type: "Wall Mic",          poeClass: 3, draw: 12.95, standard: "802.3af" },
  { name: "Shure MXA310",            type: "Table Mic",         poeClass: 3, draw: 12.95, standard: "802.3af" },
  { name: "Shure P300",              type: "DSP",               poeClass: 3, draw: 12.95, standard: "802.3af" },
  { name: "Shure ANIUSB-MATRIX",     type: "USB Interface",     poeClass: 3, draw: 12.95, standard: "802.3af" },
  { name: "Sennheiser TCC2",         type: "Ceiling Mic",       poeClass: 4, draw: 25.5,  standard: "802.3at" },
  { name: "Sennheiser TeamConnect Bar", type: "Soundbar",       poeClass: 5, draw: 40,    standard: "802.3bt" },
  { name: "Biamp Parlé TCM-XA",      type: "Ceiling Mic",       poeClass: 4, draw: 25.5,  standard: "802.3at" },
  { name: "Biamp Parlé ABC 2500T",   type: "Beamtrack Mic",     poeClass: 4, draw: 25.5,  standard: "802.3at" },
  { name: "QSC NV-32-H",             type: "NV Endpoint",       poeClass: 4, draw: 25.5,  standard: "802.3at" },
  { name: "Crestron DM-NVX-350",     type: "NVX Endpoint",      poeClass: 4, draw: 25.5,  standard: "802.3at" },
  { name: "Crestron DM-NVX-E30",     type: "NVX Encoder",       poeClass: 3, draw: 12.95, standard: "802.3af" },
  { name: "Crestron DM-NVX-D30",     type: "NVX Decoder",       poeClass: 3, draw: 12.95, standard: "802.3af" },
  { name: "Crestron TSW-1070",        type: "Touch Panel",       poeClass: 4, draw: 25.5,  standard: "802.3at" },
  { name: "Crestron TSW-770",         type: "Touch Panel",       poeClass: 3, draw: 12.95, standard: "802.3af" },
  { name: "Cisco Room Navigator",     type: "Touch Panel",       poeClass: 3, draw: 12.95, standard: "802.3af" },
  { name: "Cisco Room Bar",           type: "Video Bar",         poeClass: 5, draw: 40,    standard: "802.3bt" },
  { name: "Neat Bar",                 type: "Video Bar",         poeClass: 5, draw: 40,    standard: "802.3bt" },
  { name: "Neat Pad",                 type: "Touch Controller",  poeClass: 3, draw: 12.95, standard: "802.3af" },
  { name: "Logitech Rally Bar",       type: "Video Bar",         poeClass: 5, draw: 40,    standard: "802.3bt" },
  { name: "Logitech Tap",             type: "Touch Controller",  poeClass: 3, draw: 12.95, standard: "802.3af" },
  { name: "Huddly IQ",               type: "Camera",            poeClass: 2, draw: 6.49,  standard: "802.3af" },
  { name: "Axis P1375",              type: "IP Camera",          poeClass: 3, draw: 12.95, standard: "802.3af" },
  { name: "Extron NAV E 501",        type: "NAV Encoder",        poeClass: 4, draw: 25.5,  standard: "802.3at" },
  { name: "Extron NAV SD 501",       type: "NAV Decoder",        poeClass: 4, draw: 25.5,  standard: "802.3at" },
  { name: "AtlasIED IP-HVP",         type: "IP Speaker",         poeClass: 3, draw: 12.95, standard: "802.3af" },
  { name: "QSC Q-LAN Interface",     type: "Audio Interface",    poeClass: 3, draw: 12.95, standard: "802.3af" },
];

const stdColors: Record<string, { bg: string; text: string }> = {
  "802.3af": { bg: "rgba(34,197,94,0.15)",  text: "#4ade80" },
  "802.3at": { bg: "rgba(251,191,36,0.15)", text: "#fbbf24" },
  "802.3bt": { bg: "rgba(239,68,68,0.15)",  text: "#f87171" },
};

export default function PoEDatabasePage() {
  const [search,    setSearch]    = useState("");
  const [filterStd, setFilterStd] = useState("all");

  const filtered = POE_DEVICES.filter(d =>
    (filterStd === "all" || d.standard === filterStd) &&
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in p-6 max-w-[860px]">
      <a href="/reference" className="mb-4 inline-block text-[12px] text-subtle hover:text-secondary">← Back to Reference</a>
      <h2 className="mb-1 text-lg font-semibold text-heading">📦 PoE Device Database</h2>
      <p className="mb-5 text-[13px] text-subtle">Per-device PoE class and power draw reference for AV equipment</p>

      {/* Filters */}
      <div className="mb-5 flex gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="forge-input pl-9"
            placeholder="Search devices…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="forge-input w-auto"
          value={filterStd}
          onChange={e => setFilterStd(e.target.value)}
        >
          <option value="all">All Standards</option>
          <option value="802.3af">802.3af (15.4W)</option>
          <option value="802.3at">802.3at (30W)</option>
          <option value="802.3bt">802.3bt (60W+)</option>
        </select>
      </div>

      {/* PoE Standard legend */}
      <div className="mb-4 flex gap-3">
        {Object.entries(stdColors).map(([std, c]) => (
          <span key={std} className="rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{ background: c.bg, color: c.text }}>
            {std}
          </span>
        ))}
        <span className="text-[11px] text-faint">· Max draw at PD input</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              {["Device", "Type", "Class", "Max Draw", "Standard"].map(h => (
                <th key={h} style={{ padding: "9px 12px", background: "rgb(var(--forge-surface))", color: "rgb(var(--text-muted))", textAlign: "left", borderBottom: "2px solid rgb(var(--border))", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((d, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgb(var(--forge-surface) / 0.3)" }}>
                <td style={{ padding: "8px 12px", color: "rgb(var(--text-body))", fontWeight: 500, borderBottom: "1px solid rgb(var(--border))" }}>{d.name}</td>
                <td style={{ padding: "8px 12px", color: "rgb(var(--text-muted))", borderBottom: "1px solid rgb(var(--border))" }}>{d.type}</td>
                <td style={{ padding: "8px 12px", color: "#fbbf24", borderBottom: "1px solid rgb(var(--border))" }}>Class {d.poeClass}</td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid rgb(var(--border))", fontFamily: "'JetBrains Mono', monospace", color: "#a78bfa" }}>{d.draw}W</td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid rgb(var(--border))" }}>
                  <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600, background: stdColors[d.standard]?.bg, color: stdColors[d.standard]?.text }}>
                    {d.standard}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: "20px 12px", textAlign: "center", color: "#475569", fontSize: 13 }}>
                  No devices match the current filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-faint">
        {filtered.length} of {POE_DEVICES.length} devices · Draws shown at PD (Powered Device) input per IEEE 802.3 specifications
      </p>
    </div>
  );
}
