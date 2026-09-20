/* Formula sheet: violet page with a folded corner, a sigma, and two formula lines. */
export default function FormulaSheetIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle" }} aria-hidden="true">
      {/* Page */}
      <path d="M7 2.5H18.5L25 9V25.5A2 2 0 0 1 23 27.5H7A2 2 0 0 1 5 25.5V4.5A2 2 0 0 1 7 2.5Z" fill="#8b5cf6" />
      {/* Folded corner */}
      <path d="M18.5 2.5V7A2 2 0 0 0 20.5 9H25Z" fill="#6d28d9" />
      {/* Sigma */}
      <path d="M19.5 9.5H11L15.5 14.5L11 19.5H19.5" fill="none" stroke="#ede9fe" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      {/* Formula lines */}
      <path d="M9.5 22.5H20.5M9.5 25H16" fill="none" stroke="#ede9fe" strokeWidth="1.3" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}
