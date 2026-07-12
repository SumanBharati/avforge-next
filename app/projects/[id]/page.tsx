"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ROLE_OPTIONS } from "@/lib/pm-store";
import ProjectDetailSkeleton from "@/components/skeletons/ProjectDetailSkeleton";

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
  created_by: string;
  status: string;
  phase: string;
  created_at: string;
}

interface LineItem {
  qty: number;
  unitCost: number;
  laborHours: number;
  laborRate: number;
  category: string;
}

interface ProposalSection {
  id: string;
  name: string;
  items: LineItem[];
}

interface ProposalData {
  sections: ProposalSection[];
  taxRate: number;
  marginPercent: number;
}

/* ── Phase / tool definitions ─────────────────────────────── */
const topRow = [
  {
    id: "site-survey",
    name: "Site Survey",
    desc: "Document site conditions, measurements, and existing infrastructure",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    color: "emerald",
    href: "site-survey",
    absolute: false,
    stage: 2,
    recommendedStage: "proposal",
  },
  {
    id: "design-engineering",
    name: "Design Engineering",
    desc: "Room designer, rack planner, signal flow builder, cable pull sheets, and more",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
      </svg>
    ),
    color: "emerald",
    href: "/designEngineering",
    absolute: true,
    stage: 3,
    recommendedStage: "proposal",
  },
  {
    id: "proposal",
    name: "Proposal",
    desc: "Build AV proposals with scope of work, equipment lists, and cost estimates",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    color: "emerald",
    href: "proposal",
    absolute: false,
    stage: 4,
    recommendedStage: "proposal",
  },
  {
    id: "procurement",
    name: "Project Coordination",
    desc: "Equipment ordering, tracking, and vendor coordination",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
      </svg>
    ),
    color: "amber",
    href: "procurement",
    absolute: false,
    stage: 5,
    recommendedStage: "contract",
  },
];

const bottomRow = [
  {
    id: "project-engineering",
    name: "Project Engineering",
    desc: "System design, drawings, and engineering documentation",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
        <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
      </svg>
    ),
    color: "violet",
    href: "project-engineering",
    absolute: false,
    stage: 4,
    recommendedStage: "installation",
  },
  {
    id: "project-management",
    name: "Project Management",
    desc: "Scheduling, coordination, and on-site management",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
      </svg>
    ),
    color: "violet",
    href: "project-management",
    absolute: false,
    stage: 5,
    recommendedStage: "installation",
  },
  {
    id: "programming",
    name: "Programming",
    desc: "System programming, commissioning, and integration testing",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
        <polyline points="7 8 10 11 7 14" />
        <line x1="12" y1="14" x2="17" y2="14" />
      </svg>
    ),
    color: "violet",
    href: "",
    absolute: false,
    stage: 7,
    recommendedStage: "installation",
  },
];

const colorStyles: Record<string, { border: string; iconBg: string; iconBorder: string; iconText: string; accent: string }> = {
  cyan:    { border: "border-cyan-500/30",    iconBg: "bg-cyan-500/15",    iconBorder: "border-cyan-500/40",    iconText: "text-cyan-400",    accent: "#06b6d4" },
  blue:    { border: "border-blue-500/30",    iconBg: "bg-blue-500/15",    iconBorder: "border-blue-500/40",    iconText: "text-blue-400",    accent: "#8b5cf6" },
  violet:  { border: "border-violet-500/30",  iconBg: "bg-violet-500/15",  iconBorder: "border-violet-500/40",  iconText: "text-violet-400",  accent: "#8b5cf6" },
  emerald: { border: "border-emerald-500/30", iconBg: "bg-emerald-500/15", iconBorder: "border-emerald-500/40", iconText: "text-emerald-400", accent: "#10b981" },
  amber:   { border: "border-amber-500/30",   iconBg: "bg-amber-500/15",   iconBorder: "border-amber-500/40",   iconText: "text-amber-400",   accent: "#f59e0b" },
  orange:  { border: "border-orange-500/30",  iconBg: "bg-orange-500/15",  iconBorder: "border-orange-500/40",  iconText: "text-orange-400",  accent: "#f97316" },
  green:   { border: "border-green-500/30",   iconBg: "bg-green-500/15",   iconBorder: "border-green-500/40",   iconText: "text-green-400",   accent: "#22c55e" },
  yellow:  { border: "border-yellow-500/30",  iconBg: "bg-yellow-500/15",  iconBorder: "border-yellow-500/40",  iconText: "text-yellow-400",  accent: "#eab308" },
  rose:    { border: "border-rose-500/30",    iconBg: "bg-rose-500/15",    iconBorder: "border-rose-500/40",    iconText: "text-rose-400",    accent: "#f43f5e" },
  teal:    { border: "border-teal-500/30",    iconBg: "bg-teal-500/15",    iconBorder: "border-teal-500/40",    iconText: "text-teal-400",    accent: "#14b8a6" },
};

const phases = [
  { id: "opportunity",    label: "Opportunity",   color: "#8b5cf6" },
  { id: "proposal",       label: "Proposal",      color: "#10b981" },
  { id: "contract",       label: "Contract",      color: "#f59e0b" },
  { id: "installation",   label: "Execution",     color: "#8b5cf6" },
  { id: "completed",      label: "Completed",     color: "#14b8a6" },
];

interface OrgMember {
  id: string;
  user_id: string;
  role: string;
  full_name: string;
  email: string;
}

interface ProjectMember {
  id: string;
  member_id: string;
  role: string;
  full_name: string;
  email: string;
}

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPhase, setCurrentPhase] = useState("opportunity");
  const [proposalData, setProposalData] = useState<ProposalData | null>(null);
  const [surveyRooms, setSurveyRooms] = useState<{ id: string; name: string }[]>([]);

  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [assigningRole, setAssigningRole] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("projects")
      .select("*")
      .eq("id", params.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        setLoading(false);
        if (data) {
          setProject(data);
          setCurrentPhase(data.phase || "opportunity");
          supabase
            .from("organization_members")
            .select("id, user_id, role")
            .eq("org_id", data.org_id)
            .then(async ({ data: members }) => {
              if (cancelled || !members) return;
              const enriched: OrgMember[] = await Promise.all(
                members.map(async (m) => {
                  const { data: u } = await supabase.auth.admin.getUserById(m.user_id).catch(() => ({ data: null })) as any;
                  return {
                    id: m.id,
                    user_id: m.user_id,
                    role: m.role,
                    full_name: u?.user?.user_metadata?.full_name || u?.user?.email?.split("@")[0] || m.user_id.slice(0, 8),
                    email: u?.user?.email || "",
                  };
                })
              );
              if (!cancelled) setOrgMembers(enriched);
            });
        }
      });

    supabase
      .from("project_members")
      .select("id, member_id, role, full_name, email")
      .eq("project_id", params.id)
      .then(({ data }) => { if (!cancelled && data) setProjectMembers(data as ProjectMember[]); });

    supabase
      .from("proposals")
      .select("data")
      .eq("project_id", params.id)
      .single()
      .then(({ data: row }) => {
        if (!cancelled && row?.data) setProposalData(row.data as ProposalData);
      });

    supabase
      .from("site_surveys")
      .select("data")
      .eq("project_id", params.id)
      .single()
      .then(({ data: surveyRow }) => {
        if (cancelled) return;
        const survey = surveyRow?.data as { buildings?: { rooms?: { id: string; name: string }[] }[] } | null;
        const rooms = survey?.buildings?.flatMap((b) => b.rooms || []) || [];
        if (rooms.length > 0) setSurveyRooms(rooms);
      });

    return () => { cancelled = true; };
  }, [params.id]);

  useEffect(() => {
    if (!assigningRole) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Element;
      if (!target.closest("[data-member-picker]")) setAssigningRole(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [assigningRole]);

  const [phaseConfirm, setPhaseConfirm] = useState<string | null>(null);

  function requestPhaseChange(phaseId: string) {
    if (phaseId === currentPhase) return;
    setPhaseConfirm(phaseId);
  }

  async function confirmPhaseChange() {
    if (!phaseConfirm) return;
    setCurrentPhase(phaseConfirm);
    await supabase.from("projects").update({ phase: phaseConfirm }).eq("id", params.id);
    setPhaseConfirm(null);
  }

  const [menuOpen, setMenuOpen] = useState(false);
  const [closeProjectModal, setCloseProjectModal] = useState(false);
  const [deleteProjectModal, setDeleteProjectModal] = useState(false);
  const [editProjectModal, setEditProjectModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editJobNumber, setEditJobNumber] = useState("");
  const [editClientName, setEditClientName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editZipCode, setEditZipCode] = useState("");
  const [editClientEmail, setEditClientEmail] = useState("");
  const [editClientPhone, setEditClientPhone] = useState("");

  async function handleCloseProject(reason: "lost" | "completed") {
    const phase = reason === "lost" ? "lost" : "completed";
    await supabase.from("projects").update({ phase }).eq("id", params.id);
    setCurrentPhase(phase);
    setCloseProjectModal(false);
  }

  async function handleDeleteProject() {
    await supabase.from("projects").delete().eq("id", params.id);
    router.push("/projects");
  }

  async function handleEditProject() {
    if (!editName.trim()) return;
    await supabase.from("projects").update({
      name: editName.trim(),
      job_number: editJobNumber.trim(),
      client_name: editClientName.trim(),
      address: editAddress.trim(),
      city: editCity.trim(),
      state: editState.trim(),
      zip_code: editZipCode.trim(),
      client_email: editClientEmail.trim(),
      client_phone: editClientPhone.trim(),
    }).eq("id", params.id);
    setProject((p) => p ? { ...p, name: editName.trim(), job_number: editJobNumber.trim(), client_name: editClientName.trim(), address: editAddress.trim(), city: editCity.trim(), state: editState.trim(), zip_code: editZipCode.trim(), client_email: editClientEmail.trim(), client_phone: editClientPhone.trim() } : p);
    setEditProjectModal(false);
  }

  async function addMember(member: OrgMember, role: string) {
    const existingSlot = projectMembers.find((m) => m.role === role);
    if (existingSlot) {
      await supabase.from("project_members").delete().eq("id", existingSlot.id);
    }
    const { data } = await supabase
      .from("project_members")
      .insert({ project_id: params.id, member_id: member.id, role, full_name: member.full_name, email: member.email })
      .select()
      .single();
    if (data) {
      setProjectMembers((prev) => [...prev.filter((m) => m.role !== role), data as ProjectMember]);
    }
    setAssigningRole(null);
  }

  async function removeMember(id: string) {
    await supabase.from("project_members").delete().eq("id", id);
    setProjectMembers((prev) => prev.filter((m) => m.id !== id));
  }

  if (loading) return <ProjectDetailSkeleton />;

  if (!project) {
    return (
      <div className="animate-fade-in px-4 py-6 sm:px-6 lg:px-8">
        <Link href="/projects" className="mb-4 inline-flex items-center gap-1.5 text-sm text-subtle transition-colors hover:text-secondary">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Back to Projects
        </Link>
        <div className="mt-20 text-center text-sm text-subtle">Project not found</div>
      </div>
    );
  }

  const phaseIndex = phases.findIndex((p) => p.id === currentPhase);

  return (
    <div className="animate-fade-in overflow-x-hidden px-4 py-4 sm:px-6 lg:px-10" style={{ height: "calc(100vh - 72px)", overflowY: "auto" }}>
      {/* Back link */}
      <Link href="/projects" className="mb-3 inline-flex items-center gap-2 text-[13px] text-subtle transition-colors hover:text-secondary">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Back to Projects
      </Link>

      {/* Project header */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-heading">{project.name}</h1>
          {/* Three-dot menu — sits right next to the project name */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="rounded-lg p-1.5 text-subtle transition-colors hover:bg-forge-surface hover:text-secondary"
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="8" cy="3" r="1.2" /><circle cx="8" cy="8" r="1.2" /><circle cx="8" cy="13" r="1.2" />
              </svg>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute left-0 top-9 z-50 w-44 rounded-lg border border-border bg-forge-surface py-1 shadow-xl">
                  <button
                    onClick={() => { setEditName(project.name); setEditJobNumber(project.job_number || ""); setEditClientName(project.client_name || ""); setEditAddress(project.address || ""); setEditCity(project.city || ""); setEditState(project.state || ""); setEditZipCode(project.zip_code || ""); setEditClientEmail(project.client_email || ""); setEditClientPhone(project.client_phone || ""); setEditProjectModal(true); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-secondary transition-colors hover:bg-forge-surface/80"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    Edit Project
                  </button>
                  <button
                    onClick={() => { setCloseProjectModal(true); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-secondary transition-colors hover:bg-forge-surface/80"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
                    Close Project
                  </button>
                  <button
                    onClick={() => { setDeleteProjectModal(true); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V3h4v1M5 4v9h6V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[15px] text-subtle">
          {project.job_number && (
            <span className="flex items-center gap-2">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
                <path d="M5 6h6M5 8.5h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              </svg>
              Job #{project.job_number}
            </span>
          )}
          <span className="flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.2" />
              <path d="M2 14c0-3.3 2.7-5 6-5s6 1.7 6 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            {project.created_by}
          </span>
        </div>
      </div>

      {/* ── Phase tracker bar ─────────────────────────── */}
      {(() => {
        const mainPhases = phases.filter(p => p.id !== "lost");
        const mainIndex = mainPhases.findIndex(p => p.id === currentPhase);
        const A = 14; // chevron arrow depth in px

        return (
          <div className="mb-4 rounded-xl border border-border bg-forge-panel px-6 py-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-heading">Project Milestones</span>
              <span className="text-xs text-faint">Click to update the current Milestone</span>
            </div>
            {/* background matches inactive segment colour so clip-path notch gaps are invisible */}
            <div className="overflow-x-auto">
            <div className="flex w-full overflow-hidden" style={{ borderRadius: 9999, height: 40, background: "#e2e8f0", minWidth: 560 }}>
              {mainPhases.map((phase, i) => {
                const isActive = phase.id === currentPhase;
                const isPast = i < mainIndex;
                const isFirst = i === 0;
                const isLast = i === mainPhases.length - 1;

                const clipPath = isFirst
                  ? `polygon(0% 0%, calc(100% - ${A}px) 0%, 100% 50%, calc(100% - ${A}px) 100%, 0% 100%)`
                  : isLast
                  ? `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, ${A}px 50%)`
                  : `polygon(0% 0%, calc(100% - ${A}px) 0%, 100% 50%, calc(100% - ${A}px) 100%, 0% 100%, ${A}px 50%)`;

                const bg = isActive ? "#7c3aed" : "#e2e8f0";
                const color = isActive ? "#ffffff" : isPast ? "#6b7280" : "#9ca3af";

                return (
                  <button
                    key={phase.id}
                    onClick={() => requestPhaseChange(phase.id)}
                    className="flex items-center justify-center transition-all hover:brightness-95"
                    style={{
                      flex: "1 1 0%",
                      clipPath,
                      background: bg,
                      marginLeft: i === 0 ? 0 : -A,
                      zIndex: mainPhases.length - i,
                      position: "relative",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 12,
                        fontWeight: isActive ? 700 : 500,
                        color,
                        paddingLeft: isFirst ? A : A * 2,
                        paddingRight: isLast ? A : A + 4,
                        userSelect: "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {isPast && (
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                          <circle cx="6" cy="6" r="5.5" stroke="#6b7280" strokeWidth="1" />
                          <path d="M3.5 6l1.8 1.8L8.5 4.5" stroke="#6b7280" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {phase.label}
                    </span>
                  </button>
                );
              })}
            </div>
            </div>
          </div>
        );
      })()}

      {/* ── Tools ────────────────────────────────────── */}
      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-forge-panel">
        <div className="px-5 pb-10 pt-5">
          <h3 className="mb-5 text-[13px] font-bold uppercase tracking-wider text-heading">Tools</h3>
          <div className="w-full">
        {(() => {
          const projectId = project.id;
          const allTools = [...topRow, ...bottomRow];

          function Card({ tool }: { tool: typeof topRow[0] }) {
            const cs = colorStyles[tool.color];
            const phaseOrder = ["opportunity", "proposal", "contract", "installation", "completed"];
            const currentIdx = phaseOrder.indexOf(currentPhase);
            const recommendedIdx = phaseOrder.indexOf(tool.recommendedStage);
            const recommendedLabel = phases.find((p) => p.id === tool.recommendedStage)?.label ?? tool.recommendedStage;
            const badgeText = currentIdx === recommendedIdx
              ? "Recommended Now"
              : currentIdx < recommendedIdx
              ? `Recommended in ${recommendedLabel} Stage`
              : "Completed";
            const badgeStyle = currentIdx > recommendedIdx
              ? "bg-border/40 border-border text-faint"
              : "bg-border/30 border-border text-muted";
            return (
              <Link
                href={tool.href ? (tool.absolute ? `${tool.href}?project=${projectId}` : `/projects/${projectId}/${tool.href}`) : "#"}
                className="group flex h-[190px] w-full flex-col items-center justify-start gap-2 rounded-xl border border-border bg-forge-surface/40 px-3 pt-4 pb-3 text-center transition-all hover:-translate-y-0.5 hover:shadow-lg hover:border-border"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-forge-panel text-muted">{tool.icon}</div>
                <h3 className="text-[13px] font-bold leading-tight text-body group-hover:text-heading">{tool.name}</h3>
                <p className="text-[11px] leading-relaxed text-subtle">{tool.desc}</p>
                <span className={`mt-auto flex min-h-[2.25rem] w-full items-center justify-center rounded-xl border px-2 py-1 text-[10px] font-semibold leading-tight ${badgeStyle}`}>
                  {badgeText}
                </span>
              </Link>
            );
          }

          return (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7">
              {allTools.map((tool) => (
                <Card key={tool.id} tool={tool} />
              ))}
            </div>
          );
        })()}
          </div>
        </div>
      </div>

      {/* ── Dashboard: Rooms & Cost Breakdown ─────── */}
      {(() => {
        const sections = proposalData?.sections ?? [];
        const allItems = sections.flatMap((s) => s.items);

        const laborBySection = sections
          .map((s) => {
            const hours = s.items.reduce((sum, i) => sum + (i.laborHours || 0), 0);
            const price = s.items.reduce((sum, i) => sum + (i.laborHours || 0) * (i.laborRate || 0), 0);
            return { name: s.name, hours, price };
          })
          .filter((l) => l.hours > 0);
        const totalLaborHours = laborBySection.reduce((s, l) => s + l.hours, 0);
        const totalLaborPrice = laborBySection.reduce((s, l) => s + l.price, 0);

        const equipmentTotal = allItems.reduce((sum, i) => sum + (i.qty || 0) * (i.unitCost || 0), 0);
        const laborTotal = totalLaborPrice;
        const shippingTotal = equipmentTotal * ((proposalData?.taxRate || 0) / 100);

        const costSegments: { label: string; value: number; color: string }[] = [];
        if (equipmentTotal > 0) costSegments.push({ label: "Equipment", value: equipmentTotal, color: "#8b5cf6" });
        if (laborTotal > 0) costSegments.push({ label: "Labor", value: laborTotal, color: "#f97316" });
        if (shippingTotal > 0) costSegments.push({ label: "Shipping", value: shippingTotal, color: "#10b981" });

        const costTotal = costSegments.reduce((s, c) => s + c.value, 0);
        const marginPct = proposalData?.marginPercent || 0;

        function pieSlices(segments: typeof costSegments) {
          const total = segments.reduce((s, c) => s + c.value, 0);
          if (total === 0) return [];
          let startAngle = -Math.PI / 2;
          return segments.map((seg) => {
            const angle = (seg.value / total) * 2 * Math.PI;
            const endAngle = startAngle + angle;
            const largeArc = angle > Math.PI ? 1 : 0;
            const x1 = 100 + 80 * Math.cos(startAngle);
            const y1 = 100 + 80 * Math.sin(startAngle);
            const x2 = 100 + 80 * Math.cos(endAngle);
            const y2 = 100 + 80 * Math.sin(endAngle);
            const d = segments.length === 1
              ? `M100,100 m0,-80 a80,80 0 1,1 0,160 a80,80 0 1,1 0,-160Z`
              : `M100,100 L${x1},${y1} A80,80 0 ${largeArc},1 ${x2},${y2} Z`;
            startAngle = endAngle;
            return { ...seg, d };
          });
        }

        const slices = pieSlices(costSegments);
        const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        const roomList = surveyRooms.length > 0 ? surveyRooms : sections;

        return (
          <div className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
            {/* Rooms */}
            <div className="bg-forge-panel p-5">
              <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-heading">Rooms</h3>
              {roomList.length > 0 ? (
                <div className="space-y-1.5">
                  {roomList.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 py-1 text-sm text-secondary">
                      <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                      {r.name}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-subtle">No rooms yet</p>
              )}
            </div>

            {/* Cost Breakdown */}
            <div className="bg-forge-panel p-5">
              <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-heading">Cost Breakdown</h3>
              <div className="flex items-start gap-5">
                <div className="flex-1 space-y-1.5">
                  {costSegments.length > 0 ? costSegments.map((seg, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-sm">
                      <div className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: seg.color }} />
                      <span className="text-secondary">{seg.label}</span>
                      <span className="ml-auto font-mono font-semibold text-heading">{fmt(seg.value)}</span>
                    </div>
                  )) : (
                    <p className="text-sm text-subtle">No data yet</p>
                  )}
                  <div className="!mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
                    <span className="font-semibold text-muted">Total</span>
                    <span className="font-mono font-bold text-heading">{fmt(costTotal)}</span>
                  </div>
                </div>
                {slices.length > 0 && (
                  <div className="shrink-0">
                    <svg width="120" height="120" viewBox="0 0 200 200">
                      {slices.map((s, i) => (
                        <path key={i} d={s.d} fill={s.color} stroke="rgb(var(--forge-bg))" strokeWidth="2" />
                      ))}
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Labor Breakdown */}
            <div className="bg-forge-panel p-5">
              <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-heading">Labor Breakdown</h3>
              {laborBySection.length > 0 ? (
                <>
                  <div className="mb-2 grid grid-cols-[1fr_auto_auto] gap-x-4 text-[11px] font-semibold uppercase tracking-wider text-faint">
                    <span />
                    <span className="text-right">Hours</span>
                    <span className="text-right">Price</span>
                  </div>
                  <div className="space-y-1">
                    {laborBySection.map((l, i) => (
                      <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-x-4 py-1 text-sm">
                        <span className="text-secondary">{l.name}</span>
                        <span className="text-right font-mono text-muted">{l.hours.toFixed(1)}</span>
                        <span className="text-right font-mono font-semibold text-heading">{fmt(l.price)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-x-4 border-t border-border pt-3 text-sm">
                    <span className="font-semibold text-muted">Total</span>
                    <span className="text-right font-mono font-semibold text-muted">{totalLaborHours.toFixed(1)}</span>
                    <span className="text-right font-mono font-bold text-heading">{fmt(totalLaborPrice)}</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-subtle">No labor data yet</p>
              )}
            </div>

            {/* Margins */}
            <div className="bg-forge-panel p-5">
              <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-heading">Margins</h3>
              {costSegments.length > 0 ? (() => {
                const costPct = 100 - marginPct;
                const totalMargin = costTotal * (marginPct / 100);
                return (
                  <div className="space-y-2.5">
                    {costSegments.map((seg, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-secondary">{seg.label} <span className="text-muted">{marginPct.toFixed(1)}%</span></span>
                          <span className="font-mono font-semibold text-heading">{fmt(seg.value * (marginPct / 100))}</span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-forge-card">
                          <div className="h-full rounded-full transition-all" style={{ width: `${costPct}%`, backgroundColor: seg.color }} />
                        </div>
                      </div>
                    ))}
                    <div className="!mt-4 space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-muted">Total <span>{marginPct.toFixed(1)}%</span></span>
                        <span className="font-mono font-bold text-heading">{fmt(totalMargin)}</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-forge-card">
                        <div className="h-full rounded-full bg-gray-400 transition-all" style={{ width: `${costPct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })() : (
                <p className="text-sm text-subtle">No margin data yet</p>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Team Members ─────────────────────────────── */}
      <div className="mt-6 rounded-lg border border-border bg-forge-panel p-5">
        <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-heading">Team Members</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {ROLE_OPTIONS.map((role) => {
            const assigned = projectMembers.find((m) => m.role === role);
            const isAssigning = assigningRole === role;
            return (
              <div key={role} className="relative" data-member-picker>
                <div className={`rounded-lg border p-3 ${assigned ? "border-border bg-forge-surface/40" : "border-dashed border-border/50"}`}>
                  <div className="mb-2 text-[10px] font-semibold uppercase leading-tight tracking-wider text-faint">{role}</div>
                  {assigned ? (
                    <div className="flex items-center gap-1.5">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-[10px] font-bold text-blue-300">
                        {(assigned.full_name?.[0] || "?").toUpperCase()}
                      </div>
                      <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-heading">{assigned.full_name}</span>
                      <button
                        onClick={() => removeMember(assigned.id)}
                        className="shrink-0 rounded p-0.5 text-faint transition-colors hover:text-red-400"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAssigningRole(role)}
                      className="flex items-center gap-1 text-[11px] text-muted transition-colors hover:text-blue-400"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      Assign
                    </button>
                  )}
                </div>

                {isAssigning && (
                  <div className="absolute left-0 top-full z-30 mt-1 w-52 rounded-xl border border-border bg-forge-bg shadow-xl">
                    <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted">Select Member</div>
                    <div className="max-h-52 overflow-y-auto">
                      {orgMembers.length === 0 ? (
                        <p className="px-3 py-3 text-[12px] text-subtle">No org members found</p>
                      ) : (
                        orgMembers.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => addMember(m, role)}
                            className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-forge-surface/60"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-[11px] font-bold text-blue-300">
                              {(m.full_name?.[0] || "?").toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-[12px] font-medium text-heading">{m.full_name}</div>
                              <div className="text-[11px] text-muted">{m.role}</div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                    <div className="border-t border-border p-2">
                      <button
                        onClick={() => setAssigningRole(null)}
                        className="w-full rounded-lg px-3 py-1.5 text-[12px] text-muted transition-colors hover:text-body"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage Change Confirmation Modal */}
      {phaseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setPhaseConfirm(null)} />
          <div className="relative w-full max-w-[380px] rounded-xl border border-border bg-forge-bg p-6 shadow-2xl">
            <div className="mb-4">
              <h3 className="text-[15px] font-semibold text-heading">Do you want to move the project to <span className="text-heading">&ldquo;{phases.find(p => p.id === phaseConfirm)?.label}&rdquo;</span>?</h3>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setPhaseConfirm(null)} className="rounded-lg px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:text-body">
                Cancel
              </button>
              <button onClick={confirmPhaseChange} className="rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-blue-700">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Project Modal ─────────────────────────── */}
      {editProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditProjectModal(false)} />
          <div className="relative w-full max-w-[520px] rounded-xl border border-border bg-forge-surface p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-heading">Edit Project</h3>
              <button onClick={() => setEditProjectModal(false)} className="rounded-lg p-1.5 text-subtle transition-colors hover:bg-forge-panel hover:text-secondary">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted">Project Name <span className="text-red-400">*</span></label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="forge-input" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted">Job Number</label>
                <input type="text" value={editJobNumber} onChange={(e) => setEditJobNumber(e.target.value)} className="forge-input" />
              </div>
              <div className="border-t border-border pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-faint">Client Information</p>
                <div className="mb-4">
                  <label className="mb-1.5 block text-sm font-medium text-muted">Client Name</label>
                  <input type="text" value={editClientName} onChange={(e) => setEditClientName(e.target.value)} className="forge-input" />
                </div>
                <div className="mb-4">
                  <label className="mb-1.5 block text-sm font-medium text-muted">Address</label>
                  <input type="text" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} placeholder="e.g. 123 Main St" className="forge-input" />
                </div>
                <div className="mb-4 grid grid-cols-[1fr_100px_100px] gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-muted">City</label>
                    <input type="text" value={editCity} onChange={(e) => setEditCity(e.target.value)} placeholder="Boston" className="forge-input" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-muted">State</label>
                    <input type="text" value={editState} onChange={(e) => setEditState(e.target.value)} placeholder="MA" className="forge-input" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-muted">ZIP Code</label>
                    <input type="text" value={editZipCode} onChange={(e) => setEditZipCode(e.target.value)} placeholder="02101" className="forge-input" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-muted">Email</label>
                    <input type="email" value={editClientEmail} onChange={(e) => setEditClientEmail(e.target.value)} placeholder="contact@company.com" className="forge-input" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-muted">Phone</label>
                    <input type="tel" value={editClientPhone} onChange={(e) => setEditClientPhone(e.target.value)} placeholder="555-123-4567" className="forge-input" />
                  </div>
                </div>
              </div>
              <div className="mt-2 flex justify-end gap-3">
                <button onClick={() => setEditProjectModal(false)} className="rounded-lg px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:text-body">Cancel</button>
                <button onClick={handleEditProject} disabled={!editName.trim()} className="rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Close Project Modal ────────────────────────── */}
      {closeProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setCloseProjectModal(false)} />
          <div className="relative w-full max-w-[380px] rounded-xl border border-border bg-forge-bg p-6 shadow-2xl">
            <h3 className="mb-2 text-[15px] font-semibold text-heading">Close Project</h3>
            <p className="mb-5 text-sm text-subtle">How would you like to close <span className="font-medium text-secondary">{project.name}</span>?</p>
            <div className="flex flex-col gap-2.5">
              <button onClick={() => handleCloseProject("lost")} className="rounded-lg border border-border bg-forge-surface/50 px-4 py-3 text-left transition-colors hover:bg-forge-surface">
                <div className="text-sm font-semibold text-heading">Opportunity Lost</div>
                <div className="text-xs text-subtle">The opportunity did not convert</div>
              </button>
              <button onClick={() => handleCloseProject("completed")} className="rounded-lg border border-border bg-forge-surface/50 px-4 py-3 text-left transition-colors hover:bg-forge-surface">
                <div className="text-sm font-semibold text-heading">Project Complete</div>
                <div className="text-xs text-subtle">The project has been completed</div>
              </button>
            </div>
            <button onClick={() => setCloseProjectModal(false)} className="mt-4 w-full rounded-lg border border-border py-2 text-sm text-subtle transition-colors hover:bg-forge-surface/50">Cancel</button>
          </div>
        </div>
      )}

      {/* ── Delete Project Modal ───────────────────────── */}
      {deleteProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteProjectModal(false)} />
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
              <button onClick={() => setDeleteProjectModal(false)} className="rounded-lg px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:text-body">Cancel</button>
              <button onClick={handleDeleteProject} className="rounded-lg bg-red-500 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-red-600">Delete Project</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
