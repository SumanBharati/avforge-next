"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useOrg } from "@/components/OrgProvider";
import ProjectsPageSkeleton from "@/components/skeletons/ProjectsPageSkeleton";

/* ── Types ─────────────────────────────────────────────────── */
interface Project {
  id: string;
  name: string;
  job_number: string;
  client_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  client_email: string;
  client_phone: string;
  sales: string;
  engineer: string;
  created_by: string;
  status: string;
  phase: string;
  created_at: string;
}

const PHASE_STYLES: Record<string, { label: string; style: string }> = {
  "opportunity":    { label: "Opportunity",   style: "bg-forge-surface border-border text-secondary" },
  "proposal":       { label: "Proposal",      style: "bg-forge-surface border-border text-secondary" },
  "contract":       { label: "Contract",      style: "bg-forge-surface border-border text-secondary" },
  "installation":   { label: "Execution",     style: "bg-forge-surface border-border text-secondary" },
  "completed":      { label: "Completed",     style: "bg-forge-surface border-border text-secondary" },
  "lost":           { label: "Lost",          style: "bg-forge-surface border-border text-secondary" },
};

/* ── Page ──────────────────────────────────────────────────── */
export default function ProjectsPage() {
  const { activeOrg, loading: orgLoading } = useOrg();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [createError, setCreateError] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterSales, setFilterSales] = useState("");

  useEffect(() => {
    if (orgLoading) return;
    if (!activeOrg) { setLoading(false); return; }
    loadProjects();
  }, [activeOrg?.id, orgLoading]);

  async function loadProjects() {
    if (!activeOrg) return;
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("org_id", activeOrg.id)
      .order("created_at", { ascending: false });
    if (data) setProjects(data);
    setLoading(false);
  }

  if (loading) return <ProjectsPageSkeleton />;

  const uniqueClients = [...new Set(projects.map((p) => p.client_name).filter(Boolean))];
  const uniqueSales = [...new Set(projects.map((p) => p.sales).filter(Boolean))];

  const filtered = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.job_number || "").includes(search);
    const matchesClient = !filterClient || p.client_name === filterClient;
    const matchesStage = !filterStage || p.phase === filterStage;
    const matchesSales = !filterSales || p.sales === filterSales;
    return matchesSearch && matchesClient && matchesStage && matchesSales;
  });

  const hasActiveFilters = filterClient || filterStage || filterSales;

  async function handleCreate(data: { name: string; jobNumber: string; clientName: string; address: string; city: string; state: string; zipCode: string; clientEmail: string; clientPhone: string }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !activeOrg) return;

    setCreateError("");
    const { error } = await supabase.from("projects").insert({
      org_id: activeOrg.id,
      user_id: user.id,
      name: data.name,
      job_number: data.jobNumber,
      client_name: data.clientName,
      address: data.address,
      city: data.city,
      state: data.state,
      zip_code: data.zipCode,
      client_email: data.clientEmail,
      client_phone: data.clientPhone,
      created_by: user.user_metadata?.full_name || user.email || "",
      phase: "opportunity",
    });

    if (error) {
      console.error("Failed to create project:", error);
      setCreateError(error.message);
      return;
    }

    await loadProjects();
    setShowModal(false);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (!error) setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleUpdate(id: string, data: { name: string; jobNumber: string; clientName: string; address: string; city: string; state: string; zipCode: string; clientEmail: string; clientPhone: string }) {
    const { error } = await supabase.from("projects").update({
      name: data.name,
      job_number: data.jobNumber,
      client_name: data.clientName,
      address: data.address,
      city: data.city,
      state: data.state,
      zip_code: data.zipCode,
      client_email: data.clientEmail,
      client_phone: data.clientPhone,
    }).eq("id", id);
    if (!error) await loadProjects();
  }

  const hasProjects = projects.length > 0;

  return (
    <div className="animate-fade-in px-4 py-6 sm:px-6 lg:px-8">
      {/* ── Top bar ──────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h5l1.5-2H14v12H2V4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
          </svg>
          Projects
        </h2>

        <div className="flex flex-1 items-center justify-end gap-3 sm:flex-none">
          {hasProjects && (
            <div className="relative min-w-0 flex-1 sm:flex-none">
              <input
                type="text"
                placeholder="Search by name or job #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="forge-input w-full pr-9 text-[13px] sm:w-[260px]"
              />
              <svg
                width="15"
                height="15"
                viewBox="0 0 16 16"
                fill="none"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle"
              >
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </div>
          )}

          {hasProjects && <button onClick={() => setShowModal(true)} className="forge-btn-primary text-[13px]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            New Project
          </button>}
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────── */}
      {hasProjects && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-subtle">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 3h12L9 8.5V13l-2-1V8.5L2 3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
            Filters:
          </div>
          <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className="forge-input w-auto min-w-[140px] py-1.5 text-[12px]">
            <option value="">All Clients</option>
            {uniqueClients.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
          <select value={filterSales} onChange={(e) => setFilterSales(e.target.value)} className="forge-input w-auto min-w-[160px] py-1.5 text-[12px]">
            <option value="">All Sales Executives</option>
            {uniqueSales.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
          <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className="forge-input w-auto min-w-[140px] py-1.5 text-[12px]">
            <option value="">All Stages</option>
            {Object.entries(PHASE_STYLES).map(([key, { label }]) => (<option key={key} value={key}>{label}</option>))}
          </select>
          {hasActiveFilters && (
            <button onClick={() => { setFilterClient(""); setFilterStage(""); setFilterSales(""); }} className="text-xs font-medium text-blue-400 transition-colors hover:text-blue-300">
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* ── Projects table ───────────────────────────── */}
      <div className="overflow-visible rounded-lg border border-border">
        {hasProjects && (
          <div className="grid grid-cols-[1fr_auto_40px] gap-3 border-b border-border bg-forge-surface/60 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-secondary md:grid-cols-[1fr_1fr_0.8fr_0.6fr_40px] md:gap-4 md:px-5">
            <span className="hidden md:block">Client Name</span>
            <span>Project Name</span>
            <span className="hidden md:block">Job Number</span>
            <span>Stage</span>
            <span />
          </div>
        )}

        {!hasProjects ? (
          <div className="flex flex-col items-center gap-3 px-5 py-20 text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-faint">
              <path d="M3 7h7l2-3h9v17H3V7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
            <p className="text-sm text-subtle">No projects yet</p>
            <button onClick={() => setShowModal(true)} className="forge-btn-primary mt-1 text-[13px]">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Create your first project
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-subtle">
            No projects match your search
          </div>
        ) : (
          filtered.map((project) => (
            <ProjectRow key={project.id} project={project} onDelete={handleDelete} onUpdate={handleUpdate} existingClients={uniqueClients} />
          ))
        )}
      </div>

      {/* ── Footer ───────────────────────────────────── */}
      {hasProjects && (
        <div className="mt-3 flex items-center justify-between text-xs text-faint">
          <span className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" />
              <path d="M8 5v3M8 10v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Click row to open
          </span>
          <span>
            {filtered.length} project{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* ── New Project Modal ────────────────────────── */}
      {showModal && <NewProjectModal onClose={() => { setShowModal(false); setCreateError(""); }} onCreate={handleCreate} existingClients={uniqueClients} error={createError} />}
    </div>
  );
}

/* ── New Project Modal ─────────────────────────────────────── */
function NewProjectModal({
  onClose,
  onCreate,
  onUpdate,
  existingClients,
  initialValues,
  error,
}: {
  onClose: () => void;
  onCreate: (data: { name: string; jobNumber: string; clientName: string; address: string; city: string; state: string; zipCode: string; clientEmail: string; clientPhone: string }) => void;
  onUpdate?: (data: { name: string; jobNumber: string; clientName: string; address: string; city: string; state: string; zipCode: string; clientEmail: string; clientPhone: string }) => void;
  existingClients: string[];
  initialValues?: { name: string; jobNumber: string; clientName: string; address: string; city: string; state: string; zipCode: string; clientEmail: string; clientPhone: string };
  error?: string;
}) {
  const isEdit = !!initialValues;
  const [name, setName] = useState(initialValues?.name ?? "");
  const [jobNumber, setJobNumber] = useState(initialValues?.jobNumber ?? "");
  const [clientName, setClientName] = useState(initialValues?.clientName ?? "");
  const [address, setAddress] = useState(initialValues?.address ?? "");
  const [city, setCity] = useState(initialValues?.city ?? "");
  const [state, setState] = useState(initialValues?.state ?? "");
  const [zipCode, setZipCode] = useState(initialValues?.zipCode ?? "");
  const [clientEmail, setClientEmail] = useState(initialValues?.clientEmail ?? "");
  const [clientPhone, setClientPhone] = useState(initialValues?.clientPhone ?? "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const clientRef = useRef<HTMLDivElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) setShowSuggestions(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const suggestions = clientName.trim()
    ? existingClients.filter((c) => c.toLowerCase().includes(clientName.toLowerCase()))
    : existingClients;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const data = { name: name.trim(), jobNumber: jobNumber.trim(), clientName: clientName.trim(), address: address.trim(), city: city.trim(), state: state.trim(), zipCode: zipCode.trim(), clientEmail: clientEmail.trim(), clientPhone: clientPhone.trim() };
    if (isEdit && onUpdate) onUpdate(data); else onCreate(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[520px] animate-fade-in rounded-xl border border-border bg-forge-surface p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-heading">{isEdit ? "Edit Project" : "New Project"}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-subtle transition-colors hover:bg-forge-card hover:text-secondary">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Project details */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted">Project Name <span className="text-red-400">*</span></label>
            <input ref={nameRef} type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. School AV Upgrade" className="forge-input" required />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted">Job Number</label>
            <input type="text" value={jobNumber} onChange={(e) => setJobNumber(e.target.value)} placeholder="e.g. 343243" className="forge-input" />
          </div>

          {/* Client section */}
          <div className="border-t border-border pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-faint">Client Information</p>
            <div ref={clientRef} className="relative mb-4">
              <label className="mb-1.5 block text-sm font-medium text-muted">Client Name</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => { setClientName(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search Client or Add New"
                className="forge-input"
                autoComplete="off"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-44 overflow-y-auto rounded-lg border border-border bg-forge-surface shadow-lg">
                  {suggestions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); setClientName(c); setShowSuggestions(false); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-secondary transition-colors hover:bg-forge-surface/80 hover:text-heading"
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0 text-faint">
                        <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.3" />
                        <path d="M2 14c0-3.3 2.7-5 6-5s6 1.7 6 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                      </svg>
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-muted">Address</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 123 Main St" className="forge-input" />
            </div>
            <div className="mb-4 grid grid-cols-[1fr_100px_100px] gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted">City</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Boston" className="forge-input" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted">State</label>
                <input type="text" value={state} onChange={(e) => setState(e.target.value)} placeholder="MA" className="forge-input" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted">ZIP Code</label>
                <input type="text" value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="02101" className="forge-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted">Email</label>
                <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="contact@company.com" className="forge-input" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted">Phone</label>
                <input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="555-123-4567" className="forge-input" />
              </div>
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
          )}

          <div className="mt-2 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:text-body">Cancel</button>
            <button type="submit" disabled={!name.trim()} className="forge-btn-primary text-[13px]">{isEdit ? "Save Changes" : "Create Project"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Project row component ─────────────────────────────────── */
function ProjectRow({ project, onDelete, onUpdate, existingClients }: { project: Project; onDelete: (id: string) => void; onUpdate: (id: string, data: { name: string; jobNumber: string; clientName: string; address: string; city: string; state: string; zipCode: string; clientEmail: string; clientPhone: string }) => void; existingClients: string[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const phaseInfo = PHASE_STYLES[project.phase] ?? { label: "Site Survey", style: "bg-forge-surface border-border text-secondary" };

  async function closeProject(reason: "lost" | "completed") {
    const phase = reason === "lost" ? "lost" : "completed";
    await supabase.from("projects").update({ phase }).eq("id", project.id);
    window.location.reload();
  }

  return (
    <>
      <Link
        href={`/projects/${project.id}`}
        className="grid grid-cols-[1fr_auto_40px] items-center gap-3 border-b border-border/50 px-4 py-3.5 transition-colors hover:bg-forge-surface/40 md:grid-cols-[1fr_1fr_0.8fr_0.6fr_40px] md:gap-4 md:px-5"
      >
        <div className="hidden text-sm text-secondary md:block">{project.client_name || <span className="text-xs text-faint">&mdash;</span>}</div>
        <div><div className="text-sm font-semibold text-heading">{project.name}</div></div>
        <div className="hidden md:block">
          {project.job_number ? (
            <span className="font-mono text-xs text-secondary">{project.job_number}</span>
          ) : (
            <span className="text-xs text-faint">&mdash;</span>
          )}
        </div>
        <div>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${phaseInfo.style}`}>{phaseInfo.label}</span>
        </div>
        <div className="relative flex justify-end">
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(!menuOpen); }} className="rounded p-1 text-subtle transition-colors hover:bg-forge-surface hover:text-secondary">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="3" r="1.2" /><circle cx="8" cy="8" r="1.2" /><circle cx="8" cy="13" r="1.2" />
            </svg>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={(e) => { e.preventDefault(); setMenuOpen(false); }} />
              <div className="absolute right-0 top-8 z-50 w-40 rounded-lg border border-border bg-forge-surface py-1 shadow-xl">
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditModal(true); setMenuOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-secondary transition-colors hover:bg-forge-surface/80">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  Edit Project
                </button>
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCloseModal(true); setMenuOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-secondary transition-colors hover:bg-forge-surface/80">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
                  Close Project
                </button>
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteModal(true); setMenuOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V3h4v1M5 4v9h6V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </Link>

      {/* Close Project Modal */}
      {closeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setCloseModal(false)} />
          <div className="relative w-full max-w-[380px] rounded-xl border border-border bg-forge-bg p-6 shadow-2xl">
            <h3 className="mb-2 text-[15px] font-semibold text-heading">Close Project</h3>
            <p className="mb-5 text-sm text-subtle">How would you like to close <span className="font-medium text-secondary">{project.name}</span>?</p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => { closeProject("lost"); setCloseModal(false); }}
                className="rounded-lg border border-border bg-forge-surface/50 px-4 py-3 text-left transition-colors hover:bg-forge-surface"
              >
                <div className="text-sm font-semibold text-heading">Opportunity Lost</div>
                <div className="text-xs text-subtle">The opportunity did not convert</div>
              </button>
              <button
                onClick={() => { closeProject("completed"); setCloseModal(false); }}
                className="rounded-lg border border-border bg-forge-surface/50 px-4 py-3 text-left transition-colors hover:bg-forge-surface"
              >
                <div className="text-sm font-semibold text-heading">Project Complete</div>
                <div className="text-xs text-subtle">The project has been completed</div>
              </button>
            </div>
            <button onClick={() => setCloseModal(false)} className="mt-4 w-full rounded-lg border border-border py-2 text-sm text-subtle transition-colors hover:bg-forge-surface/50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteModal(false)} />
          <div className="relative w-full max-w-[380px] rounded-xl border border-border bg-forge-bg p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/15">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V3h4v1M5 4v9h6V4" stroke="#f87171" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-heading">Delete Project</h3>
                <p className="text-xs text-subtle">This action cannot be undone</p>
              </div>
            </div>
            <p className="mb-5 text-sm text-subtle">Are you sure you want to permanently delete <span className="font-medium text-secondary">{project.name}</span>? All associated data will be removed.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteModal(false)} className="rounded-lg px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:text-body">
                Cancel
              </button>
              <button
                onClick={() => { onDelete(project.id); setDeleteModal(false); }}
                className="rounded-lg bg-red-500 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-red-600"
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}

      {editModal && (
        <NewProjectModal
          onClose={() => setEditModal(false)}
          onCreate={() => {}}
          onUpdate={(data) => { onUpdate(project.id, data); setEditModal(false); }}
          existingClients={existingClients}
          initialValues={{ name: project.name, jobNumber: project.job_number || "", clientName: project.client_name || "", address: project.address || "", city: project.city || "", state: project.state || "", zipCode: project.zip_code || "", clientEmail: project.client_email || "", clientPhone: project.client_phone || "" }}
        />
      )}
    </>
  );
}
