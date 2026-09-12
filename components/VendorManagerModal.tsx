"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Vendor } from "@/lib/procurement";

const PAYMENT_TERMS = ["Net 15", "Net 30", "Net 45", "Net 60", "Due on Receipt", "Credit Card", "Prepaid", "Other"];

// Vendors are org-level (shared across every project's procurement, like the
// Equipment Library) rather than re-entered per project — this modal is the
// one place they're created/edited, reused from both the Procurement
// Dashboard and a released order's Released BOM tab.
export default function VendorManagerModal({ orgId, vendors, onClose, onChange }: {
  orgId: string; vendors: Vendor[]; onClose: () => void; onChange: () => void;
}) {
  const [saving, setSaving] = useState<string | null>(null);
  const inputCls = "forge-input w-full text-[12px]";
  const labelCls = "mb-1 block text-[10px] font-semibold uppercase tracking-wider text-faint";

  async function addVendor() {
    setSaving("new");
    await supabase.from("vendors").insert({ org_id: orgId, name: "New Vendor", payment_terms: PAYMENT_TERMS[1] });
    setSaving(null);
    onChange();
  }

  async function updateVendor(id: string, patch: Partial<Vendor>) {
    await supabase.from("vendors").update(patch).eq("id", id);
    onChange();
  }

  async function removeVendor(id: string) {
    await supabase.from("vendors").delete().eq("id", id);
    onChange();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-forge-bg shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold text-heading">Vendors</h2>
          <button onClick={addVendor} disabled={saving === "new"} className="forge-btn-primary text-[12px] disabled:opacity-50">+ Add Vendor</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {vendors.length === 0 ? (
            <p className="py-10 text-center text-sm text-faint">No vendors yet — add your first one above.</p>
          ) : (
            <div className="space-y-4">
              {vendors.map((v) => (
                <div key={v.id} className="rounded-xl border border-border bg-forge-surface/40 p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-[11px] font-bold text-rose-400">
                      {v.name ? v.name.slice(0, 2).toUpperCase() : "?"}
                    </div>
                    <input defaultValue={v.name} onBlur={(e) => updateVendor(v.id, { name: e.target.value })} placeholder="Vendor name" className="flex-1 border-none bg-transparent text-[14px] font-bold text-heading outline-none placeholder:text-faint" />
                    <button onClick={() => removeVendor(v.id)} className="shrink-0 rounded p-1.5 text-faint transition-colors hover:bg-red-500/10 hover:text-red-400" title="Delete">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <div><label className={labelCls}>Contact</label><input defaultValue={v.contact_name} onBlur={(e) => updateVendor(v.id, { contact_name: e.target.value })} className={inputCls} /></div>
                    <div><label className={labelCls}>Email</label><input defaultValue={v.email} onBlur={(e) => updateVendor(v.id, { email: e.target.value })} className={inputCls} /></div>
                    <div><label className={labelCls}>Phone</label><input defaultValue={v.phone} onBlur={(e) => updateVendor(v.id, { phone: e.target.value })} className={inputCls} /></div>
                    <div>
                      <label className={labelCls}>Payment Terms</label>
                      <select defaultValue={v.payment_terms} onBlur={(e) => updateVendor(v.id, { payment_terms: e.target.value })} className={inputCls}>
                        {PAYMENT_TERMS.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className={labelCls}>Manufacturers Represented (comma-separated)</label>
                    <input
                      defaultValue={v.manufacturers.join(", ")}
                      onBlur={(e) => updateVendor(v.id, { manufacturers: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                      placeholder="e.g. Crestron, QSC"
                      className={inputCls}
                    />
                    <p className="mt-1 text-[11px] text-faint">Used by &quot;Suggest Vendors&quot; on a released order&apos;s BOM to auto-assign this vendor to matching manufacturers.</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end border-t border-border px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-[13px] text-muted hover:text-body">Done</button>
        </div>
      </div>
    </div>
  );
}
