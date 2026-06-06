"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { addRecentTool } from "@/lib/recentTools";

export default function CalculatorsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname && pathname !== "/calculators") {
      addRecentTool(pathname);
    }
  }, [pathname]);
  return <>{children}</>;
}
