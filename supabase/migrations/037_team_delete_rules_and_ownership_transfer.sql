-- ============================================================
-- AVGenix: tighten Team deletion rules + add ownership transfer.
-- ============================================================
-- Team deletion was previously gated only on "caller is superadmin of a
-- non-individual org" (034_rename_roles_to_superadmin.sql). That allowed a
-- superadmin to delete a team out from under other members, and to delete
-- one with an active paid subscription still running. New rules, enforced
-- at the RLS level (not just the client) so they hold regardless of which
-- client hits the API:
--   1. Still superadmin-only, still never an Individual org.
--   2. The team must have exactly one member left (the superadmin doing
--      the deleting) — every other member must be removed, or ownership
--      transferred away, first.
--   3. The team must not have an active paid subscription — that has to
--      be cancelled (via the existing Stripe billing portal) first.
--
-- Also adds transfer_org_ownership(): the missing piece that lets a
-- superadmin hand the role to another existing member instead of being
-- permanently stuck as the only one who can ever delete or manage
-- billing for that team. Atomic (both role changes happen in one
-- transaction) and re-validates the caller server-side rather than
-- trusting two separate client-side UPDATE calls to land in the right
-- order.

-- 1. Tighten org_delete
-- ------------------------------------------------------------
DROP POLICY IF EXISTS org_delete ON organizations;
CREATE POLICY org_delete ON organizations FOR DELETE USING (
  NOT is_individual
  AND EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = organizations.id AND user_id = auth.uid() AND role = 'superadmin'
  )
  AND (SELECT count(*) FROM organization_members WHERE org_id = organizations.id) = 1
  AND subscription_status IS DISTINCT FROM 'active'
);

COMMENT ON POLICY org_delete ON organizations IS
  'Superadmin-only, never Individual, and only once the team is down to just that one superadmin member with no active paid subscription. See transfer_org_ownership() for handing off the superadmin role, and the Stripe billing portal for cancelling a subscription.';

-- 2. transfer_org_ownership(): hand the superadmin role to another member
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transfer_org_ownership(p_org_id uuid, p_new_superadmin_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_is_individual boolean;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT is_individual INTO v_is_individual FROM public.organizations WHERE id = p_org_id;
  IF v_is_individual IS NULL THEN
    RAISE EXCEPTION 'Team not found';
  END IF;
  IF v_is_individual THEN
    RAISE EXCEPTION 'Cannot transfer ownership of an Individual workspace';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE org_id = p_org_id AND user_id = v_caller_id AND role = 'superadmin'
  ) THEN
    RAISE EXCEPTION 'Only the current superadmin can transfer ownership';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE org_id = p_org_id AND user_id = p_new_superadmin_user_id
  ) THEN
    RAISE EXCEPTION 'That user is not a member of this team';
  END IF;

  IF p_new_superadmin_user_id = v_caller_id THEN
    RAISE EXCEPTION 'Already the superadmin';
  END IF;

  UPDATE public.organization_members SET role = 'superadmin'
  WHERE org_id = p_org_id AND user_id = p_new_superadmin_user_id;

  UPDATE public.organization_members SET role = 'admin'
  WHERE org_id = p_org_id AND user_id = v_caller_id;
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_org_ownership(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_org_ownership(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.transfer_org_ownership(uuid, uuid) IS
  'Re-validates the caller is the current superadmin of a non-individual org, then atomically makes the target member the new superadmin and demotes the caller to admin. Both role changes happen in one transaction so the org is never left with zero or two superadmins.';
