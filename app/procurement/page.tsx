"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useOrg } from "@/components/OrgProvider";
import VendorManagerModal from "@/components/VendorManagerModal";
import {
  fmt$, fmtDate, statusColor, statusLabel, todayISO,
  procurementCompletionPct, computeReadiness, READINESS_LABEL, READINESS_COLOR,
  type ReleasedOrder, type ProcurementItem, type VendorPurchaseOrder, type ProcurementException, type Vendor,
} from "@/lib/procurement";

interface ProjectLite { id: string; name: string; job_number: string; client_name: string; }

export default function ProcurementDashboardPage() {
  const { activeOrg, loading: orgLoading } = useOrg();
  const [orders, setOrders] = useState<ReleasedOrder[]>([]);
  const [projects, setProjects] = useState<Record<string, ProjectLite>>({});
  const [items, setItems] = useState<ProcurementItem[]>([]);
  const [pos, setPOs] = useState<VendorPurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [showVendors, setShowVendors] = useState(false);
  const [exceptions, setExceptions] = useState<ProcurementException[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const loadVendors = async () => {
    if (!activeOrg) return;
    const { data } = await supabase.from("vendors").select("*").eq("org_id", activeOrg.id).order("name");
    setVendors((data || []) as Vendor[]);
  };

  useEffect(() => {
    if (orgLoading) return;
    if (!activeOrg) { setLoading(false); return; }
    let cancelled = false;
    loadVendors();

    async function load() {
      const { data: releasedOrders } = await supabase
        .from("released_orders").select("*").eq("org_id", activeOrg!.id).order("released_at", { ascending: false });
      if (cancelled) return;
      const orderRows = (releasedOrders || []) as ReleasedOrder[];
      setOrders(orderRows);

      const projectIds = [...new Set(orderRows.map((o) => o.project_id))];
      if (projectIds.length > 0) {
        const { data: projectRows } = await supabase.from("projects").select("id, name, job_number, client_name").in("id", projectIds);
        if (!cancelled && projectRows) {
          setProjects(Object.fromEntries(projectRows.map((p) => [p.id, p as ProjectLite])));
        }
      }

      const { data: itemRows } = await supabase.from("procurement_items").select("*").eq("org_id", activeOrg!.id);
      if (!cancelled) setItems((itemRows || []) as ProcurementItem[]);

      const { data: poRows } = await supabase.from("vendor_purchase_orders").select("*").eq("org_id", activeOrg!.id);
      if (!cancelled) setPOs((poRows || []) as VendorPurchaseOrder[]);

      const orderIds = orderRows.map((o) => o.id);
      if (orderIds.length > 0) {
        const { data: exRows } = await supabase.from("procurement_exceptions").select("*").in("released_order_id", orderIds);
        if (!cancelled) setExceptions((exRows || []) as ProcurementException[]);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [activeOrg?.id, orgLoading]);

  const rows = useMemo(() => orders.map((order) => {
    const orderItems = items.filter((i) => i.released_order_id === order.id);
    const orderPOs = pos.filter((po) => po.released_order_id === order.id);
    const openExceptions = exceptions.filter((e) => e.released_order_id === order.id && e.status !== "resolved");
    const project = projects[order.project_id];

    const equipmentSell = orderItems.reduce((s, i) => s + i.qty * i.sell_price, 0);
    const equipmentCost = orderItems.reduce((s, i) => s + i.qty * i.estimated_unit_cost, 0);
    const issuedPOs = orderPOs.filter((po) => !["draft", "ready_for_review"].includes(po.status));
    const receivingPct = procurementCompletionPct(orderItems);
    const readiness = computeReadiness(orderItems, openExceptions);

    const etaDates = orderItems.map((i) => i.expected_delivery_date).filter(Boolean) as string[];
    const earliestETA = etaDates.length ? etaDates.reduce((a, b) => (a < b ? a : b)) : null;
    const latestETA = etaDates.length ? etaDates.reduce((a, b) => (a > b ? a : b)) : null;

    const isLate = orderItems.some((i) => i.expected_delivery_date && i.expected_delivery_date < todayISO() && i.received_qty < i.qty);
    const hasBackorder = orderItems.some((i) => i.status === "backordered");
    const hasCostVariance = openExceptions.some((e) => e.type === "cost_variance");
    const hasAwaitingAck = orderPOs.some((po) => po.status === "issued");
    const notOrdered = orderItems.some((i) => i.status === "ready_to_order");
    const manufacturers = [...new Set(orderItems.map((i) => i.manufacturer).filter(Boolean))];
    const releasedThisWeek = (Date.now() - new Date(order.released_at).getTime()) < 7 * 86400000;
    const complete = orderItems.length > 0 && receivingPct === 100;

    return {
      order, project, orderItems, orderPOs, openExceptions,
      equipmentSell, equipmentCost, issuedPOs, receivingPct, readiness,
      earliestETA, latestETA, isLate, hasBackorder, hasCostVariance, hasAwaitingAck, notOrdered,
      manufacturers, releasedThisWeek, complete,
    };
  }), [orders, items, pos, exceptions, projects]);

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      (r.project?.name || "").toLowerCase().includes(q) ||
      r.order.order_number.toLowerCase().includes(q) ||
      r.order.customer_po_number.toLowerCase().includes(q) ||
      (r.project?.client_name || "").toLowerCase().includes(q) ||
      r.manufacturers.some((m) => m.toLowerCase().includes(q)) ||
      r.orderPOs.some((po) => po.po_number.toLowerCase().includes(q));
    if (!matchesSearch) return false;
    switch (filter) {
      case "not_ordered": return r.notOrdered;
      case "awaiting_ack": return r.hasAwaitingAck;
      case "backordered": return r.hasBackorder;
      case "late": return r.isLate;
      case "cost_variance": return r.hasCostVariance;
      case "released_this_week": return r.releasedThisWeek;
      case "complete": return r.complete;
      default: return true;
    }
  });

  const kpis = [
    { label: "Released, Awaiting Procurement", value: rows.filter((r) => r.order.status === "released").length, color: "#8b5cf6" },
    { label: "Currently Being Procured", value: rows.filter((r) => ["procurement_in_progress", "partially_received"].includes(r.order.status)).length, color: "#3b82f6" },
    { label: "Open Purchase Orders", value: pos.filter((po) => !["closed", "cancelled", "received"].includes(po.status)).length, color: "#06b6d4" },
    { label: "POs Awaiting Acknowledgement", value: pos.filter((po) => po.status === "issued").length, color: "#f59e0b" },
    { label: "Backordered Items", value: items.filter((i) => i.status === "backordered").length, color: "#ef4444" },
    { label: "Late Orders", value: rows.filter((r) => r.isLate).length, color: "#ef4444" },
    { label: "Orders with Cost Variance", value: rows.filter((r) => r.hasCostVariance).length, color: "#f97316" },
  ];

  const FILTERS = [
    { id: "all", label: "All" },
    { id: "released_this_week", label: "Released This Week" },
    { id: "not_ordered", label: "Not Ordered" },
    { id: "awaiting_ack", label: "Awaiting ACK" },
    { id: "backordered", label: "Backordered" },
    { id: "late", label: "Late" },
    { id: "cost_variance", label: "Cost Variance" },
    { id: "complete", label: "Procurement Complete" },
  ];

  if (orgLoading || loading) {
    return <div className="animate-fade-in px-4 py-20 text-center text-sm text-subtle sm:px-6 lg:px-8">Loading...</div>;
  }

  return (
    <div className="animate-fade-in px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-xl font-bold text-heading">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-400">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
            </svg>
            Procurement
          </h1>
          <p className="mt-1 text-[13px] text-subtle">Released orders across your organization, from purchasing through receiving.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowVendors(true)} className="rounded-lg border border-border bg-forge-surface/60 px-4 py-2 text-[13px] font-medium text-body transition-colors hover:bg-forge-surface">
            Vendors
          </button>
          <Link href="/procurement/receiving" className="rounded-lg border border-border bg-forge-surface/60 px-4 py-2 text-[13px] font-medium text-body transition-colors hover:bg-forge-surface">
            Receiving
          </Link>
        </div>
      </div>

      {showVendors && activeOrg && (
        <VendorManagerModal orgId={activeOrg.id} vendors={vendors} onClose={() => setShowVendors(false)} onChange={loadVendors} />
      )}

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-forge-surface/40 p-4">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-faint">{k.label}</p>
            <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" /><path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search project, order #, PO, customer..." className="forge-input w-full pl-9 text-[13px]" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${filter === f.id ? "bg-rose-500/15 text-rose-400" : "bg-forge-surface/40 text-muted hover:bg-forge-surface/60"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-forge-surface/30 py-20 text-center text-sm text-subtle">
          {rows.length === 0 ? "No released orders yet. Release a project's proposal from its Procurement page to get started." : "No orders match this filter."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-border bg-forge-panel/60 text-[11px] font-semibold uppercase tracking-wider text-subtle">
                <th className="px-3 py-3">Project</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Order #</th>
                <th className="px-3 py-3">Customer PO</th>
                <th className="px-3 py-3">Released</th>
                <th className="px-3 py-3 text-right">Equipment Sell</th>
                <th className="px-3 py-3 text-right">Equipment Cost</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">PO Progress</th>
                <th className="px-3 py-3">Receiving</th>
                <th className="px-3 py-3">Readiness</th>
                <th className="px-3 py-3 text-center">Exceptions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.order.id} className="cursor-pointer border-b border-border/50 transition-colors hover:bg-forge-surface/20" onClick={() => window.location.assign(`/procurement/${r.order.id}`)}>
                  <td className="px-3 py-3 font-medium text-heading">{r.project?.name || "—"}</td>
                  <td className="px-3 py-3 text-muted">{r.project?.client_name || "—"}</td>
                  <td className="px-3 py-3 font-mono text-[12px] text-rose-400">{r.order.order_number}</td>
                  <td className="px-3 py-3 text-muted">{r.order.customer_po_number || "—"}</td>
                  <td className="px-3 py-3 text-subtle">{fmtDate(r.order.released_at)}</td>
                  <td className="px-3 py-3 text-right font-medium text-heading">{fmt$(r.equipmentSell)}</td>
                  <td className="px-3 py-3 text-right text-muted">{fmt$(r.equipmentCost)}</td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: statusColor(r.order.status) + "1a", color: statusColor(r.order.status), border: `1px solid ${statusColor(r.order.status)}3d` }}>
                      {statusLabel(r.order.status)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[12px] text-subtle">{r.issuedPOs.length}/{r.orderPOs.length || 0} POs Issued</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-forge-panel/60">
                        <div className="h-full rounded-full" style={{ width: `${r.receivingPct}%`, backgroundColor: r.receivingPct === 100 ? "#22c55e" : "#8b5cf6" }} />
                      </div>
                      <span className="text-[11px] text-subtle">{r.receivingPct}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-[11px] font-semibold" style={{ color: READINESS_COLOR[r.readiness] }}>{READINESS_LABEL[r.readiness]}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {r.openExceptions.length > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-400">{r.openExceptions.length}</span>
                    ) : <span className="text-faint">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
