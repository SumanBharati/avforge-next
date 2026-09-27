import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { BrevoClient } from "@getbrevo/brevo";
import { SITE_URL } from "@/lib/site";

const brevoClient = new BrevoClient({ apiKey: process.env.BREVO_API_KEY! });

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function buildInviteEmail(p: { inviterName: string; inviterEmail: string; teamName: string; roleLabel: string; inviteeEmail: string; inviteUrl: string }) {
  const e = {
    inviterName: escapeHtml(p.inviterName),
    inviterEmail: escapeHtml(p.inviterEmail),
    teamName: escapeHtml(p.teamName),
    roleLabel: escapeHtml(p.roleLabel),
    inviteeEmail: escapeHtml(p.inviteeEmail),
    inviteUrl: escapeHtml(p.inviteUrl),
  };

  // Table layout + inline styles: the only thing Gmail and Outlook render reliably.
  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f4f2fb;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2fb;padding:32px 12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e6def9;">
      <tr><td style="background:#0c1220;padding:20px 28px;">
        <!-- Always the public site: mail clients can't load images from a dev machine's localhost. -->
        <img src="${SITE_URL}/email/avgenix-logo.png" width="196" height="32" alt="AVGenix" style="display:block;border:0;color:#ffffff;font-size:18px;font-weight:700;">

      </td></tr>
      <tr><td style="padding:32px 28px 8px;">
        <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#1a1f36;">${e.inviterName} invited you to join <span style="color:#7c3aed;">${e.teamName}</span></h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4a5068;">You'll join the team on AVGenix as <strong style="color:#1a1f36;">${e.roleLabel}</strong>.</p>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#6b7190;">AVGenix brings AV project work into one place: site surveys, design engineering, proposals, procurement and scheduling.</p>
        <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:#7c3aed;">
          <a href="${e.inviteUrl}" style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Accept invitation</a>
        </td></tr></table>
        <p style="margin:20px 0 0;font-size:13px;color:#6b7190;">This invitation expires in 7 days. If you don't have an AVGenix account yet, you'll be able to create one with this email address.</p>
      </td></tr>
      <tr><td style="padding:20px 28px 28px;">
        <p style="margin:0;font-size:12px;line-height:1.6;color:#959db2;">Button not working? Paste this link into your browser:<br><a href="${e.inviteUrl}" style="color:#7c3aed;word-break:break-all;">${e.inviteUrl}</a></p>
      </td></tr>
      <tr><td style="padding:16px 28px;background:#faf9fe;border-top:1px solid #efeaf9;">
        <p style="margin:0;font-size:12px;line-height:1.6;color:#959db2;">${e.inviterName} (${e.inviterEmail}) sent this invitation to ${e.inviteeEmail}. Not expecting it? You can ignore this email. Nothing happens unless you accept.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  const text = `${p.inviterName} invited you to join ${p.teamName} on AVGenix as ${p.roleLabel}.

Accept the invitation (expires in 7 days):
${p.inviteUrl}

AVGenix brings AV project work into one place: site surveys, design engineering, proposals, procurement and scheduling.

${p.inviterName} (${p.inviterEmail}) sent this invitation to ${p.inviteeEmail}. Not expecting it? You can ignore this email.`;

  return { html, text };
}

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
    .select("name, is_individual")
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const inviteUrl = `${appUrl}/org/invite?token=${invite.token}`;
  const teamName = org?.name || org_name || "a team";
  const inviterName = (user.user_metadata?.full_name as string | undefined)?.trim() || user.email || "A teammate";
  const roleLabel = [department, role === "admin" ? "with admin access" : null].filter(Boolean).join(" ") || (role === "admin" ? "an Admin" : "a Member");
  const { html, text } = buildInviteEmail({ inviterName, inviterEmail: user.email ?? "", teamName, roleLabel, inviteeEmail: email, inviteUrl });

  try {
    await brevoClient.transactionalEmails.sendTransacEmail({
      sender: { name: "AVGenix", email: process.env.BREVO_SENDER_EMAIL! },
      to: [{ email }],
      subject: `${inviterName} invited you to join ${teamName} on AVGenix`.replace(/[\r\n]+/g, " "),
      htmlContent: html,
      textContent: text,
    });
  } catch (emailErr) {
    console.error("Email send error:", emailErr);
    // Invite row was created — don't fail the whole request, just warn
    return NextResponse.json({ warning: "Invite created but email failed to send", inviteUrl });
  }

  return NextResponse.json({ success: true });
}
