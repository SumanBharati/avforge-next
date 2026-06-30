"use client";

import { useState } from "react";

const CTS_FORMULAS = [
  {
    name: "Viewing Distance (4K)",
    formula: "VD = Screen Height × VTR",
    notes: "VTR=6 (4K), VTR=4 (1080p). Last row ≤ 6× screen height for readability.",
    example: '84" screen → 42" H → max VD = 252" (21ft)',
  },
  {
    name: "Image Height",
    formula: "IH = SW / AR",
    notes: "AR = 16/9 = 1.78 for widescreen. SW = screen width.",
    example: '120" wide → IH = 120/1.78 = 67.4"',
  },
  {
    name: "Throw Ratio",
    formula: "TR = D / W",
    notes: "D = throw distance (lens to screen), W = image width.",
    example: "15ft throw, 10ft wide → TR = 1.5:1",
  },
  {
    name: "Lumens (Ambient Light)",
    formula: "L = (fL × A) / G",
    notes: "fL = foot-lamberts (≥40 bright room), A = area ft², G = screen gain.",
    example: "40fL × 60ft² / 1.0 gain = 2,400 lumens",
  },
  {
    name: "LED Pixel Pitch",
    formula: "PP(mm) = VD(m) / 2500 to 3000",
    notes: "Also: min VD(m) ≈ PP(mm) × 1.5. Smaller pitch = closer viewing.",
    example: "6m viewing → PP ≈ 6/2750 = 2.18mm → use P2.0 or P2.5",
  },
  {
    name: "PAG (Potential Acoustic Gain)",
    formula: "PAG = 20log(D1) - 20log(D0) - 20log(D2) + 20log(DS) - 6.5",
    notes: "D1=src-to-listener, D0=mic-to-src, D2=spkr-to-mic, DS=spkr-to-listener",
    example: "Must exceed NAG by ≥6dB for stable gain",
  },
  {
    name: "NAG (Needed Acoustic Gain)",
    formula: "NAG = 20log(D1) - 20log(D0)",
    notes: "If PAG > NAG + 6dB, system is stable.",
    example: "Src 20ft, listener 4ft → NAG = 20log(20) - 20log(4) = 14dB",
  },
  {
    name: "70V Tap Load",
    formula: "Total Taps ≤ Amp Watts",
    notes: "Sum all speaker taps. Never exceed amp rating. Budget 80% for headroom.",
    example: "8 speakers × 8W tap = 64W → need ≥80W amp",
  },
  {
    name: "Conduit Fill (1 Cable)",
    formula: "Fill ≤ 53%",
    notes: "1 cable: 53%, 2 cables: 31%, 3+ cables: 40% (NEC Chapter 9, Table 1).",
    example: '1" EMT ID=1.049" → area=0.864in² → 40% = 0.346in²',
  },
  {
    name: "BTU/hr (Rack Heat)",
    formula: "BTU/hr = Watts × 3.412",
    notes: "Sum all equipment watts. 1 ton HVAC = 12,000 BTU/hr.",
    example: "2,000W rack → 6,824 BTU/hr → ~0.57 tons cooling",
  },
  {
    name: "Dante Bandwidth",
    formula: "BW = Ch × SR × BD × 1.25",
    notes: "SR=48kHz, BD=24-bit. ×1.25 for overhead. Per flow (unicast or multicast).",
    example: "64ch × 48000 × 24 × 1.25 = 92.16 Mbps",
  },
  {
    name: "Speaker Coverage (EPR)",
    formula: "EPR = 2 × H × tan(θ/2)",
    notes: "H = ceiling height - ear height (4ft). θ = speaker dispersion angle.",
    example: "10ft above ear, 90° cone → EPR = 2×10×tan(45°) = 20ft dia",
  },
];

export default function StandardsPage() {
  const [search, setSearch] = useState("");
  const filtered = CTS_FORMULAS.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.formula.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in p-6 max-w-[860px]">
      <a href="/calculators" className="mb-4 inline-block text-[12px] text-subtle hover:text-secondary">← Calculators</a>
      <h2 className="mb-1 text-lg font-semibold text-heading">📐 Formula Sheet</h2>
      <p className="mb-5 text-[13px] text-subtle">AVIXA / CTS-D engineering formulas with examples</p>

      {/* Search */}
      <div className="relative mb-5">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          className="forge-input pl-9"
          placeholder="Search formulas…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map((f, i) => (
          <div key={i} className="rounded-xl border border-border bg-forge-surface/40 p-4">
            <div className="mb-2 text-[14px] font-semibold text-heading">{f.name}</div>
            <div className="mb-3 rounded-lg border border-border bg-forge-surface px-3.5 py-2.5 font-mono text-[13px] text-blue-400">{f.formula}</div>
            <div className="mb-1.5 text-[12px] text-muted">{f.notes}</div>
            <div className="text-[12px] italic text-subtle">Example: {f.example}</div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-[13px] text-subtle">No formulas match &ldquo;{search}&rdquo;</p>
        )}
      </div>
    </div>
  );
}
