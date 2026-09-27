"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrg } from "./OrgProvider";
import { supabase } from "@/lib/supabase";

const SEAT_PRICE = 20;

const BENEFITS = [
  "Create and save unlimited AV projects",
  "Build full AV designs — room layouts, signal flow, rack elevations",
  "Generate Bills of Materials (BOM) automatically",
  "Access advanced project tools — procurement, scheduling, time tracking",
  "Export professional project documents",
];

export default function UpgradeModal({ onClose, required = false }: { onClose?: () => void; required?: boolean }) {
  const { activeOrg } = useOrg();
  const router = useRouter();
  const canManageBilling = activeOrg?.role === "superadmin" || activeOrg?.role === "admin";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seatCount, setSeatCount] = useState(1);

  // AVGenix Pro is billed per seat — a team checking out with existing
  // members starts at that headcount (app/api/stripe/checkout/route.ts),
  // so show the real total up front rather than a flat $20 that wouldn't
  // match the invoice.
  useEffect(() => {
    if (!activeOrg || activeOrg.is_individual) { setSeatCount(1); return; }
    supabase
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("org_id", activeOrg.id)
      .then(({ count }) => setSeatCount(Math.max(1, count ?? 1)));
  }, [activeOrg?.id, activeOrg?.is_individual]);

  const monthlyTotal = seatCount * SEAT_PRICE;

  async function handleUpgrade() {
    if (!activeOrg || !canManageBilling) return;
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ orgId: activeOrg.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Something went wrong. Please try again.");
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-md" onClick={() => { if (!required) onClose?.(); }} role="dialog" aria-modal="true" aria-labelledby="upgrade-title">
      <div className="relative w-full max-w-md rounded-2xl border border-violet-500/30 bg-forge-panel shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          // On a gated Pro page there's nothing usable behind the popup, so
          // closing leaves the page instead of revealing a locked skeleton.
          onClick={() => (required ? router.push("/dashboard") : onClose?.())}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-md p-1.5 text-subtle transition-colors hover:bg-forge-surface hover:text-heading"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <div className="px-7 pb-7 pt-7">
          <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-violet-300">
            AVGenix Pro
          </span>
          <h2 id="upgrade-title" className="mt-3 text-xl font-bold text-heading">Subscribe to continue using Projects</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-body">
            Calculators, references, and AV news are free. Upgrade to AVGenix Pro to create and manage AV projects.
          </p>

          <div className="mt-5 rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-heading">${SEAT_PRICE}</span>
              <span className="text-[13px] text-subtle">/ seat / month</span>
            </div>
            {seatCount > 1 && (
              <p className="mt-1 text-[12px] text-subtle">
                Your team has {seatCount} members — ${monthlyTotal}/month total.
              </p>
            )}
            <ul className="mt-3 flex flex-col gap-2">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-2 text-[13px] text-body">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0 text-violet-400">
                    <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {error && <p className="mt-3 text-[12px] text-red-400">{error}</p>}

          <button
            onClick={handleUpgrade}
            disabled={loading || !canManageBilling}
            className="mt-5 w-full rounded-lg bg-violet-600 px-4 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
          >
            {loading ? "Redirecting…" : `Upgrade to Pro — $${monthlyTotal}/month${seatCount > 1 ? ` (${seatCount} seats)` : ""}`}
          </button>
          {!canManageBilling && <p className="mt-2 text-center text-xs text-muted">Ask an organization owner or administrator to activate Pro.</p>}
          {!required && <button onClick={onClose} className="mt-2 w-full rounded-lg px-4 py-2.5 text-[13px] font-medium text-muted hover:text-body">Continue with free tools</button>}
          <p className="mt-3 text-center text-[11px] text-faint">Cancel anytime</p>
        </div>
      </div>
    </div>
  );
}
