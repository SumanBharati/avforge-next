/* Two opposing block arrows (transmit / receive): right-pointing on top, left-pointing below. */
export default function TwoWayArrowsIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle" }} aria-hidden="true">
      <path d="M2.5 5.5H17V2.5L27.5 8L17 13.5V10.5H2.5Z" fill="#8b5cf6" stroke="#8b5cf6" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M27.5 19.5H13V16.5L2.5 22L13 27.5V24.5H27.5Z" fill="#22d3ee" stroke="#22d3ee" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
