# Supabase auth email templates

Paste each file into Supabase → Authentication → Emails → Templates.
They are not deployed automatically.

| File | Template | Subject |
|---|---|---|
| confirm-signup.html | Confirm signup | Confirm your AVGenix account |
| reset-password.html | Reset password | Reset your AVGenix password |
| change-email.html | Change email address | Confirm your new AVGenix email |

Links go to `/auth/confirm` on the Site URL (app/auth/confirm/page.tsx),
which verifies the token_hash. Don't switch back to `{{ .ConfirmationURL }}`:
that link points at the *.supabase.co project domain, and a password-reset
email whose link domain differs from the sender's is what Gmail flags as
phishing.

## Team invitation email

The team invitation email is not a Supabase template. `app/api/invite/route.ts`
builds it (`buildInviteEmail`) and sends it through Brevo, because a team
invite must also reach people who already have an account, and Supabase's
"Invite user" (`inviteUserByEmail`) only works for new users and creates the
account before the invite is accepted. Leave Supabase's "Invite user"
template alone; the app never sends it.

These templates copy the invitation email's layout (header, logo, heading,
purple button, "Button not working?" link, grey footer). When you change the
design in one, change it in the other three too.

## Testing locally

Links in real emails always use the Site URL (https://avgenix.com). To test
`/auth/confirm` against `npm run dev` without sending an email:

    node --env-file=.env.local scripts/testing/auth-confirm-link.mjs recovery you@example.com
    node --env-file=.env.local scripts/testing/auth-confirm-link.mjs signup new-user@example.com

Open the printed link. `signup` creates a real, unconfirmed user in the
Supabase project, so delete it afterwards. To preview a template's look,
open the .html file in a browser (the `{{ ... }}` placeholders show as-is).
