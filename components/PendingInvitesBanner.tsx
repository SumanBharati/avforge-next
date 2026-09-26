"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useOrg } from "./OrgProvider";

interface PendingInvite {
  id: string;
  token: string;
  role: string;
  department: string;
  org_id: string;
  org_name: string;
}

// Shows a dismissible, per-viewer notice for invites addressed to the
// signed-in user's own email — the only way an EXISTING account (not a
// fresh signup, which auto-accepts) ever finds out someone invited them,
// short of clicking a link in an email that may not have arrived.
export default function PendingInvitesBanner() {
  const { refreshOrgs } = useOrg();
  const [user, setUser] = useState<User | null>(null);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setInvites([]); return; }
    let cancelled = false;
    supabase.rpc("get_my_pending_invites").then(({ data }) => {
      if (!cancelled && data) setInvites(data as PendingInvite[]);
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  const visible = invites.filter((i) => !dismissed.has(i.id));
  if (visible.length === 0) return null;

  async function handleAccept(invite: PendingInvite) {
    setBusyId(invite.id);
    setError("");
    const { error: acceptErr } = await supabase.rpc("accept_org_invite", { p_token: invite.token });
    setBusyId(null);
    if (acceptErr) { setError(acceptErr.message); return; }
    setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    await refreshOrgs();
  }

  async function handleDecline(invite: PendingInvite) {
    setBusyId(invite.id);
    setError("");
    const { error: declineErr } = await supabase.from("organization_invites").update({ status: "declined" }).eq("id", invite.id);
    setBusyId(null);
    if (declineErr) { setError(declineErr.message); return; }
    setInvites((prev) => prev.filter((i) => i.id !== invite.id));
  }

  return (
    <div className="flex flex-col gap-2 border-b border-border bg-violet-500/10 px-4 py-2.5 sm:px-6 xl:px-8">
      {error && <p className="text-[12px] text-red-400">{error}</p>}
      {visible.map((invite) => (
        <div key={invite.id} className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
          <span className="text-body">
            You&apos;ve been invited to join <span className="font-semibold text-heading">{invite.org_name}</span> as {invite.department || invite.role}.
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => handleAccept(invite)}
              disabled={busyId === invite.id}
              className="rounded-lg bg-violet-600 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
            >
              {busyId === invite.id ? "…" : "Accept"}
            </button>
            <button
              onClick={() => handleDecline(invite)}
              disabled={busyId === invite.id}
              className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:text-body disabled:opacity-50"
            >
              Decline
            </button>
            <button
              onClick={() => setDismissed((prev) => new Set(prev).add(invite.id))}
              title="Dismiss for now"
              className="p-1 text-muted transition-colors hover:text-body"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
