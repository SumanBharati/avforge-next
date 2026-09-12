"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import VendorManagerModal from "@/components/VendorManagerModal";
import {
  fmt$, fmtDate, todayISO, statusColor, statusLabel, itemLabel,
  computeReadiness, procurementCompletionPct, criticalItemsOutstanding, syncReleasedOrderStatus,
  READINESS_LABEL, READINESS_COLOR, logActivity, detectAckExceptions,
  type ReleasedOrder, type ProcurementItem, type Vendor, type VendorPurchaseOrder, type VendorPOLine,
  type ProcurementException, type ProcurementActivity, type ExceptionStatus,
} from "@/lib/procurement";

interface ProjectLite { id: string; name: string; job_number: string; client_name: string; }

const Badge = ({ label, color }: { label: string; color: string }) => (
  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: color + "1a", color, border: `1px solid ${color}3d` }}>{statusLabel(label)}</span>
);

export default function ProcurementDetailPage({ params }: { params: { releasedOrderId: string } }) {
  const [order, setOrder] = useState<ReleasedOrder | null>(null);
  const [project, setProject] = useState<ProjectLite | null>(null);
  const [items, setItems] = useState<ProcurementItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [pos, setPOs] = useState<VendorPurchaseOrder[]>([]);
  const [poLines, setPOLines] = useState<VendorPOLine[]>([]);
  const [shippedByLine, setShippedByLine] = useState<Record<string, number>>({});
  const [exceptions, setExceptions] = useState<ProcurementException[]>([]);
  const [activity, setActivity] = useState<ProcurementActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "bom" | "pos" | "exceptions" | "activity">("overview");
  const [expandedPO, setExpandedPO] = useState<string | null>(null);
  const [ackModalPO, setAckModalPO] = useState<string | null>(null);
  const [shipModalPO, setShipModalPO] = useState<string | null>(null);
  const [bomFilter, setBomFilter] = useState<{ manufacturer: string; vendor: string; status: string }>({ manufacturer: "", vendor: "", status: "" });
  const [showVendors, setShowVendors] = useState(false);

  const load = useCallback(async () => {
    const { data: orderRow } = await supabase.from("released_orders").select("*").eq("id", params.releasedOrderId).single();
    if (!orderRow) { setLoading(false); return; }
    setOrder(orderRow as ReleasedOrder);

    const { data: projectRow } = await supabase.from("projects").select("id, name, job_number, client_name").eq("id", orderRow.project_id).single();
    if (projectRow) setProject(projectRow as ProjectLite);

    const { data: itemRows } = await supabase.from("procurement_items").select("*").eq("released_order_id", params.releasedOrderId).order("category").order("manufacturer");
    setItems((itemRows || []) as ProcurementItem[]);

    const { data: vendorRows } = await supabase.from("vendors").select("*").eq("org_id", orderRow.org_id).order("name");
    setVendors((vendorRows || []) as Vendor[]);

    const { data: poRows } = await supabase.from("vendor_purchase_orders").select("*").eq("released_order_id", params.releasedOrderId).order("created_at");
    const poList = (poRows || []) as VendorPurchaseOrder[];
    setPOs(poList);

    const poIds = poList.map((po) => po.id);
    if (poIds.length > 0) {
      const { data: lineRows } = await supabase.from("vendor_po_lines").select("*").in("po_id", poIds);
      setPOLines((lineRows || []) as VendorPOLine[]);

      const lineIds = (lineRows || []).map((l) => l.id);
      if (lineIds.length > 0) {
        const { data: shipLineRows } = await supabase.from("shipment_lines").select("vendor_po_line_id, qty_shipped").in("vendor_po_line_id", lineIds);
        const shippedMap: Record<string, number> = {};
        (shipLineRows || []).forEach((sl: any) => { shippedMap[sl.vendor_po_line_id] = (shippedMap[sl.vendor_po_line_id] || 0) + sl.qty_shipped; });
        setShippedByLine(shippedMap);
      }
    } else {
      setPOLines([]);
      setShippedByLine({});
    }

    const { data: exRows } = await supabase.from("procurement_exceptions").select("*").eq("released_order_id", params.releasedOrderId).order("created_at", { ascending: false });
    setExceptions((exRows || []) as ProcurementException[]);

    const { data: actRows } = await supabase.from("procurement_activity_log").select("*").eq("released_order_id", params.releasedOrderId).order("created_at", { ascending: false });
    setActivity((actRows || []) as ProcurementActivity[]);

    setLoading(false);
  }, [params.releasedOrderId]);

  useEffect(() => { load(); }, [load]);


  const vendorName = (id: string | null) => vendors.find((v) => v.id === id)?.name || "—";
  const poNumber = (id: string | null) => pos.find((p) => p.id === id)?.po_number || "—";
  const lineForItem = (itemId: string) => poLines.find((l) => l.procurement_item_id === itemId);
  const poForLine = (line: VendorPOLine) => pos.find((p) => p.id === line.po_id);

  async function assignVendor(itemId: string, vendorId: string) {
    await supabase.from("procurement_items").update({ preferred_vendor_id: vendorId || null }).eq("id", itemId);
    setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, preferred_vendor_id: vendorId || null } : i));
  }

  async function toggleCritical(itemId: string, value: boolean) {
    await supabase.from("procurement_items").update({ critical_for_installation: value }).eq("id", itemId);
    setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, critical_for_installation: value } : i));
  }

  async function suggestVendors() {
    const updates = items.filter((i) => !i.preferred_vendor_id && i.status === "ready_to_order").map((i) => {
      const match = vendors.find((v) => v.manufacturers.some((m) => m.toLowerCase() === i.manufacturer.toLowerCase()));
      return match ? { id: i.id, vendorId: match.id } : null;
    }).filter(Boolean) as { id: string; vendorId: string }[];
    for (const u of updates) {
      await supabase.from("procurement_items").update({ preferred_vendor_id: u.vendorId }).eq("id", u.id);
    }
    if (updates.length > 0) {
      setItems((prev) => prev.map((i) => {
        const u = updates.find((x) => x.id === i.id);
        return u ? { ...i, preferred_vendor_id: u.vendorId } : i;
      }));
    }
  }

  async function createPOForVendor(vendorId: string | null) {
    if (!order) return;
    const groupItems = items.filter((i) => i.status === "ready_to_order" && (i.preferred_vendor_id || null) === vendorId);
    if (groupItems.length === 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    const numResult = await supabase.rpc("next_po_number");
    const poNum = (numResult.data as string) || `PO-${Date.now()}`;
    const { data: po, error } = await supabase.from("vendor_purchase_orders").insert({
      released_order_id: order.id, org_id: order.org_id, vendor_id: vendorId,
      po_number: poNum, status: "draft", po_date: todayISO(), created_by: user?.id || null,
    }).select("*").single();
    if (error || !po) return;

    const lineRows = groupItems.map((i) => ({ po_id: po.id, procurement_item_id: i.id, qty_ordered: i.qty, unit_cost: i.estimated_unit_cost }));
    const { data: newLines } = await supabase.from("vendor_po_lines").insert(lineRows).select("*");

    const itemIds = groupItems.map((i) => i.id);
    await supabase.from("procurement_items").update({ status: "po_draft" }).in("id", itemIds);

    await logActivity(order.id, "po_created", `${poNum} created for ${vendorId ? vendorName(vendorId) : "Unassigned"} (${groupItems.length} item${groupItems.length !== 1 ? "s" : ""}).`);

    setPOs((prev) => [...prev, po as VendorPurchaseOrder]);
    setPOLines((prev) => [...prev, ...((newLines || []) as VendorPOLine[])]);
    setItems((prev) => prev.map((i) => itemIds.includes(i.id) ? { ...i, status: "po_draft" } : i));
    setExpandedPO(po.id);
    setTab("pos");
    load();
  }

  async function issuePO(po: VendorPurchaseOrder) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("vendor_purchase_orders").update({ status: "issued", issued_by: user?.id || null, issued_at: new Date().toISOString() }).eq("id", po.id);
    const lineItemIds = poLines.filter((l) => l.po_id === po.id).map((l) => l.procurement_item_id);
    await supabase.from("procurement_items").update({ status: "po_issued", ordered_qty: 0 }).in("id", lineItemIds);
    // ordered_qty is set per-line below since qty can differ per line
    for (const line of poLines.filter((l) => l.po_id === po.id)) {
      await supabase.from("procurement_items").update({ ordered_qty: line.qty_ordered }).eq("id", line.procurement_item_id);
    }
    await logActivity(order!.id, "po_issued", `${po.po_number} issued to ${vendorName(po.vendor_id)}.`);
    await syncReleasedOrderStatus(order!.id);
    await load();
  }

  if (loading) return <div className="animate-fade-in px-4 py-20 text-center text-sm text-subtle sm:px-6 lg:px-8">Loading...</div>;
  if (!order) return <div className="animate-fade-in px-4 py-20 text-center text-sm text-subtle sm:px-6 lg:px-8">Released order not found.</div>;

  const openExceptions = exceptions.filter((e) => e.status !== "resolved");
  const readiness = computeReadiness(items, openExceptions);
  const completionPct = procurementCompletionPct(items);
  const critical = criticalItemsOutstanding(items);

  const estimatedCostAtRelease = items.reduce((s, i) => s + i.qty * i.estimated_unit_cost, 0);
  const currentExpectedCost = items.reduce((s, i) => {
    const line = lineForItem(i.id);
    const unit = line?.ack_unit_cost ?? line?.unit_cost ?? i.estimated_unit_cost;
    return s + i.qty * unit;
  }, 0);
  const costVariance = currentExpectedCost - estimatedCostAtRelease;
  const equipmentSell = items.reduce((s, i) => s + i.qty * i.sell_price, 0);

  const manufacturers = [...new Set(items.map((i) => i.manufacturer).filter(Boolean))];
  const filteredItems = items.filter((i) =>
    (!bomFilter.manufacturer || i.manufacturer === bomFilter.manufacturer) &&
    (!bomFilter.vendor || i.preferred_vendor_id === bomFilter.vendor) &&
    (!bomFilter.status || i.status === bomFilter.status)
  );

  const readyGroups = new Map<string, ProcurementItem[]>();
  items.filter((i) => i.status === "ready_to_order").forEach((i) => {
    const key = i.preferred_vendor_id || "unassigned";
    if (!readyGroups.has(key)) readyGroups.set(key, []);
    readyGroups.get(key)!.push(i);
  });

  const TABS: { id: typeof tab; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "bom", label: "Released BOM", count: items.length },
    { id: "pos", label: "Purchase Orders", count: pos.length },
    { id: "exceptions", label: "Exceptions", count: openExceptions.length },
    { id: "activity", label: "Activity" },
  ];

  return (
    <div className="animate-fade-in">
      <div className="border-b border-border bg-forge-panel/50 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/procurement" className="mb-2 inline-flex items-center gap-1.5 text-xs text-subtle hover:text-secondary">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              Procurement
            </Link>
            <h1 className="flex items-center gap-3 text-xl font-bold text-heading">
              {project?.name || "—"}
              <span className="font-mono text-[14px] font-normal text-rose-400">{order.order_number}</span>
            </h1>
            <p className="mt-1 text-[12px] text-subtle">{project?.client_name} {order.customer_po_number && `· PO ${order.customer_po_number}`}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge label={order.status} color={statusColor(order.status)} />
            <span className="text-[12px] font-semibold" style={{ color: READINESS_COLOR[readiness] }}>{READINESS_LABEL[readiness]}</span>
          </div>
        </div>
        <div className="mt-4 flex gap-1">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${tab === t.id ? "bg-rose-500/10 text-rose-400" : "text-muted hover:text-secondary"}`}>
              {t.label}
              {typeof t.count === "number" && t.count > 0 && <span className="rounded-full bg-forge-surface/60 px-1.5 py-0.5 text-[10px]">{t.count}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {tab === "overview" && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-forge-surface/40 p-5 lg:col-span-2">
              <h3 className="mb-4 text-sm font-bold text-heading">Order Overview</h3>
              <div className="grid grid-cols-2 gap-4 text-[13px] sm:grid-cols-3">
                <Field label="Customer" value={project?.client_name} />
                <Field label="Order Number" value={order.order_number} />
                <Field label="Customer PO" value={order.customer_po_number} />
                <Field label="Released" value={fmtDate(order.released_at)} />
                <Field label="Released By" value={order.released_by_name} />
                <Field label="Salesperson" value={order.salesperson} />
                <Field label="Project Manager" value={order.project_manager} />
                <Field label="Requested Install" value={fmtDate(order.requested_install_date)} />
                <Field label="Required Material Date" value={fmtDate(order.required_material_date)} />
                <Field label="Tax Status" value={order.tax_status} />
                <Field label="Payment Terms" value={order.payment_terms} />
                <Field label="Customer PO Doc" value={order.customer_po_reference} />
              </div>
              {order.release_notes && (
                <div className="mt-4 rounded-lg bg-forge-panel/40 p-3 text-[12px] text-muted">{order.release_notes}</div>
              )}
              {critical.length > 0 && (
                <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                  <p className="mb-1 text-[12px] font-bold text-red-400">Critical Items Outstanding</p>
                  {critical.map((i) => (
                    <p key={i.id} className="text-[12px] text-red-300">{itemLabel(i)} — {i.received_qty}/{i.qty} received</p>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-forge-surface/40 p-5">
                <h3 className="mb-3 text-sm font-bold text-heading">Cost & Value</h3>
                <div className="space-y-2 text-[13px]">
                  <Row label="Equipment Sell" value={fmt$(equipmentSell)} />
                  <Row label="Estimated Cost at Release" value={fmt$(estimatedCostAtRelease)} />
                  <Row label="Current Expected Cost" value={fmt$(currentExpectedCost)} />
                  <Row label="Cost Variance" value={`${costVariance >= 0 ? "+" : ""}${fmt$(costVariance)}`} valueColor={costVariance > 0 ? "#ef4444" : costVariance < 0 ? "#22c55e" : undefined} />
                </div>
              </div>
              <div className="rounded-xl border border-border bg-forge-surface/40 p-5">
                <h3 className="mb-3 text-sm font-bold text-heading">Procurement Completion</h3>
                <div className="mb-2 flex items-center gap-3">
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-forge-panel/60">
                    <div className="h-full rounded-full" style={{ width: `${completionPct}%`, backgroundColor: completionPct === 100 ? "#22c55e" : "#8b5cf6" }} />
                  </div>
                  <span className="text-[13px] font-bold text-heading">{completionPct}%</span>
                </div>
                <p className="text-[12px]" style={{ color: READINESS_COLOR[readiness] }}>Installation Readiness: {READINESS_LABEL[readiness]}</p>
              </div>
            </div>
          </div>
        )}

        {tab === "bom" && (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <select value={bomFilter.manufacturer} onChange={(e) => setBomFilter((f) => ({ ...f, manufacturer: e.target.value }))} className="forge-input text-[12px]">
                  <option value="">All Manufacturers</option>
                  {manufacturers.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={bomFilter.vendor} onChange={(e) => setBomFilter((f) => ({ ...f, vendor: e.target.value }))} className="forge-input text-[12px]">
                  <option value="">All Vendors</option>
                  {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                <select value={bomFilter.status} onChange={(e) => setBomFilter((f) => ({ ...f, status: e.target.value }))} className="forge-input text-[12px]">
                  <option value="">All Statuses</option>
                  {["ready_to_order", "po_draft", "po_issued", "acknowledged", "shipped", "partially_received", "received", "backordered"].map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowVendors(true)} className="rounded-lg border border-border bg-forge-surface/60 px-3 py-1.5 text-[12px] font-medium text-body transition-colors hover:bg-forge-surface">
                  Manage Vendors
                </button>
                <button onClick={suggestVendors} className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-1.5 text-[12px] font-semibold text-blue-400 transition-colors hover:bg-blue-500/20">
                  Suggest Vendors
                </button>
              </div>
            </div>

            <div className="mb-6 overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-forge-panel/60 text-[11px] font-semibold uppercase tracking-wider text-subtle">
                    <th className="px-3 py-3">Manufacturer</th>
                    <th className="px-3 py-3">Model</th>
                    <th className="min-w-[140px] px-3 py-3">Description</th>
                    <th className="px-3 py-3 text-center">Qty</th>
                    <th className="px-3 py-3 text-right">Sell</th>
                    <th className="px-3 py-3 text-right">Est. Cost</th>
                    <th className="px-3 py-3">Vendor</th>
                    <th className="px-3 py-3">PO</th>
                    <th className="px-3 py-3 text-center">Recv&apos;d</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3 text-center">Critical</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((i) => {
                    const line = lineForItem(i.id);
                    return (
                      <tr key={i.id} className="border-b border-border/50 transition-colors hover:bg-forge-surface/20">
                        <td className="px-3 py-2 text-body">{i.manufacturer || "—"}</td>
                        <td className="px-3 py-2 text-body">{i.model || "—"}</td>
                        <td className="px-3 py-2 text-muted">{i.description || "—"}</td>
                        <td className="px-3 py-2 text-center text-body">{i.qty}</td>
                        <td className="px-3 py-2 text-right text-body">{fmt$(i.sell_price)}</td>
                        <td className="px-3 py-2 text-right text-body">{fmt$(i.estimated_unit_cost)}</td>
                        <td className="px-3 py-2">
                          <select value={i.preferred_vendor_id || ""} onChange={(e) => assignVendor(i.id, e.target.value)} disabled={i.status !== "ready_to_order"} className="border-none bg-transparent text-[12px] text-body outline-none disabled:opacity-60">
                            <option value="">Unassigned</option>
                            {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-[11px] text-subtle">{line ? poNumber(line.po_id) : "—"}</td>
                        <td className="px-3 py-2 text-center" style={{ color: i.received_qty >= i.qty ? "#22c55e" : i.received_qty > 0 ? "#f97316" : "#94a3b8" }}>{i.received_qty}/{i.qty}</td>
                        <td className="px-3 py-2"><Badge label={i.status} color={statusColor(i.status)} /></td>
                        <td className="px-3 py-2 text-center">
                          <input type="checkbox" checked={i.critical_for_installation} onChange={(e) => toggleCritical(i.id, e.target.checked)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {readyGroups.size > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-bold text-heading">Suggested Purchase Order Groups</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from(readyGroups.entries()).map(([key, groupItems]) => {
                    const vendorId = key === "unassigned" ? null : key;
                    const total = groupItems.reduce((s, i) => s + i.qty * i.estimated_unit_cost, 0);
                    return (
                      <div key={key} className="rounded-xl border border-border bg-forge-surface/40 p-4">
                        <p className="mb-1 text-[13px] font-bold text-heading">{vendorId ? vendorName(vendorId) : "Unassigned"}</p>
                        <p className="mb-3 text-[12px] text-subtle">{groupItems.length} item{groupItems.length !== 1 ? "s" : ""} · {fmt$(total)}</p>
                        <button onClick={() => createPOForVendor(vendorId)} disabled={!vendorId} className="forge-btn-primary w-full text-[12px] disabled:cursor-not-allowed disabled:opacity-40">
                          {vendorId ? "Create PO" : "Assign a vendor first"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "pos" && (
          <div className="space-y-4">
            {pos.length === 0 ? (
              <div className="py-20 text-center text-sm text-faint">No purchase orders yet. Assign vendors on the Released BOM tab to create suggested PO groups.</div>
            ) : pos.map((po) => {
              const isExpanded = expandedPO === po.id;
              const lines = poLines.filter((l) => l.po_id === po.id);
              const vendor = vendors.find((v) => v.id === po.vendor_id);
              const poTotal = lines.reduce((s, l) => s + l.qty_ordered * l.unit_cost, 0) + po.tax + po.freight;
              return (
                <div key={po.id} className="rounded-xl border border-border bg-forge-surface/40">
                  <button onClick={() => setExpandedPO(isExpanded ? null : po.id)} className="flex w-full flex-wrap items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-forge-surface/20">
                    <svg width="14" height="14" viewBox="0 0 12 12" fill="none" className={`shrink-0 text-subtle transition-transform ${isExpanded ? "rotate-90" : ""}`}><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    <span className="font-mono text-[14px] font-bold text-rose-400">{po.po_number}</span>
                    <span className="text-[13px] text-muted">{vendor?.name || "No vendor"}</span>
                    <Badge label={po.status} color={statusColor(po.status)} />
                    <span className="text-[12px] text-subtle">{fmtDate(po.po_date)}</span>
                    <span className="ml-auto text-[12px] text-subtle">{lines.length} items</span>
                    <span className="text-[14px] font-bold text-heading">{fmt$(poTotal)}</span>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-border px-5 py-4">
                      <div className="mb-4 overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-[12px]">
                          <thead>
                            <tr className="border-b border-border bg-forge-panel/40 text-[10px] font-semibold uppercase tracking-wider text-subtle">
                              <th className="px-3 py-2">Item</th>
                              <th className="px-3 py-2 text-center">Qty</th>
                              <th className="px-3 py-2 text-right">Unit Cost</th>
                              <th className="px-3 py-2 text-right">Ack Cost</th>
                              <th className="px-3 py-2">Est. Delivery</th>
                              <th className="px-3 py-2 text-center">Recv&apos;d</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lines.map((l) => {
                              const item = items.find((i) => i.id === l.procurement_item_id);
                              return (
                                <tr key={l.id} className="border-b border-border/30">
                                  <td className="px-3 py-2 text-body">{item && itemLabel(item)}{item?.description && (item.manufacturer || item.model) && <span className="text-subtle"> — {item.description}</span>}</td>
                                  <td className="px-3 py-2 text-center text-body">{l.qty_ordered}</td>
                                  <td className="px-3 py-2 text-right text-body">{fmt$(l.unit_cost)}</td>
                                  <td className="px-3 py-2 text-right" style={{ color: l.ack_unit_cost != null && l.ack_unit_cost !== l.unit_cost ? "#ef4444" : undefined }}>{l.ack_unit_cost != null ? fmt$(l.ack_unit_cost) : "—"}</td>
                                  <td className="px-3 py-2 text-body">{fmtDate(l.est_delivery_date)}</td>
                                  <td className="px-3 py-2 text-center" style={{ color: (item?.received_qty || 0) >= l.qty_ordered ? "#22c55e" : (item?.received_qty || 0) > 0 ? "#f97316" : "#94a3b8" }}>{item?.received_qty || 0}/{l.qty_ordered}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {["draft", "ready_for_review", "approved"].includes(po.status) && (
                          <button onClick={() => issuePO(po)} className="rounded-lg bg-blue-500/10 px-3 py-1.5 text-[12px] font-semibold text-blue-400 transition-colors hover:bg-blue-500/20">Issue PO</button>
                        )}
                        {["issued", "acknowledged"].includes(po.status) && (
                          <button onClick={() => setAckModalPO(po.id)} className="rounded-lg bg-violet-500/10 px-3 py-1.5 text-[12px] font-semibold text-violet-400 transition-colors hover:bg-violet-500/20">Enter Acknowledgement</button>
                        )}
                        {["acknowledged", "partially_shipped"].includes(po.status) && (
                          <button onClick={() => setShipModalPO(po.id)} className="rounded-lg bg-cyan-500/10 px-3 py-1.5 text-[12px] font-semibold text-cyan-400 transition-colors hover:bg-cyan-500/20">Add Shipment</button>
                        )}
                        <Link href="/procurement/receiving" className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-[12px] font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20">Receive Items</Link>
                        {po.ack_vendor_order_number && (
                          <span className="ml-auto text-[11px] text-subtle">Vendor Order # {po.ack_vendor_order_number}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "exceptions" && (
          <ExceptionsPanel exceptions={exceptions} items={items} onChange={load} />
        )}

        {tab === "activity" && (
          <div className="space-y-3">
            {activity.length === 0 ? (
              <div className="py-20 text-center text-sm text-faint">No activity yet.</div>
            ) : activity.map((a) => (
              <div key={a.id} className="flex gap-3 rounded-lg bg-forge-surface/30 px-4 py-3">
                <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                <div>
                  <p className="text-[13px] text-body">{a.description}</p>
                  <p className="text-[11px] text-faint">{fmtDate(a.created_at)} {new Date(a.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} {a.actor_name && `· ${a.actor_name}`}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {ackModalPO && (
        <AckModal
          po={pos.find((p) => p.id === ackModalPO)!}
          lines={poLines.filter((l) => l.po_id === ackModalPO)}
          items={items}
          releasedOrderId={order.id}
          onClose={() => setAckModalPO(null)}
          onSaved={async () => { setAckModalPO(null); await syncReleasedOrderStatus(order.id); await load(); }}
        />
      )}

      {shipModalPO && (
        <ShipModal
          po={pos.find((p) => p.id === shipModalPO)!}
          lines={poLines.filter((l) => l.po_id === shipModalPO)}
          items={items}
          shippedByLine={shippedByLine}
          releasedOrderId={order.id}
          onClose={() => setShipModalPO(null)}
          onSaved={async () => { setShipModalPO(null); await syncReleasedOrderStatus(order.id); await load(); }}
        />
      )}

      {showVendors && order && (
        <VendorManagerModal orgId={order.org_id} vendors={vendors} onClose={() => setShowVendors(false)} onChange={load} />
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">{label}</p>
      <p className="text-body">{value || "—"}</p>
    </div>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-semibold" style={valueColor ? { color: valueColor } : { color: "rgb(var(--text-heading))" }}>{value}</span>
    </div>
  );
}

/* ── Acknowledgement modal ─────────────────────────────────── */
function AckModal({ po, lines, items, releasedOrderId, onClose, onSaved }: {
  po: VendorPurchaseOrder; lines: VendorPOLine[]; items: ProcurementItem[]; releasedOrderId: string;
  onClose: () => void; onSaved: () => void;
}) {
  const [vendorOrderNumber, setVendorOrderNumber] = useState(po.ack_vendor_order_number || "");
  const [ackDate, setAckDate] = useState(po.ack_date || todayISO());
  const [freight, setFreight] = useState(po.ack_freight?.toString() || "");
  const [notes, setNotes] = useState(po.ack_notes || "");
  const [lineData, setLineData] = useState(() => Object.fromEntries(lines.map((l) => [l.id, {
    ackQty: l.ack_qty ?? l.qty_ordered, ackCost: l.ack_unit_cost ?? l.unit_cost,
    shipDate: l.est_ship_date || "", deliveryDate: l.est_delivery_date || "", backorderDate: l.backorder_date || "",
  }])));
  const [saving, setSaving] = useState(false);
  const inputCls = "forge-input w-full text-[12px]";

  async function save() {
    setSaving(true);
    await supabase.from("vendor_purchase_orders").update({
      status: "acknowledged", ack_vendor_order_number: vendorOrderNumber, ack_date: ackDate || null,
      ack_freight: freight ? parseFloat(freight) : null, ack_notes: notes,
    }).eq("id", po.id);

    for (const line of lines) {
      const d = lineData[line.id];
      const patch = {
        ack_qty: d.ackQty, ack_unit_cost: d.ackCost,
        est_ship_date: d.shipDate || null, est_delivery_date: d.deliveryDate || null, backorder_date: d.backorderDate || null,
      };
      await supabase.from("vendor_po_lines").update(patch).eq("id", line.id);
      const item = items.find((i) => i.id === line.procurement_item_id);
      if (item) {
        await supabase.from("procurement_items").update({
          acknowledged_qty: d.ackQty,
          expected_ship_date: d.shipDate || null,
          expected_delivery_date: d.deliveryDate || null,
          status: d.backorderDate ? "backordered" : "acknowledged",
        }).eq("id", item.id);
        await detectAckExceptions(releasedOrderId, { ...po, ack_vendor_order_number: vendorOrderNumber } as VendorPurchaseOrder, { ...line, ...patch } as VendorPOLine, item);
      }
    }
    await logActivity(releasedOrderId, "ack_recorded", `Vendor acknowledgement recorded for ${po.po_number}.`);
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-forge-bg shadow-2xl">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold text-heading">Vendor Acknowledgement — {po.po_number}</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div><label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faint">Vendor Order #</label><input value={vendorOrderNumber} onChange={(e) => setVendorOrderNumber(e.target.value)} className={inputCls} /></div>
            <div><label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faint">Ack Date</label><input type="date" value={ackDate} onChange={(e) => setAckDate(e.target.value)} className={inputCls} /></div>
            <div><label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faint">Freight</label><input type="number" value={freight} onChange={(e) => setFreight(e.target.value)} className={inputCls} /></div>
          </div>
          <div className="space-y-3">
            {lines.map((line) => {
              const item = items.find((i) => i.id === line.procurement_item_id);
              const d = lineData[line.id];
              const set = (patch: Partial<typeof d>) => setLineData((prev) => ({ ...prev, [line.id]: { ...prev[line.id], ...patch } }));
              return (
                <div key={line.id} className="rounded-lg border border-border bg-forge-surface/30 p-3">
                  <p className="mb-2 text-[12px] font-semibold text-body">{item && itemLabel(item)} <span className="text-subtle">— PO qty {line.qty_ordered} @ {fmt$(line.unit_cost)}</span></p>
                  <div className="grid grid-cols-5 gap-2">
                    <div><label className="mb-1 block text-[10px] text-faint">Ack Qty</label><input type="number" value={d.ackQty} onChange={(e) => set({ ackQty: +e.target.value })} className={inputCls} /></div>
                    <div><label className="mb-1 block text-[10px] text-faint">Ack Cost</label><input type="number" value={d.ackCost} onChange={(e) => set({ ackCost: +e.target.value })} className={inputCls} /></div>
                    <div><label className="mb-1 block text-[10px] text-faint">Est. Ship</label><input type="date" value={d.shipDate} onChange={(e) => set({ shipDate: e.target.value })} className={inputCls} /></div>
                    <div><label className="mb-1 block text-[10px] text-faint">Est. Delivery</label><input type="date" value={d.deliveryDate} onChange={(e) => set({ deliveryDate: e.target.value })} className={inputCls} /></div>
                    <div><label className="mb-1 block text-[10px] text-faint">Backorder Date</label><input type="date" value={d.backorderDate} onChange={(e) => set({ backorderDate: e.target.value })} className={inputCls} /></div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faint">Vendor Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls + " resize-none"} />
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <button onClick={onClose} disabled={saving} className="rounded-lg px-4 py-2 text-[13px] text-muted hover:text-body">Cancel</button>
          <button onClick={save} disabled={saving} className="forge-btn-primary text-[13px] disabled:opacity-50">{saving ? "Saving…" : "Save Acknowledgement"}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Shipment modal ────────────────────────────────────────── */
function ShipModal({ po, lines, items, shippedByLine, releasedOrderId, onClose, onSaved }: {
  po: VendorPurchaseOrder; lines: VendorPOLine[]; items: ProcurementItem[]; shippedByLine: Record<string, number>;
  releasedOrderId: string; onClose: () => void; onSaved: () => void;
}) {
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [shipDate, setShipDate] = useState(todayISO());
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [qtyByLine, setQtyByLine] = useState(() => Object.fromEntries(lines.map((l) => [l.id, Math.max(0, l.qty_ordered - (shippedByLine[l.id] || 0))])));
  const [saving, setSaving] = useState(false);
  const inputCls = "forge-input w-full text-[12px]";

  async function save() {
    setSaving(true);
    const { data: shipment } = await supabase.from("shipments").insert({
      po_id: po.id, carrier, tracking_number: tracking, ship_date: shipDate || null, expected_delivery: expectedDelivery || null,
    }).select("id").single();
    if (shipment) {
      const rows = lines.filter((l) => qtyByLine[l.id] > 0).map((l) => ({ shipment_id: shipment.id, vendor_po_line_id: l.id, qty_shipped: qtyByLine[l.id] }));
      if (rows.length > 0) await supabase.from("shipment_lines").insert(rows);

      for (const l of lines) {
        const totalShipped = (shippedByLine[l.id] || 0) + (qtyByLine[l.id] || 0);
        const item = items.find((i) => i.id === l.procurement_item_id);
        if (item) {
          const status = totalShipped >= l.qty_ordered ? "shipped" : totalShipped > 0 ? "partial_shipment" : item.status;
          await supabase.from("procurement_items").update({
            status, expected_delivery_date: expectedDelivery || item.expected_delivery_date,
          }).eq("id", item.id);
        }
      }
      const allLinesFullyShipped = lines.every((l) => (shippedByLine[l.id] || 0) + (qtyByLine[l.id] || 0) >= l.qty_ordered);
      await supabase.from("vendor_purchase_orders").update({ status: allLinesFullyShipped ? "shipped" : "partially_shipped" }).eq("id", po.id);
      await logActivity(releasedOrderId, "shipment_added", `Shipment added for ${po.po_number}${tracking ? ` — tracking ${tracking}` : ""}.`);
    }
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-forge-bg shadow-2xl">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold text-heading">Add Shipment — {po.po_number}</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faint">Carrier</label><input value={carrier} onChange={(e) => setCarrier(e.target.value)} className={inputCls} /></div>
            <div><label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faint">Tracking #</label><input value={tracking} onChange={(e) => setTracking(e.target.value)} className={inputCls} /></div>
            <div><label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faint">Ship Date</label><input type="date" value={shipDate} onChange={(e) => setShipDate(e.target.value)} className={inputCls} /></div>
            <div><label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faint">Expected Delivery</label><input type="date" value={expectedDelivery} onChange={(e) => setExpectedDelivery(e.target.value)} className={inputCls} /></div>
          </div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">Quantity in this shipment</p>
          <div className="space-y-2">
            {lines.map((l) => {
              const item = items.find((i) => i.id === l.procurement_item_id);
              const remaining = Math.max(0, l.qty_ordered - (shippedByLine[l.id] || 0));
              return (
                <div key={l.id} className="flex items-center gap-3 rounded-lg bg-forge-surface/30 px-3 py-2">
                  <span className="flex-1 text-[12px] text-body">{item && itemLabel(item)}</span>
                  <span className="text-[11px] text-faint">Remaining: {remaining}</span>
                  <input type="number" min={0} max={remaining} value={qtyByLine[l.id]} onChange={(e) => setQtyByLine((prev) => ({ ...prev, [l.id]: Math.min(remaining, +e.target.value) }))} className="w-16 rounded border border-border bg-transparent px-2 py-1 text-center text-[12px] text-body outline-none" />
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <button onClick={onClose} disabled={saving} className="rounded-lg px-4 py-2 text-[13px] text-muted hover:text-body">Cancel</button>
          <button onClick={save} disabled={saving} className="forge-btn-primary text-[13px] disabled:opacity-50">{saving ? "Saving…" : "Save Shipment"}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Exceptions panel ──────────────────────────────────────── */
function ExceptionsPanel({ exceptions, items, onChange }: { exceptions: ProcurementException[]; items: ProcurementItem[]; onChange: () => void }) {
  const STATUSES: ExceptionStatus[] = ["open", "investigating", "waiting_on_vendor", "waiting_on_sales", "waiting_on_engineering", "resolved"];

  async function updateStatus(id: string, status: ExceptionStatus) {
    await supabase.from("procurement_exceptions").update({ status, resolved_at: status === "resolved" ? new Date().toISOString() : null }).eq("id", id);
    onChange();
  }

  if (exceptions.length === 0) {
    return <div className="py-20 text-center text-sm text-faint">No exceptions. Procurement is running clean.</div>;
  }

  return (
    <div className="space-y-3">
      {exceptions.map((e) => {
        const item = items.find((i) => i.id === e.procurement_item_id);
        return (
          <div key={e.id} className="rounded-xl border border-border bg-forge-surface/40 p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge label={e.type} color={statusColor(e.severity)} />
              <span className="text-[11px] uppercase tracking-wider text-faint">{e.severity}</span>
              {item && <span className="text-[12px] text-subtle">{itemLabel(item)}</span>}
              <select value={e.status} onChange={(ev) => updateStatus(e.id, ev.target.value as ExceptionStatus)} className="ml-auto rounded-lg border border-border bg-transparent px-2 py-1 text-[11px] font-semibold outline-none" style={{ color: statusColor(e.status) }}>
                {STATUSES.map((s) => <option key={s} value={s} className="bg-forge-bg">{statusLabel(s)}</option>)}
              </select>
            </div>
            <p className="text-[13px] text-body">{e.description}</p>
            {e.required_action && <p className="mt-1 text-[12px] text-subtle">Action: {e.required_action}</p>}
          </div>
        );
      })}
    </div>
  );
}
