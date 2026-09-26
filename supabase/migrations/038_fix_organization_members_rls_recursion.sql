-- ============================================================
-- AVGenix: fix infinite-recursion in organization_members' own
-- RLS policies, which is why RLS has been OFF on this table.
-- ============================================================
-- om_select (001_organizations.sql) checks membership by querying
-- organization_members from WITHIN organization_members' own SELECT
-- policy:
--   EXISTS (SELECT 1 FROM organization_members om2 WHERE om2.org_id = ...)
-- Any query that touches this table — including an innocuous one from a
-- DIFFERENT table's policy, like organizations' own org_select doing
-- "EXISTS (SELECT 1 FROM organization_members WHERE ...)" to check if the
-- caller belongs to that org — re-triggers om_select, which re-queries
-- organization_members, which re-triggers om_select again: infinite
-- recursion. Postgres raises exactly that error the moment RLS is turned
-- on for this table with these policies in place.
--
-- That's almost certainly why relrowsecurity was false on
-- organization_members: someone hit this error while RLS was being rolled
-- out and disabled it on the table instead of fixing the recursive
-- policy — leaving every om_select/om_insert/om_update/om_delete rule
-- unenforced ever since (any authenticated user could read every org's
-- membership, or insert themselves as superadmin into any org).
--
-- Fix: two SECURITY DEFINER helper functions. Because they run as the
-- function owner, their internal queries against organization_members
-- bypass RLS entirely — so calling them from inside a policy checks
-- membership without ever re-triggering that policy. Every self-
-- referencing organization_members policy is rewritten to call these
-- instead of querying the table directly.
--
-- Cross-table policies (org_select/org_update/org_delete on
-- organizations, oi_* on organization_invites) already just do a plain
-- EXISTS against organization_members and are NOT recursive themselves —
-- they only broke as a side effect of om_select recursing. They need no
-- changes; fixing om_select fixes what they see too.

-- 1. Helper functions
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id uuid, p_roles text[] DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND (p_roles IS NULL OR role = ANY(p_roles))
  );
$$;

COMMENT ON FUNCTION public.is_org_member(uuid, text[]) IS
  'Is the current user a member of p_org_id (optionally restricted to p_roles)? SECURITY DEFINER so its internal query bypasses organization_members'' own RLS — calling this from inside that table''s policies checks membership without re-triggering them (avoids the infinite recursion a raw self-referencing subquery causes).';

REVOKE ALL ON FUNCTION public.is_org_member(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, text[]) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.org_has_any_member(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM organization_members WHERE org_id = p_org_id);
$$;

COMMENT ON FUNCTION public.org_has_any_member(uuid) IS
  'Does org p_org_id have any member at all yet? SECURITY DEFINER for the same reason as is_org_member() — used for the Individual-org lockdown and the bootstrap case (letting a creator add themselves as an org''s first member).';

REVOKE ALL ON FUNCTION public.org_has_any_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.org_has_any_member(uuid) TO authenticated, anon;

-- 2. Rewrite organization_members' own policies to use them
-- ------------------------------------------------------------
DROP POLICY IF EXISTS om_select ON organization_members;
CREATE POLICY om_select ON organization_members FOR SELECT USING (
  public.is_org_member(org_id)
);

DROP POLICY IF EXISTS om_insert ON organization_members;
CREATE POLICY om_insert ON organization_members FOR INSERT WITH CHECK (
  NOT (
    (SELECT is_individual FROM organizations WHERE id = organization_members.org_id)
    AND public.org_has_any_member(organization_members.org_id)
  )
  AND (
    public.is_org_member(organization_members.org_id, ARRAY['superadmin','admin'])
    -- Bootstrap: the org has no members yet, and you're inserting
    -- yourself (not someone else) as its first one. Org ids are random
    -- gen_random_uuid()s, never listed to anyone who isn't already a
    -- member (org_select requires membership to even see the row), so
    -- this can't be raced by a stranger guessing an org_id mid-creation.
    OR (organization_members.user_id = auth.uid() AND NOT public.org_has_any_member(organization_members.org_id))
  )
);

DROP POLICY IF EXISTS om_update ON organization_members;
CREATE POLICY om_update ON organization_members FOR UPDATE USING (
  public.is_org_member(organization_members.org_id, ARRAY['superadmin'])
);

DROP POLICY IF EXISTS om_delete ON organization_members;
CREATE POLICY om_delete ON organization_members FOR DELETE USING (
  organization_members.user_id = auth.uid()
  OR public.is_org_member(organization_members.org_id, ARRAY['superadmin','admin'])
);

-- 3. Finally, turn RLS on for real.
-- ------------------------------------------------------------
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
