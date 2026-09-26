-- ============================================================
-- AVGenix: let the Members page show real names/emails for
-- every member, not just the signed-in viewer's own row.
-- ============================================================
-- app/org/members/page.tsx's loadMembers() has always only been able to
-- populate email/full_name for the currently signed-in user themselves
-- (matching m.user_id === user.id from supabase.auth.getUser()) — there
-- was no way for the client to look up any OTHER member's profile, since
-- that lives in auth.users, which the `authenticated` role has no direct
-- table access to (same category of issue as the auth.users permission
-- bug fixed on organization_invites in 041). Every other member has
-- always rendered as a truncated user_id instead of their name.
--
-- Fix: a SECURITY DEFINER function, same pattern as get_my_pending_invites
-- (039) — its internal query can read auth.users because it runs as the
-- function owner, bypassing the caller's own lack of table privilege.
-- Scoped to members of the org the caller is themselves a member of,
-- via the existing is_org_member() helper (038).

CREATE OR REPLACE FUNCTION public.get_org_member_profiles(p_org_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  role text,
  department text,
  joined_at timestamptz,
  email text,
  full_name text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    m.id, m.user_id, m.role, m.department, m.joined_at,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', '') AS full_name
  FROM organization_members m
  JOIN auth.users u ON u.id = m.user_id
  WHERE m.org_id = p_org_id
    AND public.is_org_member(p_org_id);
$$;

COMMENT ON FUNCTION public.get_org_member_profiles(uuid) IS
  'Returns member rows for p_org_id joined with their real email/full_name from auth.users, which the client can never query directly. Caller must themselves be a member of that org (checked via is_org_member) — same authorization boundary the Members page already relies on.';

REVOKE ALL ON FUNCTION public.get_org_member_profiles(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_org_member_profiles(uuid) TO authenticated;
