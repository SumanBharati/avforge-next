"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import PMStoreProvider, { usePMStore } from "@/components/PMStoreProvider";

const TABS = [
  { href: "/time-tracking", label: "Time Tracking", exact: true },
  { href: "/time-tracking/time-off", label: "Time Off" },
];

function SaveIndicator() {
  const { saved, loading } = usePMStore();
  if (loading) return <span className="text-xs text-subtle">Loading…</span>;
  if (saved) return <span className="text-xs text-emerald-400">Saved</span>;
  return <span className="text-xs text-faint">Auto-save on</span>;
}

function TabBar() {
  const pathname = usePathname();
  return (
    <div className="flex items-center justify-between border-b border-border bg-forge-panel px-8">
      <nav className="flex items-center gap-1.5 py-2">
        {TABS.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center rounded-lg px-[18px] py-2.5 text-[15px] transition-all ${
                active
                  ? "bg-blue-500/[0.12] font-bold text-blue-400"
                  : "font-medium text-muted hover:text-body"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <SaveIndicator />
    </div>
  );
}

export default function TimeTrackingLayout({ children }: { children: React.ReactNode }) {
  return (
    <PMStoreProvider>
      <div className="flex flex-col" style={{ height: "calc(100vh - 72px)" }}>
        <TabBar />
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </PMStoreProvider>
  );
}
