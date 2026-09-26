-- ============================================================
-- AVGenix: let a new Team share the user's single 3-day trial
-- window instead of always starting expired.
-- ============================================================
-- 033_individual_orgs.sql made every non-individual org insert (i.e. every
-- Team created via /org/new) set trial_ends_at = now() unconditionally, so
-- a brand-new Team was Pro-gated the instant it was created — the creator
-- couldn't even try Projects on it, let alone invite teammates to try it
-- with them.
--
-- The trial is meant to be a per-user (per-email), one-time, 3-day
-- allowance, not a per-org one. A user should be able to spend that same
-- 3-day window on whichever org(s) they're actively using — their
-- Individual workspace, a Team they just created, teams they invite
-- people into — but never get more than 3 days total, no matter how many
-- teams they create.
--
-- Fix: user_trial_grants now stores the trial's actual end time
-- (trial_ends_at), fixed at the moment the user's one-and-only trial is
-- granted (their first-ever org insert — in practice always their
-- signup-created Individual workspace). Every later org insert for that
-- user, individual or team, simply copies that same fixed trial_ends_at
-- instead of computing a fresh one or forcing an immediate expiry. Once
-- that original 3-day window has passed, the copied value is already in
-- the past for every subsequent org too, so access still stops dead at
-- 3 days from the user's first trial grant.

-- 1. Store the trial's end time on the grant itself
-- ------------------------------------------------------------
ALTER TABLE public.user_trial_grants
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- Backfill: every existing grant so far was only ever written for an
-- is_individual org (033's branching), so its org's own trial_ends_at
-- *is* the user's trial window — copy it across.
UPDATE public.user_trial_grants g
SET trial_ends_at = o.trial_ends_at
FROM public.organizations o
WHERE o.id = g.org_id
  AND g.trial_ends_at IS NULL;

COMMENT ON COLUMN public.user_trial_grants.trial_ends_at IS
  'Fixed at grant time: the one and only end-of-trial timestamp for this user, 3 days after their first-ever org was created. Every org they subsequently create (Individual or Team) copies this same value into its own trial_ends_at — see enforce_trial_once_per_user().';

-- 2. Rewrite the trigger: any org can carry the trial, but only one
--    3-day window ever gets handed out per user
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_trial_once_per_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_existing_trial_ends_at timestamptz;
BEGIN
  -- Trusted internal/admin writers (Stripe webhook, backfill scripts):
  -- no trial logic imposed.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    -- Normal client-side insert (e.g. /org/new). Never trust the
    -- client-supplied created_by for identity.
    v_user_id := auth.uid();
    NEW.created_by := v_user_id;
  ELSE
    -- No JWT context: this is the SECURITY DEFINER handle_new_user_org
    -- trigger firing on auth.users signup, which sets created_by to the
    -- new user's own id itself. Trust it — there is no session to read.
    v_user_id := NEW.created_by;
  END IF;

  NEW.trial_started_at := now();

  SELECT trial_ends_at INTO v_existing_trial_ends_at
  FROM public.user_trial_grants
  WHERE user_id = v_user_id;

  IF FOUND THEN
    -- This user's one trial was already granted on an earlier org (their
    -- Individual workspace, or any Team since). Every later org — this
    -- one included — just inherits that same fixed end time. If it's
    -- already in the past, this org starts expired too; if it's still
    -- ahead, this org gets Pro access for whatever's left of it.
    NEW.trial_ends_at := v_existing_trial_ends_at;
  ELSE
    -- First org this user has ever had (in practice, their signup-created
    -- Individual workspace). Grants the one and only 3-day window.
    NEW.trial_ends_at := now() + interval '3 days';
    IF v_user_id IS NOT NULL THEN
      INSERT INTO public.user_trial_grants (user_id, org_id, trial_ends_at)
      VALUES (v_user_id, NEW.id, NEW.trial_ends_at)
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_trial_once_per_user() IS
  'Every org a user creates (Individual or Team) shares one fixed 3-day trial window, granted only once, at that user''s first-ever org. Later orgs copy that same trial_ends_at from user_trial_grants rather than getting a fresh 3 days or starting pre-expired, so a user can create/use multiple teams and invite others into them during their single trial, but never gets more than 3 days of Pro access total, however many orgs they create.';
