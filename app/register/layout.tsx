import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Create your account",
  description: "Sign up for AVGenix and start a 3-day Pro trial: AV project management, site surveys, room design, signal flow and free AV calculators. No credit card required.",
  path: "/register",
});

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
