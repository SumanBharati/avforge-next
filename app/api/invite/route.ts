import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { BrevoClient } from "@getbrevo/brevo";

const brevoClient = new BrevoClient({ apiKey: process.env.BREVO_API_KEY! });

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const { org_id, org_name, email, role, department } = await req.json();

  if (!authHeader || !org_id || !email || !role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
    .select("role")
    .eq("org_id", org_id)
    .eq("user_id", user.id)
    .single();
  if (!membership) return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
  if (!(["superadmin", "admin"] as string[]).includes(membership.role)) {
    return NextResponse.json({ error: "Only organization owners and admins can invite members" }, { status: 403 });
  }

  const { data: org } = await userClient
    .from("organizations")
    .select("is_individual")
    .eq("id", org_id)
    .single();
  if (org?.is_individual) {
    return NextResponse.json({ error: "Invites aren't available for an Individual workspace" }, { status: 403 });
  }

  // Inserted with the caller's own session so the oi_insert RLS policy
  // (superadmin/admin of org_id, non-individual org) enforces the same
  // checks again server-side.
  const { data: invite, error: insertErr } = await userClient
    .from("organization_invites")
    .insert({ org_id, email: email.toLowerCase(), role, department, invited_by: user.id })
    .select("token")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/org/invite?token=${invite.token}`;

  try {
    await brevoClient.transactionalEmails.sendTransacEmail({
      sender: { name: "AVGenix", email: process.env.BREVO_SENDER_EMAIL! },
      to: [{ email }],
      subject: `You've been invited to join ${org_name} on AVGenix`,
      htmlContent: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2>You're invited to ${org_name}</h2>
          <p>You have been invited to join <strong>${org_name}</strong> on AVGenix as a <strong>${role}</strong>.</p>
          <p>This invite expires in 7 days.</p>
          <a href="${inviteUrl}" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">
            Accept Invitation
          </a>
          <p style="margin-top:24px;color:#888;font-size:12px">
            Or copy this link: ${inviteUrl}
          </p>
        </div>
      `,
    });
  } catch (emailErr) {
    console.error("Email send error:", emailErr);
    // Invite row was created — don't fail the whole request, just warn
    return NextResponse.json({ warning: "Invite created but email failed to send" });
  }

  return NextResponse.json({ success: true });
}
