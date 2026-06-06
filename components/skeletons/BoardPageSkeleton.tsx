import Shimmer from "@/components/Shimmer";

const CARD_COUNTS = [3, 2, 4];
const CARD_WIDTHS = [
  [85, 70, 60],
  [75, 90],
  [65, 80, 55, 72],
];

export default function BoardPageSkeleton() {
  return (
    <div className="animate-fade-in flex h-full flex-col px-8 py-6" style={{ minHeight: "calc(100vh - 72px)" }}>
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <Shimmer className="h-[22px] w-[22px] rounded-sm" />
        <div>
          <Shimmer className="mb-1.5 h-6 w-20" />
          <Shimmer className="h-3.5 w-52" />
        </div>
      </div>

      {/* Columns */}
      <div className="flex flex-1 items-start gap-4 overflow-x-auto pb-6">
        {CARD_COUNTS.map((count, ci) => (
          <div
            key={ci}
            className="flex w-[300px] shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-forge-panel/60"
          >
            {/* Color bar */}
            <Shimmer className="h-1.5 w-full rounded-none" />

            {/* Column header */}
            <div className="flex items-center gap-2 px-3 py-3">
              <Shimmer className="h-4 w-24" />
              <Shimmer className="h-5 w-6 rounded-md" />
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2 px-3 pb-3">
              {CARD_WIDTHS[ci].map((w, ki) => (
                <div key={ki} className="rounded-lg border border-border bg-forge-surface/40 px-3 py-3">
                  <Shimmer className="mb-2 h-3.5 rounded" style={{ width: `${w}%` }} />
                  <Shimmer className="h-3 w-16" />
                </div>
              ))}
            </div>

            {/* Add a card row */}
            <div className="px-3 pb-3">
              <Shimmer className="h-8 rounded-lg" />
            </div>
          </div>
        ))}

        {/* Add column placeholder */}
        <Shimmer className="h-12 w-[300px] shrink-0 rounded-xl" />
      </div>
    </div>
  );
}
