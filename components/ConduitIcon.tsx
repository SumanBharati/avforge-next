/* Metal (EMT) conduit pipe: brushed-steel body with an open end. */
export default function ConduitIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle" }} aria-hidden="true">
      <defs>
        <linearGradient id="conduit-steel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f1f5f9" />
          <stop offset="0.35" stopColor="#cbd5e1" />
          <stop offset="0.7" stopColor="#94a3b8" />
          <stop offset="1" stopColor="#64748b" />
        </linearGradient>
      </defs>
      {/* Pipe body */}
      <rect x="2" y="6.5" width="22" height="17" rx="1" fill="url(#conduit-steel)" stroke="#475569" strokeWidth="0.6" />
      {/* Highlight */}
      <rect x="3" y="8.2" width="20" height="2" rx="1" fill="#ffffff" opacity="0.6" />
      {/* Open end */}
      <ellipse cx="24" cy="15" rx="3.4" ry="8.5" fill="#cbd5e1" stroke="#475569" strokeWidth="0.6" />
      <ellipse cx="24.4" cy="15" rx="2.1" ry="6.3" fill="#1e293b" />
      <ellipse cx="23.8" cy="11.6" rx="0.7" ry="2" fill="#ffffff" opacity="0.25" />
    </svg>
  );
}
