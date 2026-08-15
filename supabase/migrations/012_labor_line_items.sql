-- ============================================================
-- AVForge: Dynamic Labor Line Items
-- ============================================================
-- Replaces the fixed 6-slot labor rate/cost columns with a
-- flexible list so orgs can add, rename, and remove labor types.
-- Run 011_organization_details.sql before this file.
--
-- Note: this does NOT backfill from engineering_rate/installation_rate/
-- etc. (added by 004_labor_rates.sql) — those columns turned out to
-- never have been created on this database, so there's nothing to
-- carry over. Only the custom labels from labor_rate_labels (011) are
-- preserved; rates/costs start at 0.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS labor_line_items jsonb;

UPDATE organizations
SET labor_line_items = jsonb_build_array(
  jsonb_build_object('key', 'engineering', 'label', COALESCE(labor_rate_labels->>'engineering', 'Engineering'), 'rate', 0, 'cost', 0),
  jsonb_build_object('key', 'installation', 'label', COALESCE(labor_rate_labels->>'installation', 'Installation'), 'rate', 0, 'cost', 0),
  jsonb_build_object('key', 'project_mgmt', 'label', COALESCE(labor_rate_labels->>'project_mgmt', 'Project Mgmt'), 'rate', 0, 'cost', 0),
  jsonb_build_object('key', 'project_coord', 'label', COALESCE(labor_rate_labels->>'project_coord', 'Project Coord'), 'rate', 0, 'cost', 0),
  jsonb_build_object('key', 'programming', 'label', COALESCE(labor_rate_labels->>'programming', 'Programming'), 'rate', 0, 'cost', 0),
  jsonb_build_object('key', 'field_engineering', 'label', COALESCE(labor_rate_labels->>'field_engineering', 'Field Engineering'), 'rate', 0, 'cost', 0)
)
WHERE labor_line_items IS NULL;

ALTER TABLE organizations
  ALTER COLUMN labor_line_items SET DEFAULT '[
    {"key":"engineering","label":"Engineering","rate":0,"cost":0},
    {"key":"installation","label":"Installation","rate":0,"cost":0},
    {"key":"project_mgmt","label":"Project Mgmt","rate":0,"cost":0},
    {"key":"project_coord","label":"Project Coord","rate":0,"cost":0},
    {"key":"programming","label":"Programming","rate":0,"cost":0},
    {"key":"field_engineering","label":"Field Engineering","rate":0,"cost":0}
  ]'::jsonb;
