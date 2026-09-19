import Link from "next/link";
import type { PlanComparisonFeature } from "@/lib/home-plan-comparison";

function PlanIcon({ pro }: { pro?: boolean }) {
  return (
    <div className={`mx-auto flex h-10 w-12 items-center justify-center rounded-lg ${pro ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "border border-border bg-forge-surface text-blue-500"}`}>
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="5" width="15" height="12" rx="2" />
        <path d="M7 9h7M7 13h4" />
        <circle cx="18" cy="16" r="3" fill={pro ? "currentColor" : "none"} />
      </svg>
    </div>
  );
}

function Availability({ included, label }: { included: boolean; label: string }) {
  return included ? (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm shadow-blue-600/20" role="img" aria-label={`${label}: included`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l4 4L19 6" /></svg>
    </span>
  ) : (
    <span className="text-xl font-semibold leading-none text-subtle" role="img" aria-label={`${label}: not included`}>—</span>
  );
}

export default function PlanComparisonSection({ features }: { features: PlanComparisonFeature[] }) {
  return (
    <section id="plans" className="scroll-mt-[124px] bg-forge-panel px-4 py-20 sm:px-6 sm:py-24 lg:px-8" aria-labelledby="plan-comparison-heading">
      <div className="mx-auto max-w-6xl">
        <header className="mx-auto mb-12 max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-500">Plans</p>
          <h2 id="plan-comparison-heading" className="mt-4 font-display text-3xl font-bold text-heading sm:text-4xl lg:text-5xl">Choose the Plan That Fits Your Workflow</h2>
          <p className="mt-5 text-base leading-7 text-muted sm:text-lg">Start with AVGenix&apos;s free engineering resources, then unlock the complete project workflow with Pro.</p>
        </header>

        <div className="overflow-hidden rounded-2xl border border-border bg-forge-panel shadow-xl shadow-slate-950/10">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left">
              <caption className="sr-only">Comparison of AVGenix Pro and Free plan features</caption>
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 z-20 w-[54%] min-w-[330px] bg-violet-500/10 px-6 py-6 text-xl font-bold text-heading backdrop-blur-sm sm:px-8">Compare Plans</th>
                  <th scope="col" className="w-[23%] bg-violet-500/10 px-4 py-4 text-center">
                    <PlanIcon pro />
                    <div className="mt-2 text-xs font-extrabold uppercase tracking-wide text-heading">AVGenix Pro</div>
                    <div className="mt-1 text-xs font-medium text-blue-500">$20/month</div>
                  </th>
                  <th scope="col" className="w-[23%] bg-violet-500/10 px-4 py-4 text-center">
                    <PlanIcon />
                    <div className="mt-2 text-xs font-extrabold uppercase tracking-wide text-heading">Free</div>
                    <div className="mt-1 text-xs font-medium text-muted">$0</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {features.map((feature, index) => {
                  const rowBackground = index % 2 === 0 ? "bg-forge-panel" : "bg-violet-500/5";
                  return (
                    <tr key={feature.name}>
                      <th scope="row" className={`sticky left-0 z-10 px-6 py-4 text-sm font-medium text-body sm:px-8 ${rowBackground}`}>
                        <span className="flex items-center gap-2.5">
                          <span>{feature.name}</span>
                          {feature.badge && <span className="rounded-md bg-purple-700 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white">{feature.badge}</span>}
                          {feature.detail && <span title={feature.detail} className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-muted text-[10px] font-bold text-muted" aria-label={feature.detail}>i</span>}
                        </span>
                      </th>
                      <td className={`px-4 py-4 text-center ${rowBackground}`}><Availability included={feature.pro} label={`Pro, ${feature.name}`} /></td>
                      <td className={`px-4 py-4 text-center ${rowBackground}`}><Availability included={feature.free} label={`Free, ${feature.name}`} /></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-forge-panel">
                  <th scope="row" className="sticky left-0 z-10 bg-forge-panel px-6 py-6 text-sm font-semibold text-body sm:px-8">Get started with AVGenix</th>
                  <td className="px-4 py-6 text-center"><Link href="/register?plan=pro" className="inline-flex rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700">Choose Pro</Link></td>
                  <td className="px-4 py-6 text-center"><Link href="/register" className="inline-flex rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-body transition-colors hover:bg-forge-surface">Sign Up Free</Link></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
