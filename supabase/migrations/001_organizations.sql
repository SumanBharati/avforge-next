-- ============================================================
-- AVForge: Organizations Migration
-- ============================================================

-- 1. Core tables
-- ------------------------------------------------------------

CREATE TABLE organizations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text UNIQUE NOT NULL,
  logo_url   text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE organization_members (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id    uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role      text NOT NULL CHECK (role IN ('owner','admin','member')) DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(org_id, user_id)
);

CREATE TABLE organization_invites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email      text NOT NULL,
  role       text NOT NULL CHECK (role IN ('admin','member')) DEFAULT 'member',
  invited_by uuid REFERENCES auth.users(id),
  token      text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status     text DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired')),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '7 days'
);

-- 2. Add org_id to existing tables
-- ------------------------------------------------------------

ALTER TABLE projects ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE equipment_library ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);

-- Add active_org_id to user_preferences
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS active_org_id uuid REFERENCES organizations(id);

-- 3. Data migration — create an org for every existing user with projects
-- ------------------------------------------------------------

DO $$
DECLARE
  rec RECORD;
  new_org_id uuid;
  user_name text;
  user_slug text;
BEGIN
  FOR rec IN
    SELECT DISTINCT p.user_id, u.raw_user_meta_data->>'full_name' AS full_name, u.email
    FROM projects p
    JOIN auth.users u ON u.id = p.user_id
    WHERE p.org_id IS NULL
  LOOP
    user_name := COALESCE(NULLIF(rec.full_name, ''), split_part(rec.email, '@', 1));
    user_slug := lower(regexp_replace(user_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8);

    INSERT INTO organizations (name, slug, created_by)
    VALUES (user_name || '''s Organization', user_slug, rec.user_id)
    RETURNING id INTO new_org_id;

    INSERT INTO organization_members (org_id, user_id, role)
    VALUES (new_org_id, rec.user_id, 'owner');

    UPDATE projects SET org_id = new_org_id WHERE user_id = rec.user_id AND org_id IS NULL;
    UPDATE equipment_library SET org_id = new_org_id WHERE user_id = rec.user_id AND org_id IS NULL;

    INSERT INTO user_preferences (user_id, active_org_id)
    VALUES (rec.user_id, new_org_id)
    ON CONFLICT (user_id) DO UPDATE SET active_org_id = new_org_id;
  END LOOP;
END;
$$;

-- 4. Enforce NOT NULL after migration
-- ------------------------------------------------------------

ALTER TABLE projects ALTER COLUMN org_id SET NOT NULL;

-- 5. Indexes
-- ------------------------------------------------------------

CREATE INDEX idx_org_members_user   ON organization_members(user_id);
CREATE INDEX idx_org_members_org    ON organization_members(org_id);
CREATE INDEX idx_projects_org       ON projects(org_id);
CREATE INDEX idx_equip_org          ON equipment_library(org_id);
CREATE INDEX idx_invites_email      ON organization_invites(email);
CREATE INDEX idx_invites_token      ON organization_invites(token);

-- 6. RLS Policies
-- ------------------------------------------------------------

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;

-- organizations: read if you are a member
CREATE POLICY org_select ON organizations FOR SELECT USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = organizations.id AND user_id = auth.uid())
);
CREATE POLICY org_insert ON organizations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY org_update ON organizations FOR UPDATE USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = organizations.id AND user_id = auth.uid() AND role IN ('owner','admin'))
);
CREATE POLICY org_delete ON organizations FOR DELETE USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = organizations.id AND user_id = auth.uid() AND role = 'owner')
);

-- organization_members: read if you are in the same org
CREATE POLICY om_select ON organization_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM organization_members om2 WHERE om2.org_id = organization_members.org_id AND om2.user_id = auth.uid())
);
CREATE POLICY om_insert ON organization_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM organization_members om2 WHERE om2.org_id = organization_members.org_id AND om2.user_id = auth.uid() AND om2.role IN ('owner','admin'))
);
CREATE POLICY om_delete ON organization_members FOR DELETE USING (
  -- admin/owner can remove, or you can remove yourself
  organization_members.user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM organization_members om2 WHERE om2.org_id = organization_members.org_id AND om2.user_id = auth.uid() AND om2.role IN ('owner','admin'))
);
CREATE POLICY om_update ON organization_members FOR UPDATE USING (
  EXISTS (SELECT 1 FROM organization_members om2 WHERE om2.org_id = organization_members.org_id AND om2.user_id = auth.uid() AND om2.role = 'owner')
);

-- organization_invites: visible to org admin/owner or the invited email
CREATE POLICY oi_select ON organization_invites FOR SELECT USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = organization_invites.org_id AND user_id = auth.uid() AND role IN ('owner','admin'))
  OR organization_invites.email = (SELECT email FROM auth.users WHERE id = auth.uid())
);
CREATE POLICY oi_insert ON organization_invites FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = organization_invites.org_id AND user_id = auth.uid() AND role IN ('owner','admin'))
);
CREATE POLICY oi_update ON organization_invites FOR UPDATE USING (
  -- the invited user can accept, or admin can revoke
  organization_invites.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM organization_members WHERE org_id = organization_invites.org_id AND user_id = auth.uid() AND role IN ('owner','admin'))
);
CREATE POLICY oi_delete ON organization_invites FOR DELETE USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = organization_invites.org_id AND user_id = auth.uid() AND role IN ('owner','admin'))
);

-- Update projects RLS: allow access if user is member of the project's org
DROP POLICY IF EXISTS projects_select ON projects;
DROP POLICY IF EXISTS projects_insert ON projects;
DROP POLICY IF EXISTS projects_update ON projects;
DROP POLICY IF EXISTS projects_delete ON projects;

CREATE POLICY projects_select ON projects FOR SELECT USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = projects.org_id AND user_id = auth.uid())
);
CREATE POLICY projects_insert ON projects FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = projects.org_id AND user_id = auth.uid())
);
CREATE POLICY projects_update ON projects FOR UPDATE USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = projects.org_id AND user_id = auth.uid())
);
CREATE POLICY projects_delete ON projects FOR DELETE USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = projects.org_id AND user_id = auth.uid())
);

-- Update equipment_library RLS
DROP POLICY IF EXISTS equip_select ON equipment_library;
DROP POLICY IF EXISTS equip_insert ON equipment_library;
DROP POLICY IF EXISTS equip_update ON equipment_library;
DROP POLICY IF EXISTS equip_delete ON equipment_library;

CREATE POLICY equip_select ON equipment_library FOR SELECT USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = equipment_library.org_id AND user_id = auth.uid())
);
CREATE POLICY equip_insert ON equipment_library FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = equipment_library.org_id AND user_id = auth.uid())
);
CREATE POLICY equip_update ON equipment_library FOR UPDATE USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = equipment_library.org_id AND user_id = auth.uid())
);
CREATE POLICY equip_delete ON equipment_library FOR DELETE USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = equipment_library.org_id AND user_id = auth.uid())
);

-- 7. Trigger: auto-create org on user signup
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

  INSERT INTO public.organizations (name, slug, created_by)
  VALUES (user_name || '''s Organization', user_slug, NEW.id)
  RETURNING id INTO new_org_id;

  INSERT INTO public.organization_members (org_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

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

DROP TRIGGER IF EXISTS on_auth_user_created_org ON auth.users;
CREATE TRIGGER on_auth_user_created_org
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_org();
