import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(__dirname, "..");
const env: Record<string, string> = {};
for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
  if (m) env[m[1]] = m[2];
}

const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function main() {
  const testEmail = `avforge.signup.test.${Date.now()}@gmail.com`;
  const testPassword = "Test-Password-9432!";

  console.log(`1) Testing signUp with ${testEmail} (mirrors the register page call)…`);
  const { data, error } = await anon.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: { data: { full_name: "Signup Test" } },
  });

  if (error) {
    console.log(`   SIGNUP FAILED: [${error.status}] ${error.message}`);
  } else {
    console.log(`   Signup accepted.`);
    console.log(`   user.id: ${data.user?.id ?? "NULL"}`);
    console.log(`   session: ${data.session ? "returned (no email confirmation required)" : "NULL — email confirmation required before login"}`);
    console.log(`   identities: ${JSON.stringify(data.user?.identities?.length ?? "n/a")} (0 = email already registered, silent)`);
    console.log(`   email_confirmed_at: ${data.user?.email_confirmed_at ?? "not confirmed"}`);
  }

  console.log(`\n2) Testing immediate login with the same credentials…`);
  const { data: loginData, error: loginErr } = await anon.auth.signInWithPassword({ email: testEmail, password: testPassword });
  if (loginErr) console.log(`   LOGIN FAILED: [${loginErr.status}] ${loginErr.message}`);
  else console.log(`   Login OK, session user: ${loginData.user?.email}`);

  console.log(`\n3) Testing duplicate signup (same email again)…`);
  const { data: dup, error: dupErr } = await anon.auth.signUp({ email: testEmail, password: testPassword });
  if (dupErr) console.log(`   Duplicate signup error: [${dupErr.status}] ${dupErr.message}`);
  else console.log(`   Duplicate signup accepted silently — user.identities: ${dup.user?.identities?.length} (0 means Supabase hid that the email exists)`);

  console.log(`\n4) Cleaning up test user…`);
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const testUser = list?.users.find(u => u.email === testEmail);
  if (testUser) {
    const { error: delErr } = await admin.auth.admin.deleteUser(testUser.id);
    console.log(delErr ? `   Cleanup failed: ${delErr.message}` : `   Test user deleted.`);
  } else {
    console.log(`   Test user not found in user list (nothing to clean up).`);
  }

  console.log(`\n5) Recent real users (last 10) — checking for stuck unconfirmed accounts…`);
  const { data: all } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const users = (all?.users ?? []).sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).slice(0, 10);
  users.forEach(u => {
    console.log(`   ${u.created_at?.slice(0,16)}  ${u.email}  confirmed: ${u.email_confirmed_at ? "YES" : "NO"}  last_sign_in: ${u.last_sign_in_at?.slice(0,16) ?? "never"}`);
  });
}
main().catch(e => { console.error(e); process.exit(1); });
