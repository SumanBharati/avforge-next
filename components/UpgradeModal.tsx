"use client";

import { useState } from "react";
import { useOrg } from "./OrgProvider";
import { supabase } from "@/lib/supabase";

const BENEFITS = [
  "Create and save unlimited AV projects",
  "Build full AV designs — room layouts, signal flow, rack elevations",
  "Generate Bills of Materials (BOM) automatically",
  "Access advanced project tools — procurement, scheduling, time tracking",
  "Export professional project documents",
];

export default function UpgradeModal({ onClose, required = false }: { onClose?: () => void; required?: boolean }) {
  const { activeOrg } = useOrg();
  const canManageBilling = activeOrg?.role === "owner" || activeOrg?.role === "admin";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <div className="w-full max-w-md rounded-2xl border border-violet-500/30 bg-forge-panel shadow-2xl" onClick={(e) => e.stopPropagation()}>
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
              <span className="text-2xl font-extrabold text-heading">$20</span>
              <span className="text-[13px] text-subtle">/ month</span>
            </div>
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
            {loading ? "Redirecting…" : "Upgrade to Pro — $20/month"}
          </button>
          {!canManageBilling && <p className="mt-2 text-center text-xs text-muted">Ask an organization owner or administrator to activate Pro.</p>}
          {!required && <button onClick={onClose} className="mt-2 w-full rounded-lg px-4 py-2.5 text-[13px] font-medium text-muted hover:text-body">Continue with free tools</button>}
          <p className="mt-3 text-center text-[11px] text-faint">Cancel anytime</p>
        </div>
      </div>
    </div>
  );
}
