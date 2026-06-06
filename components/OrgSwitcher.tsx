"use client";

import Link from "next/link";
import { useOrg } from "./OrgProvider";

export default function OrgSwitcher() {
  const { activeOrg } = useOrg();

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
      {activeOrg.logo_url ? (
        <img src={activeOrg.logo_url} alt={activeOrg.name} className="mt-0.5 h-5 max-w-[120px] object-contain object-left" />
      ) : (
        <span className="mt-0.5 max-w-[160px] truncate text-sm font-medium text-body">{activeOrg.name}</span>
      )}
    </div>
  );
}
