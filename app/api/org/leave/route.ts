export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { syncOrgSeats } from "@/lib/stripe-seats";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const { org_id } = await req.json();
  if (!authHeader || !org_id) {
    return NextResponse.json({ error: "Missing auth or org_id" }, { status: 400 });
  }

  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: membership } = await userClient
    .from("organization_members")
    .select("id, role, organizations(is_individual)")
    .eq("org_id", org_id)
    .eq("user_id", user.id)
    .single();
  if (!membership) return NextResponse.json({ error: "Not a member of this team" }, { status: 404 });

  const org = membership.organizations as unknown as { is_individual: boolean } | null;
  if (org?.is_individual) {
    return NextResponse.json({ error: "You can't leave your personal workspace." }, { status: 400 });
  }
  if (membership.role === "superadmin") {
    return NextResponse.json({
      error: "You're the superadmin of this team — transfer ownership to another member first, or delete the team if you're the only one left.",
    }, { status: 409 });
  }

  // RLS (om_delete) already allows deleting your own membership row.
  const { error: deleteErr } = await userClient
    .from("organization_members")
    .delete()
    .eq("id", membership.id);
  if (deleteErr) {
    console.error("Leave team: failed to remove membership:", deleteErr.message);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  await syncOrgSeats(org_id);

  return NextResponse.json({ success: true });
}
