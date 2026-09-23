-- AVGenix: close the Pro paywall bypass. Migration 022 added has_pro_access()
-- and applied it to projects/project_members, but every other Pro-gated
-- feature (Procurement, Project Management/Schedule, Time Tracking, Board,
-- Inventory, Library/equipment) was left on membership-only RLS. That meant
-- an org with no subscription and an expired trial was blocked by the
-- client-side ProGate UI but could still read/write that data directly via
-- the Supabase client. This migration brings every remaining Pro table's
-- RLS in line with has_pro_access(org_id).

-- ============================================================
-- project_management (project_id -> projects.org_id)
-- ============================================================
DROP POLICY IF EXISTS "Users can view project_management for their org projects" ON project_management;
DROP POLICY IF EXISTS "Users can insert project_management for their org projects" ON project_management;
DROP POLICY IF EXISTS "Users can update project_management for their org projects" ON project_management;
DROP POLICY IF EXISTS "Users can delete project_management for their org projects" ON project_management;

CREATE POLICY "Users can view project_management for their org projects"
  ON project_management FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_management.project_id AND public.has_pro_access(p.org_id))
  );
CREATE POLICY "Users can insert project_management for their org projects"
  ON project_management FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM projects p WHERE p.id = project_management.project_id AND public.has_pro_access(p.org_id))
  );
CREATE POLICY "Users can update project_management for their org projects"
  ON project_management FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_management.project_id AND public.has_pro_access(p.org_id))
  );
CREATE POLICY "Users can delete project_management for their org projects"
  ON project_management FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_management.project_id AND public.has_pro_access(p.org_id))
  );

-- ============================================================
-- procurement (legacy per-project JSONB blob; project_id -> projects.org_id)
-- ============================================================
DROP POLICY IF EXISTS "Users can view procurement for their org projects" ON procurement;
DROP POLICY IF EXISTS "Users can insert procurement for their org projects" ON procurement;
DROP POLICY IF EXISTS "Users can update procurement for their org projects" ON procurement;
DROP POLICY IF EXISTS "Users can delete procurement for their org projects" ON procurement;

CREATE POLICY "Users can view procurement for their org projects"
  ON procurement FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = procurement.project_id AND public.has_pro_access(p.org_id))
  );
CREATE POLICY "Users can insert procurement for their org projects"
  ON procurement FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM projects p WHERE p.id = procurement.project_id AND public.has_pro_access(p.org_id))
  );
CREATE POLICY "Users can update procurement for their org projects"
  ON procurement FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = procurement.project_id AND public.has_pro_access(p.org_id))
  );
CREATE POLICY "Users can delete procurement for their org projects"
  ON procurement FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = procurement.project_id AND public.has_pro_access(p.org_id))
  );

-- ============================================================
-- org_project_management (org_id direct — Schedule/Time Tracking/Board)
-- ============================================================
DROP POLICY IF EXISTS "Members can view org_project_management" ON org_project_management;
DROP POLICY IF EXISTS "Members can insert org_project_management" ON org_project_management;
DROP POLICY IF EXISTS "Members can update org_project_management" ON org_project_management;
DROP POLICY IF EXISTS "Members can delete org_project_management" ON org_project_management;

CREATE POLICY "Members can view org_project_management"
  ON org_project_management FOR SELECT
  USING (public.has_pro_access(org_id));
CREATE POLICY "Members can insert org_project_management"
  ON org_project_management FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.has_pro_access(org_id));
CREATE POLICY "Members can update org_project_management"
  ON org_project_management FOR UPDATE
  USING (public.has_pro_access(org_id));
CREATE POLICY "Members can delete org_project_management"
  ON org_project_management FOR DELETE
  USING (public.has_pro_access(org_id));

-- ============================================================
-- inventory_items (org_id direct)
-- ============================================================
DROP POLICY IF EXISTS inventory_items_select ON inventory_items;
DROP POLICY IF EXISTS inventory_items_insert ON inventory_items;
DROP POLICY IF EXISTS inventory_items_update ON inventory_items;
DROP POLICY IF EXISTS inventory_items_delete ON inventory_items;

CREATE POLICY inventory_items_select ON inventory_items FOR SELECT USING (public.has_pro_access(org_id));
CREATE POLICY inventory_items_insert ON inventory_items FOR INSERT WITH CHECK (public.has_pro_access(org_id));
CREATE POLICY inventory_items_update ON inventory_items FOR UPDATE USING (public.has_pro_access(org_id));
CREATE POLICY inventory_items_delete ON inventory_items FOR DELETE USING (public.has_pro_access(org_id));

-- ============================================================
-- equipment_library (org_id direct — backs Library/rack-planner/proposal)
-- ============================================================
DROP POLICY IF EXISTS equip_select ON equipment_library;
DROP POLICY IF EXISTS equip_insert ON equipment_library;
DROP POLICY IF EXISTS equip_update ON equipment_library;
DROP POLICY IF EXISTS equip_delete ON equipment_library;

CREATE POLICY equip_select ON equipment_library FOR SELECT USING (public.has_pro_access(org_id));
CREATE POLICY equip_insert ON equipment_library FOR INSERT WITH CHECK (public.has_pro_access(org_id));
CREATE POLICY equip_update ON equipment_library FOR UPDATE USING (public.has_pro_access(org_id));
CREATE POLICY equip_delete ON equipment_library FOR DELETE USING (public.has_pro_access(org_id));

-- ============================================================
-- Procurement Redesign (017_procurement_release.sql) — org_id-direct tables
-- ============================================================
DROP POLICY IF EXISTS vendors_select ON vendors;
DROP POLICY IF EXISTS vendors_insert ON vendors;
DROP POLICY IF EXISTS vendors_update ON vendors;
DROP POLICY IF EXISTS vendors_delete ON vendors;

CREATE POLICY vendors_select ON vendors FOR SELECT USING (public.has_pro_access(org_id));
CREATE POLICY vendors_insert ON vendors FOR INSERT WITH CHECK (public.has_pro_access(org_id));
CREATE POLICY vendors_update ON vendors FOR UPDATE USING (public.has_pro_access(org_id));
CREATE POLICY vendors_delete ON vendors FOR DELETE USING (public.has_pro_access(org_id));

DROP POLICY IF EXISTS released_orders_select ON released_orders;
DROP POLICY IF EXISTS released_orders_insert ON released_orders;
DROP POLICY IF EXISTS released_orders_update ON released_orders;
DROP POLICY IF EXISTS released_orders_delete ON released_orders;

CREATE POLICY released_orders_select ON released_orders FOR SELECT USING (public.has_pro_access(org_id));
CREATE POLICY released_orders_insert ON released_orders FOR INSERT WITH CHECK (public.has_pro_access(org_id));
CREATE POLICY released_orders_update ON released_orders FOR UPDATE USING (public.has_pro_access(org_id));
CREATE POLICY released_orders_delete ON released_orders FOR DELETE USING (public.has_pro_access(org_id));

DROP POLICY IF EXISTS procurement_items_select ON procurement_items;
DROP POLICY IF EXISTS procurement_items_insert ON procurement_items;
DROP POLICY IF EXISTS procurement_items_update ON procurement_items;
DROP POLICY IF EXISTS procurement_items_delete ON procurement_items;

CREATE POLICY procurement_items_select ON procurement_items FOR SELECT USING (public.has_pro_access(org_id));
CREATE POLICY procurement_items_insert ON procurement_items FOR INSERT WITH CHECK (public.has_pro_access(org_id));
CREATE POLICY procurement_items_update ON procurement_items FOR UPDATE USING (public.has_pro_access(org_id));
CREATE POLICY procurement_items_delete ON procurement_items FOR DELETE USING (public.has_pro_access(org_id));

DROP POLICY IF EXISTS vendor_pos_select ON vendor_purchase_orders;
DROP POLICY IF EXISTS vendor_pos_insert ON vendor_purchase_orders;
DROP POLICY IF EXISTS vendor_pos_update ON vendor_purchase_orders;
DROP POLICY IF EXISTS vendor_pos_delete ON vendor_purchase_orders;

CREATE POLICY vendor_pos_select ON vendor_purchase_orders FOR SELECT USING (public.has_pro_access(org_id));
CREATE POLICY vendor_pos_insert ON vendor_purchase_orders FOR INSERT WITH CHECK (public.has_pro_access(org_id));
CREATE POLICY vendor_pos_update ON vendor_purchase_orders FOR UPDATE USING (public.has_pro_access(org_id));
CREATE POLICY vendor_pos_delete ON vendor_purchase_orders FOR DELETE USING (public.has_pro_access(org_id));

-- ============================================================
-- Procurement Redesign — tables reached via a join to org_id
-- ============================================================
DROP POLICY IF EXISTS po_lines_select ON vendor_po_lines;
DROP POLICY IF EXISTS po_lines_insert ON vendor_po_lines;
DROP POLICY IF EXISTS po_lines_update ON vendor_po_lines;
DROP POLICY IF EXISTS po_lines_delete ON vendor_po_lines;

CREATE POLICY po_lines_select ON vendor_po_lines FOR SELECT USING (
  EXISTS (SELECT 1 FROM vendor_purchase_orders po WHERE po.id = vendor_po_lines.po_id AND public.has_pro_access(po.org_id))
);
CREATE POLICY po_lines_insert ON vendor_po_lines FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM vendor_purchase_orders po WHERE po.id = vendor_po_lines.po_id AND public.has_pro_access(po.org_id))
);
CREATE POLICY po_lines_update ON vendor_po_lines FOR UPDATE USING (
  EXISTS (SELECT 1 FROM vendor_purchase_orders po WHERE po.id = vendor_po_lines.po_id AND public.has_pro_access(po.org_id))
);
CREATE POLICY po_lines_delete ON vendor_po_lines FOR DELETE USING (
  EXISTS (SELECT 1 FROM vendor_purchase_orders po WHERE po.id = vendor_po_lines.po_id AND public.has_pro_access(po.org_id))
);

DROP POLICY IF EXISTS shipments_select ON shipments;
DROP POLICY IF EXISTS shipments_insert ON shipments;
DROP POLICY IF EXISTS shipments_update ON shipments;
DROP POLICY IF EXISTS shipments_delete ON shipments;

CREATE POLICY shipments_select ON shipments FOR SELECT USING (
  EXISTS (SELECT 1 FROM vendor_purchase_orders po WHERE po.id = shipments.po_id AND public.has_pro_access(po.org_id))
);
CREATE POLICY shipments_insert ON shipments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM vendor_purchase_orders po WHERE po.id = shipments.po_id AND public.has_pro_access(po.org_id))
);
CREATE POLICY shipments_update ON shipments FOR UPDATE USING (
  EXISTS (SELECT 1 FROM vendor_purchase_orders po WHERE po.id = shipments.po_id AND public.has_pro_access(po.org_id))
);
CREATE POLICY shipments_delete ON shipments FOR DELETE USING (
  EXISTS (SELECT 1 FROM vendor_purchase_orders po WHERE po.id = shipments.po_id AND public.has_pro_access(po.org_id))
);

DROP POLICY IF EXISTS shipment_lines_select ON shipment_lines;
DROP POLICY IF EXISTS shipment_lines_insert ON shipment_lines;
DROP POLICY IF EXISTS shipment_lines_update ON shipment_lines;
DROP POLICY IF EXISTS shipment_lines_delete ON shipment_lines;

CREATE POLICY shipment_lines_select ON shipment_lines FOR SELECT USING (
  EXISTS (SELECT 1 FROM shipments s JOIN vendor_purchase_orders po ON po.id = s.po_id WHERE s.id = shipment_lines.shipment_id AND public.has_pro_access(po.org_id))
);
CREATE POLICY shipment_lines_insert ON shipment_lines FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM shipments s JOIN vendor_purchase_orders po ON po.id = s.po_id WHERE s.id = shipment_lines.shipment_id AND public.has_pro_access(po.org_id))
);
CREATE POLICY shipment_lines_update ON shipment_lines FOR UPDATE USING (
  EXISTS (SELECT 1 FROM shipments s JOIN vendor_purchase_orders po ON po.id = s.po_id WHERE s.id = shipment_lines.shipment_id AND public.has_pro_access(po.org_id))
);
CREATE POLICY shipment_lines_delete ON shipment_lines FOR DELETE USING (
  EXISTS (SELECT 1 FROM shipments s JOIN vendor_purchase_orders po ON po.id = s.po_id WHERE s.id = shipment_lines.shipment_id AND public.has_pro_access(po.org_id))
);

DROP POLICY IF EXISTS receiving_records_select ON receiving_records;
DROP POLICY IF EXISTS receiving_records_insert ON receiving_records;
DROP POLICY IF EXISTS receiving_records_update ON receiving_records;
DROP POLICY IF EXISTS receiving_records_delete ON receiving_records;

CREATE POLICY receiving_records_select ON receiving_records FOR SELECT USING (
  EXISTS (SELECT 1 FROM vendor_purchase_orders po WHERE po.id = receiving_records.po_id AND public.has_pro_access(po.org_id))
);
CREATE POLICY receiving_records_insert ON receiving_records FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM vendor_purchase_orders po WHERE po.id = receiving_records.po_id AND public.has_pro_access(po.org_id))
);
CREATE POLICY receiving_records_update ON receiving_records FOR UPDATE USING (
  EXISTS (SELECT 1 FROM vendor_purchase_orders po WHERE po.id = receiving_records.po_id AND public.has_pro_access(po.org_id))
);
CREATE POLICY receiving_records_delete ON receiving_records FOR DELETE USING (
  EXISTS (SELECT 1 FROM vendor_purchase_orders po WHERE po.id = receiving_records.po_id AND public.has_pro_access(po.org_id))
);

DROP POLICY IF EXISTS receiving_lines_select ON receiving_record_lines;
DROP POLICY IF EXISTS receiving_lines_insert ON receiving_record_lines;
DROP POLICY IF EXISTS receiving_lines_update ON receiving_record_lines;
DROP POLICY IF EXISTS receiving_lines_delete ON receiving_record_lines;

CREATE POLICY receiving_lines_select ON receiving_record_lines FOR SELECT USING (
  EXISTS (SELECT 1 FROM receiving_records r JOIN vendor_purchase_orders po ON po.id = r.po_id WHERE r.id = receiving_record_lines.receiving_record_id AND public.has_pro_access(po.org_id))
);
CREATE POLICY receiving_lines_insert ON receiving_record_lines FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM receiving_records r JOIN vendor_purchase_orders po ON po.id = r.po_id WHERE r.id = receiving_record_lines.receiving_record_id AND public.has_pro_access(po.org_id))
);
CREATE POLICY receiving_lines_update ON receiving_record_lines FOR UPDATE USING (
  EXISTS (SELECT 1 FROM receiving_records r JOIN vendor_purchase_orders po ON po.id = r.po_id WHERE r.id = receiving_record_lines.receiving_record_id AND public.has_pro_access(po.org_id))
);
CREATE POLICY receiving_lines_delete ON receiving_record_lines FOR DELETE USING (
  EXISTS (SELECT 1 FROM receiving_records r JOIN vendor_purchase_orders po ON po.id = r.po_id WHERE r.id = receiving_record_lines.receiving_record_id AND public.has_pro_access(po.org_id))
);

DROP POLICY IF EXISTS exceptions_select ON procurement_exceptions;
DROP POLICY IF EXISTS exceptions_insert ON procurement_exceptions;
DROP POLICY IF EXISTS exceptions_update ON procurement_exceptions;
DROP POLICY IF EXISTS exceptions_delete ON procurement_exceptions;

CREATE POLICY exceptions_select ON procurement_exceptions FOR SELECT USING (
  EXISTS (SELECT 1 FROM released_orders ro WHERE ro.id = procurement_exceptions.released_order_id AND public.has_pro_access(ro.org_id))
);
CREATE POLICY exceptions_insert ON procurement_exceptions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM released_orders ro WHERE ro.id = procurement_exceptions.released_order_id AND public.has_pro_access(ro.org_id))
);
CREATE POLICY exceptions_update ON procurement_exceptions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM released_orders ro WHERE ro.id = procurement_exceptions.released_order_id AND public.has_pro_access(ro.org_id))
);
CREATE POLICY exceptions_delete ON procurement_exceptions FOR DELETE USING (
  EXISTS (SELECT 1 FROM released_orders ro WHERE ro.id = procurement_exceptions.released_order_id AND public.has_pro_access(ro.org_id))
);

-- Append-only audit trail: select + insert only, matching migration 017.
DROP POLICY IF EXISTS activity_log_select ON procurement_activity_log;
DROP POLICY IF EXISTS activity_log_insert ON procurement_activity_log;

CREATE POLICY activity_log_select ON procurement_activity_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM released_orders ro WHERE ro.id = procurement_activity_log.released_order_id AND public.has_pro_access(ro.org_id))
);
CREATE POLICY activity_log_insert ON procurement_activity_log FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM released_orders ro WHERE ro.id = procurement_activity_log.released_order_id AND public.has_pro_access(ro.org_id))
);
