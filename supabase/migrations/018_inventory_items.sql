-- Physical stock Inventory — org-level, like equipment_library/vendors.
--
-- Previously the "Inventory" tab on the Library page was pure client-side
-- demo state (SAMPLE_ITEMS), never persisted, resetting on every reload —
-- and the "Old Inventory Review" widget on the same page showed entirely
-- fabricated products/ages/status labels with no data behind them at all.
-- This table makes physical stock real, and created_at gives "Old Inventory
-- Review" a genuine, honest signal (time since added) to sort by.

CREATE TABLE IF NOT EXISTS inventory_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id),
  name           TEXT NOT NULL DEFAULT '',
  brand          TEXT NOT NULL DEFAULT '',
  model          TEXT NOT NULL DEFAULT '',
  category       TEXT NOT NULL DEFAULT 'Other',
  quantity       INTEGER NOT NULL DEFAULT 1,
  location       TEXT NOT NULL DEFAULT '',
  condition      TEXT NOT NULL DEFAULT 'Good' CHECK (condition IN ('New','Good','Fair','Poor')),
  serial_number  TEXT NOT NULL DEFAULT '',
  notes          TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_org ON inventory_items(org_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_created ON inventory_items(created_at);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventory_items_select ON inventory_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = inventory_items.org_id AND user_id = auth.uid())
);
CREATE POLICY inventory_items_insert ON inventory_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = inventory_items.org_id AND user_id = auth.uid())
);
CREATE POLICY inventory_items_update ON inventory_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = inventory_items.org_id AND user_id = auth.uid())
);
CREATE POLICY inventory_items_delete ON inventory_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = inventory_items.org_id AND user_id = auth.uid())
);
