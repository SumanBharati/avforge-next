export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { syncOrgSeats } from "@/lib/stripe-seats";

// Called right after a membership change (invite accepted, member removed)
// so the caller must currently belong to org_id — that's enough
// authorization to trigger a resync, since it just corrects Stripe's
// quantity to match the org's real headcount.
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
    .select("id")
    .eq("org_id", org_id)
    .eq("user_id", user.id)
    .single();
  if (!membership) return NextResponse.json({ error: "Not a member of this team" }, { status: 403 });

  await syncOrgSeats(org_id);

  return NextResponse.json({ success: true });
}
