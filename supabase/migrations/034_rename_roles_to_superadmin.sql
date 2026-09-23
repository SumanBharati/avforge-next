-- ============================================================
-- AVGenix: rename the top organization_members role from
-- 'owner' to 'superadmin' everywhere it is stored or checked.
-- ============================================================
-- Pure rename — no behavior change. 'owner' meant "the single most
-- privileged role on an org" and still does; this migration (paired with
-- a matching frontend deploy, shipped together — see rollout notes)
-- relabels it 'superadmin' in the CHECK constraint, every RLS policy from
-- 001_organizations.sql that referenced it, and handle_new_user_org()'s
-- INSERT. organization_invites.role never allowed 'owner' to begin with
-- (only 'admin'/'member'), so that constraint is untouched.

-- 1. Widen the CHECK constraint to accept the new value, backfill data,
--    then narrow it back down — never drop the constraint entirely, to
--    avoid a window with no validation on a live table.
-- ------------------------------------------------------------
ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_role_check;
ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_role_check
  CHECK (role IN ('owner','admin','member','superadmin'));

UPDATE public.organization_members SET role = 'superadmin' WHERE role = 'owner';

ALTER TABLE public.organization_members
  DROP CONSTRAINT organization_members_role_check;
ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_role_check
  CHECK (role IN ('superadmin','admin','member'));

-- 2. Re-issue every RLS policy from 001_organizations.sql that referenced
--    'owner', using 'superadmin' — carrying forward the is_individual
--    lockdown clauses added in migration 033 on oi_insert/om_insert/org_delete.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS org_update ON organizations;
CREATE POLICY org_update ON organizations FOR UPDATE USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = organizations.id AND user_id = auth.uid() AND role IN ('superadmin','admin'))
);

DROP POLICY IF EXISTS org_delete ON organizations;
CREATE POLICY org_delete ON organizations FOR DELETE USING (
  NOT is_individual
  AND EXISTS (SELECT 1 FROM organization_members WHERE org_id = organizations.id AND user_id = auth.uid() AND role = 'superadmin')
);

DROP POLICY IF EXISTS om_insert ON organization_members;
CREATE POLICY om_insert ON organization_members FOR INSERT WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = organization_members.org_id
      AND o.is_individual
      AND EXISTS (SELECT 1 FROM organization_members existing WHERE existing.org_id = o.id)
  )
  AND EXISTS (SELECT 1 FROM organization_members om2 WHERE om2.org_id = organization_members.org_id AND om2.user_id = auth.uid() AND om2.role IN ('superadmin','admin'))
);

DROP POLICY IF EXISTS om_delete ON organization_members;
CREATE POLICY om_delete ON organization_members FOR DELETE USING (
  -- admin/superadmin can remove, or you can remove yourself
  organization_members.user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM organization_members om2 WHERE om2.org_id = organization_members.org_id AND om2.user_id = auth.uid() AND om2.role IN ('superadmin','admin'))
);

DROP POLICY IF EXISTS om_update ON organization_members;
CREATE POLICY om_update ON organization_members FOR UPDATE USING (
  EXISTS (SELECT 1 FROM organization_members om2 WHERE om2.org_id = organization_members.org_id AND om2.user_id = auth.uid() AND om2.role = 'superadmin')
);

DROP POLICY IF EXISTS oi_select ON organization_invites;
CREATE POLICY oi_select ON organization_invites FOR SELECT USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = organization_invites.org_id AND user_id = auth.uid() AND role IN ('superadmin','admin'))
  OR organization_invites.email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

DROP POLICY IF EXISTS oi_insert ON organization_invites;
CREATE POLICY oi_insert ON organization_invites FOR INSERT WITH CHECK (
  NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = organization_invites.org_id AND o.is_individual)
  AND EXISTS (SELECT 1 FROM organization_members WHERE org_id = organization_invites.org_id AND user_id = auth.uid() AND role IN ('superadmin','admin'))
);

DROP POLICY IF EXISTS oi_update ON organization_invites;
CREATE POLICY oi_update ON organization_invites FOR UPDATE USING (
  organization_invites.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM organization_members WHERE org_id = organization_invites.org_id AND user_id = auth.uid() AND role IN ('superadmin','admin'))
);

DROP POLICY IF EXISTS oi_delete ON organization_invites;
CREATE POLICY oi_delete ON organization_invites FOR DELETE USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = organization_invites.org_id AND user_id = auth.uid() AND role IN ('superadmin','admin'))
);

-- 3. handle_new_user_org(): the creator's role literal.
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
  VALUES (new_org_id, NEW.id, 'superadmin');

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

COMMENT ON FUNCTION public.handle_new_user_org() IS
  'Auto-creates a permanent, solo Individual workspace for every new signup and makes them superadmin of it. Also auto-accepts any pending invites matching the new user''s email into other, real Organizations.';
