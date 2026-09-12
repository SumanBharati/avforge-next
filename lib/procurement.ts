import { supabase } from "@/lib/supabase";
import { computeProposalTotals, itemPrice, type PricingSection } from "@/lib/proposal-pricing";

/* ══════════════════════════════════════════════════════════════
   Types — mirror supabase/migrations/017_procurement_release.sql
   ══════════════════════════════════════════════════════════════ */

export type ReleasedOrderStatus = "released" | "procurement_in_progress" | "partially_received" | "fully_received" | "closed" | "cancelled";
export type ProcurementItemStatus = "ready_to_order" | "po_draft" | "po_issued" | "acknowledged" | "partial_shipment" | "shipped" | "partially_received" | "received" | "backordered" | "cancelled" | "substituted" | "on_hold";
export type PurchaseOrderStatus = "draft" | "ready_for_review" | "approved" | "issued" | "acknowledged" | "partially_shipped" | "shipped" | "partially_received" | "received" | "closed" | "cancelled";
export type ReceivingCondition = "good" | "damaged" | "wrong_item" | "short" | "over";
export type ExceptionType = "cost_variance" | "quantity_variance" | "late_eta" | "backorder" | "discontinued" | "vendor_change" | "substitution_required" | "missing_ack" | "partial_shipment" | "damaged" | "missing_material" | "wrong_material";
export type ExceptionSeverity = "low" | "medium" | "high" | "critical";
export type ExceptionStatus = "open" | "investigating" | "waiting_on_vendor" | "waiting_on_sales" | "waiting_on_engineering" | "resolved";
export type InstallationReadiness = "ready" | "at_risk" | "critical" | "not_ready";

export interface Vendor {
  id: string;
  org_id: string;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  account_number: string;
  payment_terms: string;
  lead_time: string;
  address: string;
  website: string;
  notes: string;
  manufacturers: string[];
  created_at: string;
  updated_at: string;
}

export interface ReleasedOrder {
  id: string;
  org_id: string;
  project_id: string;
  proposal_snapshot: unknown;
  status: ReleasedOrderStatus;
  order_number: string;
  customer_po_number: string;
  customer_po_amount: number | null;
  customer_po_reference: string;
  signed_order_value: number | null;
  salesperson: string;
  project_manager: string;
  requested_install_date: string | null;
  required_material_date: string | null;
  bill_to: string;
  ship_to: string;
  tax_status: string;
  payment_terms: string;
  release_notes: string;
  released_by: string | null;
  released_by_name: string;
  released_at: string;
  created_at: string;
  updated_at: string;
}

export interface ProcurementItem {
  id: string;
  released_order_id: string;
  org_id: string;
  manufacturer: string;
  model: string;
  description: string;
  category: string;
  qty: number;
  sell_price: number;
  estimated_unit_cost: number;
  preferred_vendor_id: string | null;
  vendor_sku: string;
  required_date: string | null;
  expected_ship_date: string | null;
  expected_delivery_date: string | null;
  ordered_qty: number;
  acknowledged_qty: number;
  received_qty: number;
  status: ProcurementItemStatus;
  critical_for_installation: boolean;
  created_at: string;
  updated_at: string;
}

export interface VendorPurchaseOrder {
  id: string;
  released_order_id: string;
  org_id: string;
  vendor_id: string | null;
  po_number: string;
  status: PurchaseOrderStatus;
  po_date: string;
  required_delivery_date: string | null;
  ship_to: string;
  shipping_instructions: string;
  payment_terms: string;
  freight_terms: string;
  tax: number;
  freight: number;
  internal_notes: string;
  vendor_notes: string;
  ack_vendor_order_number: string;
  ack_date: string | null;
  ack_freight: number | null;
  ack_notes: string;
  created_by: string | null;
  approved_by: string | null;
  issued_by: string | null;
  issued_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorPOLine {
  id: string;
  po_id: string;
  procurement_item_id: string;
  qty_ordered: number;
  unit_cost: number;
  ack_qty: number | null;
  ack_unit_cost: number | null;
  est_ship_date: string | null;
  est_delivery_date: string | null;
  backorder_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Shipment {
  id: string;
  po_id: string;
  carrier: string;
  tracking_number: string;
  ship_date: string | null;
  expected_delivery: string | null;
  actual_delivery: string | null;
  notes: string;
  created_at: string;
}

export interface ShipmentLine {
  id: string;
  shipment_id: string;
  vendor_po_line_id: string;
  qty_shipped: number;
}

export interface ReceivingRecord {
  id: string;
  po_id: string;
  received_by: string | null;
  received_by_name: string;
  received_at: string;
  notes: string;
  created_at: string;
}

export interface ReceivingRecordLine {
  id: string;
  receiving_record_id: string;
  vendor_po_line_id: string;
  qty_received: number;
  condition: ReceivingCondition;
  notes: string;
}

export interface ProcurementException {
  id: string;
  released_order_id: string;
  procurement_item_id: string | null;
  po_id: string | null;
  type: ExceptionType;
  severity: ExceptionSeverity;
  description: string;
  owner: string;
  status: ExceptionStatus;
  required_action: string;
  resolution_notes: string;
  created_at: string;
  resolved_at: string | null;
}

export interface ProcurementActivity {
  id: string;
  released_order_id: string;
  event_type: string;
  description: string;
  actor_id: string | null;
  actor_name: string;
  created_at: string;
}

/* ══════════════════════════════════════════════════════════════
   Formatting helpers — shared across all Procurement pages
   ══════════════════════════════════════════════════════════════ */

export const fmt$ = (n: number | null | undefined) => "$" + (n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtDate = (d: string | null | undefined) => d ? new Date(d.length <= 10 ? d + "T00:00:00" : d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
export const todayISO = () => new Date().toISOString().split("T")[0];
export const statusLabel = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Many misc./generic line items (e.g. a customer-provided laptop, or a
// device with no manufacturer set in Signal Flow) carry blank
// manufacturer/model — fall back to the description so the row is never
// just blank whitespace.
export function itemLabel(item: { manufacturer: string; model: string; description: string }): string {
  const name = [item.manufacturer, item.model].filter(Boolean).join(" ");
  return name || item.description || "Item";
}

export const STATUS_COLORS: Record<string, string> = {
  released: "#8b5cf6", procurement_in_progress: "#3b82f6", partially_received: "#f97316",
  fully_received: "#22c55e", closed: "#94a3b8", cancelled: "#ef4444",
  ready_to_order: "#94a3b8", po_draft: "#f59e0b", po_issued: "#8b5cf6", acknowledged: "#3b82f6",
  partial_shipment: "#f97316", shipped: "#06b6d4", partially_received_item: "#f97316", received: "#22c55e",
  backordered: "#ef4444", substituted: "#a855f7", on_hold: "#64748b",
  draft: "#94a3b8", ready_for_review: "#f59e0b", approved: "#3b82f6", issued: "#8b5cf6",
  partially_shipped: "#f97316",
  good: "#22c55e", damaged: "#ef4444", wrong_item: "#f97316", short: "#f59e0b", over: "#a855f7",
  open: "#ef4444", investigating: "#f59e0b", waiting_on_vendor: "#3b82f6", waiting_on_sales: "#8b5cf6",
  waiting_on_engineering: "#8b5cf6", resolved: "#22c55e",
  low: "#94a3b8", medium: "#f59e0b", high: "#f97316", critical: "#ef4444",
};
export const statusColor = (s: string) => STATUS_COLORS[s] || "#94a3b8";

export const READINESS_LABEL: Record<InstallationReadiness, string> = {
  ready: "Ready for Installation", at_risk: "At Risk", critical: "Critical", not_ready: "Not Ready",
};
export const READINESS_COLOR: Record<InstallationReadiness, string> = {
  ready: "#22c55e", at_risk: "#f59e0b", critical: "#ef4444", not_ready: "#94a3b8",
};

/* ══════════════════════════════════════════════════════════════
   Status / readiness computation — pure functions, no I/O, so the
   same rule always applies wherever a status badge is rendered.
   ══════════════════════════════════════════════════════════════ */

// released_orders.status for the receiving-driven states is recomputed here
// after every mutation to procurement_items, then persisted via UPDATE —
// "released"/"closed"/"cancelled" stay manual/terminal and are never
// overwritten by this function.
export function computeOrderStatus(items: ProcurementItem[], currentStatus: ReleasedOrderStatus): ReleasedOrderStatus {
  if (currentStatus === "closed" || currentStatus === "cancelled") return currentStatus;
  const active = items.filter((i) => i.status !== "cancelled");
  if (active.length === 0) return currentStatus;
  const allReceived = active.every((i) => i.received_qty >= i.qty);
  if (allReceived) return "fully_received";
  const anyReceived = active.some((i) => i.received_qty > 0);
  if (anyReceived) return "partially_received";
  const anyOrdered = active.some((i) => i.status !== "ready_to_order");
  if (anyOrdered) return "procurement_in_progress";
  return currentStatus === "released" ? "released" : "procurement_in_progress";
}

// Re-derives and persists released_orders.status from the current DB state
// of its procurement_items — the single call site every mutation (ack,
// shipment, receiving) should use, instead of each page recomputing it from
// whatever items happen to be sitting in local React state (which can be
// stale relative to the write that was just made, or simply not loaded at
// all on a page — like the global Receiving page — that doesn't hold the
// full order in memory).
export async function syncReleasedOrderStatus(releasedOrderId: string): Promise<ReleasedOrderStatus | null> {
  const { data: order } = await supabase.from("released_orders").select("status").eq("id", releasedOrderId).single();
  if (!order) return null;
  const { data: items } = await supabase.from("procurement_items").select("*").eq("released_order_id", releasedOrderId);
  const nextStatus = computeOrderStatus((items || []) as ProcurementItem[], order.status as ReleasedOrderStatus);
  if (nextStatus !== order.status) {
    await supabase.from("released_orders").update({ status: nextStatus }).eq("id", releasedOrderId);
  }
  return nextStatus;
}

// Installation readiness is a separate axis from receiving status — 94%
// received but missing the one DSP marked critical must not read as "done."
export function computeReadiness(items: ProcurementItem[], openExceptions: ProcurementException[]): InstallationReadiness {
  const active = items.filter((i) => i.status !== "cancelled");
  if (active.length === 0) return "not_ready";
  const allReceived = active.every((i) => i.received_qty >= i.qty);
  const criticalOutstanding = active.some((i) => i.critical_for_installation && i.received_qty < i.qty);
  const hasCriticalException = openExceptions.some((e) => e.severity === "critical" && e.status !== "resolved");
  if (allReceived && !hasCriticalException) return "ready";
  if (criticalOutstanding || hasCriticalException) return "critical";
  const mostlyReceived = active.filter((i) => i.received_qty >= i.qty).length / active.length >= 0.8;
  return mostlyReceived ? "at_risk" : "not_ready";
}

export function procurementCompletionPct(items: ProcurementItem[]): number {
  const active = items.filter((i) => i.status !== "cancelled");
  const totalQty = active.reduce((s, i) => s + i.qty, 0);
  if (totalQty === 0) return 0;
  const receivedQty = active.reduce((s, i) => s + Math.min(i.received_qty, i.qty), 0);
  return Math.round((receivedQty / totalQty) * 100);
}

export function criticalItemsOutstanding(items: ProcurementItem[]): ProcurementItem[] {
  return items.filter((i) => i.critical_for_installation && i.status !== "cancelled" && i.received_qty < i.qty);
}

/* ══════════════════════════════════════════════════════════════
   Activity log
   ══════════════════════════════════════════════════════════════ */

export async function logActivity(releasedOrderId: string, eventType: string, description: string) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("procurement_activity_log").insert({
    released_order_id: releasedOrderId,
    event_type: eventType,
    description,
    actor_id: user?.id || null,
    actor_name: user?.user_metadata?.full_name || user?.email || "",
  });
}

/* ══════════════════════════════════════════════════════════════
   Release — the one genuinely complex multi-step write, centralized
   so the release gate page stays thin.
   ══════════════════════════════════════════════════════════════ */

export interface ReleaseOrderInput {
  orgId: string;
  projectId: string;
  proposal: { sections: PricingSection[]; marginPercent: number; taxRate: number; clientName?: string };
  proposalRaw: unknown; // the full proposals.data row, frozen verbatim as the snapshot
  customerPoNumber: string;
  customerPoAmount: number | null;
  customerPoReference: string;
  signedOrderValue: number | null;
  salesperson: string;
  projectManager: string;
  requestedInstallDate: string;
  requiredMaterialDate: string;
  billTo: string;
  shipTo: string;
  taxStatus: string;
  paymentTerms: string;
  releaseNotes: string;
}

export async function releaseOrder(input: ReleaseOrderInput): Promise<{ releasedOrderId: string } | { error: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const totals = computeProposalTotals(input.proposal.sections, input.proposal.marginPercent, input.proposal.taxRate);
  const orderNumberResult = await supabase.rpc("next_released_order_number");
  const orderNumber = (orderNumberResult.data as string) || `AVF-${Date.now()}`;

  const { data: order, error: orderError } = await supabase.from("released_orders").insert({
    org_id: input.orgId,
    project_id: input.projectId,
    proposal_snapshot: input.proposalRaw,
    status: "released",
    order_number: orderNumber,
    customer_po_number: input.customerPoNumber,
    customer_po_amount: input.customerPoAmount,
    customer_po_reference: input.customerPoReference,
    signed_order_value: input.signedOrderValue ?? totals.grandTotal,
    salesperson: input.salesperson,
    project_manager: input.projectManager,
    requested_install_date: input.requestedInstallDate || null,
    required_material_date: input.requiredMaterialDate || null,
    bill_to: input.billTo,
    ship_to: input.shipTo,
    tax_status: input.taxStatus,
    payment_terms: input.paymentTerms,
    release_notes: input.releaseNotes,
    released_by: user.id,
    released_by_name: user.user_metadata?.full_name || user.email || "",
  }).select("id").single();

  if (orderError || !order) return { error: orderError?.message || "Failed to create released order" };

  const rows = input.proposal.sections.flatMap((s) =>
    s.items
      .filter((i: any) => (i.manufacturer || i.model || i.description) && i.qty > 0)
      .map((i: any) => ({
        released_order_id: order.id,
        org_id: input.orgId,
        manufacturer: i.manufacturer || "",
        model: i.model || "",
        description: i.description || "",
        category: i.category || "",
        qty: i.qty,
        sell_price: itemPrice(i, input.proposal.marginPercent),
        estimated_unit_cost: i.unitCost || 0,
        status: "ready_to_order" as const,
      }))
  );

  if (rows.length > 0) {
    const { error: itemsError } = await supabase.from("procurement_items").insert(rows);
    if (itemsError) return { error: itemsError.message };
  }

  await logActivity(order.id, "released", `Order released by ${user.user_metadata?.full_name || user.email || "a team member"}.`);

  return { releasedOrderId: order.id as string };
}

/* ══════════════════════════════════════════════════════════════
   Exception detection — called after acknowledgement / receiving writes
   ══════════════════════════════════════════════════════════════ */

export async function detectAckExceptions(releasedOrderId: string, po: VendorPurchaseOrder, line: VendorPOLine, item: ProcurementItem) {
  const exceptions: Array<Omit<ProcurementException, "id" | "created_at" | "resolved_at">> = [];

  if (line.ack_unit_cost != null && line.ack_unit_cost !== line.unit_cost) {
    const diff = line.ack_unit_cost - line.unit_cost;
    const pct = line.unit_cost > 0 ? (diff / line.unit_cost) * 100 : 0;
    exceptions.push({
      released_order_id: releasedOrderId, procurement_item_id: item.id, po_id: po.id,
      type: "cost_variance", severity: Math.abs(pct) >= 10 ? "high" : "medium",
      description: `${itemLabel(item)}: quoted ${line.unit_cost.toFixed(2)}, vendor acknowledged ${line.ack_unit_cost.toFixed(2)} (${diff >= 0 ? "+" : ""}${diff.toFixed(2)} / ${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%).`,
      owner: "", status: "open", required_action: "Review cost variance with vendor or sales.", resolution_notes: "",
    });
  }
  if (line.ack_qty != null && line.ack_qty !== line.qty_ordered) {
    exceptions.push({
      released_order_id: releasedOrderId, procurement_item_id: item.id, po_id: po.id,
      type: "quantity_variance", severity: "medium",
      description: `${itemLabel(item)}: PO qty ${line.qty_ordered}, vendor acknowledged qty ${line.ack_qty}.`,
      owner: "", status: "open", required_action: "Confirm quantity with vendor.", resolution_notes: "",
    });
  }
  if (line.est_delivery_date && item.required_date && line.est_delivery_date > item.required_date) {
    exceptions.push({
      released_order_id: releasedOrderId, procurement_item_id: item.id, po_id: po.id,
      type: "late_eta", severity: item.critical_for_installation ? "critical" : "high",
      description: `${itemLabel(item)}: required ${fmtDate(item.required_date)}, vendor ETA ${fmtDate(line.est_delivery_date)}.`,
      owner: "", status: "open", required_action: "Notify project manager of schedule risk.", resolution_notes: "",
    });
  }
  if (line.backorder_date) {
    exceptions.push({
      released_order_id: releasedOrderId, procurement_item_id: item.id, po_id: po.id,
      type: "backorder", severity: item.critical_for_installation ? "critical" : "medium",
      description: `${itemLabel(item)}: backordered, vendor estimate ${fmtDate(line.backorder_date)}.`,
      owner: "", status: "open", required_action: "Monitor vendor backorder status.", resolution_notes: "",
    });
  }

  if (exceptions.length > 0) {
    await supabase.from("procurement_exceptions").insert(exceptions);
    for (const e of exceptions) {
      await logActivity(releasedOrderId, "exception_created", `${statusLabel(e.type)} detected: ${e.description}`);
    }
  }
  return exceptions.length;
}
