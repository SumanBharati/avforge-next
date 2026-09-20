/* Ohm (Ω) symbol drawn as a path so it renders identically regardless of installed fonts. */
export default function OhmIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle" }} aria-hidden="true">
      <path
        d="M3.5 25.5H11C7 22.5 5 19 5 14A10 10 0 0 1 25 14C25 19 23 22.5 19 25.5H26.5"
        fill="none"
        stroke="#8b5cf6"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
