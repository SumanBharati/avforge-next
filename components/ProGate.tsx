"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useOrg } from "./OrgProvider";

export default function ProGate({ children }: { children: React.ReactNode }) {
  const { activeOrg, loading, isPro, openUpgradeModal } = useOrg();
  const router = useRouter();
  const redirected = useRef(false);

  useEffect(() => {
    if (loading || !activeOrg) return;
    if (!isPro && !redirected.current) {
      redirected.current = true;
      router.replace("/home");
      openUpgradeModal();
    }
  }, [loading, activeOrg, isPro, router, openUpgradeModal]);

  if (loading || !activeOrg) return null;
  if (!isPro) return null;
  return <>{children}</>;
}
