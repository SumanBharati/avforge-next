-- AVGenix: organization-level three-day Pro trial and Projects enforcement

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '3 days');

CREATE INDEX IF NOT EXISTS idx_organizations_trial_ends_at
  ON public.organizations(trial_ends_at);

-- Central access check. SECURITY DEFINER avoids RLS recursion while the
-- membership predicate still binds access to the authenticated user.
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
      )
  );
$$;

REVOKE ALL ON FUNCTION public.has_pro_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_pro_access(uuid) TO authenticated;

-- Projects are a Pro feature. These policies replace membership-only access.
DROP POLICY IF EXISTS projects_select ON public.projects;
DROP POLICY IF EXISTS projects_insert ON public.projects;
DROP POLICY IF EXISTS projects_update ON public.projects;
DROP POLICY IF EXISTS projects_delete ON public.projects;

CREATE POLICY projects_select ON public.projects FOR SELECT
  USING (public.has_pro_access(org_id));
CREATE POLICY projects_insert ON public.projects FOR INSERT
  WITH CHECK (public.has_pro_access(org_id));
CREATE POLICY projects_update ON public.projects FOR UPDATE
  USING (public.has_pro_access(org_id))
  WITH CHECK (public.has_pro_access(org_id));
CREATE POLICY projects_delete ON public.projects FOR DELETE
  USING (public.has_pro_access(org_id));

-- Project assignments must follow the same access rule.
DROP POLICY IF EXISTS project_members_select ON public.project_members;
DROP POLICY IF EXISTS project_members_insert ON public.project_members;
DROP POLICY IF EXISTS project_members_update ON public.project_members;
DROP POLICY IF EXISTS project_members_delete ON public.project_members;

CREATE POLICY project_members_select ON public.project_members FOR SELECT
  USING (public.has_pro_access(org_id));
CREATE POLICY project_members_insert ON public.project_members FOR INSERT
  WITH CHECK (public.has_pro_access(org_id));
CREATE POLICY project_members_update ON public.project_members FOR UPDATE
  USING (public.has_pro_access(org_id))
  WITH CHECK (public.has_pro_access(org_id));
CREATE POLICY project_members_delete ON public.project_members FOR DELETE
  USING (public.has_pro_access(org_id));

COMMENT ON COLUMN public.organizations.trial_ends_at IS
  'End of the organization-level AVGenix Pro trial; evaluated using database time.';
COMMENT ON FUNCTION public.has_pro_access(uuid) IS
  'True when the authenticated user belongs to the organization and it has an active subscription or unexpired trial.';
