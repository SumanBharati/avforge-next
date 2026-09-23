-- AVGenix: cap the free Pro trial to once per user, not once per org.
--
-- org_insert (001_organizations.sql) lets any authenticated user create
-- unlimited organizations, and trial_started_at/trial_ends_at (022) default
-- to now()/now()+3 days on every new row. Combined, a single person could
-- keep creating new orgs to get a fresh free trial indefinitely. This also
-- closes a second angle: since those columns previously had no insert-time
-- guard, a client could pass an arbitrary trial_ends_at directly in the
-- insert payload.

CREATE TABLE IF NOT EXISTS public.user_trial_grants (
  user_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  granted_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_trial_grants ENABLE ROW LEVEL SECURITY;

-- Read-only for the user it belongs to; all writes happen from the
-- SECURITY DEFINER trigger below, never directly from the client.
DROP POLICY IF EXISTS user_trial_grants_select_own ON public.user_trial_grants;
CREATE POLICY user_trial_grants_select_own
  ON public.user_trial_grants FOR SELECT
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.enforce_trial_once_per_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
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

  IF v_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_trial_grants WHERE user_id = v_user_id
  ) THEN
    -- Already had a free trial on a previous org: this one starts expired.
    NEW.trial_ends_at := now();
  ELSE
    NEW.trial_ends_at := now() + interval '3 days';
    IF v_user_id IS NOT NULL THEN
      INSERT INTO public.user_trial_grants (user_id, org_id)
      VALUES (v_user_id, NEW.id)
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_trial_once_per_user ON public.organizations;
CREATE TRIGGER trg_enforce_trial_once_per_user
  BEFORE INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_trial_once_per_user();

COMMENT ON TABLE public.user_trial_grants IS
  'One row per user who has ever received the free 3-day org trial (including their first, auto-created-on-signup org). Creating additional orgs after this no longer grants a fresh trial.';
