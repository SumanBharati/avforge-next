"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import NavigationBar from "./NavigationBar";
import AIChatWidget from "./AIChatWidget";
import { useOrg } from "./OrgProvider";

const AUTH_ROUTES = ["/login", "/register", "/org/invite", "/welcome"];

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isPro } = useOrg();
  const isAuth = AUTH_ROUTES.includes(pathname);
  const isPublicHome = pathname === "/";

  if (isAuth) {
    return <>{children}</>;
  }

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-violet-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white">Skip to main content</a>
      <Header />
      <NavigationBar />
      <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto focus:outline-none">{children}</main>
      {!isPublicHome && isPro && <AIChatWidget />}
    </>
  );
}
