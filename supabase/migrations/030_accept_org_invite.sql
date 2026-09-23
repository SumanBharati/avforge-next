-- AVGenix: fix org invite acceptance and lock down invite creation.
--
-- Two issues:
-- 1. app/org/invite/page.tsx accepted an invite by having the invited user
--    insert their own organization_members row from the client. The
--    om_insert RLS policy (001_organizations.sql) requires the caller to
--    ALREADY be an owner/admin of that org, so a genuinely-invited outsider
--    can never pass it — invite acceptance was broken. This adds a
--    SECURITY DEFINER function that re-validates the invite (token, status,
--    expiry, email match) and performs the membership insert + invite
--    status update atomically, bypassing RLS only for that one, narrowly
--    checked operation.
-- 2. app/api/invite/route.ts had no auth check and used the service-role
--    key, so anyone could POST an org_id/email/role and create a valid
--    invite for any organization. That route has been fixed separately to
--    require a verified owner/admin session; this migration is the
--    corresponding fix on the acceptance side.

CREATE OR REPLACE FUNCTION public.accept_org_invite(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.organization_invites%ROWTYPE;
  v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_invite FROM public.organization_invites WHERE token = p_token FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invite link';
  END IF;

  IF v_invite.status <> 'pending' THEN
    RAISE EXCEPTION 'This invite has already been used';
  END IF;

  IF v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'This invite has expired';
  END IF;

  IF lower(v_invite.email) <> lower(v_email) THEN
    RAISE EXCEPTION 'This invite was sent to a different email address';
  END IF;

  INSERT INTO public.organization_members (org_id, user_id, role, department)
  VALUES (v_invite.org_id, auth.uid(), v_invite.role, v_invite.department)
  ON CONFLICT (org_id, user_id) DO NOTHING;

  UPDATE public.organization_invites SET status = 'accepted' WHERE id = v_invite.id;

  RETURN v_invite.org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_org_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_org_invite(text) TO authenticated;

COMMENT ON FUNCTION public.accept_org_invite(text) IS
  'Validates a pending, unexpired invite against the caller''s own email and joins them to the org. SECURITY DEFINER: the only privileged part is the organization_members insert, guarded by an explicit email/status/expiry check rather than RLS.';
