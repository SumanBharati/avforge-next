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
    .select("role, organizations(id, name, is_individual, subscription_status, subscription_cancel_at_period_end)")
    .eq("user_id", user.id);
  if (membershipsErr) {
    console.error("Account deletion: failed to load memberships:", membershipsErr.message);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  // For a team you own (superadmin), same rules as deleting it outright
  // (037_team_delete_rules_and_ownership_transfer.sql): no active
  // subscription, and no other members still on it — resolve those first
  // (cancel billing; transfer ownership or remove members).
  //
  // For a team you're just a member/admin of, billing isn't your call to
  // make (only superadmin/admin can even open Manage Billing — see
  // app/api/stripe/checkout/route.ts) and AVGenix Pro is billed per seat
  // (lib/stripe-seats.ts), so you leaving doesn't require touching the
  // team's subscription at all — it just corrects the team's seat count.
  // The requirement is simply: leave first, then delete.
  const blockers: string[] = [];
  for (const m of memberships ?? []) {
    const org = m.organizations as unknown as { id: string; name: string; is_individual: boolean; subscription_status: string | null; subscription_cancel_at_period_end: boolean | null } | null;
    if (!org) continue;
    const label = org.is_individual ? "your Individual workspace" : `"${org.name}"`;

    // Individual workspaces always make their creator the superadmin, so
    // this only fires for a real team you don't own.
    if (m.role !== "superadmin") {
      blockers.push(`You're a member of ${label} — leave that team first (Team Settings → Members).`);
      continue;
    }

    // Already cancelled but still inside the paid month: no future charges, so
    // it doesn't need to block deletion.
    if (org.subscription_status === "active" && !org.subscription_cancel_at_period_end) {
      blockers.push(`${label} has an active Pro subscription — cancel it first (Team Settings → Manage Billing).`);
      continue;
    }
    const { count } = await admin
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("org_id", org.id);
    if ((count ?? 0) > 1) {
      blockers.push(`You're the superadmin of ${label}, which still has other members — transfer ownership or remove them first.`);
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
