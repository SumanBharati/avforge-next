"use client";

import Link from "next/link";
import { useOrg } from "./OrgProvider";

export default function OrgSwitcher() {
  const { activeOrg, loading } = useOrg();

  if (loading) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-subtle">Organization</span>
        <span className="h-3.5 w-24 animate-pulse rounded bg-forge-surface/60" />
      </div>
    );
  }

  if (!activeOrg) {
    return (
      <Link
        href="/org/new"
        className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        New Organization
      </Link>
    );
  }

  return (
    <div className="flex flex-col">
      <span className="text-[9px] font-semibold uppercase tracking-widest text-subtle">Organization</span>
      <span className="mt-0.5 max-w-[160px] truncate text-sm font-medium text-body">{activeOrg.name}</span>
    </div>
  );
}
