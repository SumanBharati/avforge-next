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
      <Header />
      <NavigationBar />
      <main className="flex-1 overflow-y-auto">{children}</main>
      {!isPublicHome && isPro && <AIChatWidget />}
    </>
  );
}
