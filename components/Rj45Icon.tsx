/* Front view of an RJ45 plug: clear plastic body, 8 gold contacts, latch tab. */
const CONTACT_X = Array.from({ length: 8 }, (_, i) => 6.4 + i * 2.3);

export default function Rj45Icon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle" }} aria-hidden="true">
      <defs>
        <linearGradient id="rj45-plastic" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f1f5f9" />
          <stop offset="1" stopColor="#94a3b8" />
        </linearGradient>
        <linearGradient id="rj45-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
      </defs>
      {/* Latch tab */}
      <rect x="8" y="20" width="14" height="7" rx="1.6" fill="url(#rj45-plastic)" stroke="#475569" strokeWidth="0.6" />
      {/* Body */}
      <rect x="3" y="3.5" width="24" height="18" rx="2.2" fill="url(#rj45-plastic)" stroke="#475569" strokeWidth="0.6" />
      {/* Contact cavity */}
      <rect x="5" y="6" width="20" height="10.5" rx="1" fill="#1e293b" />
      {/* 8 gold contacts */}
      {CONTACT_X.map((x) => (
        <rect key={x} x={x} y="7" width="1.4" height="8.5" rx="0.4" fill="url(#rj45-gold)" />
      ))}
    </svg>
  );
}
