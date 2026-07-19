const PATTERNS = [
  ["Omnidirectional", "Equal pickup around the microphone; useful for lavaliers, ambience, and moving subjects."],
  ["Subcardioid", "Broad front pickup with mild rear rejection; captures the source plus room sound."],
  ["Cardioid", "Strong front pickup and rear rejection; the common general-purpose pattern for speech and events."],
  ["Supercardioid", "Narrower front lobe with a small rear lobe; useful on booms and noisy stages."],
  ["Bi-directional", "Figure-eight pickup from front and rear with strong side rejection; useful for interviews and M/S recording."],
  ["Hypercardioid", "Very narrow front pickup with a larger rear lobe; useful for isolated instruments and location sound."],
  ["Shotgun", "Interference-tube pattern with very narrow high-frequency pickup; common for broadcast and camera work."],
] as const;

function PatternIcon({ type }: { type: string }) {
  const fill = "rgba(34,211,238,.18)";
  const stroke = "#22d3ee";
  if (type === "Omnidirectional") return <circle cx="50" cy="50" r="31" fill={fill} stroke={stroke} strokeWidth="2" />;
  if (type === "Bi-directional") return <><ellipse cx="30" cy="50" rx="20" ry="28" fill={fill} stroke={stroke} strokeWidth="2" /><ellipse cx="70" cy="50" rx="20" ry="28" fill={fill} stroke={stroke} strokeWidth="2" /></>;
  if (type === "Shotgun") return <><ellipse cx="63" cy="50" rx="34" ry="11" fill={fill} stroke={stroke} strokeWidth="2" /><ellipse cx="25" cy="50" rx="10" ry="7" fill={fill} stroke={stroke} strokeWidth="2" /></>;
  const rear = type === "Cardioid" ? 0 : type === "Subcardioid" ? 5 : type === "Supercardioid" ? 9 : 13;
  return <><path d="M50 50 C24 7 94 8 89 50 C94 92 24 93 50 50Z" fill={fill} stroke={stroke} strokeWidth="2" />{rear > 0 && <ellipse cx={42 - rear / 3} cy="50" rx={rear} ry={rear * .75} fill={fill} stroke={stroke} strokeWidth="2" />}</>;
}

export default function MicrophonePolarPatterns() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {PATTERNS.map(([name, description]) => (
        <div key={name} className="flex gap-3 rounded-xl border border-border bg-forge-surface/30 p-3">
          <svg viewBox="0 0 100 100" className="h-16 w-16 shrink-0" aria-hidden="true">
            <line x1="50" y1="12" x2="50" y2="88" stroke="rgb(var(--border-light))" />
            <line x1="12" y1="50" x2="88" y2="50" stroke="rgb(var(--border-light))" />
            <PatternIcon type={name} />
            <circle cx="50" cy="50" r="3" fill="#f97316" />
          </svg>
          <div>
            <div className="text-[13px] font-semibold text-heading">{name}</div>
            <p className="mt-1 text-[11px] leading-relaxed text-subtle">{description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
