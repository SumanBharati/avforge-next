"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

/* ── Types ─────────────────────────────────────────────────── */
interface Project { id: string; name: string; job_number: string; }

interface Task {
  id: string; title: string; description: string; assignee: string;
  status: "not_started" | "in_progress" | "completed" | "blocked";
  priority: "low" | "medium" | "high" | "critical";
  category: string; dueDate: string; completedDate: string; notes: string;
}

interface Milestone {
  id: string; name: string; dueDate: string; status: "pending" | "completed";
  description: string;
}

interface TeamMember {
  id: string; name: string; role: string; email: string; phone: string;
}

interface FieldReport {
  id: string; date: string; author: string; crewSize: number; hoursWorked: number;
  workPerformed: string; materialsUsed: string; issues: string;
  tomorrowPlan: string; weather: string; notes: string;
}

interface PunchItem {
  id: string; location: string; description: string; assignee: string;
  status: "open" | "in_progress" | "resolved" | "verified";
  priority: "low" | "medium" | "high"; dueDate: string; notes: string;
}

interface ChangeOrder {
  id: string; title: string; description: string; requestedBy: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  costImpact: number; scheduleImpact: string; date: string; notes: string;
}

interface Submittal {
  id: string; number: string; description: string; vendor: string;
  status: "pending" | "approved" | "approved_as_noted" | "rejected" | "resubmit";
  submittedDate: string; requiredDate: string; notes: string;
}

interface RFI {
  id: string; number: string; subject: string; question: string; answer: string;
  status: "open" | "answered" | "closed";
  submittedDate: string; requiredDate: string; answeredDate: string;
  submittedBy: string; answeredBy: string;
}

interface BudgetLine {
  id: string; category: string; budgeted: number; actual: number; committed: number; notes: string;
}

interface PMData {
  tasks: Task[];
  milestones: Milestone[];
  team: TeamMember[];
  fieldReports: FieldReport[];
  punchList: PunchItem[];
  changeOrders: ChangeOrder[];
  submittals: Submittal[];
  rfis: RFI[];
  budget: BudgetLine[];
  projectNotes: string;
  scheduleStart: string;
  scheduleEnd: string;
}

const emptyPM: PMData = {
  tasks: [], milestones: [], team: [], fieldReports: [], punchList: [],
  changeOrders: [], submittals: [], rfis: [], budget: [],
  projectNotes: "", scheduleStart: "", scheduleEnd: "",
};

/* ── Helpers ───────────────────────────────────────────────── */
const uid = () => crypto.randomUUID();
const fmt$ = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d: string) => d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const today = () => new Date().toISOString().split("T")[0];

const TASK_CATEGORIES = ["Pre-Construction", "Engineering", "Procurement", "Execution", "Programming", "Commissioning", "Closeout"];
const TASK_STATUSES: Task["status"][] = ["not_started", "in_progress", "completed", "blocked"];
const PRIORITIES: Task["priority"][] = ["low", "medium", "high", "critical"];
const PUNCH_STATUSES: PunchItem["status"][] = ["open", "in_progress", "resolved", "verified"];
const CO_STATUSES: ChangeOrder["status"][] = ["draft", "submitted", "approved", "rejected"];
const SUB_STATUSES: Submittal["status"][] = ["pending", "approved", "approved_as_noted", "rejected", "resubmit"];
const RFI_STATUSES: RFI["status"][] = ["open", "answered", "closed"];
const BUDGET_CATEGORIES = ["Equipment", "Labor — Installation", "Labor — Programming", "Labor — Engineering", "Cabling & Infrastructure", "Subcontractors", "Permits & Fees", "Travel & Expenses", "Contingency", "Other"];
const TEAM_ROLES = ["Project Manager", "Lead Engineer", "Design Engineer", "Programmer", "Lead Technician", "Installer", "Cable Tech", "Commissioning Engineer", "Project Coordinator", "Sales Engineer", "Other"];

const statusLabel = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const statusColor = (s: string) => {
  const map: Record<string, string> = {
    not_started: "#94a3b8", in_progress: "#3b82f6", completed: "#22c55e", blocked: "#ef4444",
    open: "#f97316", resolved: "#22c55e", verified: "#06b6d4",
    draft: "#94a3b8", submitted: "#3b82f6", approved: "#22c55e", rejected: "#ef4444",
    pending: "#f59e0b", approved_as_noted: "#eab308", resubmit: "#f97316",
    answered: "#22c55e", closed: "#94a3b8",
    low: "#94a3b8", medium: "#f59e0b", high: "#f97316", critical: "#ef4444",
  };
  return map[s] || "#94a3b8";
};

/* ── Sidebar nav definition ────────────────────────────────── */
type TabId = "overview" | "tasks" | "milestones" | "team" | "budget" | "field-reports" | "punch-list" | "change-orders" | "submittals" | "rfis";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { id: "tasks", label: "Tasks", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg> },
  { id: "milestones", label: "Milestones", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg> },
  { id: "team", label: "Team", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
  { id: "budget", label: "Budget", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg> },
  { id: "field-reports", label: "Field Reports", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
  { id: "punch-list", label: "Punch List", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> },
  { id: "change-orders", label: "Change Orders", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> },
  { id: "submittals", label: "Submittals", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> },
  { id: "rfis", label: "RFIs", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
];

/* ═══════════════════════════════════════════════════════════ */
export default function ProjectManagementPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<Project | null>(null);
  const [pm, setPm] = useState<PMData>(emptyPM);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  /* ── Load ──────────────────────────────────────── */
  useEffect(() => {
    supabase.from("projects").select("id, name, job_number").eq("id", params.id).single()
      .then(({ data }) => { if (data) setProject(data); });
    supabase.from("project_management").select("data").eq("project_id", params.id).single()
      .then(({ data: row }) => { if (row?.data) setPm({ ...emptyPM, ...(row.data as PMData) }); });
  }, [params.id]);

  /* ── Auto-save ─────────────────────────────────── */
  const autoSave = useCallback(async (d: PMData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: existing } = await supabase.from("project_management").select("id").eq("project_id", params.id).single();
    if (existing) {
      await supabase.from("project_management").update({ data: d, updated_at: new Date().toISOString() }).eq("project_id", params.id);
    } else {
      await supabase.from("project_management").insert({ project_id: params.id, user_id: user.id, data: d });
    }
  }, [params.id]);

  function persist(next: PMData) {
    setPm(next);
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => autoSave(next), 1200);
  }

  async function handleSave() {
    await autoSave(pm);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  /* ── CRUD helpers ──────────────────────────────── */
  function addTask() {
    persist({ ...pm, tasks: [...pm.tasks, { id: uid(), title: "", description: "", assignee: "", status: "not_started", priority: "medium", category: TASK_CATEGORIES[0], dueDate: "", completedDate: "", notes: "" }] });
  }
  function updateTask(id: string, patch: Partial<Task>) {
    persist({ ...pm, tasks: pm.tasks.map((t) => t.id === id ? { ...t, ...patch } : t) });
  }
  function removeTask(id: string) { persist({ ...pm, tasks: pm.tasks.filter((t) => t.id !== id) }); }

  function addMilestone() {
    persist({ ...pm, milestones: [...pm.milestones, { id: uid(), name: "", dueDate: "", status: "pending", description: "" }] });
  }
  function updateMilestone(id: string, patch: Partial<Milestone>) {
    persist({ ...pm, milestones: pm.milestones.map((m) => m.id === id ? { ...m, ...patch } : m) });
  }
  function removeMilestone(id: string) { persist({ ...pm, milestones: pm.milestones.filter((m) => m.id !== id) }); }

  function addTeamMember() {
    persist({ ...pm, team: [...pm.team, { id: uid(), name: "", role: TEAM_ROLES[0], email: "", phone: "" }] });
  }
  function updateTeamMember(id: string, patch: Partial<TeamMember>) {
    persist({ ...pm, team: pm.team.map((m) => m.id === id ? { ...m, ...patch } : m) });
  }
  function removeTeamMember(id: string) { persist({ ...pm, team: pm.team.filter((m) => m.id !== id) }); }

  function addFieldReport() {
    persist({ ...pm, fieldReports: [{ id: uid(), date: today(), author: "", crewSize: 0, hoursWorked: 0, workPerformed: "", materialsUsed: "", issues: "", tomorrowPlan: "", weather: "", notes: "" }, ...pm.fieldReports] });
  }
  function updateFieldReport(id: string, patch: Partial<FieldReport>) {
    persist({ ...pm, fieldReports: pm.fieldReports.map((r) => r.id === id ? { ...r, ...patch } : r) });
  }
  function removeFieldReport(id: string) { persist({ ...pm, fieldReports: pm.fieldReports.filter((r) => r.id !== id) }); }

  function addPunchItem() {
    persist({ ...pm, punchList: [...pm.punchList, { id: uid(), location: "", description: "", assignee: "", status: "open", priority: "medium", dueDate: "", notes: "" }] });
  }
  function updatePunchItem(id: string, patch: Partial<PunchItem>) {
    persist({ ...pm, punchList: pm.punchList.map((p) => p.id === id ? { ...p, ...patch } : p) });
  }
  function removePunchItem(id: string) { persist({ ...pm, punchList: pm.punchList.filter((p) => p.id !== id) }); }

  function addChangeOrder() {
    persist({ ...pm, changeOrders: [...pm.changeOrders, { id: uid(), title: "", description: "", requestedBy: "", status: "draft", costImpact: 0, scheduleImpact: "", date: today(), notes: "" }] });
  }
  function updateChangeOrder(id: string, patch: Partial<ChangeOrder>) {
    persist({ ...pm, changeOrders: pm.changeOrders.map((c) => c.id === id ? { ...c, ...patch } : c) });
  }
  function removeChangeOrder(id: string) { persist({ ...pm, changeOrders: pm.changeOrders.filter((c) => c.id !== id) }); }

  function addSubmittal() {
    const num = `SUB-${String(pm.submittals.length + 1).padStart(3, "0")}`;
    persist({ ...pm, submittals: [...pm.submittals, { id: uid(), number: num, description: "", vendor: "", status: "pending", submittedDate: today(), requiredDate: "", notes: "" }] });
  }
  function updateSubmittal(id: string, patch: Partial<Submittal>) {
    persist({ ...pm, submittals: pm.submittals.map((s) => s.id === id ? { ...s, ...patch } : s) });
  }
  function removeSubmittal(id: string) { persist({ ...pm, submittals: pm.submittals.filter((s) => s.id !== id) }); }

  function addRFI() {
    const num = `RFI-${String(pm.rfis.length + 1).padStart(3, "0")}`;
    persist({ ...pm, rfis: [...pm.rfis, { id: uid(), number: num, subject: "", question: "", answer: "", status: "open", submittedDate: today(), requiredDate: "", answeredDate: "", submittedBy: "", answeredBy: "" }] });
  }
  function updateRFI(id: string, patch: Partial<RFI>) {
    persist({ ...pm, rfis: pm.rfis.map((r) => r.id === id ? { ...r, ...patch } : r) });
  }
  function removeRFI(id: string) { persist({ ...pm, rfis: pm.rfis.filter((r) => r.id !== id) }); }

  function addBudgetLine() {
    persist({ ...pm, budget: [...pm.budget, { id: uid(), category: BUDGET_CATEGORIES[0], budgeted: 0, actual: 0, committed: 0, notes: "" }] });
  }
  function updateBudgetLine(id: string, patch: Partial<BudgetLine>) {
    persist({ ...pm, budget: pm.budget.map((b) => b.id === id ? { ...b, ...patch } : b) });
  }
  function removeBudgetLine(id: string) { persist({ ...pm, budget: pm.budget.filter((b) => b.id !== id) }); }

  /* ── Computed metrics ──────────────────────────── */
  const tasksDone = pm.tasks.filter((t) => t.status === "completed").length;
  const tasksTotal = pm.tasks.length;
  const tasksPct = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;
  const milestonesDone = pm.milestones.filter((m) => m.status === "completed").length;
  const punchOpen = pm.punchList.filter((p) => p.status === "open" || p.status === "in_progress").length;
  const cosApproved = pm.changeOrders.filter((c) => c.status === "approved").reduce((s, c) => s + c.costImpact, 0);
  const totalBudgeted = pm.budget.reduce((s, b) => s + b.budgeted, 0);
  const totalActual = pm.budget.reduce((s, b) => s + b.actual, 0);
  const totalCommitted = pm.budget.reduce((s, b) => s + b.committed, 0);

  /* ── Loading state ─────────────────────────────── */
  if (!project) {
    return (
      <div className="animate-fade-in px-8 py-6">
        <Link href="/projects" className="mb-4 inline-flex items-center gap-1.5 text-sm text-subtle hover:text-secondary">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          Back to Projects
        </Link>
        <div className="mt-20 text-center text-sm text-subtle">Loading...</div>
      </div>
    );
  }

  /* ── Shared UI pieces ──────────────────────────── */
  const Badge = ({ label, color }: { label: string; color: string }) => (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: color + "1a", color, border: `1px solid ${color}3d` }}>
      {statusLabel(label)}
    </span>
  );

  const EmptyState = ({ noun, onAdd }: { noun: string; onAdd: () => void }) => (
    <div className="flex flex-col items-center justify-center py-20">
      <p className="mb-3 text-sm text-faint">No {noun} yet</p>
      <button onClick={onAdd} className="forge-btn-primary text-[13px]">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        Add {noun.replace(/s$/, "").replace(/ies$/, "y")}
      </button>
    </div>
  );

  const SectionHeader = ({ title, count, onAdd, addLabel }: { title: string; count: number; onAdd: () => void; addLabel: string }) => (
    <div className="mb-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-heading">{title}</h2>
        <span className="rounded-md bg-forge-surface/60 px-2 py-0.5 text-[11px] text-subtle">{count}</span>
      </div>
      <button onClick={onAdd} className="flex items-center gap-1.5 rounded-lg bg-orange-500/10 px-3 py-1.5 text-[12px] font-semibold text-orange-400 transition-colors hover:bg-orange-500/20">
        <svg width="12" height="12" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        {addLabel}
      </button>
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

  const SelectField = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) => (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faint">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="forge-input w-full text-[13px]">
        {options.map((o) => <option key={o} value={o}>{statusLabel(o)}</option>)}
      </select>
    </div>
  );

  const DeleteBtn = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} className="shrink-0 rounded p-1.5 text-faint transition-colors hover:bg-red-500/10 hover:text-red-400" title="Delete">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
    </button>
  );

  /* ── Metric card for overview ──────────────────── */
  const MetricCard = ({ label, value, sub, color = "#f97316" }: { label: string; value: string | number; sub?: string; color?: string }) => (
    <div className="rounded-xl border border-border bg-forge-surface/40 p-5">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-faint">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="mt-1 text-[12px] text-subtle">{sub}</p>}
    </div>
  );

  /* ═══════════════════════════════════════════════════════════ */
  /* ── Tab content renderers ─────────────────────────────── */
  /* ═══════════════════════════════════════════════════════════ */

  function renderOverview() {
    return (
      <div>
        <h2 className="mb-6 text-lg font-bold text-heading">Project Dashboard</h2>

        {/* Metric cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label="Task Progress" value={`${tasksPct}%`} sub={`${tasksDone} of ${tasksTotal} tasks`} />
          <MetricCard label="Milestones" value={`${milestonesDone}/${pm.milestones.length}`} sub={milestonesDone === pm.milestones.length && pm.milestones.length > 0 ? "All complete" : "In progress"} color="#22c55e" />
          <MetricCard label="Open Punch Items" value={punchOpen} sub={`${pm.punchList.length} total`} color={punchOpen > 0 ? "#f97316" : "#22c55e"} />
          <MetricCard label="Budget" value={fmt$(totalActual)} sub={`of ${fmt$(totalBudgeted)} budgeted`} color={totalActual > totalBudgeted && totalBudgeted > 0 ? "#ef4444" : "#3b82f6"} />
        </div>

        {/* Schedule */}
        <div className="mb-8 rounded-xl border border-border bg-forge-surface/40 p-5">
          <h3 className="mb-4 text-sm font-bold text-heading">Project Schedule</h3>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Start Date" value={pm.scheduleStart} onChange={(v) => persist({ ...pm, scheduleStart: v })} type="date" />
            <InputField label="Target Completion" value={pm.scheduleEnd} onChange={(v) => persist({ ...pm, scheduleEnd: v })} type="date" />
          </div>
        </div>

        {/* Quick stats rows */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-forge-surface/40 p-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">Team</p>
            <p className="text-xl font-bold text-heading">{pm.team.length} members</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {pm.team.slice(0, 5).map((m) => (
                <span key={m.id} className="rounded bg-orange-500/10 px-2 py-0.5 text-[11px] text-orange-400">{m.name || m.role}</span>
              ))}
              {pm.team.length > 5 && <span className="text-[11px] text-faint">+{pm.team.length - 5} more</span>}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-forge-surface/40 p-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">Change Orders</p>
            <p className="text-xl font-bold text-heading">{pm.changeOrders.length}</p>
            <p className="mt-1 text-[12px] text-subtle">Approved impact: {fmt$(cosApproved)}</p>
          </div>
          <div className="rounded-xl border border-border bg-forge-surface/40 p-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">Submittals / RFIs</p>
            <p className="text-xl font-bold text-heading">{pm.submittals.length} / {pm.rfis.length}</p>
            <p className="mt-1 text-[12px] text-subtle">
              {pm.submittals.filter((s) => s.status === "pending").length} pending, {pm.rfis.filter((r) => r.status === "open").length} open
            </p>
          </div>
        </div>

        {/* Field reports preview */}
        {pm.fieldReports.length > 0 && (
          <div className="mt-8 rounded-xl border border-border bg-forge-surface/40 p-5">
            <h3 className="mb-3 text-sm font-bold text-heading">Recent Field Reports</h3>
            {pm.fieldReports.slice(0, 3).map((r) => (
              <div key={r.id} className="mb-2 flex items-start gap-3 rounded-lg bg-forge-panel/30 px-4 py-3 last:mb-0">
                <span className="shrink-0 text-[12px] font-medium text-orange-400">{fmtDate(r.date)}</span>
                <span className="text-[12px] text-muted">{r.author && `${r.author} — `}{r.workPerformed || "No description"}</span>
              </div>
            ))}
          </div>
        )}

        {/* Project notes */}
        <div className="mt-8">
          <TextareaField label="Project Notes" value={pm.projectNotes} onChange={(v) => persist({ ...pm, projectNotes: v })} placeholder="General project notes, key decisions, important contacts..." rows={4} />
        </div>
      </div>
    );
  }

  /* ── Tasks ─────────────────────────────────────── */
  function renderTasks() {
    if (pm.tasks.length === 0) return <EmptyState noun="tasks" onAdd={addTask} />;
    return (
      <div>
        <SectionHeader title="Tasks" count={pm.tasks.length} onAdd={addTask} addLabel="Add Task" />
        <div className="space-y-3">
          {pm.tasks.map((task) => (
            <div key={task.id} className="rounded-xl border border-border bg-forge-surface/40 p-4">
              <div className="mb-3 flex items-start gap-2">
                <input value={task.title} onChange={(e) => updateTask(task.id, { title: e.target.value })} placeholder="Task title..." className="flex-1 border-none bg-transparent text-[14px] font-semibold text-heading outline-none placeholder:text-faint" />
                <Badge label={task.status} color={statusColor(task.status)} />
                <Badge label={task.priority} color={statusColor(task.priority)} />
                <DeleteBtn onClick={() => removeTask(task.id)} />
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <SelectField label="Status" value={task.status} onChange={(v) => updateTask(task.id, { status: v as Task["status"], ...(v === "completed" ? { completedDate: today() } : {}) })} options={TASK_STATUSES} />
                <SelectField label="Priority" value={task.priority} onChange={(v) => updateTask(task.id, { priority: v as Task["priority"] })} options={PRIORITIES} />
                <SelectField label="Category" value={task.category} onChange={(v) => updateTask(task.id, { category: v })} options={TASK_CATEGORIES} />
                <InputField label="Assignee" value={task.assignee} onChange={(v) => updateTask(task.id, { assignee: v })} placeholder="Name" />
                <InputField label="Due Date" value={task.dueDate} onChange={(v) => updateTask(task.id, { dueDate: v })} type="date" />
                {task.status === "completed" && <InputField label="Completed" value={task.completedDate} onChange={(v) => updateTask(task.id, { completedDate: v })} type="date" />}
              </div>
              <div className="mt-3">
                <TextareaField label="Description / Notes" value={task.description} onChange={(v) => updateTask(task.id, { description: v })} placeholder="Details, blockers, dependencies..." rows={2} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Milestones ────────────────────────────────── */
  function renderMilestones() {
    if (pm.milestones.length === 0) return <EmptyState noun="milestones" onAdd={addMilestone} />;
    return (
      <div>
        <SectionHeader title="Milestones" count={pm.milestones.length} onAdd={addMilestone} addLabel="Add Milestone" />

        {/* Timeline */}
        <div className="space-y-0">
          {pm.milestones.map((m, i) => (
            <div key={m.id} className="flex gap-4">
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2" style={{ borderColor: m.status === "completed" ? "#22c55e" : "#f97316", backgroundColor: m.status === "completed" ? "#22c55e" : "transparent" }}>
                  {m.status === "completed" ? (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 4.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-orange-400" />
                  )}
                </div>
                {i < pm.milestones.length - 1 && <div className="w-0.5 flex-1 bg-border" />}
              </div>

              {/* Content */}
              <div className="mb-4 flex-1 rounded-xl border border-border bg-forge-surface/40 p-4">
                <div className="mb-2 flex items-start gap-2">
                  <input value={m.name} onChange={(e) => updateMilestone(m.id, { name: e.target.value })} placeholder="Milestone name..." className="flex-1 border-none bg-transparent text-[14px] font-semibold text-heading outline-none placeholder:text-faint" />
                  <button onClick={() => updateMilestone(m.id, { status: m.status === "completed" ? "pending" : "completed" })} className="rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors" style={{ backgroundColor: (m.status === "completed" ? "#22c55e" : "#f97316") + "1a", color: m.status === "completed" ? "#22c55e" : "#f97316" }}>
                    {m.status === "completed" ? "Completed" : "Mark Complete"}
                  </button>
                  <DeleteBtn onClick={() => removeMilestone(m.id)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <InputField label="Due Date" value={m.dueDate} onChange={(v) => updateMilestone(m.id, { dueDate: v })} type="date" />
                  <TextareaField label="Description" value={m.description} onChange={(v) => updateMilestone(m.id, { description: v })} placeholder="Milestone details..." rows={1} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Team ───────────────────────────────────────── */
  function renderTeam() {
    if (pm.team.length === 0) return <EmptyState noun="team members" onAdd={addTeamMember} />;
    return (
      <div>
        <SectionHeader title="Project Team" count={pm.team.length} onAdd={addTeamMember} addLabel="Add Member" />
        <div className="grid gap-3 lg:grid-cols-2">
          {pm.team.map((m) => (
            <div key={m.id} className="flex gap-4 rounded-xl border border-border bg-forge-surface/40 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-sm font-bold text-orange-400">
                {m.name ? m.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "?"}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-start gap-2">
                  <input value={m.name} onChange={(e) => updateTeamMember(m.id, { name: e.target.value })} placeholder="Name" className="flex-1 border-none bg-transparent text-[14px] font-semibold text-heading outline-none placeholder:text-faint" />
                  <DeleteBtn onClick={() => removeTeamMember(m.id)} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <SelectField label="Role" value={m.role} onChange={(v) => updateTeamMember(m.id, { role: v })} options={TEAM_ROLES} />
                  <InputField label="Email" value={m.email} onChange={(v) => updateTeamMember(m.id, { email: v })} placeholder="email@company.com" />
                  <InputField label="Phone" value={m.phone} onChange={(v) => updateTeamMember(m.id, { phone: v })} placeholder="(555) 000-0000" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Budget ────────────────────────────────────── */
  function renderBudget() {
    return (
      <div>
        <SectionHeader title="Budget Tracking" count={pm.budget.length} onAdd={addBudgetLine} addLabel="Add Line" />

        {/* Summary cards */}
        <div className="mb-6 grid grid-cols-4 gap-3">
          <MetricCard label="Total Budgeted" value={fmt$(totalBudgeted)} color="#3b82f6" />
          <MetricCard label="Committed" value={fmt$(totalCommitted)} color="#f59e0b" />
          <MetricCard label="Actual Spent" value={fmt$(totalActual)} color={totalActual > totalBudgeted && totalBudgeted > 0 ? "#ef4444" : "#22c55e"} />
          <MetricCard label="Remaining" value={fmt$(totalBudgeted - totalActual)} color={totalBudgeted - totalActual < 0 ? "#ef4444" : "#22c55e"} />
        </div>

        {pm.budget.length === 0 ? (
          <EmptyState noun="budget lines" onAdd={addBudgetLine} />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-border bg-forge-panel/60 text-[11px] font-semibold uppercase tracking-wider text-subtle">
                  <th className="px-3 py-3">Category</th>
                  <th className="px-3 py-3 text-right">Budgeted</th>
                  <th className="px-3 py-3 text-right">Committed</th>
                  <th className="px-3 py-3 text-right">Actual</th>
                  <th className="px-3 py-3 text-right">Variance</th>
                  <th className="min-w-[150px] px-3 py-3">Notes</th>
                  <th className="w-10 px-2" />
                </tr>
              </thead>
              <tbody>
                {pm.budget.map((b) => {
                  const variance = b.budgeted - b.actual;
                  return (
                    <tr key={b.id} className="border-b border-border/50 transition-colors hover:bg-forge-surface/20">
                      <td className="px-3 py-2">
                        <select value={b.category} onChange={(e) => updateBudgetLine(b.id, { category: e.target.value })} className="w-full border-none bg-transparent text-[13px] text-body outline-none">
                          {BUDGET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-right"><input type="number" value={b.budgeted || ""} onChange={(e) => updateBudgetLine(b.id, { budgeted: +e.target.value })} className="w-24 border-none bg-transparent text-right text-[13px] text-body outline-none" placeholder="0" /></td>
                      <td className="px-3 py-2 text-right"><input type="number" value={b.committed || ""} onChange={(e) => updateBudgetLine(b.id, { committed: +e.target.value })} className="w-24 border-none bg-transparent text-right text-[13px] text-body outline-none" placeholder="0" /></td>
                      <td className="px-3 py-2 text-right"><input type="number" value={b.actual || ""} onChange={(e) => updateBudgetLine(b.id, { actual: +e.target.value })} className="w-24 border-none bg-transparent text-right text-[13px] text-body outline-none" placeholder="0" /></td>
                      <td className="px-3 py-2 text-right font-medium" style={{ color: variance < 0 ? "#ef4444" : "#22c55e" }}>{fmt$(variance)}</td>
                      <td className="px-3 py-2"><input value={b.notes} onChange={(e) => updateBudgetLine(b.id, { notes: e.target.value })} className="w-full border-none bg-transparent text-[13px] text-muted outline-none" placeholder="Notes..." /></td>
                      <td className="px-2 py-2"><DeleteBtn onClick={() => removeBudgetLine(b.id)} /></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-forge-panel/40 text-[12px] font-bold text-heading">
                  <td className="px-3 py-3">TOTAL</td>
                  <td className="px-3 py-3 text-right">{fmt$(totalBudgeted)}</td>
                  <td className="px-3 py-3 text-right">{fmt$(totalCommitted)}</td>
                  <td className="px-3 py-3 text-right">{fmt$(totalActual)}</td>
                  <td className="px-3 py-3 text-right" style={{ color: totalBudgeted - totalActual < 0 ? "#ef4444" : "#22c55e" }}>{fmt$(totalBudgeted - totalActual)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    );
  }

  /* ── Field Reports ─────────────────────────────── */
  function renderFieldReports() {
    if (pm.fieldReports.length === 0) return <EmptyState noun="field reports" onAdd={addFieldReport} />;
    return (
      <div>
        <SectionHeader title="Daily Field Reports" count={pm.fieldReports.length} onAdd={addFieldReport} addLabel="New Report" />
        <div className="space-y-4">
          {pm.fieldReports.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-forge-surface/40 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <InputField label="Date" value={r.date} onChange={(v) => updateFieldReport(r.id, { date: v })} type="date" />
                  <InputField label="Author" value={r.author} onChange={(v) => updateFieldReport(r.id, { author: v })} placeholder="Name" />
                  <InputField label="Weather" value={r.weather} onChange={(v) => updateFieldReport(r.id, { weather: v })} placeholder="Clear, 72F" />
                </div>
                <DeleteBtn onClick={() => removeFieldReport(r.id)} />
              </div>
              <div className="mb-3 grid grid-cols-2 gap-3">
                <InputField label="Crew Size" value={r.crewSize || ""} onChange={(v) => updateFieldReport(r.id, { crewSize: +v })} type="number" placeholder="0" />
                <InputField label="Hours Worked" value={r.hoursWorked || ""} onChange={(v) => updateFieldReport(r.id, { hoursWorked: +v })} type="number" placeholder="0" />
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <TextareaField label="Work Performed" value={r.workPerformed} onChange={(v) => updateFieldReport(r.id, { workPerformed: v })} placeholder="Description of work completed today..." rows={3} />
                <TextareaField label="Materials Used" value={r.materialsUsed} onChange={(v) => updateFieldReport(r.id, { materialsUsed: v })} placeholder="Equipment, cables, hardware installed..." rows={3} />
                <TextareaField label="Issues / Delays" value={r.issues} onChange={(v) => updateFieldReport(r.id, { issues: v })} placeholder="Problems encountered, delays, blockers..." rows={3} />
                <TextareaField label="Tomorrow's Plan" value={r.tomorrowPlan} onChange={(v) => updateFieldReport(r.id, { tomorrowPlan: v })} placeholder="Planned activities for next day..." rows={3} />
              </div>
              <div className="mt-3">
                <TextareaField label="Additional Notes" value={r.notes} onChange={(v) => updateFieldReport(r.id, { notes: v })} placeholder="Safety observations, visitor log, coordination notes..." rows={2} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Punch List ────────────────────────────────── */
  function renderPunchList() {
    if (pm.punchList.length === 0) return <EmptyState noun="punch items" onAdd={addPunchItem} />;
    return (
      <div>
        <SectionHeader title="Punch List" count={pm.punchList.length} onAdd={addPunchItem} addLabel="Add Item" />
        <div className="space-y-3">
          {pm.punchList.map((p) => (
            <div key={p.id} className="rounded-xl border border-border bg-forge-surface/40 p-4">
              <div className="mb-3 flex items-start gap-2">
                <input value={p.description} onChange={(e) => updatePunchItem(p.id, { description: e.target.value })} placeholder="Punch item description..." className="flex-1 border-none bg-transparent text-[14px] font-semibold text-heading outline-none placeholder:text-faint" />
                <Badge label={p.status} color={statusColor(p.status)} />
                <Badge label={p.priority} color={statusColor(p.priority)} />
                <DeleteBtn onClick={() => removePunchItem(p.id)} />
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <InputField label="Location" value={p.location} onChange={(v) => updatePunchItem(p.id, { location: v })} placeholder="Room / Area" />
                <InputField label="Assignee" value={p.assignee} onChange={(v) => updatePunchItem(p.id, { assignee: v })} placeholder="Name" />
                <SelectField label="Status" value={p.status} onChange={(v) => updatePunchItem(p.id, { status: v as PunchItem["status"] })} options={PUNCH_STATUSES} />
                <SelectField label="Priority" value={p.priority} onChange={(v) => updatePunchItem(p.id, { priority: v as PunchItem["priority"] })} options={["low", "medium", "high"]} />
                <InputField label="Due Date" value={p.dueDate} onChange={(v) => updatePunchItem(p.id, { dueDate: v })} type="date" />
              </div>
              <div className="mt-3">
                <TextareaField label="Notes" value={p.notes} onChange={(v) => updatePunchItem(p.id, { notes: v })} placeholder="Additional details, photos needed..." rows={2} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Change Orders ─────────────────────────────── */
  function renderChangeOrders() {
    if (pm.changeOrders.length === 0) return <EmptyState noun="change orders" onAdd={addChangeOrder} />;
    return (
      <div>
        <SectionHeader title="Change Orders" count={pm.changeOrders.length} onAdd={addChangeOrder} addLabel="New CO" />
        <div className="space-y-3">
          {pm.changeOrders.map((co, i) => (
            <div key={co.id} className="rounded-xl border border-border bg-forge-surface/40 p-4">
              <div className="mb-3 flex items-start gap-2">
                <span className="shrink-0 rounded bg-orange-500/15 px-2 py-0.5 text-[11px] font-bold text-orange-400">CO-{String(i + 1).padStart(3, "0")}</span>
                <input value={co.title} onChange={(e) => updateChangeOrder(co.id, { title: e.target.value })} placeholder="Change order title..." className="flex-1 border-none bg-transparent text-[14px] font-semibold text-heading outline-none placeholder:text-faint" />
                <Badge label={co.status} color={statusColor(co.status)} />
                <DeleteBtn onClick={() => removeChangeOrder(co.id)} />
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <SelectField label="Status" value={co.status} onChange={(v) => updateChangeOrder(co.id, { status: v as ChangeOrder["status"] })} options={CO_STATUSES} />
                <InputField label="Requested By" value={co.requestedBy} onChange={(v) => updateChangeOrder(co.id, { requestedBy: v })} placeholder="Name / Company" />
                <InputField label="Cost Impact ($)" value={co.costImpact || ""} onChange={(v) => updateChangeOrder(co.id, { costImpact: +v })} type="number" placeholder="0" />
                <InputField label="Schedule Impact" value={co.scheduleImpact} onChange={(v) => updateChangeOrder(co.id, { scheduleImpact: v })} placeholder="e.g. +3 days" />
                <InputField label="Date" value={co.date} onChange={(v) => updateChangeOrder(co.id, { date: v })} type="date" />
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <TextareaField label="Description" value={co.description} onChange={(v) => updateChangeOrder(co.id, { description: v })} placeholder="Scope of change, reason..." rows={3} />
                <TextareaField label="Notes" value={co.notes} onChange={(v) => updateChangeOrder(co.id, { notes: v })} placeholder="Approval notes, attachments..." rows={3} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Submittals ────────────────────────────────── */
  function renderSubmittals() {
    if (pm.submittals.length === 0) return <EmptyState noun="submittals" onAdd={addSubmittal} />;
    return (
      <div>
        <SectionHeader title="Submittals" count={pm.submittals.length} onAdd={addSubmittal} addLabel="New Submittal" />
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-border bg-forge-panel/60 text-[11px] font-semibold uppercase tracking-wider text-subtle">
                <th className="px-3 py-3">No.</th>
                <th className="min-w-[200px] px-3 py-3">Description</th>
                <th className="px-3 py-3">Vendor</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Submitted</th>
                <th className="px-3 py-3">Required By</th>
                <th className="min-w-[150px] px-3 py-3">Notes</th>
                <th className="w-10 px-2" />
              </tr>
            </thead>
            <tbody>
              {pm.submittals.map((s) => (
                <tr key={s.id} className="border-b border-border/50 transition-colors hover:bg-forge-surface/20">
                  <td className="px-3 py-2 text-[12px] font-bold text-orange-400">{s.number}</td>
                  <td className="px-3 py-2"><input value={s.description} onChange={(e) => updateSubmittal(s.id, { description: e.target.value })} className="w-full border-none bg-transparent text-[13px] text-body outline-none" placeholder="Description..." /></td>
                  <td className="px-3 py-2"><input value={s.vendor} onChange={(e) => updateSubmittal(s.id, { vendor: e.target.value })} className="w-full border-none bg-transparent text-[13px] text-body outline-none" placeholder="Vendor" /></td>
                  <td className="px-3 py-2">
                    <select value={s.status} onChange={(e) => updateSubmittal(s.id, { status: e.target.value as Submittal["status"] })} className="border-none bg-transparent text-[12px] font-semibold outline-none" style={{ color: statusColor(s.status) }}>
                      {SUB_STATUSES.map((o) => <option key={o} value={o}>{statusLabel(o)}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2"><input type="date" value={s.submittedDate} onChange={(e) => updateSubmittal(s.id, { submittedDate: e.target.value })} className="border-none bg-transparent text-[13px] text-body outline-none" /></td>
                  <td className="px-3 py-2"><input type="date" value={s.requiredDate} onChange={(e) => updateSubmittal(s.id, { requiredDate: e.target.value })} className="border-none bg-transparent text-[13px] text-body outline-none" /></td>
                  <td className="px-3 py-2"><input value={s.notes} onChange={(e) => updateSubmittal(s.id, { notes: e.target.value })} className="w-full border-none bg-transparent text-[13px] text-muted outline-none" placeholder="Notes..." /></td>
                  <td className="px-2 py-2"><DeleteBtn onClick={() => removeSubmittal(s.id)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ── RFIs ──────────────────────────────────────── */
  function renderRFIs() {
    if (pm.rfis.length === 0) return <EmptyState noun="RFIs" onAdd={addRFI} />;
    return (
      <div>
        <SectionHeader title="Requests for Information" count={pm.rfis.length} onAdd={addRFI} addLabel="New RFI" />
        <div className="space-y-3">
          {pm.rfis.map((rfi) => (
            <div key={rfi.id} className="rounded-xl border border-border bg-forge-surface/40 p-4">
              <div className="mb-3 flex items-start gap-2">
                <span className="shrink-0 rounded bg-orange-500/15 px-2 py-0.5 text-[11px] font-bold text-orange-400">{rfi.number}</span>
                <input value={rfi.subject} onChange={(e) => updateRFI(rfi.id, { subject: e.target.value })} placeholder="RFI subject..." className="flex-1 border-none bg-transparent text-[14px] font-semibold text-heading outline-none placeholder:text-faint" />
                <Badge label={rfi.status} color={statusColor(rfi.status)} />
                <DeleteBtn onClick={() => removeRFI(rfi.id)} />
              </div>
              <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
                <SelectField label="Status" value={rfi.status} onChange={(v) => updateRFI(rfi.id, { status: v as RFI["status"] })} options={RFI_STATUSES} />
                <InputField label="Submitted By" value={rfi.submittedBy} onChange={(v) => updateRFI(rfi.id, { submittedBy: v })} placeholder="Name" />
                <InputField label="Submitted Date" value={rfi.submittedDate} onChange={(v) => updateRFI(rfi.id, { submittedDate: v })} type="date" />
                <InputField label="Required By" value={rfi.requiredDate} onChange={(v) => updateRFI(rfi.id, { requiredDate: v })} type="date" />
                <InputField label="Answered By" value={rfi.answeredBy} onChange={(v) => updateRFI(rfi.id, { answeredBy: v })} placeholder="Name" />
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <TextareaField label="Question" value={rfi.question} onChange={(v) => updateRFI(rfi.id, { question: v })} placeholder="Describe the question or clarification needed..." rows={3} />
                <TextareaField label="Answer" value={rfi.answer} onChange={(v) => updateRFI(rfi.id, { answer: v, ...(v && !rfi.answeredDate ? { answeredDate: today() } : {}) })} placeholder="Response..." rows={3} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Content map ───────────────────────────────── */
  const tabContent: Record<TabId, () => React.ReactNode> = {
    overview: renderOverview,
    tasks: renderTasks,
    milestones: renderMilestones,
    team: renderTeam,
    budget: renderBudget,
    "field-reports": renderFieldReports,
    "punch-list": renderPunchList,
    "change-orders": renderChangeOrders,
    submittals: renderSubmittals,
    rfis: renderRFIs,
  };

  /* ═══════════════════════════════════════════════════════════ */
  /* ── Render ────────────────────────────────────────────── */
  /* ═══════════════════════════════════════════════════════════ */
  return (
    <div className="animate-fade-in">
      {/* ── Top header ────────────────────────────────── */}
      <div className="border-b border-border bg-forge-panel/50 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <Link href={`/projects/${params.id}`} className="mb-2 inline-flex items-center gap-1.5 text-xs text-subtle hover:text-secondary">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              {project.name}
            </Link>
            <h1 className="flex items-center gap-2.5 text-xl font-bold text-heading">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
              </svg>
              Project Management
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[12px] text-faint">
              {pm.tasks.length} tasks &middot; {pm.milestones.length} milestones &middot; {pm.punchList.length} punch items
            </span>
            <Link
              href="/project-management"
              className="flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-[12px] font-semibold text-blue-400 transition-colors hover:bg-blue-500/20"
              title="Org-wide resource scheduling"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Team Schedule
            </Link>
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

      {/* ── Body: sidebar + content ────────────────── */}
      <div className="flex" style={{ minHeight: "calc(100vh - 72px - 85px)" }}>
        {/* Sidebar */}
        <nav className="w-[220px] shrink-0 overflow-y-auto border-r border-border bg-forge-panel/30 px-3 py-5">
          <div className="space-y-0.5">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const count = tab.id === "tasks" ? pm.tasks.length
                : tab.id === "milestones" ? pm.milestones.length
                : tab.id === "team" ? pm.team.length
                : tab.id === "budget" ? pm.budget.length
                : tab.id === "field-reports" ? pm.fieldReports.length
                : tab.id === "punch-list" ? pm.punchList.length
                : tab.id === "change-orders" ? pm.changeOrders.length
                : tab.id === "submittals" ? pm.submittals.length
                : tab.id === "rfis" ? pm.rfis.length
                : 0;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] transition-all ${
                    isActive ? "bg-orange-500/10 font-semibold text-orange-400" : "text-muted hover:bg-forge-surface/30 hover:text-secondary"
                  }`}
                >
                  <span className={isActive ? "text-orange-400" : "text-subtle"}>{tab.icon}</span>
                  <span className="flex-1">{tab.label}</span>
                  {count > 0 && tab.id !== "overview" && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${isActive ? "bg-orange-500/20 text-orange-400" : "bg-forge-surface/60 text-faint"}`}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-6" style={{ maxHeight: "calc(100vh - 72px - 85px)" }}>
          {tabContent[activeTab]()}
        </div>
      </div>
    </div>
  );
}
