const RESOLUTIONS: { name: string; w: number; h: number }[] = [
  { name: "VGA", w: 640, h: 480 },
  { name: "SVGA", w: 800, h: 600 },
  { name: "qHD", w: 960, h: 540 },
  { name: "XGA", w: 1024, h: 768 },
  { name: "HD", w: 1280, h: 720 },
  { name: "WXGA", w: 1280, h: 800 },
  { name: "SXGA", w: 1280, h: 1024 },
  { name: "WXGA+", w: 1440, h: 900 },
  { name: "HD+", w: 1600, h: 900 },
  { name: "UXGA", w: 1600, h: 1200 },
  { name: "WSXGA+", w: 1680, h: 1050 },
  { name: "FHD (1080p)", w: 1920, h: 1080 },
  { name: "WUXGA", w: 1920, h: 1200 },
  { name: "UW-FHD", w: 2560, h: 1080 },
  { name: "WQHD (1440p)", w: 2560, h: 1440 },
  { name: "WQXGA", w: 2560, h: 1600 },
  { name: "UWQHD", w: 3440, h: 1440 },
  { name: "4K UHD", w: 3840, h: 2160 },
  { name: "DCI 4K", w: 4096, h: 2160 },
  { name: "5K", w: 5120, h: 2880 },
  { name: "DQHD (32:9)", w: 5120, h: 1440 },
  { name: "8K UHD", w: 7680, h: 4320 },
];

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

function aspectLabel(w: number, h: number): string {
  const divisor = gcd(w, h);
  const key = `${w / divisor}:${h / divisor}`;
  const friendly: Record<string, string> = {
    "8:5": "16:10",
    "43:18": "≈21:9 (43:18)",
    "64:27": "21:9 (64:27)",
    "256:135": "≈17:9 (256:135)",
  };
  return friendly[key] ?? key;
}

const megapixels = (w: number, h: number) => ((w * h) / 1_000_000).toFixed(2);

export default function ResolutionReference() {
  return (
    <>
      <p className="mb-3 text-[12px] text-subtle">Aspect ratio and megapixels are computed from H×V at render time — no hand-typed derived values.</p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-[12px]">
          <thead><tr className="border-b border-border bg-forge-surface/60"><th className="px-3 py-2 text-left font-semibold text-secondary">Name</th><th className="px-3 py-2 text-right font-semibold text-secondary">H</th><th className="px-3 py-2 text-right font-semibold text-secondary">V</th><th className="px-3 py-2 text-left font-semibold text-secondary">Aspect</th><th className="px-3 py-2 text-right font-semibold text-secondary">Mpx</th></tr></thead>
          <tbody>{RESOLUTIONS.map(resolution => <tr key={resolution.name} className="border-b border-border/50 last:border-0"><td className="px-3 py-1.5 font-medium text-muted">{resolution.name}</td><td className="px-3 py-1.5 text-right font-mono text-blue-400">{resolution.w}</td><td className="px-3 py-1.5 text-right font-mono text-blue-400">{resolution.h}</td><td className="px-3 py-1.5 text-subtle">{aspectLabel(resolution.w, resolution.h)}</td><td className="px-3 py-1.5 text-right font-mono text-subtle">{megapixels(resolution.w, resolution.h)}</td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
