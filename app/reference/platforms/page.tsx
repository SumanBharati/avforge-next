const PLATFORM_COMPARISONS = [
  { feature: "Control Processor",      qsys: "Core 110f/510i",             crestron: "CP4/PRO4",                  extron: "IPCP Pro 550",               biamp: "TesiraFORTÉ" },
  { feature: "Programming Language",   qsys: "Lua + Q-SYS Designer",       crestron: "SIMPL+ / SIMPL#",           extron: "Global Scripter (Python)",   biamp: "Composer (Drag & Drop)" },
  { feature: "Network AV",             qsys: "Q-LAN (Dante)",              crestron: "DM NVX (SDVoE)",            extron: "NAV Pro (SDVoE)",            biamp: "Dante" },
  { feature: "DSP Architecture",       qsys: "Software-based",             crestron: "Hardware (Avia DSP)",       extron: "DMP Series",                 biamp: "TesiraFORTÉ/SERVER" },
  { feature: "Touch Panels",           qsys: "TSC Series / UCI",           crestron: "TSW Series",                extron: "TLP Pro",                    biamp: "N/A (3rd party)" },
  { feature: "AEC",                    qsys: "Built-in (Core)",            crestron: "Avia DSP-1",                extron: "DMP 128 Plus",               biamp: "TesiraFORTÉ AI" },
  { feature: "Cloud Management",       qsys: "Q-SYS Reflect",              crestron: "XiO Cloud",                 extron: "GlobalViewer",               biamp: "Biamp Launch" },
  { feature: "Licensing Model",        qsys: "Per-core + features",        crestron: "Per-device",                extron: "Per-device",                 biamp: "Per-card/license" },
  { feature: "Teams/Zoom Integration", qsys: "Q-SYS USB Bridging",         crestron: "Flex UC",                   extron: "Collaboration Gateway",      biamp: "Devio" },
  { feature: "Camera Integration",     qsys: "Q-SYS PTZ Cameras",          crestron: "1 Beyond",                  extron: "SMP Series",                 biamp: "N/A (3rd party)" },
];

export default function PlatformComparisonPage() {
  return (
    <div className="animate-fade-in p-6 max-w-[1100px]">
      <a href="/reference" className="mb-4 inline-block text-[12px] text-subtle hover:text-secondary">← Back to Reference</a>
      <h2 className="mb-1 text-lg font-semibold text-heading">⚔️ Platform Comparison</h2>
      <p className="mb-5 text-[13px] text-subtle">Q-SYS vs Crestron vs Extron vs Biamp — feature-by-feature breakdown</p>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              {[
                { label: "Feature",   color: "rgb(var(--text-muted))" },
                { label: "Q-SYS",    color: "#c4b5fd" },
                { label: "Crestron", color: "#fbbf24" },
                { label: "Extron",   color: "#34d399" },
                { label: "Biamp",    color: "#c084fc" },
              ].map(h => (
                <th key={h.label} style={{ padding: "10px 14px", background: "rgb(var(--forge-surface))", color: h.color, textAlign: "left", borderBottom: "2px solid rgb(var(--border))", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLATFORM_COMPARISONS.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgb(var(--forge-surface) / 0.3)" }}>
                <td style={{ padding: "9px 14px", color: "rgb(var(--text-body))", fontWeight: 500, borderBottom: "1px solid rgb(var(--border))" }}>{row.feature}</td>
                <td style={{ padding: "9px 14px", color: "#c4b5fd", borderBottom: "1px solid rgb(var(--border))" }}>{row.qsys}</td>
                <td style={{ padding: "9px 14px", color: "#fbbf24", borderBottom: "1px solid rgb(var(--border))" }}>{row.crestron}</td>
                <td style={{ padding: "9px 14px", color: "#34d399", borderBottom: "1px solid rgb(var(--border))" }}>{row.extron}</td>
                <td style={{ padding: "9px 14px", color: "#c084fc", borderBottom: "1px solid rgb(var(--border))" }}>{row.biamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
