-- ============================================================
-- AVForge: Organization Member Roles
-- ============================================================
-- Makes the "role" list (Sales Executive, Field Engineer, etc.)
-- used when inviting members and assigning project Team Members
-- editable per-organization instead of a hardcoded constant.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS member_roles jsonb DEFAULT '[
    "Sales Executive",
    "Pre Sales Engineer",
    "Post Sales Engineer",
    "Field Engineer",
    "Installer",
    "Programmer",
    "Project Coordinator",
    "Project Manager",
    "Engineering Manager",
    "Sales Manager"
  ]'::jsonb;

UPDATE organizations
SET member_roles = '[
    "Sales Executive",
    "Pre Sales Engineer",
    "Post Sales Engineer",
    "Field Engineer",
    "Installer",
    "Programmer",
    "Project Coordinator",
    "Project Manager",
    "Engineering Manager",
    "Sales Manager"
  ]'::jsonb
WHERE member_roles IS NULL;
