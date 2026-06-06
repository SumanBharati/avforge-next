"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useOrg } from "@/components/OrgProvider";

export default function InviteAcceptPage() {
  return (
    <Suspense fallback={null}>
      <InviteAcceptPageInner />
    </Suspense>
  );
}

function InviteAcceptPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshOrgs, switchOrg } = useOrg();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "accepting" | "success" | "error" | "expired">("loading");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) { setStatus("error"); setError("No invite token provided"); return; }
    acceptInvite();
  }, [token]);

  async function acceptInvite() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Redirect to login with token preserved
      router.push(`/login?invite=${token}`);
      return;
    }

    // Look up the invite
    const { data: invite, error: fetchErr } = await supabase
      .from("organization_invites")
      .select("id, org_id, email, role, status, expires_at, organizations(name)")
      .eq("token", token!)
      .single();

    if (fetchErr || !invite) {
      setStatus("error");
      setError("Invalid invite link");
      return;
    }

    setOrgName((invite as any).organizations?.name || "Organization");

    if (invite.status !== "pending") {
      setStatus("error");
      setError("This invite has already been used");
      return;
    }

    if (new Date(invite.expires_at) < new Date()) {
      setStatus("expired");
      return;
    }

    // Check email matches
    if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
      setStatus("error");
      setError(`This invite was sent to ${invite.email}. You are signed in as ${user.email}.`);
      return;
    }

    setStatus("accepting");

    // Accept: add member + update invite status
    const { error: memberErr } = await supabase.from("organization_members").insert({
      org_id: invite.org_id,
      user_id: user.id,
      role: invite.role,
    });

    if (memberErr && !memberErr.message.includes("duplicate")) {
      setStatus("error");
      setError(memberErr.message);
      return;
    }

    await supabase
      .from("organization_invites")
      .update({ status: "accepted" })
      .eq("id", invite.id);

    // Switch to the new org
    await supabase
      .from("user_preferences")
      .upsert({ user_id: user.id, active_org_id: invite.org_id }, { onConflict: "user_id" });

    await refreshOrgs();
    await switchOrg(invite.org_id);
    setStatus("success");

    setTimeout(() => router.push("/home"), 1500);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-[400px] animate-fade-in rounded-xl border border-border bg-forge-surface p-8 text-center">
        {status === "loading" || status === "accepting" ? (
          <>
            <div className="mb-4 text-lg font-semibold text-heading">
              {status === "accepting" ? "Joining organization..." : "Verifying invite..."}
            </div>
            <p className="text-sm text-muted">Please wait</p>
          </>
        ) : status === "success" ? (
          <>
            <div className="mb-2 text-3xl">&#10003;</div>
            <div className="mb-2 text-lg font-semibold text-heading">Welcome to {orgName}!</div>
            <p className="text-sm text-muted">Redirecting to dashboard...</p>
          </>
        ) : status === "expired" ? (
          <>
            <div className="mb-2 text-3xl">&#9203;</div>
            <div className="mb-2 text-lg font-semibold text-heading">Invite Expired</div>
            <p className="text-sm text-muted">This invite link has expired. Please ask the organization admin to send a new one.</p>
            <Link href="/home" className="mt-4 inline-block text-sm font-medium text-blue-400 hover:text-blue-300">
              Go to Dashboard
            </Link>
          </>
        ) : (
          <>
            <div className="mb-2 text-3xl">&#9888;</div>
            <div className="mb-2 text-lg font-semibold text-heading">Unable to Accept Invite</div>
            <p className="text-sm text-muted">{error}</p>
            <Link href="/home" className="mt-4 inline-block text-sm font-medium text-blue-400 hover:text-blue-300">
              Go to Dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
