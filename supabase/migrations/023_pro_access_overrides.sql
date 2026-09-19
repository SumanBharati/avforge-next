-- AVGenix: temporary Pro access exceptions for QA and stakeholder testing

CREATE TABLE IF NOT EXISTS public.pro_access_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  expires_at timestamptz NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  CONSTRAINT pro_access_override_reason_not_blank CHECK (length(trim(reason)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_pro_access_overrides_user_active
  ON public.pro_access_overrides(user_id, enabled, expires_at);

ALTER TABLE public.pro_access_overrides ENABLE ROW LEVEL SECURITY;

-- Users may inspect only their own exceptions. No client-side write policies
-- are provided; grants/revocations are performed by a database administrator
-- or a server endpoint using the service-role key.
DROP POLICY IF EXISTS pro_access_overrides_select_own ON public.pro_access_overrides;
CREATE POLICY pro_access_overrides_select_own
  ON public.pro_access_overrides FOR SELECT
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_active_pro_override()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pro_access_overrides override
    WHERE override.user_id = auth.uid()
      AND override.enabled = true
      AND override.expires_at > now()
  );
$$;

REVOKE ALL ON FUNCTION public.has_active_pro_override() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_active_pro_override() TO authenticated;

-- Extend the access decision introduced in migration 022. Membership remains
-- mandatory; an override grants access to Pro features in the user's orgs.
CREATE OR REPLACE FUNCTION public.has_pro_access(target_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members member
    JOIN public.organizations org ON org.id = member.org_id
    WHERE member.org_id = target_org_id
      AND member.user_id = auth.uid()
      AND (
        org.subscription_status IN ('active', 'trialing')
        OR org.trial_ends_at > now()
        OR public.has_active_pro_override()
      )
  );
$$;

REVOKE ALL ON FUNCTION public.has_pro_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_pro_access(uuid) TO authenticated;

COMMENT ON TABLE public.pro_access_overrides IS
  'Expiring, administrator-managed exceptions that grant selected users Pro access without altering Stripe subscription state.';
