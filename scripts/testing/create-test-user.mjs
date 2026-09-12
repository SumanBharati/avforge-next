// One-time setup: creates a dedicated, pre-confirmed test account for
// automated browser verification (Playwright), using the Supabase service
// role key so it never has to click an email confirmation link.
//
// Usage: node --env-file=.env.local scripts/testing/create-test-user.mjs
//
// Credentials are written to .env.local (gitignored) as
// PLAYWRIGHT_TEST_EMAIL / PLAYWRIGHT_TEST_PASSWORD. Safe to re-run — it
// reuses the existing test user instead of creating duplicates.

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — run with node --env-file=.env.local");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_EMAIL = "claude-e2e-test@avforge.local";

async function main() {
  const { data: existingList, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) throw listErr;
  const existing = existingList.users.find((u) => u.email === TEST_EMAIL);

  let password = process.env.PLAYWRIGHT_TEST_PASSWORD;

  if (existing) {
    console.log(`Test user already exists: ${TEST_EMAIL} (${existing.id})`);
    if (!password) {
      console.error("User exists but PLAYWRIGHT_TEST_PASSWORD isn't set in .env.local — delete the user in Supabase and re-run, or set the password manually.");
      process.exit(1);
    }
  } else {
    password = randomBytes(18).toString("base64url");
    const { data, error } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Claude E2E Test" },
    });
    if (error) throw error;
    console.log(`Created test user: ${TEST_EMAIL} (${data.user.id})`);

    const envPath = ".env.local";
    const current = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
    const lines = current.split("\n").filter((l) => !l.startsWith("PLAYWRIGHT_TEST_EMAIL=") && !l.startsWith("PLAYWRIGHT_TEST_PASSWORD="));
    lines.push(`PLAYWRIGHT_TEST_EMAIL=${TEST_EMAIL}`, `PLAYWRIGHT_TEST_PASSWORD=${password}`);
    writeFileSync(envPath, lines.join("\n").replace(/\n+$/, "\n"));
    console.log("Wrote PLAYWRIGHT_TEST_EMAIL / PLAYWRIGHT_TEST_PASSWORD to .env.local");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
