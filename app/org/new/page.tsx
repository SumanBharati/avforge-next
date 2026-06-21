"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useOrg } from "@/components/OrgProvider";

export default function NewOrgPage() {
  const router = useRouter();
  const { refreshOrgs, switchOrg } = useOrg();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(true);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email ?? "");
        setEmailVerified(!!user.email_confirmed_at);
      }
    });
    if (emailVerified) nameRef.current?.focus();
  }, []);

  async function handleResend() {
    setResendLoading(true);
    await supabase.auth.resend({ type: "signup", email: userEmail });
    setResendLoading(false);
    setResendSent(true);
  }

  function generateSlug(n: string) {
    return n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated"); setLoading(false); return; }

    const slug = generateSlug(name) + "-" + crypto.randomUUID().slice(0, 8);

    const { data: org, error: insertErr } = await supabase
      .from("organizations")
      .insert({ name: name.trim(), slug, created_by: user.id })
      .select()
      .single();

    if (insertErr || !org) {
      setError(insertErr?.message || "Failed to create organization");
      setLoading(false);
      return;
    }

    // Add creator as owner
    await supabase.from("organization_members").insert({
      org_id: org.id,
      user_id: user.id,
      role: "owner",
    });

    // Switch to new org
    await supabase
      .from("user_preferences")
      .upsert({ user_id: user.id, active_org_id: org.id }, { onConflict: "user_id" });

    await refreshOrgs();
    await switchOrg(org.id);
    router.push("/home");
  }

  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-4">
      <div className="w-full max-w-[440px] animate-fade-in rounded-xl border border-border bg-forge-surface p-8">
        <h2 className="mb-2 text-xl font-semibold text-heading">Create Organization</h2>
        <p className="mb-6 text-sm text-muted">
          Organizations let your team collaborate on projects together.
        </p>

        {!emailVerified && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <div className="flex items-start gap-3">
              <svg className="mt-0.5 shrink-0 text-amber-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-amber-400">Email verification required</p>
                <p className="mt-0.5 text-[12px] text-amber-400/80">
                  Please verify your email address before creating an organization. Check your inbox at <span className="font-medium">{userEmail}</span>.
                </p>
                {resendSent ? (
                  <p className="mt-2 text-[12px] font-medium text-emerald-400">Verification email sent — check your inbox.</p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendLoading}
                    className="mt-2 text-[12px] font-medium text-amber-400 underline underline-offset-2 hover:text-amber-300 transition-colors disabled:opacity-50"
                  >
                    {resendLoading ? "Sending…" : "Resend verification email"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[13px] text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted">
              Organization Name <span className="text-red-400">*</span>
            </label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme AV Solutions"
              className="forge-input"
              required
            />
            {name.trim() && (
              <p className="mt-1.5 text-xs text-faint">
                Slug: {generateSlug(name) || "—"}
              </p>
            )}
          </div>

          <div className="mt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:text-body"
            >
              Cancel
            </button>
            <button type="submit" disabled={loading || !name.trim() || !emailVerified} className="forge-btn-primary text-[13px]">
              {loading ? "Creating..." : "Create Organization"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
