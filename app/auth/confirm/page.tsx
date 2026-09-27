"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// Landing page for links in Supabase auth emails (sign-up confirmation,
// password reset, email change). The templates in supabase/templates/ point
// here with a token_hash instead of using {{ .ConfirmationURL }}, so the link
// in the email is on avgenix.com rather than the Supabase project domain,
// which Gmail flags as a mismatched, phishing-style link.
const EMAIL_OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

export default function AuthConfirm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  // Tokens are single-use; guard against React strict mode running the effect twice.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");
    const type = params.get("type") as EmailOtpType | null;
    if (!tokenHash || !type || !EMAIL_OTP_TYPES.includes(type)) {
      setError("This link is incomplete. Please use the full link from your email.");
      return;
    }

    // {{ .RedirectTo }} is the emailRedirectTo the app passed (e.g. /login?next=%2Fwelcome).
    // Only same-origin targets are followed.
    let target = "/dashboard";
    const redirectTo = params.get("redirect_to");
    if (redirectTo) {
      try {
        const url = new URL(redirectTo, window.location.origin);
        if (url.origin === window.location.origin) target = url.pathname + url.search;
      } catch {}
    }

    supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ error: verifyErr }) => {
      if (verifyErr) {
        setError("This link has expired or has already been used. Request a new one and try again.");
        return;
      }
      router.replace(type === "recovery" ? "/?auth=reset" : target);
    });
  }, [router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      {error ? (
        <div className="max-w-md text-center">
          <h1 className="mb-2 text-xl font-bold text-heading">Link not valid</h1>
          <p className="mb-6 text-sm text-muted">{error}</p>
          <button type="button" onClick={() => router.replace("/?auth=signin")} className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-500">Go to sign in</button>
        </div>
      ) : (
        <p className="text-sm text-muted">Verifying your link…</p>
      )}
    </div>
  );
}
