import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as brevo from "@getbrevo/brevo";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const emailApi = new brevo.TransactionalEmailsApi();
emailApi.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY!);

export async function POST(req: NextRequest) {
  const { org_id, org_name, email, role, department, invited_by } = await req.json();

  if (!org_id || !email || !role || !invited_by) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Insert invite and get the auto-generated token back
  const { data: invite, error: insertErr } = await supabaseAdmin
    .from("organization_invites")
    .insert({ org_id, email: email.toLowerCase(), role, department, invited_by })
    .select("token")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/org/invite?token=${invite.token}`;

  try {
    await emailApi.sendTransacEmail({
      sender: { name: "AVForge", email: process.env.BREVO_SENDER_EMAIL! },
      to: [{ email }],
      subject: `You've been invited to join ${org_name} on AVForge`,
      htmlContent: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2>You're invited to ${org_name}</h2>
          <p>You have been invited to join <strong>${org_name}</strong> on AVForge as a <strong>${role}</strong>.</p>
          <p>This invite expires in 7 days.</p>
          <a href="${inviteUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">
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
