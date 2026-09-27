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

## Testing locally

Links in real emails always use the Site URL (https://avgenix.com). To test
`/auth/confirm` against `npm run dev` without sending an email:

    node --env-file=.env.local scripts/testing/auth-confirm-link.mjs recovery you@example.com
    node --env-file=.env.local scripts/testing/auth-confirm-link.mjs signup new-user@example.com

Open the printed link. `signup` creates a real, unconfirmed user in the
Supabase project, so delete it afterwards. To preview a template's look,
open the .html file in a browser (the `{{ ... }}` placeholders show as-is).
