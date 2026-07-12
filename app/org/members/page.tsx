"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useOrg } from "@/components/OrgProvider";
import { ROLE_OPTIONS } from "@/lib/pm-store";

interface Member {
  id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  department: string;
  joined_at: string;
  email: string;
  full_name: string;
}

interface Invite {
  id: string;
  email: string;
  role: string;
  department: string;
  status: string;
  created_at: string;
}

export default function OrgMembersPage() {
  const { activeOrg, refreshOrgs } = useOrg();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePrivileges, setInvitePrivileges] = useState({
    viewReport: true,
    createProjects: false,
    adminPrivileges: false,
  });
  const [inviteRole, setInviteRole] = useState<string>(ROLE_OPTIONS[0]);
  const [inviteError, setInviteError] = useState("");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (activeOrg) loadMembers();
  }, [activeOrg?.id]);

  async function loadMembers() {
    if (!activeOrg) return;

    // Fetch members with user details
    const { data: memberData } = await supabase
      .from("organization_members")
      .select("id, user_id, role, department, joined_at")
      .eq("org_id", activeOrg.id)
      .order("joined_at");

    if (memberData) {
      // Fetch user details for each member
      const userIds = memberData.map((m) => m.user_id);
      const membersWithDetails: Member[] = [];

      for (const m of memberData) {
        // Use admin API or just show user_id - for now we'll get from auth
        membersWithDetails.push({
          ...m,
          department: m.department || "Sales",
          email: "",
          full_name: "",
        });
      }

      // Get current user to at least populate their info
      const { data: { user } } = await supabase.auth.getUser();
      const finalMembers = membersWithDetails.map((m) => {
        if (m.user_id === user?.id) {
          return {
            ...m,
            email: user.email || "",
            full_name: user.user_metadata?.full_name || "",
          };
        }
        return m;
      });

      setMembers(finalMembers);
    }

    // Fetch pending invites
    const { data: inviteData, error: inviteErr } = await supabase
      .from("organization_invites")
      .select("id, email, role, department, status, created_at")
      .eq("org_id", activeOrg.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (inviteErr) console.error("Failed to fetch invites:", inviteErr);
    setInvites(inviteData || []);
    setLoading(false);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeOrg) return;
    setInviteError("");
    setInviting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setInviteError("Not authenticated"); setInviting(false); return; }

    // Check if already a member
    const existing = members.find((m) => m.email === inviteEmail.trim());
    if (existing) {
      setInviteError("This user is already a member");
      setInviting(false);
      return;
    }

    const derivedRole = invitePrivileges.adminPrivileges ? "admin" : "member";

    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        org_id: activeOrg.id,
        org_name: activeOrg.name,
        email: inviteEmail.trim(),
        role: derivedRole,
        department: inviteRole,
        invited_by: user.id,
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      console.error("Invite error:", result.error);
      setInviteError(result.error || "Failed to send invite");
      setInviting(false);
      return;
    }

    setInviteEmail("");
    setInviteRole(ROLE_OPTIONS[0]);
    setShowInvite(false);
    setInviting(false);
    await loadMembers();
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm("Remove this member from the organization?")) return;
    await supabase.from("organization_members").delete().eq("id", memberId);
    await loadMembers();
  }

  async function handleChangeRole(memberId: string, newRole: string) {
    await supabase.from("organization_members").update({ role: newRole }).eq("id", memberId);
    await loadMembers();
    await refreshOrgs();
  }

  async function handleRevokeInvite(inviteId: string) {
    await supabase.from("organization_invites").delete().eq("id", inviteId);
    await loadMembers();
  }

  if (!activeOrg) return <div className="px-8 py-20 text-center text-sm text-subtle">Loading...</div>;

  const isOwnerOrAdmin = activeOrg.role === "owner" || activeOrg.role === "admin";

  return (
    <div className="animate-fade-in px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-heading">Organization Settings</h2>
        <p className="mt-1 text-sm text-muted">Manage your organization&apos;s details and members.</p>
      </div>

      {/* Nav tabs */}
      <div className="mb-6 flex gap-1 border-b border-border">
        <Link href="/org/settings" className="border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:text-body">
          General
        </Link>
        <Link href="/org/members" className="border-b-2 border-blue-500 px-4 py-2.5 text-sm font-medium text-blue-400">
          Members
        </Link>
      </div>

      {/* Members list */}
      <div className="max-w-[640px]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-heading">
            Members ({members.length})
          </h3>
          {isOwnerOrAdmin && (
            <button onClick={() => setShowInvite(!showInvite)} className="forge-btn-primary text-[13px]">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Invite Member
            </button>
          )}
        </div>

        {/* Invite form */}
        {showInvite && (
          <form onSubmit={handleInvite} className="mb-4 rounded-xl border border-border bg-forge-surface/40 p-5">
            {inviteError && (
              <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-400">
                {inviteError}
              </div>
            )}

            {/* Step 1: Email */}
            <div className="mb-5">
              <p className="mb-2 text-sm text-muted"><span className="mr-1.5 text-base font-semibold text-heading">1.</span>Enter their email address:</p>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="forge-input max-w-[360px]"
                required
              />
            </div>

            {/* Step 2: Privileges */}
            <div className="mb-5">
              <p className="mb-3 text-sm text-muted"><span className="mr-1.5 text-base font-semibold text-heading">2.</span>Define their privileges:</p>
              <div className="space-y-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-forge-surface/60 px-4 py-3 transition-colors hover:bg-forge-surface">
                  <input
                    type="checkbox"
                    checked={invitePrivileges.viewReport}
                    disabled
                    className="mt-0.5 h-4 w-4 rounded border-border accent-blue-500"
                  />
                  <div>
                    <div className="text-[13px] font-semibold text-heading">View and Report only</div>
                    <div className="text-[12px] text-muted">View projects. Generate proposals and reports.</div>
                  </div>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-forge-surface/60 px-4 py-3 transition-colors hover:bg-forge-surface">
                  <input
                    type="checkbox"
                    checked={invitePrivileges.createProjects}
                    onChange={(e) => setInvitePrivileges((prev) => ({
                      ...prev,
                      createProjects: e.target.checked,
                      // If unchecking createProjects, also uncheck admin
                      adminPrivileges: e.target.checked ? prev.adminPrivileges : false,
                    }))}
                    className="mt-0.5 h-4 w-4 rounded border-border accent-blue-500"
                  />
                  <div>
                    <div className="text-[13px] font-semibold text-heading">Create Clients and Projects</div>
                    <div className="text-[12px] text-muted">Create/edit clients and projects. Design reports.</div>
                  </div>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-forge-surface/60 px-4 py-3 transition-colors hover:bg-forge-surface">
                  <input
                    type="checkbox"
                    checked={invitePrivileges.adminPrivileges}
                    onChange={(e) => setInvitePrivileges((prev) => ({
                      ...prev,
                      adminPrivileges: e.target.checked,
                      // If checking admin, also check createProjects
                      createProjects: e.target.checked ? true : prev.createProjects,
                    }))}
                    className="mt-0.5 h-4 w-4 rounded border-border accent-blue-500"
                  />
                  <div>
                    <div className="text-[13px] font-semibold text-heading">Admin Privileges</div>
                    <div className="text-[12px] text-muted">Add and manage team members. Set company preferences.</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Step 3: Role */}
            <div className="mb-5">
              <p className="mb-2 text-sm text-muted"><span className="mr-1.5 text-base font-semibold text-heading">3.</span>Select their role:</p>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="forge-input max-w-[360px]"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <button type="submit" disabled={inviting} className="forge-btn-primary text-[13px]">
              {inviting ? "Sending..." : "Send Invite"}
            </button>
          </form>
        )}

        {/* Members table */}
        {loading ? (
          <div className="py-10 text-center text-sm text-subtle">Loading members...</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-4 border-b border-border/50 px-4 py-3 last:border-b-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-xs font-bold text-blue-400">
                  {(member.full_name || member.email || member.user_id).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-heading">
                    {member.full_name || member.email || member.user_id.slice(0, 8) + "..."}
                  </div>
                  {member.email && <div className="text-xs text-subtle">{member.email}</div>}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
                    {member.department || "Sales"}
                  </span>
                  {member.role === "owner" ? (
                    <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-medium text-amber-400">owner</span>
                  ) : (
                    <>
                      <span className="rounded-full bg-forge-surface px-2.5 py-0.5 text-[11px] font-medium text-muted">View &amp; Report</span>
                      {(member.role === "admin") && (
                        <span className="rounded-full bg-blue-500/15 px-2.5 py-0.5 text-[11px] font-medium text-blue-400">Create &amp; Edit</span>
                      )}
                      {member.role === "admin" && (
                        <span className="rounded-full bg-purple-500/15 px-2.5 py-0.5 text-[11px] font-medium text-purple-400">Admin</span>
                      )}
                    </>
                  )}
                </div>
                {isOwnerOrAdmin && member.role !== "owner" && (
                  <div className="flex items-center gap-1">
                    {activeOrg.role === "owner" && (
                      <button
                        onClick={() => handleChangeRole(member.id, member.role === "admin" ? "member" : "admin")}
                        className="rounded border border-border bg-forge-surface px-2 py-1 text-[11px] text-body transition-colors hover:bg-forge-card-hover"
                      >
                        {member.role === "admin" ? "Revoke Admin" : "Grant Admin"}
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="rounded p-1 text-subtle transition-colors hover:text-red-400"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pending invites */}
        {invites.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold text-heading">Pending Invites ({invites.length})</h3>
            <div className="overflow-hidden rounded-xl border border-border">
              {invites.map((invite) => (
                <div key={invite.id} className="flex items-center gap-4 border-b border-border/50 px-4 py-3 last:border-b-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-xs font-bold text-amber-400">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <rect x="2" y="4" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M2 5.5l6 4 6-4" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-secondary">{invite.email}</div>
                    <div className="text-[11px] text-faint">Invited as {invite.role} &middot; {invite.department || "Sales"}</div>
                  </div>
                  <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-medium text-amber-400">
                    pending
                  </span>
                  {isOwnerOrAdmin && (
                    <button
                      onClick={() => handleRevokeInvite(invite.id)}
                      className="rounded p-1 text-subtle transition-colors hover:text-red-400"
                      title="Revoke invite"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
