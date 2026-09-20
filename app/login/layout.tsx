import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

// Sign-in has no search value and duplicates the header's Log In dialog, so keep it out of the index.
export const metadata: Metadata = pageMetadata({
  title: "Log in",
  description: "Log in to your AVGenix account to manage AV projects, designs and procurement.",
  path: "/login",
  noindex: true,
});

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
