# Headless browser verification

Lets Claude (or anyone) visually verify UI changes against a real running
`next dev` server, using a dedicated throwaway test account and project —
never your own data.

## One-time setup

```bash
npm install                                                       # installs playwright (devDependency)
npx playwright install chromium                                   # downloads the browser binary (~300MB, one-time)
node --env-file=.env.local scripts/testing/create-test-user.mjs   # creates claude-e2e-test@avforge.local via the Supabase admin API (pre-confirmed, no email click needed)
```

This writes `PLAYWRIGHT_TEST_EMAIL` / `PLAYWRIGHT_TEST_PASSWORD` into
`.env.local` (gitignored).

## Before each verification run

```bash
node --env-file=.env.local scripts/testing/seed-fixture.mjs
```

Idempotent. Ensures the test user has an org + a project ("Claude E2E
Project") + a room ("Test Room"), and resets that room's Signal Flow data to
one baseline device (a "Laptop" with an HDMI + USB port) with no
cables/annotations — so every run starts from the same known state. Ids are
written to `scripts/testing/.fixture.json` (gitignored).

## Running a check

`scripts/testing/verify-flag.mjs` is the current example — it logs in,
opens the seeded room's Signal Flow Builder, creates a flag on the HDMI
port, and screenshots both the live-editing state and the committed state
into `scripts/testing/screenshots/` (gitignored).

```bash
node --env-file=.env.local scripts/testing/verify-flag.mjs
```

Requires `next dev` already running on `NEXT_PUBLIC_APP_URL`
(`http://localhost:3000` by default) — this does not start or stop your dev
server.

## Writing a new check

Copy `verify-flag.mjs` as a starting point. The pattern:

1. `chromium.launch()` → new page.
2. Log in via `/login` (email/password inputs, `button[type="submit"]`).
3. `page.goto()` straight to the deep-linked URL you need
   (`?project=<fixture.projectId>&room=<fixture.roomId>`) — no need to click
   through the sidebar.
4. Prefer selecting elements by `title=` attribute (most toolbar buttons have
   one) or by visible text, over CSS classes (which are inline Tailwind/style
   objects here, not stable hooks).
5. `page.screenshot()` (whole page) or pass `clip: {x,y,width,height}` for a
   tight crop of just the thing you changed.
6. Check `consoleErrors` before declaring success — a page can render fine
   while something under it 500s.

If a change needs different seeded data (more devices, a second room, an
existing flag already on the port, etc.), extend `seed-fixture.mjs` rather
than trying to click through the "Add Equipment" modal — it seeds
`tool_data` rows directly via the service-role key, which is faster and more
reliable than driving multi-step creation UI for fixtures that aren't
themselves the thing under test.
