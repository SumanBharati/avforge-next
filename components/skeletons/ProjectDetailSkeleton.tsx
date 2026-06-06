import Shimmer from "@/components/Shimmer";

export default function ProjectDetailSkeleton() {
  return (
    <div className="animate-fade-in overflow-x-hidden px-10 py-4" style={{ height: "calc(100vh - 72px)", overflowY: "auto" }}>
      {/* Back link */}
      <div className="mb-3 flex items-center gap-2">
        <Shimmer className="h-3.5 w-3.5 rounded-sm" />
        <Shimmer className="h-3.5 w-28" />
      </div>

      {/* Project header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Shimmer className="mb-2 h-8 w-64" />
          <div className="flex items-center gap-5">
            <Shimmer className="h-4 w-28" />
            <Shimmer className="h-4 w-32" />
          </div>
        </div>
        <Shimmer className="h-9 w-28 rounded-full" />
      </div>

      {/* Phase tracker */}
      <div className="mb-4 rounded-xl border border-border bg-forge-panel px-6 py-8">
        <div className="mb-4 flex items-center justify-between">
          <Shimmer className="h-3 w-28" />
          <Shimmer className="h-3 w-40" />
        </div>
        <div className="relative flex justify-between">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-1 flex-col-reverse items-center gap-2.5">
              <Shimmer className="h-3 w-16" />
              <Shimmer className="h-7 w-7 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Tools section */}
      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-forge-panel">
        <div className="px-5 pb-10 pt-5">
          <Shimmer className="mb-5 h-4 w-12" />
          <div className="grid grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="flex h-[190px] flex-col items-center rounded-xl border border-border bg-forge-surface/40 px-3 pt-4 pb-3"
              >
                <Shimmer className="mb-2 h-11 w-11 rounded-lg" />
                <Shimmer className="mb-1.5 h-3.5 w-[75%]" />
                <Shimmer className="mb-1 h-3 w-[90%]" />
                <Shimmer className="h-3 w-[65%]" />
                <Shimmer className="mt-auto h-9 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dashboard grid */}
      <div className="mt-6 grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-border bg-border">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-forge-panel p-5">
            <Shimmer className="mb-4 h-4 w-20" />
            <div className="flex flex-col gap-2">
              {[70, 55, 80, 45, 60].map((w, j) => (
                <Shimmer key={j} className="h-5 rounded" style={{ width: `${w}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Team members */}
      <div className="mt-6 rounded-lg border border-border bg-forge-panel p-5">
        <Shimmer className="mb-4 h-4 w-32" />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg border border-border px-4 py-3">
              <Shimmer className="mb-1 h-3 w-24" />
              <Shimmer className="h-5 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
