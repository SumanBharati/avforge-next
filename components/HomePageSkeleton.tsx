import Shimmer from "./Shimmer";

const CARD_STYLE = {
  background: "#ffffff",
  borderTop: "1.5px solid #e6def9",
  borderRight: "1.5px solid #e6def9",
  borderBottom: "1.5px solid #d8ccf6",
  borderLeft: "1.5px solid #d8ccf6",
  boxShadow: "0 4px 24px rgba(124,58,237,0.08)",
};

const INFO_ROW_WIDTHS  = [72, 85, 55, 78, 62];
const ACTIVITY_WIDTHS  = [65, 80, 55, 70, 85, 60, 75, 50];
const LEGEND_WIDTHS    = [90, 80, 95, 70, 85];

export default function HomePageSkeleton() {
  return (
    <div className="flex flex-col px-4 pt-6 pb-16 sm:px-6 lg:px-8" style={{ minHeight: "calc(100vh - 72px)" }}>

      {/* ── Top 3 info cards ──────────────────────── */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="relative flex min-h-[200px] flex-col overflow-hidden rounded-2xl p-5" style={CARD_STYLE}>
            {/* Card header */}
            <div className="mb-3 flex items-center gap-2.5">
              <Shimmer light className="h-9 w-9 rounded-xl" />
              <Shimmer light className="h-4 w-28" />
            </div>
            {/* Sub-label */}
            <Shimmer light className="mb-2.5 h-3 w-24" />
            {/* Content rows */}
            <div className="flex flex-col gap-1.5">
              {INFO_ROW_WIDTHS.map((w, j) => (
                <Shimmer key={j} light className="h-5 rounded-md" style={{ width: `${w}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Dashboard card ────────────────────────── */}
      <div className="forge-gradient-card mb-6 flex flex-1 min-h-0 flex-col rounded-xl border-2 border-blue-500/40 p-6 shadow-lg shadow-blue-500/5">

        {/* Dashboard header */}
        <div className="mb-5 flex items-center gap-3">
          <Shimmer className="h-9 w-9 rounded-lg" />
          <Shimmer className="h-5 w-32" />
        </div>

        <div className="flex flex-1 min-h-0 flex-col gap-5 xl:flex-row">

          {/* ── Project section (flex-[3]) ─────────── */}
          <div className="flex flex-[3] min-w-0 flex-col p-4">
            <div className="flex flex-1 flex-col gap-4 overflow-x-auto 2xl:flex-row">

              {/* Pie chart + legend */}
              <div className="flex flex-1 min-w-0 flex-col">
                <div className="mb-3 flex items-center gap-2">
                  <Shimmer className="h-3 w-3 rounded-sm" />
                  <Shimmer className="h-3 w-36" />
                </div>
                <div className="flex w-full flex-1 flex-col items-center justify-center gap-4 sm:flex-row">
                  <Shimmer className="h-[220px] w-[220px] shrink-0 rounded-full sm:h-[280px] sm:w-[280px]" />
                  <div className="flex flex-col gap-3">
                    {LEGEND_WIDTHS.map((w, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Shimmer className="h-3 w-3 rounded-sm" />
                        <Shimmer className="h-3" style={{ width: `${w}px` }} />
                        <Shimmer className="h-3 w-6" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-border lg:h-auto lg:w-px" />

              {/* Pipeline overview */}
              <div className="flex w-full shrink-0 flex-col gap-3 lg:w-[230px]">
                <div className="mb-1 flex items-center gap-2">
                  <Shimmer className="h-3 w-3 rounded-sm" />
                  <Shimmer className="h-3 w-36" />
                </div>
                <div className="flex flex-col gap-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="rounded border-l-[3px] border-l-border px-3 py-2">
                      <Shimmer className="mb-2 h-2.5 w-20" />
                      <Shimmer className="h-6 w-20" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px w-full bg-border lg:h-auto lg:w-px" />

              {/* Team activity */}
              <div className="flex w-full shrink-0 flex-col lg:w-[280px]">
                <div className="mb-3 flex items-center gap-2">
                  <Shimmer className="h-3 w-3 rounded-sm" />
                  <Shimmer className="h-3 w-28" />
                </div>
                <div className="flex flex-col gap-0.5">
                  {ACTIVITY_WIDTHS.map((w, i) => (
                    <div key={i} className="flex items-start gap-3 px-3 py-2.5">
                      <Shimmer className="mt-1 h-6 w-6 shrink-0 rounded-full" />
                      <div className="flex-1">
                        <Shimmer className="mb-1 h-3" style={{ width: `${w}%` }} />
                        <Shimmer className="h-2.5 w-10" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          <div className="h-px w-full bg-border xl:h-auto xl:w-px" />

          {/* ── Schedule section (flex-[2]) ─────────── */}
          <div className="flex flex-[2] min-w-0 flex-col overflow-hidden p-4">
            <div className="mb-3 flex items-center gap-2">
              <Shimmer className="h-3 w-3 rounded-sm" />
              <Shimmer className="h-3 w-20" />
            </div>
            <Shimmer className="min-h-[320px] flex-1 rounded-lg" />
          </div>

        </div>
      </div>

    </div>
  );
}
