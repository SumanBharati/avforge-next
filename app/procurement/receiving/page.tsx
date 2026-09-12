"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useOrg } from "@/components/OrgProvider";
import { statusColor, statusLabel, itemLabel, logActivity, syncReleasedOrderStatus, type VendorPurchaseOrder, type VendorPOLine, type ProcurementItem, type ReceivingCondition } from "@/lib/procurement";

interface ReceivableRow {
  po: VendorPurchaseOrder;
  line: VendorPOLine;
  item: ProcurementItem;
  projectName: string;
  jobNumber: string;
  trackingNumbers: string[];
}

const CONDITIONS: { id: ReceivingCondition; label: string }[] = [
  { id: "good", label: "Received Good" },
  { id: "damaged", label: "Damaged" },
  { id: "wrong_item", label: "Wrong Item" },
  { id: "short", label: "Short Shipment" },
  { id: "over", label: "Over Shipment" },
];

export default function ReceivingPage() {
  const { activeOrg, loading: orgLoading } = useOrg();
  const [rows, setRows] = useState<ReceivableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeRow, setActiveRow] = useState<string | null>(null);

  useEffect(() => {
    if (orgLoading || !activeOrg) { if (!orgLoading) setLoading(false); return; }
    load();
  }, [activeOrg?.id, orgLoading]);

  async function load() {
    if (!activeOrg) return;
    setLoading(true);
    const { data: poRows } = await supabase.from("vendor_purchase_orders").select("*").eq("org_id", activeOrg.id).not("status", "in", "(draft,ready_for_review,closed,cancelled)");
    const pos = (poRows || []) as VendorPurchaseOrder[];
    if (pos.length === 0) { setRows([]); setLoading(false); return; }

    const poIds = pos.map((p) => p.id);
    const { data: lineRows } = await supabase.from("vendor_po_lines").select("*").in("po_id", poIds);
    const lines = (lineRows || []) as VendorPOLine[];

    const itemIds = lines.map((l) => l.procurement_item_id);
    const { data: itemRows } = await supabase.from("procurement_items").select("*").in("id", itemIds.length ? itemIds : ["00000000-0000-0000-0000-000000000000"]);
    const items = (itemRows || []) as ProcurementItem[];

    const orderIds = [...new Set(pos.map((p) => p.released_order_id))];
    const { data: orderRows } = await supabase.from("released_orders").select("id, project_id").in("id", orderIds);
    const projectIds = [...new Set((orderRows || []).map((o: any) => o.project_id))];
    const { data: projectRows } = await supabase.from("projects").select("id, name, job_number").in("id", projectIds.length ? projectIds : ["00000000-0000-0000-0000-000000000000"]);
    const projectByOrderId = new Map((orderRows || []).map((o: any) => [o.id, projectRows?.find((p) => p.id === o.project_id)]));

    const { data: shipmentRows } = await supabase.from("shipments").select("po_id, tracking_number").in("po_id", poIds);

    const built: ReceivableRow[] = [];
    for (const line of lines) {
      const item = items.find((i) => i.id === line.procurement_item_id);
      const po = pos.find((p) => p.id === line.po_id);
      if (!item || !po) continue;
      if (item.received_qty >= line.qty_ordered) continue; // fully received, nothing left to receive
      const project = projectByOrderId.get(po.released_order_id) as { name: string; job_number: string } | undefined;
      const tracking = (shipmentRows || []).filter((s: any) => s.po_id === po.id).map((s: any) => s.tracking_number).filter(Boolean);
      built.push({ po, line, item, projectName: project?.name || "—", jobNumber: project?.job_number || "", trackingNumbers: tracking });
    }
    setRows(built);
    setLoading(false);
  }

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.po.po_number.toLowerCase().includes(q) ||
      r.projectName.toLowerCase().includes(q) ||
      r.jobNumber.toLowerCase().includes(q) ||
      r.item.manufacturer.toLowerCase().includes(q) ||
      // Many misc./generic line items (e.g. a customer-provided laptop) carry
      // no manufacturer at all — model/description keep them searchable too.
      r.item.model.toLowerCase().includes(q) ||
      r.item.description.toLowerCase().includes(q) ||
      r.trackingNumbers.some((t) => t.toLowerCase().includes(q));
  });

  if (orgLoading || loading) {
    return <div className="animate-fade-in px-4 py-20 text-center text-sm text-subtle sm:px-6 lg:px-8">Loading...</div>;
  }

  return (
    <div className="animate-fade-in px-4 py-6 sm:px-6 lg:px-8">
      <Link href="/procurement" className="mb-3 inline-flex items-center gap-1.5 text-xs text-subtle hover:text-secondary">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        Procurement
      </Link>
      <h1 className="mb-1 flex items-center gap-2.5 text-xl font-bold text-heading">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
          <polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" />
        </svg>
        Receiving
      </h1>
      <p className="mb-5 text-[13px] text-subtle">Search by PO #, project #, manufacturer, or tracking # to receive equipment against any open order.</p>

      <div className="relative mb-6 max-w-lg">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" /><path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Scan or type PO #, project #, manufacturer, tracking #..." className="forge-input w-full pl-9 text-[13px]" autoFocus />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-forge-surface/30 py-20 text-center text-sm text-subtle">
          {rows.length === 0 ? "Nothing open to receive right now." : "No matches for that search."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <ReceivableRowCard key={r.line.id} row={r} isActive={activeRow === r.line.id} onToggle={() => setActiveRow(activeRow === r.line.id ? null : r.line.id)} onReceived={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReceivableRowCard({ row, isActive, onToggle, onReceived }: { row: ReceivableRow; isActive: boolean; onToggle: () => void; onReceived: () => void }) {
  const { po, line, item, projectName, jobNumber, trackingNumbers } = row;
  const remaining = Math.max(0, line.qty_ordered - item.received_qty);
  const [qty, setQty] = useState(remaining);
  const [condition, setCondition] = useState<ReceivingCondition>("good");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function receive() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: record } = await supabase.from("receiving_records").insert({
      po_id: po.id, received_by: user?.id || null, received_by_name: user?.user_metadata?.full_name || user?.email || "",
    }).select("id").single();
    if (record) {
      await supabase.from("receiving_record_lines").insert({ receiving_record_id: record.id, vendor_po_line_id: line.id, qty_received: qty, condition, notes });

      if (condition === "good") {
        const newReceived = item.received_qty + qty;
        const newStatus = newReceived >= line.qty_ordered ? "received" : "partially_received";
        await supabase.from("procurement_items").update({ received_qty: newReceived, status: newStatus }).eq("id", item.id);
        await logActivity(po.released_order_id, "received", `${qty} of ${line.qty_ordered} ${itemLabel(item)} received${newReceived >= line.qty_ordered ? " (complete)" : ""}.`);
      } else {
        await supabase.from("procurement_exceptions").insert({
          released_order_id: po.released_order_id, procurement_item_id: item.id, po_id: po.id,
          type: condition === "damaged" ? "damaged" : condition === "wrong_item" ? "wrong_material" : condition === "short" ? "missing_material" : "quantity_variance",
          severity: item.critical_for_installation ? "high" : "medium",
          description: `${itemLabel(item)}: ${qty} unit(s) received as "${statusLabel(condition)}"${notes ? ` — ${notes}` : ""}.`,
          required_action: "Review with vendor / warehouse.",
        });
        await logActivity(po.released_order_id, "receiving_exception", `${statusLabel(condition)} reported for ${itemLabel(item)} (qty ${qty}).`);
      }
      await syncReleasedOrderStatus(po.released_order_id);
    }
    setSaving(false);
    onReceived();
  }

  return (
    <div className="rounded-xl border border-border bg-forge-surface/40">
      <button onClick={onToggle} className="flex w-full flex-wrap items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-forge-surface/20">
        <svg width="14" height="14" viewBox="0 0 12 12" fill="none" className={`shrink-0 text-subtle transition-transform ${isActive ? "rotate-90" : ""}`}><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        <span className="font-mono text-[13px] font-bold text-rose-400">{po.po_number}</span>
        <span className="text-[13px] text-body">{itemLabel(item)}</span>
        <span className="text-[12px] text-subtle">{projectName}{jobNumber && ` · #${jobNumber}`}</span>
        <span className="ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: statusColor(item.status) + "1a", color: statusColor(item.status) }}>{statusLabel(item.status)}</span>
        <span className="text-[12px] text-subtle">Remaining: {remaining}</span>
      </button>
      {isActive && (
        <div className="border-t border-border px-5 py-4">
          <div className="mb-4 grid grid-cols-4 gap-4 text-[12px]">
            <div><p className="text-faint">Ordered</p><p className="font-semibold text-body">{line.qty_ordered}</p></div>
            <div><p className="text-faint">Previously Received</p><p className="font-semibold text-body">{item.received_qty}</p></div>
            <div><p className="text-faint">Receiving Now</p><p className="font-semibold text-heading">{qty}</p></div>
            <div><p className="text-faint">Remaining After</p><p className="font-semibold text-body">{Math.max(0, remaining - qty)}</p></div>
          </div>
          {trackingNumbers.length > 0 && <p className="mb-3 text-[11px] text-subtle">Tracking: <span className="font-mono text-blue-400">{trackingNumbers.join(", ")}</span></p>}
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faint">Quantity</label>
              <input type="number" min={0} max={remaining} value={qty} onChange={(e) => setQty(Math.max(0, Math.min(remaining, +e.target.value)))} className="forge-input w-full text-[13px]" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faint">Condition</label>
              <select value={condition} onChange={(e) => setCondition(e.target.value as ReceivingCondition)} className="forge-input w-full text-[13px]">
                {CONDITIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faint">Notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Packing slip #, damage description, etc." className="forge-input w-full text-[13px]" />
          </div>
          <button onClick={receive} disabled={saving || qty <= 0} className="forge-btn-primary text-[13px] disabled:opacity-50">{saving ? "Saving…" : "Confirm Receipt"}</button>
        </div>
      )}
    </div>
  );
}
