-- ============================================================
-- AVGenix: add a 'declined' status for organization_invites.
-- ============================================================
-- Needed for the new in-app "pending invites for you" notice (an
-- already-existing, signed-in user who gets invited has no other way to
-- discover or act on it — only a brand-new signup auto-accepts). A
-- recipient actively declining an invite is a distinct, meaningful event
-- from it merely expiring after 7 days unopened; conflating the two under
-- 'expired' would make that Pending Invites list on the Members page
-- misleading later.

ALTER TABLE public.organization_invites
  DROP CONSTRAINT IF EXISTS organization_invites_status_check;
ALTER TABLE public.organization_invites
  ADD CONSTRAINT organization_invites_status_check
  CHECK (status IN ('pending','accepted','expired','declined'));

-- get_my_pending_invites(): lets the banner show the org's *name*, even
-- though the invitee isn't a member of that org yet (so plain org_select
-- RLS would hide it from a normal join). Deliberately a narrow,
-- read-only, SECURITY DEFINER function scoped to exactly the caller's own
-- pending invites, rather than widening org_select itself to let anyone
-- with a pending invite see org details — org_select is the policy this
-- session's earlier migrations spent the most effort getting right, and
-- there's no need to touch it again for this.
CREATE OR REPLACE FUNCTION public.get_my_pending_invites()
RETURNS TABLE (id uuid, token text, role text, department text, org_id uuid, org_name text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT i.id, i.token, i.role, i.department, i.org_id, o.name
  FROM organization_invites i
  JOIN organizations o ON o.id = i.org_id
  WHERE i.status = 'pending'
    AND i.expires_at > now()
    AND i.email = (SELECT email FROM auth.users WHERE id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.get_my_pending_invites() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_pending_invites() TO authenticated;
