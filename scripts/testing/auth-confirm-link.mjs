// Prints a working /auth/confirm link for the local dev server, the same link
// the Supabase email templates (supabase/templates/) would send, without
// sending an email. Uses the service role key to generate the token.
//
// Usage:
//   node --env-file=.env.local scripts/testing/auth-confirm-link.mjs recovery you@example.com
//   node --env-file=.env.local scripts/testing/auth-confirm-link.mjs signup new-user@example.com [password]
//
// recovery: the account must exist. Opening the link should land on the
//           "Set new password" popup.
// signup:   creates an UNCONFIRMED user with that email (password defaults to
//           a random one). Opening the link confirms it and should land on
//           /welcome, signed in. Pending invites for the email are joined at
//           that moment once migration 048 is applied.
//
// Tokens are single-use and expire per Supabase's Email OTP expiration.

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.LOCAL_APP_URL || "http://localhost:3000";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — run with node --env-file=.env.local");
  process.exit(1);
}

const [kind, email, password] = process.argv.slice(2);
if (!["recovery", "signup"].includes(kind) || !email) {
  console.error("Usage: auth-confirm-link.mjs <recovery|signup> <email> [password]");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Mirrors the emailRedirectTo values the app passes (register page / Log In popup).
const redirectTo = kind === "signup" ? `${APP_URL}/login?next=%2Fwelcome` : `${APP_URL}/login`;

const { data, error } = await admin.auth.admin.generateLink(
  kind === "signup"
    ? { type: "signup", email, password: password || randomBytes(12).toString("base64url"), options: { data: { full_name: email.split("@")[0] }, redirectTo } }
    : { type: "recovery", email, options: { redirectTo } }
);
if (error) {
  console.error(`Supabase error: ${error.message}`);
  process.exit(1);
}

// Same shape as the template: {{ .SiteURL }}/auth/confirm?token_hash=…&type=…&redirect_to={{ .RedirectTo }}
const type = kind === "signup" ? "email" : "recovery";
console.log(`${APP_URL}/auth/confirm?token_hash=${data.properties.hashed_token}&type=${type}&redirect_to=${redirectTo}`);
