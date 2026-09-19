"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useOrg } from "./OrgProvider";

export default function OrgSwitcher() {
  const { activeOrg, orgs, loading, switchOrg } = useOrg();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

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
      <Link href="/org/new" className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/20">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        New Organization
      </Link>
    );
  }

  async function selectOrganization(orgId: string) {
    if (orgId === activeOrg?.id) {
      setOpen(false);
      return;
    }
    setSwitching(orgId);
    await switchOrg(orgId);
    setSwitching(null);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((current) => !current)} className="flex min-w-[170px] items-center justify-between gap-3 rounded-lg px-2 py-1 text-left transition-colors hover:bg-forge-surface" aria-haspopup="listbox" aria-expanded={open}>
        <span className="min-w-0">
          <span className="block text-[9px] font-semibold uppercase tracking-widest text-subtle">Organization</span>
          <span className="mt-0.5 block max-w-[160px] truncate text-sm font-medium text-body">{activeOrg.name}</span>
        </span>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-border bg-forge-bg shadow-2xl">
          <div className="border-b border-border px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-subtle">Switch organization</div>
          <div className="max-h-64 overflow-y-auto p-1.5" role="listbox" aria-label="Organizations">
            {orgs.map((org) => {
              const selected = org.id === activeOrg.id;
              return (
                <button key={org.id} type="button" role="option" aria-selected={selected} disabled={switching !== null} onClick={() => selectOrganization(org.id)} className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${selected ? "bg-violet-500/15 text-heading" : "text-body hover:bg-forge-surface"}`}>
                  <span className="min-w-0"><span className="block truncate text-sm font-medium">{org.name}</span><span className="mt-0.5 block text-[11px] capitalize text-subtle">{org.role}</span></span>
                  {selected && <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-violet-400"><path d="m3 8 3 3 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  {switching === org.id && <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 border-t border-border text-xs">
            <Link href="/org/settings" onClick={() => setOpen(false)} className="px-3 py-3 text-center font-medium text-muted transition-colors hover:bg-forge-surface hover:text-heading">Manage</Link>
            <Link href="/org/new" onClick={() => setOpen(false)} className="border-l border-border px-3 py-3 text-center font-medium text-violet-400 transition-colors hover:bg-violet-500/10">New organization</Link>
          </div>
        </div>
      )}
    </div>
  );
}
