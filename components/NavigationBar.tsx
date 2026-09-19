"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BookIcon, CalculatorIcon, InventoryIcon, ToolsIcon } from "./Icons";
import { useOrg } from "./OrgProvider";

type NavigationItem = {
  href: string;
  label: string;
  icon?: React.ComponentType;
  pro?: boolean;
};

function ScheduleIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><rect x="7" y="13" width="4" height="3" rx="0.5" fill="currentColor" stroke="none" /><rect x="13" y="13" width="6" height="3" rx="0.5" fill="currentColor" stroke="none" opacity="0.6" /></svg>;
}

function TimeTrackingIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 15" /></svg>;
}

function BoardIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></svg>;
}

function OrderManagementIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="4" width="14" height="18" rx="2" /><path d="M9 2h6a1 1 0 011 1v2H8V3a1 1 0 011-1z" fill="currentColor" stroke="none" /><path d="M8.5 12.5l2 2 4.5-4.5" /><line x1="8" y1="17.5" x2="14" y2="17.5" /></svg>;
}

/** Navigation shown throughout the signed-in dashboard application. */
const DASHBOARD_NAV_ITEMS: NavigationItem[] = [
  { href: "/projects", label: "Projects", icon: ToolsIcon, pro: true },
  { href: "/procurement", label: "Order Management", icon: OrderManagementIcon, pro: true },
  { href: "/project-management", label: "Schedule", icon: ScheduleIcon, pro: true },
  { href: "/time-tracking", label: "Time Tracking", icon: TimeTrackingIcon, pro: true },
  { href: "/board", label: "Board", icon: BoardIcon, pro: true },
  { href: "/inventory", label: "Library", icon: InventoryIcon, pro: true },
  { href: "/calculators", label: "Calculators", icon: CalculatorIcon, pro: false },
  { href: "/references", label: "References", icon: BookIcon, pro: false },
];

const REFERENCE_CALC_IDS = ["connectors", "microphone-polar-patterns", "resolution-reference", "standards"];

function isNavItemActive(href: string, pathname: string): boolean {
  const isReferenceCalc = REFERENCE_CALC_IDS.some((id) => pathname === `/calculators/${id}` || pathname.startsWith(`/calculators/${id}/`));
  if (href === "/calculators") return !isReferenceCalc && (pathname === href || pathname.startsWith(href + "/"));
  if (href === "/references") return isReferenceCalc || pathname === href || pathname.startsWith(href + "/");
  return pathname === href || pathname.startsWith(href + "/");
}

function ProBadge() {
  return <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/90">Pro</span>;
}

export default function NavigationBar() {
  const pathname = usePathname();
  const { isPro } = useOrg();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => setMobileMenuOpen(false), [pathname]);

  const links = DASHBOARD_NAV_ITEMS.map((item) => {
    const active = isNavItemActive(item.href, pathname);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileMenuOpen(false)}
        className={`flex h-[52px] items-center gap-2 border-b-[3px] px-4 text-sm font-semibold transition-colors ${active ? "border-white text-white" : "border-transparent text-white/85 hover:border-violet-300 hover:text-white"}`}
      >
        {Icon && <Icon />}
        <span>{item.label}</span>
        {item.pro && !isPro && <ProBadge />}
      </Link>
    );
  });

  return (
    <div className="sticky top-[72px] z-30 shrink-0 bg-blue-900 px-4 shadow-md shadow-blue-950/30 sm:px-6 xl:px-8">
      <div className="hidden h-[52px] items-center justify-center xl:flex">
        <nav className="flex items-center gap-1" aria-label="Primary navigation">{links}</nav>
      </div>
      <div className="flex h-[52px] items-center justify-between xl:hidden">
        <span className="text-sm font-semibold text-white">Navigation</span>
        <button onClick={() => setMobileMenuOpen((open) => !open)} className="flex h-9 w-9 items-center justify-center rounded-lg text-white hover:bg-white/15" aria-label={mobileMenuOpen ? "Close menu" : "Open menu"} aria-expanded={mobileMenuOpen}>
          {mobileMenuOpen ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg> : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></svg>}
        </button>
      </div>
      {mobileMenuOpen && <nav className="absolute inset-x-0 top-[52px] flex max-h-[calc(100dvh-124px)] flex-col overflow-y-auto border-t border-white/15 bg-blue-900 p-3 shadow-xl xl:hidden" aria-label="Mobile primary navigation">{links}</nav>}
    </div>
  );
}
