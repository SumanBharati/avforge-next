-- ============================================================
-- AVGenix: a new Team never gets Pro until it subscribes.
-- ============================================================
-- 036_shared_trial_across_teams.sql let every Team a user creates inherit
-- that user's one-time 3-day trial window. With per-seat billing
-- (lib/stripe-seats.ts), a Team is a paid workspace from day one: its Pro
-- features stay locked (ProGate shows the subscribe popup) until its owner
-- or an admin starts a subscription. The 3-day trial now belongs only to a
-- person's Individual workspace.
--
-- Forward-only: Teams that already inherited a trial keep whatever is left
-- of it (at most 3 days). Only new inserts change.

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
    -- No JWT context: the SECURITY DEFINER handle_new_user_org trigger
    -- firing on auth.users signup, which sets created_by itself.
    v_user_id := NEW.created_by;
  END IF;

  NEW.trial_started_at := now();

  -- Teams start with no trial at all and don't consume the user's grant.
  IF NOT NEW.is_individual THEN
    NEW.trial_ends_at := now();
    RETURN NEW;
  END IF;

  SELECT trial_ends_at INTO v_existing_trial_ends_at
  FROM public.user_trial_grants
  WHERE user_id = v_user_id;

  IF FOUND THEN
    NEW.trial_ends_at := v_existing_trial_ends_at;
  ELSE
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
  'Only a user''s Individual workspace carries their one-time 3-day trial (granted once, at their first Individual org). Teams always start with trial_ends_at = now(): no Pro access until the Team has an active per-seat subscription.';
