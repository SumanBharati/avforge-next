"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import AIChatWidget from "./AIChatWidget";

const AUTH_ROUTES = ["/", "/login", "/register", "/org/invite", "/welcome"];

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = AUTH_ROUTES.includes(pathname);

  if (isAuth) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="flex-1 overflow-y-auto">{children}</main>
      <AIChatWidget />
    </>
  );
}
