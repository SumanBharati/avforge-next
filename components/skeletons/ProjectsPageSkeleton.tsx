import Shimmer from "@/components/Shimmer";

const ROW_WIDTHS = [
  [65, 70, 45, 55],
  [80, 55, 50, 60],
  [55, 75, 40, 50],
  [72, 62, 55, 45],
  [68, 80, 48, 58],
  [60, 65, 52, 62],
];

export default function ProjectsPageSkeleton() {
  return (
    <div className="animate-fade-in px-8 py-6">
      {/* ── Top bar ── */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shimmer className="h-4 w-4 rounded-sm" />
          <Shimmer className="h-4 w-20" />
        </div>
        <div className="flex items-center gap-3">
          <Shimmer className="h-9 w-[260px] rounded-lg" />
          <Shimmer className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* ── Filters row ── */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Shimmer className="h-3.5 w-3.5 rounded-sm" />
          <Shimmer className="h-3.5 w-12" />
        </div>
        <Shimmer className="h-8 w-[140px] rounded-lg" />
        <Shimmer className="h-8 w-[160px] rounded-lg" />
        <Shimmer className="h-8 w-[140px] rounded-lg" />
      </div>

      {/* ── Table ── */}
      <div className="overflow-visible rounded-lg border border-border">
        {/* Header */}
        <div className="grid grid-cols-[1fr_1fr_0.8fr_0.6fr_40px] gap-4 border-b border-border bg-forge-surface/60 px-5 py-3">
          {["40%", "50%", "55%", "45%"].map((w, i) => (
            <Shimmer key={i} className="h-3 rounded" style={{ width: w }} />
          ))}
          <div />
        </div>

        {/* Rows */}
        {ROW_WIDTHS.map((cols, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_1fr_0.8fr_0.6fr_40px] gap-4 border-b border-border px-5 py-4 last:border-b-0"
          >
            {cols.map((w, j) => (
              <Shimmer key={j} className="h-4 rounded" style={{ width: `${w}%` }} />
            ))}
            <Shimmer className="h-6 w-6 rounded-md" />
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      <div className="mt-3 flex items-center justify-between">
        <Shimmer className="h-3 w-32" />
        <Shimmer className="h-3 w-20" />
      </div>
    </div>
  );
}
