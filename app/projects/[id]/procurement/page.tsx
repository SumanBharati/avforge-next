"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

/* ══════════════════════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════════════════════ */
interface Project { id: string; name: string; job_number: string; }

interface ProcurementLine {
  id: string; manufacturer: string; model: string; description: string;
  category: string; qtyNeeded: number; qtyOrdered: number; qtyReceived: number;
  unitCost: number; vendorId: string; poId: string;
  status: "pending" | "ordered" | "partial" | "received" | "backordered" | "cancelled";
  notes: string;
}

interface PurchaseOrder {
  id: string; number: string; vendorId: string; date: string;
  status: "draft" | "submitted" | "acknowledged" | "shipped" | "partial" | "received" | "closed" | "cancelled";
  shippingMethod: string; deliveryAddress: string;
  expectedShipDate: string; expectedDeliveryDate: string; actualDeliveryDate: string;
  trackingNumbers: string; carrier: string;
  subtotal: number; tax: number; shipping: number;
  notes: string; lineIds: string[];
}

interface Vendor {
  id: string; name: string; contactName: string; email: string; phone: string;
  accountNumber: string; paymentTerms: string; leadTime: string;
  address: string; website: string; notes: string;
}

interface ReceivingLog {
  id: string; poId: string; date: string; receivedBy: string;
  lineItems: { lineId: string; qtyReceived: number; condition: "good" | "damaged" | "wrong_item"; notes: string }[];
  notes: string;
}

interface ProcurementData {
  lines: ProcurementLine[];
  purchaseOrders: PurchaseOrder[];
  vendors: Vendor[];
  receivingLog: ReceivingLog[];
  importedFromProposal: boolean;
}

const emptyData: ProcurementData = {
  lines: [], purchaseOrders: [], vendors: [], receivingLog: [], importedFromProposal: false,
};

/* ── Helpers ───────────────────────────────────────────────── */
const uid = () => crypto.randomUUID();
const fmt$ = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d: string) => d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const today = () => new Date().toISOString().split("T")[0];
const statusLabel = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const LINE_STATUSES: ProcurementLine["status"][] = ["pending", "ordered", "partial", "received", "backordered", "cancelled"];
const PO_STATUSES: PurchaseOrder["status"][] = ["draft", "submitted", "acknowledged", "shipped", "partial", "received", "closed", "cancelled"];
const CATEGORIES = ["Display", "Audio", "Video Processing", "Control System", "Cabling", "Mounting Hardware", "Networking", "Miscellaneous"];
const PAYMENT_TERMS = ["Net 15", "Net 30", "Net 45", "Net 60", "Due on Receipt", "Credit Card", "Prepaid", "Other"];
const CONDITIONS: ReceivingLog["lineItems"][0]["condition"][] = ["good", "damaged", "wrong_item"];

const statusColor = (s: string) => {
  const map: Record<string, string> = {
    pending: "#f59e0b", ordered: "#8b5cf6", partial: "#f97316", received: "#22c55e",
    backordered: "#ef4444", cancelled: "#94a3b8",
    draft: "#94a3b8", submitted: "#8b5cf6", acknowledged: "#8b5cf6", shipped: "#06b6d4",
    closed: "#22c55e",
    good: "#22c55e", damaged: "#ef4444", wrong_item: "#f97316",
  };
  return map[s] || "#94a3b8";
};

/* ── Sidebar nav ───────────────────────────────────────────── */
type TabId = "overview" | "lines" | "purchase-orders" | "vendors" | "receiving" | "tracking";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { id: "lines", label: "Procurement Lines", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
  { id: "purchase-orders", label: "Purchase Orders", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
  { id: "vendors", label: "Vendors", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { id: "receiving", label: "Receiving", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg> },
  { id: "tracking", label: "Order Tracking", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> },
];

/* ═══════════════════════════════════════════════════════════ */
export default function ProcurementPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<Project | null>(null);
  const [data, setData] = useState<ProcurementData>(emptyData);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [saved, setSaved] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [expandedPO, setExpandedPO] = useState<string | null>(null);
  const [showReceiveModal, setShowReceiveModal] = useState<string | null>(null);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  /* ── Load ──────────────────────────────────────── */
  useEffect(() => {
    supabase.from("projects").select("id, name, job_number").eq("id", params.id).single()
      .then(({ data: p }) => { if (p) setProject(p); });
    supabase.from("procurement").select("data").eq("project_id", params.id).single()
      .then(({ data: row }) => { if (row?.data) setData({ ...emptyData, ...(row.data as ProcurementData) }); });
  }, [params.id]);

  /* ── Auto-save ─────────────────────────────────── */
  const autoSave = useCallback(async (d: ProcurementData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: existing } = await supabase.from("procurement").select("id").eq("project_id", params.id).single();
    if (existing) {
      await supabase.from("procurement").update({ data: d, updated_at: new Date().toISOString() }).eq("project_id", params.id);
    } else {
      await supabase.from("procurement").insert({ project_id: params.id, user_id: user.id, data: d });
    }
  }, [params.id]);

  function persist(next: ProcurementData) {
    setData(next);
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => autoSave(next), 1200);
  }

  async function handleSave() { await autoSave(data); setSaved(true); setTimeout(() => setSaved(false), 2000); }

  /* ── Import from Proposal ──────────────────────── */
  async function importFromProposal() {
    const { data: row } = await supabase.from("proposals").select("data").eq("project_id", params.id).single();
    if (!row?.data) return;
    const proposal = row.data as { sections: { items: { id: string; category: string; manufacturer: string; model: string; description: string; qty: number; unitCost: number }[] }[] };
    const newLines: ProcurementLine[] = [];
    for (const section of proposal.sections || []) {
      for (const item of section.items || []) {
        if (data.lines.some((l) => l.manufacturer === item.manufacturer && l.model === item.model)) continue;
        newLines.push({
          id: uid(), manufacturer: item.manufacturer, model: item.model,
          description: item.description, category: item.category,
          qtyNeeded: item.qty, qtyOrdered: 0, qtyReceived: 0,
          unitCost: item.unitCost, vendorId: "", poId: "",
          status: "pending", notes: "",
        });
      }
    }
    if (newLines.length > 0) {
      persist({ ...data, lines: [...data.lines, ...newLines], importedFromProposal: true });
    }
    setShowImportModal(false);
  }

  /* ── CRUD: Lines ───────────────────────────────── */
  function addLine() {
    persist({ ...data, lines: [...data.lines, { id: uid(), manufacturer: "", model: "", description: "", category: CATEGORIES[0], qtyNeeded: 1, qtyOrdered: 0, qtyReceived: 0, unitCost: 0, vendorId: "", poId: "", status: "pending", notes: "" }] });
  }
  function updateLine(id: string, patch: Partial<ProcurementLine>) { persist({ ...data, lines: data.lines.map((l) => l.id === id ? { ...l, ...patch } : l) }); }
  function removeLine(id: string) { persist({ ...data, lines: data.lines.filter((l) => l.id !== id) }); }

  /* ── CRUD: Purchase Orders ─────────────────────── */
  function createPO(vendorId?: string) {
    const num = `PO-${String(data.purchaseOrders.length + 1).padStart(3, "0")}`;
    const po: PurchaseOrder = { id: uid(), number: num, vendorId: vendorId || "", date: today(), status: "draft", shippingMethod: "", deliveryAddress: "", expectedShipDate: "", expectedDeliveryDate: "", actualDeliveryDate: "", trackingNumbers: "", carrier: "", subtotal: 0, tax: 0, shipping: 0, notes: "", lineIds: [] };
    persist({ ...data, purchaseOrders: [...data.purchaseOrders, po] });
    setExpandedPO(po.id);
    setActiveTab("purchase-orders");
  }
  function updatePO(id: string, patch: Partial<PurchaseOrder>) { persist({ ...data, purchaseOrders: data.purchaseOrders.map((po) => po.id === id ? { ...po, ...patch } : po) }); }
  function removePO(id: string) {
    const freed = data.lines.map((l) => l.poId === id ? { ...l, poId: "", status: "pending" as const, qtyOrdered: 0 } : l);
    persist({ ...data, purchaseOrders: data.purchaseOrders.filter((po) => po.id !== id), lines: freed });
  }
  function addLineToPO(poId: string, lineId: string) {
    const po = data.purchaseOrders.find((p) => p.id === poId);
    if (!po || po.lineIds.includes(lineId)) return;
    const line = data.lines.find((l) => l.id === lineId);
    if (!line) return;
    const updatedPO = { ...po, lineIds: [...po.lineIds, lineId] };
    const updatedLine = { ...line, poId, status: "ordered" as const, qtyOrdered: line.qtyNeeded };
    persist({
      ...data,
      purchaseOrders: data.purchaseOrders.map((p) => p.id === poId ? updatedPO : p),
      lines: data.lines.map((l) => l.id === lineId ? updatedLine : l),
    });
  }
  function removeLineFromPO(poId: string, lineId: string) {
    const po = data.purchaseOrders.find((p) => p.id === poId);
    if (!po) return;
    persist({
      ...data,
      purchaseOrders: data.purchaseOrders.map((p) => p.id === poId ? { ...p, lineIds: p.lineIds.filter((id) => id !== lineId) } : p),
      lines: data.lines.map((l) => l.id === lineId ? { ...l, poId: "", status: "pending" as const, qtyOrdered: 0 } : l),
    });
  }

  /* ── CRUD: Vendors ─────────────────────────────── */
  function addVendor() {
    persist({ ...data, vendors: [...data.vendors, { id: uid(), name: "", contactName: "", email: "", phone: "", accountNumber: "", paymentTerms: PAYMENT_TERMS[1], leadTime: "", address: "", website: "", notes: "" }] });
  }
  function updateVendor(id: string, patch: Partial<Vendor>) { persist({ ...data, vendors: data.vendors.map((v) => v.id === id ? { ...v, ...patch } : v) }); }
  function removeVendor(id: string) { persist({ ...data, vendors: data.vendors.filter((v) => v.id !== id) }); }

  /* ── CRUD: Receiving ───────────────────────────── */
  function createReceivingLog(poId: string) {
    const po = data.purchaseOrders.find((p) => p.id === poId);
    if (!po) return;
    const logItems = po.lineIds.map((lid) => {
      const line = data.lines.find((l) => l.id === lid);
      return { lineId: lid, qtyReceived: line ? line.qtyNeeded - line.qtyReceived : 0, condition: "good" as const, notes: "" };
    });
    const log: ReceivingLog = { id: uid(), poId, date: today(), receivedBy: "", lineItems: logItems, notes: "" };
    persist({ ...data, receivingLog: [log, ...data.receivingLog] });
    setShowReceiveModal(null);
    setActiveTab("receiving");
  }

  function confirmReceiving(logId: string) {
    const log = data.receivingLog.find((r) => r.id === logId);
    if (!log) return;
    let updatedLines = [...data.lines];
    for (const item of log.lineItems) {
      updatedLines = updatedLines.map((l) => {
        if (l.id !== item.lineId) return l;
        const newReceived = l.qtyReceived + item.qtyReceived;
        const newStatus: ProcurementLine["status"] = newReceived >= l.qtyNeeded ? "received" : newReceived > 0 ? "partial" : l.status;
        return { ...l, qtyReceived: newReceived, status: newStatus };
      });
    }
    const po = data.purchaseOrders.find((p) => p.id === log.poId);
    let updatedPOs = data.purchaseOrders;
    if (po) {
      const allReceived = po.lineIds.every((lid) => {
        const line = updatedLines.find((l) => l.id === lid);
        return line && line.qtyReceived >= line.qtyNeeded;
      });
      const anyReceived = po.lineIds.some((lid) => {
        const line = updatedLines.find((l) => l.id === lid);
        return line && line.qtyReceived > 0;
      });
      const newPoStatus: PurchaseOrder["status"] = allReceived ? "received" : anyReceived ? "partial" : po.status;
      updatedPOs = updatedPOs.map((p) => p.id === po.id ? { ...p, status: newPoStatus, actualDeliveryDate: allReceived ? today() : p.actualDeliveryDate } : p);
    }
    persist({ ...data, lines: updatedLines, purchaseOrders: updatedPOs });
  }
  function updateReceivingLog(id: string, patch: Partial<ReceivingLog>) { persist({ ...data, receivingLog: data.receivingLog.map((r) => r.id === id ? { ...r, ...patch } : r) }); }
  function removeReceivingLog(id: string) { persist({ ...data, receivingLog: data.receivingLog.filter((r) => r.id !== id) }); }

  /* ── Computed ──────────────────────────────────── */
  const getVendorName = (id: string) => data.vendors.find((v) => v.id === id)?.name || "—";
  const getPONumber = (id: string) => data.purchaseOrders.find((p) => p.id === id)?.number || "—";
  const totalNeeded = data.lines.reduce((s, l) => s + l.qtyNeeded * l.unitCost, 0);
  const totalOrdered = data.lines.filter((l) => l.status !== "pending" && l.status !== "cancelled").reduce((s, l) => s + l.qtyOrdered * l.unitCost, 0);
  const totalReceived = data.lines.filter((l) => l.qtyReceived > 0).reduce((s, l) => s + l.qtyReceived * l.unitCost, 0);
  const pendingLines = data.lines.filter((l) => l.status === "pending");
  const unassignedLines = data.lines.filter((l) => !l.poId && l.status !== "cancelled");
  const overduePOs = data.purchaseOrders.filter((po) => po.expectedDeliveryDate && po.expectedDeliveryDate < today() && po.status !== "received" && po.status !== "closed" && po.status !== "cancelled");

  if (!project) {
    return (
      <div className="animate-fade-in px-4 py-6 sm:px-6 lg:px-8">
        <Link href="/projects" className="mb-4 inline-flex items-center gap-1.5 text-sm text-subtle hover:text-secondary">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          Back to Projects
        </Link>
        <div className="mt-20 text-center text-sm text-subtle">Loading...</div>
      </div>
    );
  }

  /* ── Shared UI ─────────────────────────────────── */
  const Badge = ({ label, color }: { label: string; color: string }) => (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: color + "1a", color, border: `1px solid ${color}3d` }}>{statusLabel(label)}</span>
  );
  const DeleteBtn = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} className="shrink-0 rounded p-1.5 text-faint transition-colors hover:bg-red-500/10 hover:text-red-400" title="Delete">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
    </button>
  );
  const SectionHeader = ({ title, count, onAdd, addLabel, extra }: { title: string; count: number; onAdd: () => void; addLabel: string; extra?: React.ReactNode }) => (
    <div className="mb-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-heading">{title}</h2>
        <span className="rounded-md bg-forge-surface/60 px-2 py-0.5 text-[11px] text-subtle">{count}</span>
      </div>
      <div className="flex items-center gap-2">
        {extra}
        <button onClick={onAdd} className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-3 py-1.5 text-[12px] font-semibold text-rose-400 transition-colors hover:bg-rose-500/20">
          <svg width="12" height="12" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          {addLabel}
        </button>
      </div>
    </div>
  );
  const InputField = ({ label, value, onChange, type = "text", placeholder = "" }: { label: string; value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string }) => (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faint">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="forge-input w-full text-[13px]" />
    </div>
  );
  const TextareaField = ({ label, value, onChange, placeholder = "", rows = 3 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) => (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faint">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="forge-input w-full resize-none text-[13px]" />
    </div>
  );
  const SelectField = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) => (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faint">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="forge-input w-full text-[13px]">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
  const MetricCard = ({ label, value, sub, color = "#f43f5e" }: { label: string; value: string | number; sub?: string; color?: string }) => (
    <div className="rounded-xl border border-border bg-forge-surface/40 p-5">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-faint">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="mt-1 text-[12px] text-subtle">{sub}</p>}
    </div>
  );

  /* ═══════════════════════════════════════════════════════════
     Tab Renderers
     ═══════════════════════════════════════════════════════════ */

  /* ── Overview ──────────────────────────────────── */
  function renderOverview() {
    return (
      <div>
        <h2 className="mb-6 text-lg font-bold text-heading">Procurement Dashboard</h2>

        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label="Total Equipment Cost" value={fmt$(totalNeeded)} sub={`${data.lines.length} line items`} color="#8b5cf6" />
          <MetricCard label="Ordered" value={fmt$(totalOrdered)} sub={`${data.lines.filter((l) => l.qtyOrdered > 0).length} items ordered`} color="#8b5cf6" />
          <MetricCard label="Received" value={fmt$(totalReceived)} sub={`${data.lines.filter((l) => l.status === "received").length} fully received`} color="#22c55e" />
          <MetricCard label="Pending Order" value={pendingLines.length} sub={pendingLines.length > 0 ? fmt$(pendingLines.reduce((s, l) => s + l.qtyNeeded * l.unitCost, 0)) + " value" : "All ordered"} color={pendingLines.length > 0 ? "#f59e0b" : "#22c55e"} />
        </div>

        {/* Import from proposal */}
        {!data.importedFromProposal && data.lines.length === 0 && (
          <div className="mb-8 rounded-xl border-2 border-dashed border-rose-500/30 bg-rose-500/5 p-8 text-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-rose-400">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <h3 className="mb-2 text-[15px] font-bold text-heading">Import Equipment from Proposal</h3>
            <p className="mb-4 text-[13px] text-subtle">Pull your approved BOM line items directly into procurement to start ordering</p>
            <button onClick={() => setShowImportModal(true)} className="forge-btn-primary text-[13px]">Import from Proposal</button>
          </div>
        )}

        {/* Alerts */}
        {overduePOs.length > 0 && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-[13px] font-bold text-red-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Overdue Deliveries
            </h3>
            {overduePOs.map((po) => (
              <div key={po.id} className="ml-6 text-[12px] text-red-300">
                {po.number} — expected {fmtDate(po.expectedDeliveryDate)} ({getVendorName(po.vendorId)})
              </div>
            ))}
          </div>
        )}

        {unassignedLines.length > 0 && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <h3 className="mb-1 text-[13px] font-bold text-amber-400">{unassignedLines.length} items not yet assigned to a Purchase Order</h3>
            <p className="text-[12px] text-amber-300/70">Go to Purchase Orders to create POs and assign these items</p>
          </div>
        )}

        {/* PO summary */}
        {data.purchaseOrders.length > 0 && (
          <div className="rounded-xl border border-border bg-forge-surface/40 p-5">
            <h3 className="mb-3 text-sm font-bold text-heading">Purchase Orders</h3>
            <div className="space-y-2">
              {data.purchaseOrders.map((po) => {
                const poLines = data.lines.filter((l) => po.lineIds.includes(l.id));
                const poTotal = poLines.reduce((s, l) => s + l.qtyOrdered * l.unitCost, 0);
                return (
                  <div key={po.id} className="flex items-center gap-4 rounded-lg bg-forge-panel/30 px-4 py-3">
                    <span className="text-[13px] font-bold text-rose-400">{po.number}</span>
                    <span className="text-[12px] text-muted">{getVendorName(po.vendorId)}</span>
                    <Badge label={po.status} color={statusColor(po.status)} />
                    <span className="ml-auto text-[12px] text-subtle">{poLines.length} items</span>
                    <span className="text-[13px] font-semibold text-heading">{fmt$(poTotal)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Vendor summary */}
        {data.vendors.length > 0 && (
          <div className="mt-6 rounded-xl border border-border bg-forge-surface/40 p-5">
            <h3 className="mb-3 text-sm font-bold text-heading">Vendors</h3>
            <div className="grid gap-2 lg:grid-cols-2">
              {data.vendors.map((v) => {
                const vendorPOs = data.purchaseOrders.filter((po) => po.vendorId === v.id);
                return (
                  <div key={v.id} className="flex items-center gap-3 rounded-lg bg-forge-panel/30 px-4 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-[11px] font-bold text-rose-400">
                      {v.name ? v.name.slice(0, 2).toUpperCase() : "?"}
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-heading">{v.name || "Unnamed"}</p>
                      <p className="text-[11px] text-subtle">{v.contactName} {v.phone && `· ${v.phone}`}</p>
                    </div>
                    <span className="text-[11px] text-faint">{vendorPOs.length} PO{vendorPOs.length !== 1 ? "s" : ""}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── Procurement Lines ─────────────────────────── */
  function renderLines() {
    return (
      <div>
        <SectionHeader
          title="Procurement Lines"
          count={data.lines.length}
          onAdd={addLine}
          addLabel="Add Item"
          extra={
            <button onClick={() => setShowImportModal(true)} className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-1.5 text-[12px] font-semibold text-blue-400 transition-colors hover:bg-blue-500/20">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              Import from Proposal
            </button>
          }
        />

        {data.lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="mb-3 text-sm text-faint">No procurement lines yet</p>
            <div className="flex gap-3">
              <button onClick={addLine} className="forge-btn-primary text-[13px]">Add Manually</button>
              <button onClick={() => setShowImportModal(true)} className="rounded-lg border border-border bg-forge-surface/60 px-4 py-2 text-[13px] font-medium text-body transition-colors hover:bg-forge-surface">Import from Proposal</button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-border bg-forge-panel/60 text-[11px] font-semibold uppercase tracking-wider text-subtle">
                  <th className="px-3 py-3">Category</th>
                  <th className="px-3 py-3">Manufacturer</th>
                  <th className="px-3 py-3">Model</th>
                  <th className="min-w-[160px] px-3 py-3">Description</th>
                  <th className="px-3 py-3 text-center">Need</th>
                  <th className="px-3 py-3 text-center">Ordered</th>
                  <th className="px-3 py-3 text-center">Recv&apos;d</th>
                  <th className="px-3 py-3 text-right">Unit Cost</th>
                  <th className="px-3 py-3 text-right">Ext. Cost</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">PO</th>
                  <th className="w-10 px-2" />
                </tr>
              </thead>
              <tbody>
                {data.lines.map((line) => (
                  <tr key={line.id} className="border-b border-border/50 transition-colors hover:bg-forge-surface/20">
                    <td className="px-3 py-2">
                      <select value={line.category} onChange={(e) => updateLine(line.id, { category: e.target.value })} className="w-full border-none bg-transparent text-[12px] text-body outline-none">
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2"><input value={line.manufacturer} onChange={(e) => updateLine(line.id, { manufacturer: e.target.value })} className="w-full border-none bg-transparent text-[13px] text-body outline-none" placeholder="Mfr" /></td>
                    <td className="px-3 py-2"><input value={line.model} onChange={(e) => updateLine(line.id, { model: e.target.value })} className="w-full border-none bg-transparent text-[13px] text-body outline-none" placeholder="Model" /></td>
                    <td className="px-3 py-2"><input value={line.description} onChange={(e) => updateLine(line.id, { description: e.target.value })} className="w-full border-none bg-transparent text-[13px] text-muted outline-none" placeholder="Description" /></td>
                    <td className="px-3 py-2 text-center"><input type="number" value={line.qtyNeeded || ""} onChange={(e) => updateLine(line.id, { qtyNeeded: +e.target.value })} className="w-14 border-none bg-transparent text-center text-[13px] text-body outline-none" /></td>
                    <td className="px-3 py-2 text-center text-[13px]" style={{ color: line.qtyOrdered >= line.qtyNeeded && line.qtyNeeded > 0 ? "#22c55e" : "#f59e0b" }}>{line.qtyOrdered}</td>
                    <td className="px-3 py-2 text-center text-[13px]" style={{ color: line.qtyReceived >= line.qtyNeeded && line.qtyNeeded > 0 ? "#22c55e" : line.qtyReceived > 0 ? "#f97316" : "#94a3b8" }}>{line.qtyReceived}</td>
                    <td className="px-3 py-2 text-right"><input type="number" value={line.unitCost || ""} onChange={(e) => updateLine(line.id, { unitCost: +e.target.value })} className="w-20 border-none bg-transparent text-right text-[13px] text-body outline-none" placeholder="0" /></td>
                    <td className="px-3 py-2 text-right text-[13px] font-medium text-heading">{fmt$(line.qtyNeeded * line.unitCost)}</td>
                    <td className="px-3 py-2">
                      <select value={line.status} onChange={(e) => updateLine(line.id, { status: e.target.value as ProcurementLine["status"] })} className="border-none bg-transparent text-[11px] font-semibold outline-none" style={{ color: statusColor(line.status) }}>
                        {LINE_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-subtle">{line.poId ? getPONumber(line.poId) : "—"}</td>
                    <td className="px-2 py-2"><DeleteBtn onClick={() => removeLine(line.id)} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-forge-panel/40 text-[12px] font-bold text-heading">
                  <td colSpan={8} className="px-3 py-3">TOTAL</td>
                  <td className="px-3 py-3 text-right">{fmt$(totalNeeded)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    );
  }

  /* ── Purchase Orders ───────────────────────────── */
  function renderPurchaseOrders() {
    return (
      <div>
        <SectionHeader title="Purchase Orders" count={data.purchaseOrders.length} onAdd={() => createPO()} addLabel="New PO" />

        {data.purchaseOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="mb-3 text-sm text-faint">No purchase orders yet</p>
            <button onClick={() => createPO()} className="forge-btn-primary text-[13px]">Create Purchase Order</button>
          </div>
        ) : (
          <div className="space-y-4">
            {data.purchaseOrders.map((po) => {
              const isExpanded = expandedPO === po.id;
              const poLines = data.lines.filter((l) => po.lineIds.includes(l.id));
              const poTotal = poLines.reduce((s, l) => s + l.qtyOrdered * l.unitCost, 0) + po.tax + po.shipping;
              const availableLines = data.lines.filter((l) => !l.poId && l.status !== "cancelled");

              return (
                <div key={po.id} className="rounded-xl border border-border bg-forge-surface/40">
                  {/* PO Header */}
                  <button onClick={() => setExpandedPO(isExpanded ? null : po.id)} className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-forge-surface/20">
                    <svg width="14" height="14" viewBox="0 0 12 12" fill="none" className={`shrink-0 text-subtle transition-transform ${isExpanded ? "rotate-90" : ""}`}>
                      <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <span className="text-[15px] font-bold text-rose-400">{po.number}</span>
                    <span className="text-[13px] text-muted">{getVendorName(po.vendorId)}</span>
                    <Badge label={po.status} color={statusColor(po.status)} />
                    <span className="text-[12px] text-subtle">{fmtDate(po.date)}</span>
                    <span className="ml-auto text-[12px] text-subtle">{poLines.length} items</span>
                    <span className="text-[14px] font-bold text-heading">{fmt$(poTotal)}</span>
                    <DeleteBtn onClick={() => removePO(po.id)} />
                  </button>

                  {/* Expanded PO */}
                  {isExpanded && (
                    <div className="border-t border-border px-5 py-4">
                      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <SelectField label="Vendor" value={po.vendorId} onChange={(v) => updatePO(po.id, { vendorId: v })} options={[{ value: "", label: "Select vendor..." }, ...data.vendors.map((v) => ({ value: v.id, label: v.name || "Unnamed" }))]} />
                        <SelectField label="Status" value={po.status} onChange={(v) => updatePO(po.id, { status: v as PurchaseOrder["status"] })} options={PO_STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))} />
                        <InputField label="PO Date" value={po.date} onChange={(v) => updatePO(po.id, { date: v })} type="date" />
                        <InputField label="Shipping Method" value={po.shippingMethod} onChange={(v) => updatePO(po.id, { shippingMethod: v })} placeholder="Ground, Freight, etc." />
                        <InputField label="Expected Ship Date" value={po.expectedShipDate} onChange={(v) => updatePO(po.id, { expectedShipDate: v })} type="date" />
                        <InputField label="Expected Delivery" value={po.expectedDeliveryDate} onChange={(v) => updatePO(po.id, { expectedDeliveryDate: v })} type="date" />
                        <InputField label="Carrier" value={po.carrier} onChange={(v) => updatePO(po.id, { carrier: v })} placeholder="UPS, FedEx, LTL..." />
                        <InputField label="Tracking #" value={po.trackingNumbers} onChange={(v) => updatePO(po.id, { trackingNumbers: v })} placeholder="Tracking number(s)" />
                      </div>
                      <div className="mb-5 grid grid-cols-2 gap-3">
                        <InputField label="Delivery Address" value={po.deliveryAddress} onChange={(v) => updatePO(po.id, { deliveryAddress: v })} placeholder="Job site or warehouse address" />
                        <TextareaField label="Notes" value={po.notes} onChange={(v) => updatePO(po.id, { notes: v })} placeholder="Special instructions, quotes, etc." rows={1} />
                      </div>

                      {/* PO line items */}
                      <h4 className="mb-2 text-[12px] font-bold uppercase tracking-wider text-faint">Line Items</h4>
                      {poLines.length > 0 && (
                        <div className="mb-3 overflow-x-auto rounded-lg border border-border">
                          <table className="w-full text-[12px]">
                            <thead>
                              <tr className="border-b border-border bg-forge-panel/40 text-[10px] font-semibold uppercase tracking-wider text-subtle">
                                <th className="px-3 py-2">Item</th>
                                <th className="px-3 py-2 text-center">Qty</th>
                                <th className="px-3 py-2 text-right">Unit</th>
                                <th className="px-3 py-2 text-right">Total</th>
                                <th className="px-3 py-2 text-center">Recv&apos;d</th>
                                <th className="w-8 px-2" />
                              </tr>
                            </thead>
                            <tbody>
                              {poLines.map((l) => (
                                <tr key={l.id} className="border-b border-border/30">
                                  <td className="px-3 py-2 text-body">{l.manufacturer} {l.model} <span className="text-subtle">— {l.description}</span></td>
                                  <td className="px-3 py-2 text-center text-body">{l.qtyOrdered}</td>
                                  <td className="px-3 py-2 text-right text-body">{fmt$(l.unitCost)}</td>
                                  <td className="px-3 py-2 text-right font-medium text-heading">{fmt$(l.qtyOrdered * l.unitCost)}</td>
                                  <td className="px-3 py-2 text-center" style={{ color: l.qtyReceived >= l.qtyNeeded ? "#22c55e" : l.qtyReceived > 0 ? "#f97316" : "#94a3b8" }}>{l.qtyReceived}/{l.qtyNeeded}</td>
                                  <td className="px-2 py-2"><DeleteBtn onClick={() => removeLineFromPO(po.id, l.id)} /></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Add items to PO */}
                      {availableLines.length > 0 && (
                        <div className="mb-4">
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">Add unassigned items to this PO</p>
                          <div className="max-h-[200px] overflow-y-auto rounded-lg border border-dashed border-border bg-forge-panel/20 p-2">
                            {availableLines.map((l) => (
                              <button key={l.id} onClick={() => addLineToPO(po.id, l.id)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[12px] transition-colors hover:bg-forge-surface/40">
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                                <span className="text-body">{l.manufacturer} {l.model}</span>
                                <span className="text-subtle">— {l.description}</span>
                                <span className="ml-auto text-muted">Qty: {l.qtyNeeded}</span>
                                <span className="font-medium text-heading">{fmt$(l.qtyNeeded * l.unitCost)}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* PO totals */}
                      <div className="flex items-center gap-4 rounded-lg bg-forge-panel/40 px-4 py-3">
                        <div className="flex-1 grid grid-cols-3 gap-3">
                          <InputField label="Tax ($)" value={po.tax || ""} onChange={(v) => updatePO(po.id, { tax: +v })} type="number" placeholder="0" />
                          <InputField label="Shipping ($)" value={po.shipping || ""} onChange={(v) => updatePO(po.id, { shipping: +v })} type="number" placeholder="0" />
                          <div>
                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faint">PO Total</label>
                            <p className="text-lg font-bold text-heading">{fmt$(poTotal)}</p>
                          </div>
                        </div>
                        <button onClick={() => createReceivingLog(po.id)} className="rounded-lg bg-emerald-500/10 px-4 py-2 text-[12px] font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20">
                          Receive Items
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* ── Vendors ───────────────────────────────────── */
  function renderVendors() {
    if (data.vendors.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="mb-3 text-sm text-faint">No vendors yet</p>
          <button onClick={addVendor} className="forge-btn-primary text-[13px]">Add Vendor</button>
        </div>
      );
    }
    return (
      <div>
        <SectionHeader title="Vendors" count={data.vendors.length} onAdd={addVendor} addLabel="Add Vendor" />
        <div className="space-y-4">
          {data.vendors.map((v) => {
            const vendorPOs = data.purchaseOrders.filter((po) => po.vendorId === v.id);
            return (
              <div key={v.id} className="rounded-xl border border-border bg-forge-surface/40 p-5">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-sm font-bold text-rose-400">
                    {v.name ? v.name.slice(0, 2).toUpperCase() : "?"}
                  </div>
                  <div className="flex-1">
                    <input value={v.name} onChange={(e) => updateVendor(v.id, { name: e.target.value })} placeholder="Vendor name..." className="border-none bg-transparent text-[15px] font-bold text-heading outline-none placeholder:text-faint" />
                    {vendorPOs.length > 0 && <p className="text-[11px] text-subtle">{vendorPOs.length} purchase order{vendorPOs.length !== 1 ? "s" : ""}</p>}
                  </div>
                  <DeleteBtn onClick={() => removeVendor(v.id)} />
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <InputField label="Contact Name" value={v.contactName} onChange={(val) => updateVendor(v.id, { contactName: val })} placeholder="Sales rep" />
                  <InputField label="Email" value={v.email} onChange={(val) => updateVendor(v.id, { email: val })} placeholder="email@vendor.com" />
                  <InputField label="Phone" value={v.phone} onChange={(val) => updateVendor(v.id, { phone: val })} placeholder="(555) 000-0000" />
                  <InputField label="Account Number" value={v.accountNumber} onChange={(val) => updateVendor(v.id, { accountNumber: val })} placeholder="Account #" />
                  <SelectField label="Payment Terms" value={v.paymentTerms} onChange={(val) => updateVendor(v.id, { paymentTerms: val })} options={PAYMENT_TERMS.map((t) => ({ value: t, label: t }))} />
                  <InputField label="Lead Time" value={v.leadTime} onChange={(val) => updateVendor(v.id, { leadTime: val })} placeholder="e.g. 2-3 weeks" />
                  <InputField label="Website" value={v.website} onChange={(val) => updateVendor(v.id, { website: val })} placeholder="www.vendor.com" />
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <InputField label="Address" value={v.address} onChange={(val) => updateVendor(v.id, { address: val })} placeholder="Vendor address" />
                  <TextareaField label="Notes" value={v.notes} onChange={(val) => updateVendor(v.id, { notes: val })} placeholder="Discount codes, preferred contact method, etc." rows={1} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── Receiving ─────────────────────────────────── */
  function renderReceiving() {
    if (data.receivingLog.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="mb-3 text-sm text-faint">No receiving records yet</p>
          <p className="text-[12px] text-faint">Click &quot;Receive Items&quot; on a Purchase Order to log a delivery</p>
        </div>
      );
    }
    return (
      <div>
        <SectionHeader title="Receiving Log" count={data.receivingLog.length} onAdd={() => {}} addLabel="" />
        <div className="space-y-4">
          {data.receivingLog.map((log) => {
            const po = data.purchaseOrders.find((p) => p.id === log.poId);
            return (
              <div key={log.id} className="rounded-xl border border-border bg-forge-surface/40 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-[13px] font-bold text-rose-400">{po?.number || "—"}</span>
                    <span className="text-[12px] text-subtle">{getVendorName(po?.vendorId || "")}</span>
                    <span className="text-[12px] text-muted">{fmtDate(log.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => confirmReceiving(log.id)} className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-[12px] font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20">
                      Confirm Receipt
                    </button>
                    <DeleteBtn onClick={() => removeReceivingLog(log.id)} />
                  </div>
                </div>
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <InputField label="Date Received" value={log.date} onChange={(v) => updateReceivingLog(log.id, { date: v })} type="date" />
                  <InputField label="Received By" value={log.receivedBy} onChange={(v) => updateReceivingLog(log.id, { receivedBy: v })} placeholder="Name" />
                </div>

                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="border-b border-border bg-forge-panel/40 text-[10px] font-semibold uppercase tracking-wider text-subtle">
                        <th className="px-3 py-2">Item</th>
                        <th className="px-3 py-2 text-center">Expected</th>
                        <th className="px-3 py-2 text-center">Received</th>
                        <th className="px-3 py-2">Condition</th>
                        <th className="min-w-[140px] px-3 py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {log.lineItems.map((item, idx) => {
                        const line = data.lines.find((l) => l.id === item.lineId);
                        return (
                          <tr key={item.lineId} className="border-b border-border/30">
                            <td className="px-3 py-2 text-body">{line ? `${line.manufacturer} ${line.model}` : "Unknown"}</td>
                            <td className="px-3 py-2 text-center text-muted">{line?.qtyNeeded || 0}</td>
                            <td className="px-3 py-2 text-center">
                              <input type="number" value={item.qtyReceived || ""} onChange={(e) => {
                                const items = [...log.lineItems]; items[idx] = { ...items[idx], qtyReceived: +e.target.value };
                                updateReceivingLog(log.id, { lineItems: items });
                              }} className="w-14 border-none bg-transparent text-center text-[12px] text-body outline-none" />
                            </td>
                            <td className="px-3 py-2">
                              <select value={item.condition} onChange={(e) => {
                                const items = [...log.lineItems]; items[idx] = { ...items[idx], condition: e.target.value as typeof item.condition };
                                updateReceivingLog(log.id, { lineItems: items });
                              }} className="border-none bg-transparent text-[11px] font-semibold outline-none" style={{ color: statusColor(item.condition) }}>
                                {CONDITIONS.map((c) => <option key={c} value={c}>{statusLabel(c)}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input value={item.notes} onChange={(e) => {
                                const items = [...log.lineItems]; items[idx] = { ...items[idx], notes: e.target.value };
                                updateReceivingLog(log.id, { lineItems: items });
                              }} className="w-full border-none bg-transparent text-[12px] text-muted outline-none" placeholder="Notes..." />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3">
                  <TextareaField label="Receiving Notes" value={log.notes} onChange={(v) => updateReceivingLog(log.id, { notes: v })} placeholder="Packing slip #, delivery notes, damage report..." rows={2} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── Order Tracking ────────────────────────────── */
  function renderTracking() {
    const activePOs = data.purchaseOrders.filter((po) => !["closed", "cancelled", "received"].includes(po.status));
    return (
      <div>
        <h2 className="mb-6 text-lg font-bold text-heading">Order Tracking</h2>

        {activePOs.length === 0 ? (
          <div className="py-20 text-center text-sm text-faint">No active orders to track</div>
        ) : (
          <div className="space-y-3">
            {activePOs.map((po) => {
              const poLines = data.lines.filter((l) => po.lineIds.includes(l.id));
              const receivedCount = poLines.filter((l) => l.qtyReceived >= l.qtyNeeded).length;
              const pct = poLines.length > 0 ? Math.round((receivedCount / poLines.length) * 100) : 0;
              const isOverdue = po.expectedDeliveryDate && po.expectedDeliveryDate < today();
              const isApproaching = po.expectedDeliveryDate && !isOverdue && po.expectedDeliveryDate <= new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];

              return (
                <div key={po.id} className={`rounded-xl border bg-forge-surface/40 p-5 ${isOverdue ? "border-red-500/40" : isApproaching ? "border-amber-500/40" : "border-border"}`}>
                  <div className="mb-3 flex items-center gap-4">
                    <span className="text-[14px] font-bold text-rose-400">{po.number}</span>
                    <span className="text-[13px] text-muted">{getVendorName(po.vendorId)}</span>
                    <Badge label={po.status} color={statusColor(po.status)} />
                    {isOverdue && <Badge label="OVERDUE" color="#ef4444" />}
                    {isApproaching && !isOverdue && <Badge label="DUE SOON" color="#f59e0b" />}
                  </div>

                  <div className="mb-3 grid grid-cols-4 gap-4 text-[12px]">
                    <div><span className="text-faint">Ordered:</span> <span className="text-body">{fmtDate(po.date)}</span></div>
                    <div><span className="text-faint">Expected Ship:</span> <span className="text-body">{fmtDate(po.expectedShipDate)}</span></div>
                    <div><span className="text-faint">Expected Delivery:</span> <span className={isOverdue ? "font-semibold text-red-400" : "text-body"}>{fmtDate(po.expectedDeliveryDate)}</span></div>
                    <div><span className="text-faint">Carrier:</span> <span className="text-body">{po.carrier || "—"}</span></div>
                  </div>

                  {po.trackingNumbers && (
                    <div className="mb-3 text-[12px]">
                      <span className="text-faint">Tracking:</span>{" "}
                      <span className="font-mono text-blue-400">{po.trackingNumbers}</span>
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-forge-panel/60">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#22c55e" : "#8b5cf6" }} />
                    </div>
                    <span className="text-[12px] font-semibold" style={{ color: pct === 100 ? "#22c55e" : "#8b5cf6" }}>{pct}%</span>
                    <span className="text-[11px] text-subtle">{receivedCount}/{poLines.length} items received</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* ── Tab map ───────────────────────────────────── */
  const tabContent: Record<TabId, () => React.ReactNode> = {
    overview: renderOverview, lines: renderLines, "purchase-orders": renderPurchaseOrders,
    vendors: renderVendors, receiving: renderReceiving, tracking: renderTracking,
  };

  /* ═══════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════ */
  return (
    <div className="animate-fade-in">
      {/* ── Top header ────────────────────────────────── */}
      <div className="border-b border-border bg-forge-panel/50 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <Link href={`/projects/${params.id}`} className="mb-2 inline-flex items-center gap-1.5 text-xs text-subtle hover:text-secondary">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              {project.name}
            </Link>
            <h1 className="flex items-center gap-2.5 text-xl font-bold text-heading">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-400">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
              </svg>
              Procurement
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[12px] text-faint">
              {data.lines.length} items &middot; {data.purchaseOrders.length} POs &middot; {data.vendors.length} vendors
            </span>
            <button onClick={handleSave} className="forge-btn-primary text-[13px]">
              {saved ? (
                <><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>Saved</>
              ) : (
                <><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M13 11v3H3v-3M8 2v9M5 5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Save</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────── */}
      <div className="flex" style={{ minHeight: "calc(100vh - 72px - 85px)" }}>
        <nav className="w-[220px] shrink-0 overflow-y-auto border-r border-border bg-forge-panel/30 px-3 py-5">
          <div className="space-y-0.5">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const count = tab.id === "lines" ? data.lines.length
                : tab.id === "purchase-orders" ? data.purchaseOrders.length
                : tab.id === "vendors" ? data.vendors.length
                : tab.id === "receiving" ? data.receivingLog.length
                : tab.id === "tracking" ? data.purchaseOrders.filter((po) => !["closed", "cancelled", "received"].includes(po.status)).length
                : 0;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] transition-all ${isActive ? "bg-rose-500/10 font-semibold text-rose-400" : "text-muted hover:bg-forge-surface/30 hover:text-secondary"}`}>
                  <span className={isActive ? "text-rose-400" : "text-subtle"}>{tab.icon}</span>
                  <span className="flex-1">{tab.label}</span>
                  {count > 0 && tab.id !== "overview" && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${isActive ? "bg-rose-500/20 text-rose-400" : "bg-forge-surface/60 text-faint"}`}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="flex-1 overflow-y-auto p-6" style={{ maxHeight: "calc(100vh - 72px - 85px)" }}>
          {tabContent[activeTab]()}
        </div>
      </div>

      {/* ── Import from Proposal Modal ────────────── */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowImportModal(false)} />
          <div className="relative w-full max-w-md rounded-xl border border-border bg-forge-bg p-6 shadow-2xl">
            <h3 className="mb-2 text-[15px] font-bold text-heading">Import from Proposal</h3>
            <p className="mb-4 text-[13px] text-subtle">
              This will pull all equipment line items from your approved proposal into the procurement list. Duplicates (same manufacturer + model) will be skipped.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowImportModal(false)} className="rounded-lg px-4 py-2 text-[13px] text-muted hover:text-body">Cancel</button>
              <button onClick={importFromProposal} className="forge-btn-primary text-[13px]">Import Items</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
