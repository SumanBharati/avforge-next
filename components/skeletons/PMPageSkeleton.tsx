import Shimmer from "@/components/Shimmer";

const ROW_WIDTHS = [
  [60, 45, 55, 40, 50],
  [75, 55, 45, 60, 35],
  [50, 65, 50, 45, 55],
  [68, 40, 60, 50, 42],
  [55, 70, 48, 55, 38],
  [72, 50, 52, 42, 48],
];

export default function PMPageSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border px-8 py-4">
        <div className="flex items-center gap-3">
          <Shimmer className="h-6 w-28" />
          <Shimmer className="h-5 w-8 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Shimmer className="h-9 w-48 rounded-lg" />
          <Shimmer className="h-9 w-24 rounded-lg" />
          <Shimmer className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden px-8 py-4">
        {/* Table header */}
        <div className="mb-2 grid grid-cols-5 gap-4 px-4 py-2">
          {["30%", "25%", "22%", "18%", "15%"].map((w, i) => (
            <Shimmer key={i} className="h-3 rounded" style={{ width: w }} />
          ))}
        </div>

        {/* Table rows */}
        <div className="rounded-lg border border-border overflow-hidden">
          {ROW_WIDTHS.map((cols, i) => (
            <div
              key={i}
              className="grid grid-cols-5 gap-4 border-b border-border px-4 py-3.5 last:border-b-0"
            >
              {cols.map((w, j) => (
                <Shimmer key={j} className="h-4 rounded" style={{ width: `${w}%` }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
