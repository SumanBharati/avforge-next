-- Project Team assignments — one row per (project, role) slot.
--
-- This table is referenced by app/projects/[id]/page.tsx's "Team Members"
-- section, but no migration for it was ever committed, so it never actually
-- existed in the database — every assignment there was silently failing
-- (the insert errored, and the calling code only checked the success path).
-- This creates it for real, and from the start supports both:
--   - a real org member (member_id -> organization_members), and
--   - an external resource from the org's Schedule tool (person_id — a
--     Person that lives in org_project_management -> data.people[], not a
--     relational table, so person_id is a plain identifier, not an FK).

CREATE TABLE IF NOT EXISTS project_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  member_id   UUID REFERENCES organization_members(id) ON DELETE CASCADE,
  person_id   TEXT,
  role        TEXT NOT NULL,
  full_name   TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT project_members_identity_check CHECK (member_id IS NOT NULL OR person_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_project_members_org ON project_members(org_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_members_select ON project_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = project_members.org_id AND user_id = auth.uid())
);
CREATE POLICY project_members_insert ON project_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = project_members.org_id AND user_id = auth.uid())
);
CREATE POLICY project_members_update ON project_members FOR UPDATE USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = project_members.org_id AND user_id = auth.uid())
);
CREATE POLICY project_members_delete ON project_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = project_members.org_id AND user_id = auth.uid())
);
