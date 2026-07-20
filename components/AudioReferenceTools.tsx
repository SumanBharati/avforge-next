"use client";

import Image from "next/image";
import { Fragment, useMemo, useState } from "react";

const INTERCONNECTS = [
  ["RCA", "RCA", "Unbalanced", "Signal → signal; shield → shield"],
  ["RCA", "1/4\" TS", "Unbalanced", "RCA signal → tip; shield → sleeve"],
  ["RCA", "1/4\" TRS", "Unbalanced to balanced input", "Signal → tip; shield → ring and sleeve"],
  ["RCA", "XLR", "Unbalanced to balanced input", "Signal → pin 2; shield → pins 1 and 3"],
  ["1/4\" TS", "1/4\" TS", "Unbalanced", "Tip → tip; sleeve → sleeve"],
  ["1/4\" TS", "1/4\" TRS", "Unbalanced to balanced input", "Tip → tip; sleeve → ring and sleeve"],
  ["1/4\" TS", "XLR", "Unbalanced to balanced input", "Tip → pin 2; sleeve → pins 1 and 3"],
  ["1/4\" TRS", "1/4\" TRS", "Balanced", "Tip → tip; ring → ring; sleeve → sleeve"],
  ["1/4\" TRS", "XLR", "Balanced", "Tip → pin 2; ring → pin 3; sleeve → pin 1"],
  ["XLR", "XLR", "Balanced", "Pin 1 → 1; pin 2 → 2; pin 3 → 3"],
] as const;

const INTERCONNECT_DIAGRAMS: Record<string, { src: string; alt: string }> = {
  "RCA->RCA": {
    src: "/unbalanced-rca-to-rca.png",
    alt: "Wiring diagram for an unbalanced RCA output connected to an unbalanced RCA input",
  },
  "RCA->1/4\" TS": {
    src: "/unbalanced-rca-quarter-inch-ts.png",
    alt: "Wiring diagram for an unbalanced RCA output connected to a quarter-inch unbalanced TS input",
  },
  "RCA->1/4\" TRS": {
    src: "/unbalanced-rca-balanced-trs.png",
    alt: "Wiring diagram for an unbalanced RCA output connected to a quarter-inch balanced TRS input",
  },
  "RCA->XLR": {
    src: "/unbalanced-rca-male-xlr.png",
    alt: "Wiring diagram for an unbalanced RCA output connected to a male balanced XLR input",
  },
  "1/4\" TS->XLR": {
    src: "/unbalanced-ts-balanced-xlr.png",
    alt: "Wiring diagram for a quarter-inch unbalanced TS output connected to a male balanced XLR input",
  },
  "1/4\" TS->1/4\" TRS": {
    src: "/unbalanced-ts-balanced-trs.png",
    alt: "Wiring diagram for a quarter-inch unbalanced TS output connected to a quarter-inch balanced TRS input",
  },
  "1/4\" TS->1/4\" TS": {
    src: "/unbalanced-ts-to-ts.png",
    alt: "Wiring diagram for a quarter-inch unbalanced TS output connected to a quarter-inch unbalanced TS input",
  },
  "1/4\" TRS->XLR": {
    src: "/trs-to-balanced-xlr.png",
    alt: "Wiring diagram for a quarter-inch TRS output connected to a balanced XLR input",
  },
  "1/4\" TRS->1/4\" TRS": {
    src: "/balanced-trs-to-trs.png",
    alt: "Wiring diagram for a balanced quarter-inch TRS output connected to a balanced quarter-inch TRS input",
  },
  "XLR->XLR": {
    src: "/balanced-xlr-to-xlr.png",
    alt: "Wiring diagram for a balanced female XLR output connected to a balanced male XLR input",
  },
};

type WiringMode = "series" | "parallel" | "series-parallel";

export default function AudioReferenceTools() {
  const [mode, setMode] = useState<WiringMode>("parallel");
  const [impedance, setImpedance] = useState(8);
  const [speakers, setSpeakers] = useState(2);

  const total = useMemo(() => {
    if (mode === "series") return impedance * speakers;
    if (mode === "parallel") return impedance / speakers;
    const branchSize = Math.sqrt(speakers);
    return Number.isInteger(branchSize) ? (impedance * branchSize) / branchSize : null;
  }, [impedance, mode, speakers]);

  return (
    <section className="mt-8 space-y-7">
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-faint">Audio Interconnects</div>
        <p className="mb-3 text-[12px] text-subtle">Common analog-audio cable mappings. Direction matters when converting balanced outputs to unbalanced inputs; follow the equipment maker’s output-stage guidance.</p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-[12px]">
            <thead><tr className="border-b border-border bg-forge-surface/60"><th className="px-3 py-2 text-left text-secondary">From</th><th className="px-3 py-2 text-left text-secondary">To</th><th className="px-3 py-2 text-left text-secondary">Link</th><th className="px-3 py-2 text-left text-secondary">Typical wiring</th></tr></thead>
            <tbody>{INTERCONNECTS.map(row => {
              const diagram = INTERCONNECT_DIAGRAMS[`${row[0]}->${row[1]}`];
              return (
                <Fragment key={`${row[0]}-${row[1]}`}>
                  <tr className="border-b border-border/50">
                    <td className="px-3 py-2 font-medium text-muted">{row[0]}</td>
                    <td className="px-3 py-2 font-medium text-muted">{row[1]}</td>
                    <td className="px-3 py-2 text-subtle">{row[2]}</td>
                    <td className="px-3 py-2 text-subtle">{row[3]}</td>
                  </tr>
                  {diagram && (
                    <tr className="border-b border-border/50">
                      <td colSpan={4} className="bg-forge-surface/30 p-3">
                        <Image
                          src={diagram.src}
                          alt={diagram.alt}
                          width={2048}
                          height={683}
                          className="h-auto w-full rounded-lg border border-border bg-white"
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}</tbody>
          </table>
        </div>
        <div className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-subtle">Never apply phantom power through an unbalanced adapter. Transformer-balanced, impedance-balanced, and cross-coupled outputs can require different unbalancing methods.</div>
      </div>

      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-faint">Speaker Impedance</div>
        <div className="rounded-xl border border-border bg-forge-surface/30 p-4">
          <div className="mb-4 flex flex-wrap gap-2">{(["parallel", "series", "series-parallel"] as WiringMode[]).map(value => <button key={value} onClick={() => setMode(value)} className={`rounded-lg border px-3 py-1.5 text-[12px] capitalize ${mode === value ? "border-blue-400 bg-blue-500/10 text-blue-400" : "border-border text-subtle"}`}>{value.replace("-", " / ")}</button>)}</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[12px] text-secondary">Each speaker (Ω)<input className="forge-input mt-1" type="number" min="1" step="0.5" value={impedance} onChange={e => setImpedance(Math.max(0.5, Number(e.target.value) || 0.5))} /></label>
            <label className="text-[12px] text-secondary">Speaker count<input className="forge-input mt-1" type="number" min="2" step="1" value={speakers} onChange={e => setSpeakers(Math.max(2, Math.floor(Number(e.target.value) || 2)))} /></label>
          </div>
          <div className="mt-4 rounded-lg border border-border bg-forge-card px-4 py-3"><span className="text-[12px] text-subtle">Computed load: </span><span className="font-mono text-lg font-semibold text-blue-400">{total === null ? "Requires a square speaker count" : `${Number(total.toFixed(3))} Ω`}</span></div>
          <p className="mt-2 text-[11px] text-faint">Series adds impedances. Equal parallel loads divide impedance by speaker count. The series/parallel result assumes an equal square grid (4, 9, 16…). Confirm the amplifier’s permitted load before connecting.</p>
        </div>
      </div>

    </section>
  );
}
