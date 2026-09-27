-- ============================================================
-- AVGenix: fix auto-accepting invites at signup.
-- ============================================================
-- handle_new_user_org() (034) auto-accepts pending invites for a new user's
-- email, but its membership insert had two bugs:
--   1. It selected EVERY invite for that email with status 'accepted', not
--      just the ones accepted by this signup. Account deletion frees the
--      email for re-registration, so someone signing up again was put back
--      into every team whose invite had ever been accepted, including teams
--      they had left or been removed from.
--   2. It didn't copy the invite's department, so the new member got the
--      column default ("Sales") instead of the role they were invited as.
-- Now only invites accepted in this same statement become memberships, with
-- their department. Email matching is also case-insensitive, like
-- accept_org_invite().

CREATE OR REPLACE FUNCTION public.handle_new_user_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
  user_name text;
  user_slug text;
BEGIN
  user_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1));
  user_slug := lower(regexp_replace(user_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8);

  INSERT INTO public.organizations (name, slug, created_by, is_individual)
  VALUES (user_name || '''s Organization', user_slug, NEW.id, true)
  RETURNING id INTO new_org_id;

  INSERT INTO public.organization_members (org_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'superadmin');

  INSERT INTO public.user_preferences (user_id, active_org_id)
  VALUES (NEW.id, new_org_id)
  ON CONFLICT (user_id) DO UPDATE SET active_org_id = new_org_id;

  WITH accepted AS (
    UPDATE public.organization_invites
    SET status = 'accepted'
    WHERE lower(email) = lower(NEW.email) AND status = 'pending' AND expires_at > now()
    RETURNING org_id, role, department
  )
  INSERT INTO public.organization_members (org_id, user_id, role, department)
  SELECT org_id, NEW.id, role, department FROM accepted
  ON CONFLICT (org_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user_org() IS
  'Auto-creates a permanent, solo Individual workspace for every new signup and makes them superadmin of it. Also auto-accepts pending, unexpired invites for the new user''s email, joining only those teams, with the invited role and department.';
