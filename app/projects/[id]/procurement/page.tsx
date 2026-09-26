"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useOrg } from "@/components/OrgProvider";
import ComingSoon from "@/components/ComingSoon";
import { computeProposalTotals } from "@/lib/proposal-pricing";
import { releaseOrder, fmt$ } from "@/lib/procurement";

interface Project {
  id: string; name: string; job_number: string; client_name: string; sales: string;
  address: string; city: string; state: string; zip_code: string;
}

interface ProposalData {
  clientName: string;
  sections: { items: { qty: number; unitCost: number; margin?: number | null; markup?: number | null; laborHours?: number; laborRate?: number }[] }[];
  marginPercent: number;
  taxRate: number;
}

const PAYMENT_TERMS = ["Net 15", "Net 30", "Net 45", "Net 60", "Due on Receipt", "Credit Card", "Prepaid", "Other"];

export default function ProjectProcurementGatePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { activeOrg, hasAccessOverride } = useOrg();
  const [project, setProject] = useState<Project | null>(null);
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [proposalRaw, setProposalRaw] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [checkingReleased, setCheckingReleased] = useState(true);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [releaseError, setReleaseError] = useState("");

  useEffect(() => {
    let cancelled = false;

    supabase.from("released_orders").select("id").eq("project_id", params.id).maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.id) { router.replace(`/procurement/${data.id}`); return; }
        setCheckingReleased(false);
      });

    supabase.from("projects").select("id, name, job_number, client_name, sales, address, city, state, zip_code").eq("id", params.id).single()
      .then(({ data }) => { if (!cancelled && data) setProject(data as Project); });

    supabase.from("proposals").select("data").eq("project_id", params.id).maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.data) { setProposal(data.data as ProposalData); setProposalRaw(data.data); }
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [params.id, router]);

  const totals = proposal ? computeProposalTotals(proposal.sections, proposal.marginPercent, proposal.taxRate) : null;
  const itemCount = proposal ? proposal.sections.reduce((s, sec) => s + sec.items.filter((i) => i.qty > 0).length, 0) : 0;
  const canRelease = !!activeOrg && (activeOrg.role === "superadmin" || activeOrg.role === "admin");

  async function handleRelease(formData: ReleaseFormData) {
    if (!activeOrg || !project || !proposal) return;
    setReleasing(true);
    setReleaseError("");
    const result = await releaseOrder({
      orgId: activeOrg.id,
      projectId: params.id,
      proposal,
      proposalRaw,
      customerPoNumber: formData.customerPoNumber,
      customerPoAmount: formData.customerPoAmount ? parseFloat(formData.customerPoAmount) : null,
      customerPoReference: formData.customerPoReference,
      signedOrderValue: formData.signedOrderValue ? parseFloat(formData.signedOrderValue) : null,
      salesperson: formData.salesperson,
      projectManager: formData.projectManager,
      requestedInstallDate: formData.requestedInstallDate,
      requiredMaterialDate: formData.requiredMaterialDate,
      billTo: formData.billTo,
      shipTo: formData.shipTo,
      taxStatus: formData.taxStatus,
      paymentTerms: formData.paymentTerms,
      releaseNotes: formData.releaseNotes,
    });
    setReleasing(false);
    if ("error" in result) { setReleaseError(result.error); return; }
    router.push(`/procurement/${result.releasedOrderId}`);
  }

  if (loading || checkingReleased || !project) {
    return (
      <div className="animate-fade-in px-4 py-6 sm:px-6 lg:px-8">
        <Link href={`/projects/${params.id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-subtle hover:text-secondary">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          Back to Project
        </Link>
        <div className="mt-20 text-center text-sm text-subtle">Loading...</div>
      </div>
    );
  }

  if (!hasAccessOverride) {
    return (
      <div className="animate-fade-in">
        <div className="border-b border-border bg-forge-panel/50 px-4 py-4 sm:px-6 lg:px-8">
          <Link href={`/projects/${params.id}`} className="mb-2 inline-flex items-center gap-1.5 text-xs text-subtle hover:text-secondary">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            {project.name}
            {project.job_number && <span className="text-subtle"> · #{project.job_number}</span>}
          </Link>
          <h1 className="flex items-center gap-2.5 text-xl font-bold text-heading">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
            </svg>
            Project Coordination
          </h1>
        </div>
        <ComingSoon
          color="amber"
          icon={
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
            </svg>
          }
          description="Equipment ordering, tracking, and vendor coordination tools are on the way."
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="border-b border-border bg-forge-panel/50 px-4 py-4 sm:px-6 lg:px-8">
        <Link href={`/projects/${params.id}`} className="mb-2 inline-flex items-center gap-1.5 text-xs text-subtle hover:text-secondary">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          {project.name}
          {project.job_number && <span className="text-subtle"> · #{project.job_number}</span>}
        </Link>
        <h1 className="flex items-center gap-2.5 text-xl font-bold text-heading">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-400">
            <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
          </svg>
          Procurement
        </h1>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        {!proposal || itemCount === 0 ? (
          <>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-faint">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            <h2 className="mb-2 text-lg font-bold text-heading">No proposal to release yet</h2>
            <p className="mb-5 text-[13px] text-subtle">Procurement starts from the project's approved Proposal — build the equipment list there first, then come back to release it.</p>
            <Link href={`/projects/${params.id}/proposal`} className="forge-btn-primary inline-flex text-[13px]">Go to Proposal</Link>
          </>
        ) : (
          <>
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-400 mx-auto">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
              </svg>
            </div>
            <h2 className="mb-2 text-lg font-bold text-heading">Ready to Release</h2>
            <p className="mx-auto mb-6 max-w-md text-[13px] text-subtle">
              This project's proposal isn't procurement-active yet. Once the customer has signed and you release this order, its approved equipment list becomes available for purchasing.
            </p>
            <div className="mb-6 grid grid-cols-2 gap-3 rounded-xl border border-border bg-forge-surface/40 p-5 text-left">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">Equipment Sell</p>
                <p className="text-lg font-bold text-heading">{fmt$(totals?.totalEquipmentPrice)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">Line Items</p>
                <p className="text-lg font-bold text-heading">{itemCount}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">Estimated Equipment Cost</p>
                <p className="text-lg font-bold text-heading">{fmt$(totals?.totalEquipmentCost)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">Proposal Total</p>
                <p className="text-lg font-bold text-heading">{fmt$(totals?.grandTotal)}</p>
              </div>
            </div>
            {canRelease ? (
              <button onClick={() => setShowReleaseModal(true)} className="forge-btn-primary text-[13px]">Release Order</button>
            ) : (
              <p className="text-[12px] text-faint">Only an org owner or admin can release this order.</p>
            )}
          </>
        )}
      </div>

      {showReleaseModal && proposal && (
        <ReleaseModal
          project={project}
          proposal={proposal}
          totals={totals!}
          busy={releasing}
          error={releaseError}
          onCancel={() => setShowReleaseModal(false)}
          onConfirm={handleRelease}
        />
      )}
    </div>
  );
}

interface ReleaseFormData {
  customerPoNumber: string; customerPoAmount: string; customerPoReference: string;
  signedOrderValue: string; salesperson: string; projectManager: string;
  requestedInstallDate: string; requiredMaterialDate: string;
  billTo: string; shipTo: string; taxStatus: string; paymentTerms: string; releaseNotes: string;
}

function ReleaseModal({ project, proposal, totals, busy, error, onCancel, onConfirm }: {
  project: Project; proposal: ProposalData; totals: ReturnType<typeof computeProposalTotals>;
  busy: boolean; error: string; onCancel: () => void; onConfirm: (data: ReleaseFormData) => void;
}) {
  const defaultAddress = [project.address, project.city, project.state, project.zip_code].filter(Boolean).join(", ");
  const [form, setForm] = useState<ReleaseFormData>({
    customerPoNumber: "", customerPoAmount: "", customerPoReference: "",
    signedOrderValue: totals.grandTotal.toFixed(2), salesperson: project.sales || "", projectManager: "",
    requestedInstallDate: "", requiredMaterialDate: "",
    billTo: defaultAddress, shipTo: defaultAddress, taxStatus: "Taxable", paymentTerms: "Net 30", releaseNotes: "",
  });
  const set = (patch: Partial<ReleaseFormData>) => setForm((f) => ({ ...f, ...patch }));
  const inputCls = "forge-input w-full text-[13px]";
  const labelCls = "mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faint";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-forge-bg shadow-2xl">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold text-heading">Release Order</h2>
          <p className="mt-1 text-[12px] text-subtle">{project.name} {project.job_number && `· #${project.job_number}`} · {project.client_name}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-5 grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Customer PO Number</label>
              <input value={form.customerPoNumber} onChange={(e) => set({ customerPoNumber: e.target.value })} placeholder="e.g. ABC-45892" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Customer PO Amount</label>
              <input type="number" value={form.customerPoAmount} onChange={(e) => set({ customerPoAmount: e.target.value })} placeholder="0.00" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Signed Order Value</label>
              <input type="number" value={form.signedOrderValue} onChange={(e) => set({ signedOrderValue: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Customer PO / Signed Document</label>
              <input value={form.customerPoReference} onChange={(e) => set({ customerPoReference: e.target.value })} placeholder="Link or reference" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Salesperson</label>
              <input value={form.salesperson} onChange={(e) => set({ salesperson: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Project Manager</label>
              <input value={form.projectManager} onChange={(e) => set({ projectManager: e.target.value })} placeholder="If assigned" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Requested Install Date</label>
              <input type="date" value={form.requestedInstallDate} onChange={(e) => set({ requestedInstallDate: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Required Equipment Delivery Date</label>
              <input type="date" value={form.requiredMaterialDate} onChange={(e) => set({ requiredMaterialDate: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Bill-To</label>
              <input value={form.billTo} onChange={(e) => set({ billTo: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Ship-To</label>
              <input value={form.shipTo} onChange={(e) => set({ shipTo: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Tax Status</label>
              <select value={form.taxStatus} onChange={(e) => set({ taxStatus: e.target.value })} className={inputCls}>
                <option>Taxable</option><option>Exempt</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Payment Terms</label>
              <select value={form.paymentTerms} onChange={(e) => set({ paymentTerms: e.target.value })} className={inputCls}>
                {PAYMENT_TERMS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="mb-2">
            <label className={labelCls}>Release Notes</label>
            <textarea value={form.releaseNotes} onChange={(e) => set({ releaseNotes: e.target.value })} rows={3} placeholder='e.g. "Customer signed proposal dated 9/10. PO received. Release equipment for purchasing."' className={inputCls + " resize-none"} />
          </div>

          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[12px] text-amber-300">
            Releasing this order will make the approved BOM available to Procurement and allow vendor purchase orders to be created.
          </div>
          {error && <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-[12px] text-red-300">{error}</div>}
        </div>

        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <button onClick={onCancel} disabled={busy} className="rounded-lg px-4 py-2 text-[13px] text-muted hover:text-body">Cancel</button>
          <button onClick={() => onConfirm(form)} disabled={busy} className="forge-btn-primary text-[13px] disabled:opacity-50">
            {busy ? "Releasing…" : "Release Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
