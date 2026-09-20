/* Cross-section of a 2-conductor speaker cable: jacket, insulation, stranded copper and silver conductors. */
const STRAND_OFFSETS = [0, 60, 120, 180, 240, 300].map((deg) => {
  const rad = (deg * Math.PI) / 180;
  return { dx: Math.cos(rad) * 2.6, dy: Math.sin(rad) * 2.6 };
});

function Conductor({ cx, fill, strandFill, strandStroke }: { cx: number; fill: string; strandFill: string; strandStroke: string }) {
  return (
    <g>
      <circle cx={cx} cy={15} r={4.6} fill={fill} />
      {STRAND_OFFSETS.map(({ dx, dy }, i) => (
        <circle key={i} cx={cx + dx} cy={15 + dy} r={1.3} fill={strandFill} stroke={strandStroke} strokeWidth="0.3" />
      ))}
      <circle cx={cx} cy={15} r={1.3} fill={strandFill} stroke={strandStroke} strokeWidth="0.3" />
    </g>
  );
}

export default function SpeakerWireIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle" }} aria-hidden="true">
      <defs>
        <linearGradient id="wire-jacket" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#64748b" />
          <stop offset="1" stopColor="#334155" />
        </linearGradient>
        <linearGradient id="wire-copper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="wire-silver" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="1" stopColor="#94a3b8" />
        </linearGradient>
      </defs>
      {/* Outer jacket (figure-8 zip cord) */}
      <rect x="1.5" y="6" width="27" height="18" rx="9" fill="url(#wire-jacket)" stroke="#94a3b8" strokeWidth="0.6" />
      {/* Insulation around each conductor */}
      <circle cx="9.5" cy="15" r="6.2" fill="#1e293b" stroke="#94a3b8" strokeWidth="0.4" />
      <circle cx="20.5" cy="15" r="6.2" fill="#1e293b" stroke="#94a3b8" strokeWidth="0.4" />
      {/* Conductors: copper and silver (polarity pair) */}
      <Conductor cx={9.5} fill="url(#wire-copper)" strandFill="#fcd34d" strandStroke="#92400e" />
      <Conductor cx={20.5} fill="url(#wire-silver)" strandFill="#f1f5f9" strandStroke="#64748b" />
    </svg>
  );
}
