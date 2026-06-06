-- ============================================================
-- AVForge: Add department/team role to members and invites
-- ============================================================

ALTER TABLE organization_members
  ADD COLUMN IF NOT EXISTS department text DEFAULT 'Sales';

ALTER TABLE organization_invites
  ADD COLUMN IF NOT EXISTS department text DEFAULT 'Sales';
