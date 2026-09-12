"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { changeOrderCostImpact, itemLineTotal as sharedItemLineTotal, type RemovedChangeOrderItem } from "@/lib/proposal-pricing";

interface ChangeOrderRecord {
  id: string;
  title: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  date: string;
  removedItems: RemovedChangeOrderItem[];
}

interface AddedItem {
  id: string;
  category: string;
  manufacturer: string;
  model: string;
  description: string;
  qty: number;
  unitCost: number;
  margin: number | null;
  markup: number | null;
  laborHours?: number;
  laborRate?: number;
}

function fmt$(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_COLOR: Record<string, string> = {
  draft: "#94a3b8", submitted: "#8b5cf6", approved: "#22c55e", rejected: "#ef4444",
};

function itemLabel(i: { manufacturer: string; model: string; description: string }) {
  return [i.manufacturer, i.model].filter(Boolean).join(" ") || i.description || "Item";
}

// CSV cell escaping — quotes cells containing a comma/quote/newline, and
// neutralizes a leading =/+/-/@ so opening the file in Excel can't be
// tricked into evaluating a formula (CSV injection), matching the Proposal
// page's own export.
function csvCell(value: string | number) {
  let s = String(value ?? "");
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function escapeHtml(value: string) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

export default function ChangeOrderDetailPage({ params }: { params: { id: string; coId: string } }) {
  const [loading, setLoading] = useState(true);
  const [co, setCo] = useState<ChangeOrderRecord | null>(null);
  const [addedItems, setAddedItems] = useState<AddedItem[]>([]);
  const [marginPercent, setMarginPercent] = useState(0);
  const [projectName, setProjectName] = useState("");
  const [projectJobNumber, setProjectJobNumber] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.from("projects").select("name, job_number").eq("id", params.id).single()
      .then(({ data }) => { if (!cancelled && data) { setProjectName(data.name || ""); setProjectJobNumber(data.job_number || ""); } });
    Promise.all([
      supabase.from("project_management").select("data").eq("project_id", params.id).single(),
      supabase.from("proposals").select("data").eq("project_id", params.id).single(),
    ]).then(([pmRes, propRes]) => {
      if (cancelled) return;
      const list = (pmRes.data?.data?.changeOrders || []) as ChangeOrderRecord[];
      const found = list.find((c) => c.id === params.coId) || null;
      setCo(found ? { ...found, removedItems: found.removedItems || [] } : null);

      const sections = propRes.data?.data?.sections || [];
      const allItems = sections.flatMap((s: any) => s.items || []);
      setAddedItems(allItems.filter((i: any) => i.changeOrderId === params.coId));
      setMarginPercent(propRes.data?.data?.marginPercent || 0);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [params.id, params.coId]);

  if (loading) {
    return <div className="animate-fade-in px-4 py-6 text-sm text-subtle sm:px-6 lg:px-8">Loading…</div>;
  }

  if (!co) {
    return (
      <div className="animate-fade-in px-4 py-6 sm:px-6 lg:px-8">
        <Link href={`/projects/${params.id}/proposal`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-subtle hover:text-secondary">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          Back to Proposal
        </Link>
        <p className="mt-10 text-center text-sm text-subtle">Change Order not found.</p>
      </div>
    );
  }

  const removedItems = co.removedItems;
  const netImpact = changeOrderCostImpact(addedItems, removedItems, marginPercent);
  const fileBase = `${co.title || "Change Order"}${projectJobNumber ? "_" + projectJobNumber : ""}`.replace(/[^\w\- ]/g, "").trim() || "Change Order";

  function exportCSV() {
    const rows: string[][] = [];
    rows.push([projectName || "Project", projectJobNumber ? `#${projectJobNumber}` : ""]);
    rows.push([co!.title || "Untitled Change Order", co!.status, co!.date]);
    rows.push([]);
    rows.push(["Type", "Qty", "Manufacturer", "Model", "Description", "Amount"]);
    addedItems.forEach((i) => {
      rows.push(["Added", String(i.qty), i.manufacturer, i.model, i.description, sharedItemLineTotal(i, marginPercent).toFixed(2)]);
    });
    removedItems.forEach((i) => {
      rows.push(["Removed", String(i.qty), i.manufacturer, i.model, i.description, (-i.lineTotalAtRemoval).toFixed(2)]);
    });
    rows.push([]);
    rows.push(["", "", "", "", "Net Impact", netImpact.toFixed(2)]);

    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${fileBase}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function exportPDF() {
    const addedRows = addedItems.map((i) => `<tr><td>${escapeHtml(i.manufacturer) || "—"}</td><td>${escapeHtml(i.model) || "—"}</td><td>${escapeHtml(i.description) || "—"}</td><td style="text-align:right">${i.qty}</td><td style="text-align:right">$${fmt$(sharedItemLineTotal(i, marginPercent)).slice(1)}</td></tr>`).join("");
    const removedRows = removedItems.map((i) => `<tr><td>${escapeHtml(i.manufacturer) || "—"}</td><td>${escapeHtml(i.model) || "—"}</td><td>${escapeHtml(i.description) || "—"}</td><td style="text-align:right">${i.qty}</td><td style="text-align:right">-$${fmt$(i.lineTotalAtRemoval).slice(1)}</td></tr>`).join("");

    const html = `<html><head><meta charset="utf-8"><title>${escapeHtml(co!.title || "Change Order")}</title>
      <style>
        body{font-family:Arial,sans-serif;margin:0;padding:40px;color:#0f172a}
        .cover{background:#0f2942;color:#fff;padding:28px 40px;margin:-40px -40px 24px -40px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        .cover .eyebrow{font-size:11px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.75;margin-bottom:8px}
        .cover h1{font-size:24px;margin:0;color:#fff}
        .meta{font-size:12px;color:#334155;margin-bottom:20px}
        h3{font-size:14px;margin:20px 0 6px}
        table{width:100%;border-collapse:collapse;margin:8px 0}
        th,td{border:1px solid #cbd5e1;padding:6px 10px;text-align:left;font-size:12px}
        th{background:#f1f5f9;font-weight:600;font-size:10px;text-transform:uppercase}
        .empty{color:#94a3b8;font-size:12px;padding:10px 0}
        .impact{margin-top:20px;text-align:right;font-size:16px;font-weight:700}
        .impact.neg{color:#ef4444} .impact.pos{color:#059669}
      </style></head><body>
      <div class="cover">
        <div class="eyebrow">Change Order</div>
        <h1>${escapeHtml(co!.title || "Untitled Change Order")}</h1>
      </div>
      <div class="meta">${escapeHtml(projectName)}${projectJobNumber ? ` · #${escapeHtml(projectJobNumber)}` : ""} &nbsp;|&nbsp; Status: ${escapeHtml(co!.status)} &nbsp;|&nbsp; Date: ${escapeHtml(co!.date || "—")}</div>
      ${addedItems.length > 0 ? `<h3>Added</h3><table><tr><th>Manufacturer</th><th>Model</th><th>Description</th><th>Qty</th><th>Amount</th></tr>${addedRows}</table>` : ""}
      ${removedItems.length > 0 ? `<h3>Removed</h3><table><tr><th>Manufacturer</th><th>Model</th><th>Description</th><th>Qty</th><th>Amount</th></tr>${removedRows}</table>` : ""}
      ${addedItems.length === 0 && removedItems.length === 0 ? `<p class="empty">No equipment has been added or removed under this Change Order yet.</p>` : ""}
      <div class="impact ${netImpact >= 0 ? "pos" : "neg"}">Net Impact: ${netImpact >= 0 ? "+" : "-"}$${fmt$(Math.abs(netImpact)).slice(1)}</div>
      </body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  }

  return (
    <div className="animate-fade-in px-4 py-6 sm:px-6 lg:px-8">
      <Link href={`/projects/${params.id}/proposal`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-subtle hover:text-secondary">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        Back to Proposal
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-heading">{co.title || "Untitled Change Order"}</h1>
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize"
          style={{ backgroundColor: (STATUS_COLOR[co.status] || "#94a3b8") + "1a", color: STATUS_COLOR[co.status] || "#94a3b8", border: `1px solid ${(STATUS_COLOR[co.status] || "#94a3b8")}3d` }}
        >
          {co.status}
        </span>
        {co.date && <span className="text-[12px] text-subtle">{new Date(co.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
        <div className="relative ml-auto">
          <button
            onClick={() => setShowExportMenu((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-forge-surface/50 px-3 py-1.5 text-[12px] font-medium text-secondary transition-colors hover:bg-forge-surface"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M8 10l-3-3M8 10l3-3M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Export
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          {showExportMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
              <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-44 rounded-lg border border-border bg-forge-bg p-1 shadow-2xl shadow-black/50">
                <button
                  onClick={() => { exportCSV(); setShowExportMenu(false); }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] text-secondary transition-colors hover:bg-forge-surface/60"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="1" width="12" height="14" rx="2" stroke="#22c55e" strokeWidth="1.2" /><text x="8" y="11" textAnchor="middle" fontSize="5.5" fill="#22c55e" fontWeight="700">CSV</text></svg>
                  Export as CSV
                </button>
                <button
                  onClick={() => { exportPDF(); setShowExportMenu(false); }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] text-secondary transition-colors hover:bg-forge-surface/60"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="1" width="12" height="14" rx="2" stroke="#ef4444" strokeWidth="1.2" /><text x="8" y="11" textAnchor="middle" fontSize="6" fill="#ef4444" fontWeight="700">PDF</text></svg>
                  Export as PDF
                </button>
              </div>
            </>
          )}
        </div>
        <Link
          href={`/projects/${params.id}/proposal?co=${co.id}`}
          className="rounded-lg bg-orange-500 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-orange-600"
        >
          Add/Remove Equipment →
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-forge-surface/40 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-heading">Equipment Changes</h2>
          <span className={`text-[13px] font-bold ${netImpact >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {netImpact >= 0 ? "+" : "-"}{fmt$(Math.abs(netImpact))} net impact
          </span>
        </div>

        {addedItems.length === 0 && removedItems.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-faint">No equipment has been added or removed under this Change Order yet.</p>
        ) : (
          <div className="space-y-4">
            {addedItems.length > 0 && (
              <div>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">Added ({addedItems.length})</div>
                <div className="space-y-1">
                  {addedItems.map((it) => (
                    <div key={it.id} className="flex items-center justify-between rounded-lg bg-emerald-500/[0.06] px-3 py-2 text-[13px]">
                      <span className="text-secondary">+ {it.qty}× {itemLabel(it)}</span>
                      <span className="font-medium text-emerald-400">+{fmt$(sharedItemLineTotal(it, marginPercent))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {removedItems.length > 0 && (
              <div>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">Removed ({removedItems.length})</div>
                <div className="space-y-1">
                  {removedItems.map((it) => (
                    <div key={it.id} className="flex items-center justify-between rounded-lg bg-red-500/[0.06] px-3 py-2 text-[13px]">
                      <span className="text-faint line-through">− {it.qty}× {itemLabel(it)}</span>
                      <span className="font-medium text-red-400">-{fmt$(it.lineTotalAtRemoval)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
