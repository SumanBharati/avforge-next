-- ============================================================
-- AVGenix: only auto-accept invites once the email is confirmed.
-- ============================================================
-- handle_new_user_org() (046) joins a new user to every team with a pending
-- invite for their email, right when the auth.users row is inserted. Signing
-- up doesn't prove the person owns that inbox, so anyone who knew an invitee's
-- address could register with it and take the invite's seat and role.
--
-- Now the signup trigger only accepts invites when the email is already
-- confirmed (i.e. Supabase "Confirm email" is off, or the user was created
-- pre-confirmed). Otherwise the invites wait until email_confirmed_at is set,
-- which a second trigger picks up.

CREATE OR REPLACE FUNCTION public.accept_pending_invites_for_user(p_user_id uuid, p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH accepted AS (
    UPDATE public.organization_invites
    SET status = 'accepted'
    WHERE lower(email) = lower(p_email) AND status = 'pending' AND expires_at > now()
    RETURNING org_id, role, department
  )
  INSERT INTO public.organization_members (org_id, user_id, role, department)
  SELECT org_id, p_user_id, role, department FROM accepted
  ON CONFLICT (org_id, user_id) DO NOTHING;
END;
$$;

-- Internal helper for the triggers below; not callable by clients.
REVOKE ALL ON FUNCTION public.accept_pending_invites_for_user(uuid, text) FROM PUBLIC, anon, authenticated;

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

  IF NEW.email_confirmed_at IS NOT NULL THEN
    PERFORM public.accept_pending_invites_for_user(NEW.id, NEW.email);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.accept_pending_invites_for_user(NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_user_email_confirmed();

COMMENT ON FUNCTION public.handle_new_user_org() IS
  'Auto-creates a permanent, solo Individual workspace for every new signup and makes them superadmin of it. Pending invites for the email are accepted here only if the email is already confirmed; otherwise on_auth_user_email_confirmed accepts them at confirmation.';
