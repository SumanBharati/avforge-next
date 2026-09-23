-- ============================================================
-- AVGenix: Individual workspaces — is_individual flag, trial
-- restricted to Individual orgs only, and DB-level lockdown of
-- Individual orgs (no invites, no second member, no delete).
-- ============================================================
-- Multi-org membership is already fully supported (get_my_organizations,
-- OrgSwitcher, /org/new, /org/invite) — a user can create or join any
-- number of real Organizations. This migration distinguishes the single,
-- permanent, solo workspace auto-created for every user at signup
-- ("Individual") from real Organizations, and moves the one-time 3-day
-- trial (032_trial_once_per_user.sql) so it can ONLY ever be granted to a
-- user's Individual org — a real Organization never gets a trial, it must
-- have an active paid subscription from day one.

-- 1. New column
-- ------------------------------------------------------------
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS is_individual boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.organizations.is_individual IS
  'True only for the single, permanent, solo workspace auto-created for a user at signup by handle_new_user_org(). False for every org created via /org/new or joined via invite. Individual orgs can never receive invites, gain a second member, or be deleted (enforced below), and are the only orgs eligible for the one-time trial (see enforce_trial_once_per_user()).';

-- 2. Backfill existing rows
-- ------------------------------------------------------------
-- Primary signal: user_trial_grants.org_id — the org that already claimed
-- this user's one-time trial (set by the pre-existing 032 trigger), which
-- by construction was the first org ever created for that user.
-- Fallback: users with no trial-grant row (e.g. their original signup org
-- was since deleted) get their single earliest org, but only if it's
-- still solo-membership — never retroactively flag an org that already
-- has more than one member as Individual, since that can only be a real,
-- already-shared Organization.
UPDATE public.organizations org
SET is_individual = true
WHERE org.id IN (
  SELECT g.org_id FROM public.user_trial_grants g
  UNION
  (
    SELECT DISTINCT ON (o.created_by) o.id
    FROM public.organizations o
    WHERE o.created_by IS NOT NULL
      AND o.created_by NOT IN (SELECT user_id FROM public.user_trial_grants)
    ORDER BY o.created_by, o.created_at ASC
  )
)
AND (SELECT count(*) FROM public.organization_members m WHERE m.org_id = org.id) = 1;

-- 3. handle_new_user_org(): mark the signup-created org as Individual
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user_org()
RETURNS trigger AS $$
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
  VALUES (new_org_id, NEW.id, 'owner');  -- renamed to 'superadmin' in migration 034

  INSERT INTO public.user_preferences (user_id, active_org_id)
  VALUES (NEW.id, new_org_id)
  ON CONFLICT (user_id) DO UPDATE SET active_org_id = new_org_id;

  -- Auto-accept any pending invites for this email
  UPDATE public.organization_invites
  SET status = 'accepted'
  WHERE email = NEW.email AND status = 'pending' AND expires_at > now();

  INSERT INTO public.organization_members (org_id, user_id, role)
  SELECT org_id, NEW.id, role
  FROM public.organization_invites
  WHERE email = NEW.email AND status = 'accepted'
  ON CONFLICT (org_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- (Trigger itself unchanged — still AFTER INSERT ON auth.users — only the
-- function body changed, no need to re-DROP/CREATE the trigger.)

-- 4. Rewrite the trial grant: only ever fires for is_individual orgs
-- ------------------------------------------------------------
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

  IF NOT NEW.is_individual THEN
    -- Real Organization (created via /org/new, or any non-signup insert
    -- path): never gets a trial, unconditionally — no free days at all,
    -- regardless of user_trial_grants state. It must have an active paid
    -- subscription to unlock Pro features.
    NEW.trial_ends_at := now();
    RETURN NEW;
  END IF;

  -- Only the Individual org insert path reaches here.
  IF v_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_trial_grants WHERE user_id = v_user_id
  ) THEN
    -- Already had a free trial on a previous Individual org: starts expired.
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

COMMENT ON FUNCTION public.enforce_trial_once_per_user() IS
  'Grants the one-time 3-day trial only when the inserted org is_individual = true (the auto-created personal workspace) and the user has never had a trial before. Every other organizations insert (e.g. via /org/new) gets trial_ends_at = now() unconditionally — real Organizations never get a free trial, they must be paid subscriptions from day one.';

-- 5. Lock down Individual orgs at the DB level
-- ------------------------------------------------------------

-- 5a. Block invites targeting an Individual org.
DROP POLICY IF EXISTS oi_insert ON organization_invites;
CREATE POLICY oi_insert ON organization_invites FOR INSERT WITH CHECK (
  NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = organization_invites.org_id AND o.is_individual)
  AND EXISTS (SELECT 1 FROM organization_members WHERE org_id = organization_invites.org_id AND user_id = auth.uid() AND role IN ('owner','admin'))
);
-- (role literals stay 'owner'/'admin' until migration 034 renames them —
--  034 re-issues this same policy again with 'superadmin'/'admin'.)

-- 5b. Block a second organization_members row on an Individual org.
DROP POLICY IF EXISTS om_insert ON organization_members;
CREATE POLICY om_insert ON organization_members FOR INSERT WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = organization_members.org_id
      AND o.is_individual
      AND EXISTS (SELECT 1 FROM organization_members existing WHERE existing.org_id = o.id)
  )
  AND EXISTS (SELECT 1 FROM organization_members om2 WHERE om2.org_id = organization_members.org_id AND om2.user_id = auth.uid() AND om2.role IN ('owner','admin'))
);
-- Note: handle_new_user_org() and accept_org_invite() both run SECURITY
-- DEFINER (bypass RLS entirely) — this policy only needs to stop a
-- *second* client-side insert into an org that is_individual, which by
-- definition already has exactly one member (its creator) by the time any
-- client could reach this policy.

-- 5c. Block DELETE on an Individual org — replaces org_delete from 001.
DROP POLICY IF EXISTS org_delete ON organizations;
CREATE POLICY org_delete ON organizations FOR DELETE USING (
  NOT is_individual
  AND EXISTS (SELECT 1 FROM organization_members WHERE org_id = organizations.id AND user_id = auth.uid() AND role = 'owner')
);

-- 6. get_my_organizations(): return is_individual too
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_organizations()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', org.id,
        'name', org.name,
        'slug', org.slug,
        'logo_url', org.logo_url,
        'role', member.role,
        'member_roles', org.member_roles,
        'subscription_status', org.subscription_status,
        'trial_started_at', org.trial_started_at,
        'trial_ends_at', org.trial_ends_at,
        'is_individual', org.is_individual
      )
      ORDER BY org.created_at
    ),
    '[]'::jsonb
  )
  FROM public.organization_members member
  JOIN public.organizations org ON org.id = member.org_id
  WHERE member.user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_organizations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_organizations() TO authenticated;
