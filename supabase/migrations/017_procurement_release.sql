-- Procurement Redesign: release-gated vendor purchasing.
--
-- Replaces the per-project JSONB `procurement` blob (still present, no
-- longer written to) with a real relational model so procurement can be
-- queried across the whole org (dashboard), carry a genuine order lifecycle,
-- and keep a permanent history instead of being silently overwritten.
--
-- Core rule: procurement never starts by re-entering a BOM. A released_orders
-- row is only created by the manual "Release Order" action, which snapshots
-- the project's approved proposal into procurement_items. Everything else
-- (POs, shipments, receiving, exceptions) operates against that baseline.

-- ============================================================
-- 1. Vendors — org-level, shared across every project (like equipment_library)
-- ============================================================
CREATE TABLE IF NOT EXISTS vendors (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name           TEXT NOT NULL DEFAULT '',
  contact_name   TEXT NOT NULL DEFAULT '',
  email          TEXT NOT NULL DEFAULT '',
  phone          TEXT NOT NULL DEFAULT '',
  account_number TEXT NOT NULL DEFAULT '',
  payment_terms  TEXT NOT NULL DEFAULT 'Net 30',
  lead_time      TEXT NOT NULL DEFAULT '',
  address        TEXT NOT NULL DEFAULT '',
  website        TEXT NOT NULL DEFAULT '',
  notes          TEXT NOT NULL DEFAULT '',
  -- Manufacturers this vendor represents, so released BOM lines can be
  -- auto-grouped into suggested PO drafts instead of requiring every line
  -- to be hand-assigned to a vendor first.
  manufacturers  TEXT[] NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendors_org ON vendors(org_id);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY vendors_select ON vendors FOR SELECT USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = vendors.org_id AND user_id = auth.uid())
);
CREATE POLICY vendors_insert ON vendors FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = vendors.org_id AND user_id = auth.uid())
);
CREATE POLICY vendors_update ON vendors FOR UPDATE USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = vendors.org_id AND user_id = auth.uid())
);
CREATE POLICY vendors_delete ON vendors FOR DELETE USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = vendors.org_id AND user_id = auth.uid())
);

-- Sequential, human-readable order/PO numbers (AVF-10284, PO-3001) shared
-- across the whole database rather than per-org, which is fine at this
-- scale and avoids a per-org counter row to maintain.
CREATE SEQUENCE IF NOT EXISTS released_order_number_seq START 10001;
CREATE SEQUENCE IF NOT EXISTS vendor_po_number_seq START 3001;

CREATE OR REPLACE FUNCTION next_released_order_number()
RETURNS text LANGUAGE sql AS $$
  SELECT 'AVF-' || nextval('released_order_number_seq')::text;
$$;

CREATE OR REPLACE FUNCTION next_po_number()
RETURNS text LANGUAGE sql AS $$
  SELECT 'PO-' || nextval('vendor_po_number_seq')::text;
$$;

-- ============================================================
-- 2. Released Orders — the manual release event / procurement baseline
-- ============================================================
CREATE TABLE IF NOT EXISTS released_orders (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id              UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Frozen copy of proposals.data at the moment of release. AVForge doesn't
  -- version proposals today, so this snapshot is what stands in for "the
  -- exact approved proposal revision" — the released BOM is generated from
  -- this, never from a live re-read of the (possibly since-edited) proposal.
  proposal_snapshot       JSONB NOT NULL DEFAULT '{}'::jsonb,

  status                  TEXT NOT NULL DEFAULT 'released'
                            CHECK (status IN ('released','procurement_in_progress','partially_received','fully_received','closed','cancelled')),

  order_number            TEXT NOT NULL,
  customer_po_number      TEXT NOT NULL DEFAULT '',
  customer_po_amount      NUMERIC(12,2),
  customer_po_reference   TEXT NOT NULL DEFAULT '', -- reference/URL to signed doc; no file upload in MVP
  signed_order_value      NUMERIC(12,2),

  salesperson             TEXT NOT NULL DEFAULT '',
  project_manager         TEXT NOT NULL DEFAULT '',

  requested_install_date  DATE,
  required_material_date  DATE,

  bill_to                 TEXT NOT NULL DEFAULT '',
  ship_to                 TEXT NOT NULL DEFAULT '',
  tax_status              TEXT NOT NULL DEFAULT 'Taxable',
  payment_terms           TEXT NOT NULL DEFAULT 'Net 30',

  release_notes           TEXT NOT NULL DEFAULT '',
  released_by             UUID REFERENCES auth.users(id),
  released_by_name        TEXT NOT NULL DEFAULT '',
  released_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (project_id)
);

CREATE INDEX IF NOT EXISTS idx_released_orders_org ON released_orders(org_id);
CREATE INDEX IF NOT EXISTS idx_released_orders_status ON released_orders(status);

ALTER TABLE released_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY released_orders_select ON released_orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = released_orders.org_id AND user_id = auth.uid())
);
CREATE POLICY released_orders_insert ON released_orders FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = released_orders.org_id AND user_id = auth.uid())
);
CREATE POLICY released_orders_update ON released_orders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = released_orders.org_id AND user_id = auth.uid())
);
CREATE POLICY released_orders_delete ON released_orders FOR DELETE USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = released_orders.org_id AND user_id = auth.uid())
);

-- ============================================================
-- 3. Procurement Items — the released BOM (one row per proposal line item)
-- ============================================================
CREATE TABLE IF NOT EXISTS procurement_items (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  released_order_id       UUID NOT NULL REFERENCES released_orders(id) ON DELETE CASCADE,
  org_id                  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  manufacturer            TEXT NOT NULL DEFAULT '',
  model                   TEXT NOT NULL DEFAULT '',
  description             TEXT NOT NULL DEFAULT '',
  category                TEXT NOT NULL DEFAULT '',
  qty                     NUMERIC(10,2) NOT NULL DEFAULT 0,

  sell_price              NUMERIC(12,2) NOT NULL DEFAULT 0,   -- unit sell price, frozen at release
  estimated_unit_cost     NUMERIC(12,2) NOT NULL DEFAULT 0,   -- unit cost, frozen at release

  preferred_vendor_id     UUID REFERENCES vendors(id) ON DELETE SET NULL,
  vendor_sku              TEXT NOT NULL DEFAULT '',

  required_date           DATE,
  expected_ship_date      DATE,
  expected_delivery_date  DATE,

  ordered_qty             NUMERIC(10,2) NOT NULL DEFAULT 0,
  acknowledged_qty        NUMERIC(10,2) NOT NULL DEFAULT 0,
  received_qty            NUMERIC(10,2) NOT NULL DEFAULT 0,

  status                  TEXT NOT NULL DEFAULT 'ready_to_order'
                            CHECK (status IN ('ready_to_order','po_draft','po_issued','acknowledged','partial_shipment','shipped','partially_received','received','backordered','cancelled','substituted','on_hold')),

  critical_for_installation BOOLEAN NOT NULL DEFAULT false,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_procurement_items_order ON procurement_items(released_order_id);
CREATE INDEX IF NOT EXISTS idx_procurement_items_org ON procurement_items(org_id);
CREATE INDEX IF NOT EXISTS idx_procurement_items_vendor ON procurement_items(preferred_vendor_id);
CREATE INDEX IF NOT EXISTS idx_procurement_items_status ON procurement_items(status);

ALTER TABLE procurement_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY procurement_items_select ON procurement_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = procurement_items.org_id AND user_id = auth.uid())
);
CREATE POLICY procurement_items_insert ON procurement_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = procurement_items.org_id AND user_id = auth.uid())
);
CREATE POLICY procurement_items_update ON procurement_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = procurement_items.org_id AND user_id = auth.uid())
);
CREATE POLICY procurement_items_delete ON procurement_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = procurement_items.org_id AND user_id = auth.uid())
);

-- ============================================================
-- 4. Vendor Purchase Orders (+ acknowledgement header fields — MVP only
--    needs one acknowledgement per PO, not a repeatable history)
-- ============================================================
CREATE TABLE IF NOT EXISTS vendor_purchase_orders (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  released_order_id       UUID NOT NULL REFERENCES released_orders(id) ON DELETE CASCADE,
  org_id                  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id               UUID REFERENCES vendors(id) ON DELETE SET NULL,

  po_number               TEXT NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','ready_for_review','approved','issued','acknowledged','partially_shipped','shipped','partially_received','received','closed','cancelled')),

  po_date                 DATE NOT NULL DEFAULT CURRENT_DATE,
  required_delivery_date  DATE,
  ship_to                 TEXT NOT NULL DEFAULT '',
  shipping_instructions   TEXT NOT NULL DEFAULT '',
  payment_terms           TEXT NOT NULL DEFAULT '',
  freight_terms           TEXT NOT NULL DEFAULT '',
  tax                     NUMERIC(12,2) NOT NULL DEFAULT 0,
  freight                 NUMERIC(12,2) NOT NULL DEFAULT 0,
  internal_notes          TEXT NOT NULL DEFAULT '',
  vendor_notes            TEXT NOT NULL DEFAULT '',

  -- Vendor acknowledgement (header-level; per-line ack detail lives on vendor_po_lines)
  ack_vendor_order_number TEXT NOT NULL DEFAULT '',
  ack_date                DATE,
  ack_freight             NUMERIC(12,2),
  ack_notes               TEXT NOT NULL DEFAULT '',

  created_by              UUID REFERENCES auth.users(id),
  approved_by             UUID REFERENCES auth.users(id),
  issued_by               UUID REFERENCES auth.users(id),
  issued_at               TIMESTAMPTZ,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_pos_order ON vendor_purchase_orders(released_order_id);
CREATE INDEX IF NOT EXISTS idx_vendor_pos_org ON vendor_purchase_orders(org_id);
CREATE INDEX IF NOT EXISTS idx_vendor_pos_vendor ON vendor_purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_pos_status ON vendor_purchase_orders(status);

ALTER TABLE vendor_purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY vendor_pos_select ON vendor_purchase_orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = vendor_purchase_orders.org_id AND user_id = auth.uid())
);
CREATE POLICY vendor_pos_insert ON vendor_purchase_orders FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = vendor_purchase_orders.org_id AND user_id = auth.uid())
);
CREATE POLICY vendor_pos_update ON vendor_purchase_orders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = vendor_purchase_orders.org_id AND user_id = auth.uid())
);
CREATE POLICY vendor_pos_delete ON vendor_purchase_orders FOR DELETE USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = vendor_purchase_orders.org_id AND user_id = auth.uid())
);

-- ============================================================
-- 5. Vendor PO Lines — join between a PO and the procurement items on it
-- ============================================================
CREATE TABLE IF NOT EXISTS vendor_po_lines (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id                 UUID NOT NULL REFERENCES vendor_purchase_orders(id) ON DELETE CASCADE,
  procurement_item_id   UUID NOT NULL REFERENCES procurement_items(id) ON DELETE CASCADE,

  qty_ordered           NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit_cost             NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Vendor acknowledgement detail for this line
  ack_qty               NUMERIC(10,2),
  ack_unit_cost         NUMERIC(12,2),
  est_ship_date         DATE,
  est_delivery_date     DATE,
  backorder_date        DATE,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (po_id, procurement_item_id)
);

CREATE INDEX IF NOT EXISTS idx_po_lines_po ON vendor_po_lines(po_id);
CREATE INDEX IF NOT EXISTS idx_po_lines_item ON vendor_po_lines(procurement_item_id);

ALTER TABLE vendor_po_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY po_lines_select ON vendor_po_lines FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM vendor_purchase_orders po
    JOIN organization_members om ON om.org_id = po.org_id
    WHERE po.id = vendor_po_lines.po_id AND om.user_id = auth.uid()
  )
);
CREATE POLICY po_lines_insert ON vendor_po_lines FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM vendor_purchase_orders po
    JOIN organization_members om ON om.org_id = po.org_id
    WHERE po.id = vendor_po_lines.po_id AND om.user_id = auth.uid()
  )
);
CREATE POLICY po_lines_update ON vendor_po_lines FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM vendor_purchase_orders po
    JOIN organization_members om ON om.org_id = po.org_id
    WHERE po.id = vendor_po_lines.po_id AND om.user_id = auth.uid()
  )
);
CREATE POLICY po_lines_delete ON vendor_po_lines FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM vendor_purchase_orders po
    JOIN organization_members om ON om.org_id = po.org_id
    WHERE po.id = vendor_po_lines.po_id AND om.user_id = auth.uid()
  )
);

-- ============================================================
-- 6. Shipments (+ lines) — supports split shipments per PO line
-- ============================================================
CREATE TABLE IF NOT EXISTS shipments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id             UUID NOT NULL REFERENCES vendor_purchase_orders(id) ON DELETE CASCADE,
  carrier           TEXT NOT NULL DEFAULT '',
  tracking_number   TEXT NOT NULL DEFAULT '',
  ship_date         DATE,
  expected_delivery DATE,
  actual_delivery   DATE,
  notes             TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shipment_lines (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id         UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  vendor_po_line_id   UUID NOT NULL REFERENCES vendor_po_lines(id) ON DELETE CASCADE,
  qty_shipped         NUMERIC(10,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_shipments_po ON shipments(po_id);
CREATE INDEX IF NOT EXISTS idx_shipment_lines_shipment ON shipment_lines(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_lines_po_line ON shipment_lines(vendor_po_line_id);

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY shipments_select ON shipments FOR SELECT USING (
  EXISTS (SELECT 1 FROM vendor_purchase_orders po JOIN organization_members om ON om.org_id = po.org_id WHERE po.id = shipments.po_id AND om.user_id = auth.uid())
);
CREATE POLICY shipments_insert ON shipments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM vendor_purchase_orders po JOIN organization_members om ON om.org_id = po.org_id WHERE po.id = shipments.po_id AND om.user_id = auth.uid())
);
CREATE POLICY shipments_update ON shipments FOR UPDATE USING (
  EXISTS (SELECT 1 FROM vendor_purchase_orders po JOIN organization_members om ON om.org_id = po.org_id WHERE po.id = shipments.po_id AND om.user_id = auth.uid())
);
CREATE POLICY shipments_delete ON shipments FOR DELETE USING (
  EXISTS (SELECT 1 FROM vendor_purchase_orders po JOIN organization_members om ON om.org_id = po.org_id WHERE po.id = shipments.po_id AND om.user_id = auth.uid())
);

CREATE POLICY shipment_lines_select ON shipment_lines FOR SELECT USING (
  EXISTS (SELECT 1 FROM shipments s JOIN vendor_purchase_orders po ON po.id = s.po_id JOIN organization_members om ON om.org_id = po.org_id WHERE s.id = shipment_lines.shipment_id AND om.user_id = auth.uid())
);
CREATE POLICY shipment_lines_insert ON shipment_lines FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM shipments s JOIN vendor_purchase_orders po ON po.id = s.po_id JOIN organization_members om ON om.org_id = po.org_id WHERE s.id = shipment_lines.shipment_id AND om.user_id = auth.uid())
);
CREATE POLICY shipment_lines_update ON shipment_lines FOR UPDATE USING (
  EXISTS (SELECT 1 FROM shipments s JOIN vendor_purchase_orders po ON po.id = s.po_id JOIN organization_members om ON om.org_id = po.org_id WHERE s.id = shipment_lines.shipment_id AND om.user_id = auth.uid())
);
CREATE POLICY shipment_lines_delete ON shipment_lines FOR DELETE USING (
  EXISTS (SELECT 1 FROM shipments s JOIN vendor_purchase_orders po ON po.id = s.po_id JOIN organization_members om ON om.org_id = po.org_id WHERE s.id = shipment_lines.shipment_id AND om.user_id = auth.uid())
);

-- ============================================================
-- 7. Receiving Records (+ lines) — partial receiving, condition tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS receiving_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id         UUID NOT NULL REFERENCES vendor_purchase_orders(id) ON DELETE CASCADE,
  received_by   UUID REFERENCES auth.users(id),
  received_by_name TEXT NOT NULL DEFAULT '',
  received_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes         TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS receiving_record_lines (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receiving_record_id UUID NOT NULL REFERENCES receiving_records(id) ON DELETE CASCADE,
  vendor_po_line_id   UUID NOT NULL REFERENCES vendor_po_lines(id) ON DELETE CASCADE,
  qty_received        NUMERIC(10,2) NOT NULL DEFAULT 0,
  condition           TEXT NOT NULL DEFAULT 'good'
                        CHECK (condition IN ('good','damaged','wrong_item','short','over')),
  notes               TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_receiving_records_po ON receiving_records(po_id);
CREATE INDEX IF NOT EXISTS idx_receiving_lines_record ON receiving_record_lines(receiving_record_id);
CREATE INDEX IF NOT EXISTS idx_receiving_lines_po_line ON receiving_record_lines(vendor_po_line_id);

ALTER TABLE receiving_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE receiving_record_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY receiving_records_select ON receiving_records FOR SELECT USING (
  EXISTS (SELECT 1 FROM vendor_purchase_orders po JOIN organization_members om ON om.org_id = po.org_id WHERE po.id = receiving_records.po_id AND om.user_id = auth.uid())
);
CREATE POLICY receiving_records_insert ON receiving_records FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM vendor_purchase_orders po JOIN organization_members om ON om.org_id = po.org_id WHERE po.id = receiving_records.po_id AND om.user_id = auth.uid())
);
CREATE POLICY receiving_records_update ON receiving_records FOR UPDATE USING (
  EXISTS (SELECT 1 FROM vendor_purchase_orders po JOIN organization_members om ON om.org_id = po.org_id WHERE po.id = receiving_records.po_id AND om.user_id = auth.uid())
);
CREATE POLICY receiving_records_delete ON receiving_records FOR DELETE USING (
  EXISTS (SELECT 1 FROM vendor_purchase_orders po JOIN organization_members om ON om.org_id = po.org_id WHERE po.id = receiving_records.po_id AND om.user_id = auth.uid())
);

CREATE POLICY receiving_lines_select ON receiving_record_lines FOR SELECT USING (
  EXISTS (SELECT 1 FROM receiving_records r JOIN vendor_purchase_orders po ON po.id = r.po_id JOIN organization_members om ON om.org_id = po.org_id WHERE r.id = receiving_record_lines.receiving_record_id AND om.user_id = auth.uid())
);
CREATE POLICY receiving_lines_insert ON receiving_record_lines FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM receiving_records r JOIN vendor_purchase_orders po ON po.id = r.po_id JOIN organization_members om ON om.org_id = po.org_id WHERE r.id = receiving_record_lines.receiving_record_id AND om.user_id = auth.uid())
);
CREATE POLICY receiving_lines_update ON receiving_record_lines FOR UPDATE USING (
  EXISTS (SELECT 1 FROM receiving_records r JOIN vendor_purchase_orders po ON po.id = r.po_id JOIN organization_members om ON om.org_id = po.org_id WHERE r.id = receiving_record_lines.receiving_record_id AND om.user_id = auth.uid())
);
CREATE POLICY receiving_lines_delete ON receiving_record_lines FOR DELETE USING (
  EXISTS (SELECT 1 FROM receiving_records r JOIN vendor_purchase_orders po ON po.id = r.po_id JOIN organization_members om ON om.org_id = po.org_id WHERE r.id = receiving_record_lines.receiving_record_id AND om.user_id = auth.uid())
);

-- ============================================================
-- 8. Procurement Exceptions
-- ============================================================
CREATE TABLE IF NOT EXISTS procurement_exceptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  released_order_id   UUID NOT NULL REFERENCES released_orders(id) ON DELETE CASCADE,
  procurement_item_id UUID REFERENCES procurement_items(id) ON DELETE SET NULL,
  po_id               UUID REFERENCES vendor_purchase_orders(id) ON DELETE SET NULL,

  type                TEXT NOT NULL
                        CHECK (type IN ('cost_variance','quantity_variance','late_eta','backorder','discontinued','vendor_change','substitution_required','missing_ack','partial_shipment','damaged','missing_material','wrong_material')),
  severity            TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  description         TEXT NOT NULL DEFAULT '',
  owner               TEXT NOT NULL DEFAULT '',
  status              TEXT NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','investigating','waiting_on_vendor','waiting_on_sales','waiting_on_engineering','resolved')),
  required_action     TEXT NOT NULL DEFAULT '',
  resolution_notes    TEXT NOT NULL DEFAULT '',

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_exceptions_order ON procurement_exceptions(released_order_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_status ON procurement_exceptions(status);

ALTER TABLE procurement_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY exceptions_select ON procurement_exceptions FOR SELECT USING (
  EXISTS (SELECT 1 FROM released_orders ro JOIN organization_members om ON om.org_id = ro.org_id WHERE ro.id = procurement_exceptions.released_order_id AND om.user_id = auth.uid())
);
CREATE POLICY exceptions_insert ON procurement_exceptions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM released_orders ro JOIN organization_members om ON om.org_id = ro.org_id WHERE ro.id = procurement_exceptions.released_order_id AND om.user_id = auth.uid())
);
CREATE POLICY exceptions_update ON procurement_exceptions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM released_orders ro JOIN organization_members om ON om.org_id = ro.org_id WHERE ro.id = procurement_exceptions.released_order_id AND om.user_id = auth.uid())
);
CREATE POLICY exceptions_delete ON procurement_exceptions FOR DELETE USING (
  EXISTS (SELECT 1 FROM released_orders ro JOIN organization_members om ON om.org_id = ro.org_id WHERE ro.id = procurement_exceptions.released_order_id AND om.user_id = auth.uid())
);

-- ============================================================
-- 9. Procurement Activity Log — append-only audit trail
-- ============================================================
CREATE TABLE IF NOT EXISTS procurement_activity_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  released_order_id   UUID NOT NULL REFERENCES released_orders(id) ON DELETE CASCADE,
  event_type          TEXT NOT NULL,
  description         TEXT NOT NULL DEFAULT '',
  actor_id            UUID REFERENCES auth.users(id),
  actor_name          TEXT NOT NULL DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_order ON procurement_activity_log(released_order_id, created_at DESC);

ALTER TABLE procurement_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY activity_log_select ON procurement_activity_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM released_orders ro JOIN organization_members om ON om.org_id = ro.org_id WHERE ro.id = procurement_activity_log.released_order_id AND om.user_id = auth.uid())
);
CREATE POLICY activity_log_insert ON procurement_activity_log FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM released_orders ro JOIN organization_members om ON om.org_id = ro.org_id WHERE ro.id = procurement_activity_log.released_order_id AND om.user_id = auth.uid())
);
-- No update/delete policies: activity log is append-only by design.
