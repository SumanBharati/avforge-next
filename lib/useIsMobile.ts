"use client";

import { useEffect, useState } from "react";

// Breakpoint for tools that offer a simplified, view-only experience on
// small screens (Signal Flow Builder, and eventually Room Designer/Rack
// Planner) instead of their full drag/click-to-edit canvas — those
// interactions assume a mouse and enough screen space for a toolbar, neither
// of which a phone has. Matches Tailwind's own `md` breakpoint so it lines
// up with any responsive layout already keyed off that.
const MOBILE_BREAKPOINT = 768;

// Tracks the live viewport width (not a one-time device/UA check), so
// resizing a desktop window past the breakpoint, or rotating a tablet,
// updates immediately rather than requiring a reload.
export function useIsMobile(breakpoint: number = MOBILE_BREAKPOINT): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);

  return isMobile;
}
