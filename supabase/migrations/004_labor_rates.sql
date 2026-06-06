-- ============================================================
-- AVForge: Labor Rates & Costs on Organizations
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS engineering_rate    numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS installation_rate   numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS project_mgmt_rate    numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS programming_rate    numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS field_engineering_rate numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engineering_cost    numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS installation_cost   numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS project_mgmt_cost    numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS programming_cost    numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS field_engineering_cost numeric(10,2) DEFAULT 0;
