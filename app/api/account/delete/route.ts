export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Full AVGenix account deletion is a soft delete, not a row delete: at
// least 10 columns across organizations, organization_invites, project
// management, procurement, and inventory reference auth.users(id) with no
// ON DELETE behavior defined, so auth.admin.deleteUser() would throw a
// foreign-key violation the moment the user has any real activity.
// Instead this bans the auth.users row (blocks all future sign-in) and
// scrubs PII, while leaving historical records — projects, procurement
// audit trails, invites they sent — intact and attributed to the now-
// anonymized user.
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "Missing auth" }, { status: 400 });

  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: memberships, error: membershipsErr } = await userClient
    .from("organization_members")
    .select("role, organizations(id, name, is_individual, subscription_status)")
    .eq("user_id", user.id);
  if (membershipsErr) {
    console.error("Account deletion: failed to load memberships:", membershipsErr.message);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  // Same rules as deleting a single team (037_team_delete_rules_and_ownership_transfer.sql),
  // applied across every org this person owns: nothing with an active
  // subscription, and no team where they're still superadmin over other
  // members — each one has to be resolved (cancel billing; transfer
  // ownership or remove members) before the whole account can go.
  const blockers: string[] = [];
  for (const m of memberships ?? []) {
    const org = m.organizations as unknown as { id: string; name: string; is_individual: boolean; subscription_status: string | null } | null;
    if (!org) continue;
    const label = org.is_individual ? "your Individual workspace" : `"${org.name}"`;

    if (org.subscription_status === "active") {
      blockers.push(`${label} has an active Pro subscription — cancel it first (Team Settings → Manage Billing).`);
      continue;
    }
    if (m.role === "superadmin" && !org.is_individual) {
      const { count } = await admin
        .from("organization_members")
        .select("id", { count: "exact", head: true })
        .eq("org_id", org.id);
      if ((count ?? 0) > 1) {
        blockers.push(`You're the superadmin of ${label}, which still has other members — transfer ownership or remove them first.`);
      }
    }
  }

  if (blockers.length > 0) {
    return NextResponse.json({ error: "Your account can't be deleted yet.", blockers }, { status: 409 });
  }

  const { error: banErr } = await admin.auth.admin.updateUserById(user.id, {
    email: `deleted-${user.id}@deleted.avgenix.invalid`,
    ban_duration: "876000h", // ~100 years — effectively permanent
    user_metadata: { full_name: null, avatar_url: null, deleted_at: new Date().toISOString() },
  });
  if (banErr) {
    console.error("Account deletion: failed to ban user:", banErr.message);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  // ban_duration blocks future sign-ins/token refreshes, but the caller's
  // already-issued access token stays valid until it naturally expires.
  // Revoke it (and every other session they have open) right now instead
  // of waiting that out.
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const { error: signOutErr } = await admin.auth.admin.signOut(token, "global");
  if (signOutErr) console.error("Account deletion: failed to revoke sessions:", signOutErr.message);

  const individualOrg = (memberships ?? []).find((m) => (m.organizations as any)?.is_individual);
  if (individualOrg) {
    await admin.from("organizations").update({
      name: "Deleted Account",
      website: null, phone: null, street_address: null, city: null, state: null, zip: null,
      shipping_address: null, shipping_city: null, shipping_state: null, shipping_zip: null,
    }).eq("id", (individualOrg.organizations as any).id);
  }

  return NextResponse.json({ success: true });
}
