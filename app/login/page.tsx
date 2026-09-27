"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Sign-in lives in the header's Log In popup now. This route stays only because
// emails and old links still point at it: invite sign-ins (?invite=), the
// sign-up confirmation link (?next=), and password-reset links (#type=recovery),
// all of which Supabase's allowed redirect list already covers. It forwards
// each one to the right place without rendering the old page.
export default function LoginRedirect() {
  const router = useRouter();
  // Captured on first render: supabase-js clears the URL hash once it has
  // turned the recovery token into a session.
  const [isRecovery] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get("invite");
    const requestedNext = params.get("next");
    const next = requestedNext?.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : null;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isRecovery && session) {
        router.replace("/?auth=reset");
        return;
      }
      if (session) {
        router.replace(invite ? `/org/invite?token=${encodeURIComponent(invite)}` : next ?? "/dashboard");
        return;
      }
      const target = new URLSearchParams({ auth: "signin" });
      if (invite) target.set("invite", invite);
      if (next) target.set("next", next);
      router.replace(`/?${target.toString()}`);
    });
  }, [isRecovery, router]);

  return null;
}
