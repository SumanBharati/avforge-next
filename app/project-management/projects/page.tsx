"use client";

import { useMemo, useState } from "react";
import { usePMStore } from "@/components/PMStoreProvider";
import PMPageSkeleton from "@/components/skeletons/PMPageSkeleton";
import {
  PROJECT_COLORS,
  fmtDateShort,
  projectAllocatedHours,
  projectSpentHours,
  uid,
  type Phase,
  type SchedProject,
  type SchedTask,
} from "@/lib/pm-store";

export default function ProjectsPage() {
  const { store, update, loading } = usePMStore();
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (loading) return <PMPageSkeleton />;

  const filtered = store.projects
    .filter((p) => showArchived || !p.archived)
    .filter(
      (p) =>
        search === "" ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.client.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  function addProject() {
    const color = PROJECT_COLORS[store.projects.length % PROJECT_COLORS.length];
    const proj: SchedProject = {
      id: uid(),
      name: "New project",
      client: "",
      color,
      projectRef: null,
      budgetHours: 0,
      budgetAmount: 0,
      startDate: "",
      endDate: "",
      archived: false,
      tags: [],
      notes: "",
    };
    update({ ...store, projects: [...store.projects, proj] });
    setExpanded((prev) => new Set([...prev, proj.id]));
  }

  function updateProject(id: string, patch: Partial<SchedProject>) {
    update({
      ...store,
      projects: store.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
  }

  function deleteProject(id: string) {
    update({
      ...store,
      projects: store.projects.filter((p) => p.id !== id),
      phases: store.phases.filter((ph) => ph.projectId !== id),
      allocations: store.allocations.filter((a) => a.projectId !== id),
      milestones: store.milestones.filter((m) => m.projectId !== id),
      tasks: store.tasks.filter((t) => t.projectId !== id),
      timeEntries: store.timeEntries.filter((e) => e.projectId !== id),
    });
  }

  function addPhase(projectId: string) {
    const proj = store.projects.find((p) => p.id === projectId);
    if (!proj) return;
    const phase: Phase = {
      id: uid(),
      projectId,
      name: "New phase",
      startDate: proj.startDate,
      endDate: proj.endDate,
      color: proj.color,
      budgetHours: 0,
    };
    update({ ...store, phases: [...store.phases, phase] });
  }

  function updatePhase(id: string, patch: Partial<Phase>) {
    update({
      ...store,
      phases: store.phases.map((ph) => (ph.id === id ? { ...ph, ...patch } : ph)),
    });
  }

  function deletePhase(id: string) {
    update({
      ...store,
      phases: store.phases.filter((ph) => ph.id !== id),
      allocations: store.allocations.map((a) => (a.phaseId === id ? { ...a, phaseId: null } : a)),
      tasks: store.tasks.filter((t) => t.phaseId !== id),
    });
  }

  function addTask(projectId: string, phaseId: string) {
    const task: SchedTask = {
      id: uid(),
      projectId,
      phaseId,
      name: "New task",
      assigneeId: null,
      done: false,
      dueDate: "",
    };
    update({ ...store, tasks: [...store.tasks, task] });
  }

  function updateTask(id: string, patch: Partial<SchedTask>) {
    update({
      ...store,
      tasks: store.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    });
  }

  function deleteTask(id: string) {
    update({ ...store, tasks: store.tasks.filter((t) => t.id !== id) });
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-8 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-heading">Projects</h1>
          <span className="rounded-md bg-forge-surface/60 px-2 py-0.5 text-[11px] text-subtle">
            {filtered.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="forge-input w-48 text-sm"
          />
          <label className="flex items-center gap-1.5 text-xs text-subtle">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Archived
          </label>
          <button
            onClick={addProject}
            className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-2 text-[12px] font-semibold text-white hover:bg-blue-600"
          >
            <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
              <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Add project
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="mb-3 text-sm text-faint">No projects yet</p>
            <button
              onClick={addProject}
              className="rounded-lg bg-blue-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-600"
            >
              Create your first project
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((proj) => {
              const phases = store.phases.filter((ph) => ph.projectId === proj.id);
              const allocated = projectAllocatedHours(proj.id, store.allocations);
              const spent = projectSpentHours(proj.id, store.timeEntries);
              const budgetPct = proj.budgetHours > 0 ? (spent / proj.budgetHours) * 100 : 0;
              const open = expanded.has(proj.id);

              return (
                <div
                  key={proj.id}
                  className={`overflow-hidden rounded-xl border border-border bg-forge-surface/40 ${
                    proj.archived ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start gap-4 p-4">
                    <button
                      onClick={() => toggleExpanded(proj.id)}
                      className="mt-1 text-subtle hover:text-body"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="none"
                        style={{ transform: open ? "rotate(90deg)" : "rotate(0)", transition: "transform 0.15s" }}
                      >
                        <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <div className="mt-1 h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: proj.color }} />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          value={proj.name}
                          onChange={(e) => updateProject(proj.id, { name: e.target.value })}
                          className="flex-1 bg-transparent text-base font-semibold text-heading outline-none focus:bg-forge-input"
                        />
                        <select
                          value={proj.color}
                          onChange={(e) => updateProject(proj.id, { color: e.target.value })}
                          className="h-6 w-6 shrink-0 cursor-pointer rounded border border-border bg-transparent"
                          style={{ backgroundColor: proj.color }}
                          title="Color"
                        >
                          {PROJECT_COLORS.map((c) => (
                            <option key={c} value={c} style={{ backgroundColor: c, color: c }}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-5 gap-3 text-xs">
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-faint">Client</label>
                          <input
                            value={proj.client}
                            onChange={(e) => updateProject(proj.id, { client: e.target.value })}
                            placeholder="—"
                            className="mt-0.5 w-full bg-transparent text-secondary outline-none focus:text-body"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-faint">Start</label>
                          <input
                            type="date"
                            value={proj.startDate}
                            onChange={(e) => updateProject(proj.id, { startDate: e.target.value })}
                            className="mt-0.5 w-full bg-transparent text-secondary outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-faint">End</label>
                          <input
                            type="date"
                            value={proj.endDate}
                            onChange={(e) => updateProject(proj.id, { endDate: e.target.value })}
                            className="mt-0.5 w-full bg-transparent text-secondary outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-faint">Budget (h)</label>
                          <input
                            type="number"
                            value={proj.budgetHours}
                            onChange={(e) => updateProject(proj.id, { budgetHours: Number(e.target.value) || 0 })}
                            className="mt-0.5 w-full bg-transparent text-secondary outline-none focus:text-body"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-faint">Budget ($)</label>
                          <input
                            type="number"
                            value={proj.budgetAmount}
                            onChange={(e) => updateProject(proj.id, { budgetAmount: Number(e.target.value) || 0 })}
                            className="mt-0.5 w-full bg-transparent text-secondary outline-none focus:text-body"
                          />
                        </div>
                      </div>
                      {proj.budgetHours > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-subtle">
                              {spent.toFixed(1)}h spent · {allocated.toFixed(1)}h scheduled · {proj.budgetHours}h budget
                            </span>
                            <span className={budgetPct > 100 ? "text-red-400" : "text-muted"}>
                              {budgetPct.toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-1 w-full overflow-hidden rounded-full bg-forge-bg">
                            <div
                              className="h-full"
                              style={{
                                width: `${Math.min(budgetPct, 100)}%`,
                                backgroundColor: budgetPct > 100 ? "#ef4444" : budgetPct > 80 ? "#f59e0b" : proj.color,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => updateProject(proj.id, { archived: !proj.archived })}
                        className="rounded p-1.5 text-subtle hover:bg-forge-surface hover:text-body"
                        title={proj.archived ? "Unarchive" : "Archive"}
                      >
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                          <rect x="2" y="3" width="12" height="3" rx="1" stroke="currentColor" strokeWidth="1.2" />
                          <path d="M3 6v6a1 1 0 001 1h8a1 1 0 001-1V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${proj.name}"? All phases, allocations, and tasks will be removed.`)) {
                            deleteProject(proj.id);
                          }
                        }}
                        className="rounded p-1.5 text-subtle hover:bg-red-500/10 hover:text-red-400"
                        title="Delete"
                      >
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                          <path d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1M4 4v9a1 1 0 001 1h6a1 1 0 001-1V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {open && (
                    <div className="border-t border-border bg-forge-bg/40 px-6 py-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                          Phases · {phases.length}
                        </span>
                        <button
                          onClick={() => addPhase(proj.id)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300"
                        >
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                          Add phase
                        </button>
                      </div>
                      {phases.length === 0 ? (
                        <p className="py-3 text-xs text-faint">No phases yet</p>
                      ) : (
                        <div className="space-y-2">
                          {phases.map((ph) => {
                            const tasks = store.tasks.filter((t) => t.phaseId === ph.id);
                            return (
                              <div key={ph.id} className="rounded-lg border border-border bg-forge-surface/40 p-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: ph.color }} />
                                  <input
                                    value={ph.name}
                                    onChange={(e) => updatePhase(ph.id, { name: e.target.value })}
                                    className="flex-1 bg-transparent text-sm font-semibold text-body outline-none"
                                  />
                                  <input
                                    type="date"
                                    value={ph.startDate}
                                    onChange={(e) => updatePhase(ph.id, { startDate: e.target.value })}
                                    className="bg-transparent text-xs text-muted outline-none"
                                  />
                                  <span className="text-xs text-faint">→</span>
                                  <input
                                    type="date"
                                    value={ph.endDate}
                                    onChange={(e) => updatePhase(ph.id, { endDate: e.target.value })}
                                    className="bg-transparent text-xs text-muted outline-none"
                                  />
                                  <input
                                    type="number"
                                    value={ph.budgetHours}
                                    onChange={(e) => updatePhase(ph.id, { budgetHours: Number(e.target.value) || 0 })}
                                    className="w-16 bg-transparent text-right text-xs text-muted outline-none focus:text-body"
                                    placeholder="hrs"
                                  />
                                  <span className="text-[10px] text-faint">h</span>
                                  <button
                                    onClick={() => addTask(proj.id, ph.id)}
                                    className="rounded p-1 text-subtle hover:bg-forge-surface hover:text-body"
                                    title="Add task"
                                  >
                                    <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
                                      <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => deletePhase(ph.id)}
                                    className="rounded p-1 text-subtle hover:bg-red-500/10 hover:text-red-400"
                                    title="Delete phase"
                                  >
                                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                                      <path d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1M4 4v9a1 1 0 001 1h6a1 1 0 001-1V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                                    </svg>
                                  </button>
                                </div>
                                {tasks.length > 0 && (
                                  <div className="mt-2 space-y-1 pl-5">
                                    {tasks.map((t) => (
                                      <div key={t.id} className="flex items-center gap-2 text-xs">
                                        <input
                                          type="checkbox"
                                          checked={t.done}
                                          onChange={(e) => updateTask(t.id, { done: e.target.checked })}
                                        />
                                        <input
                                          value={t.name}
                                          onChange={(e) => updateTask(t.id, { name: e.target.value })}
                                          className={`flex-1 bg-transparent outline-none ${
                                            t.done ? "text-faint line-through" : "text-body"
                                          }`}
                                        />
                                        <select
                                          value={t.assigneeId || ""}
                                          onChange={(e) => updateTask(t.id, { assigneeId: e.target.value || null })}
                                          className="bg-transparent text-muted outline-none"
                                        >
                                          <option value="">Unassigned</option>
                                          {store.people.filter((p) => !p.archived).map((p) => (
                                            <option key={p.id} value={p.id}>
                                              {p.name}
                                            </option>
                                          ))}
                                        </select>
                                        <input
                                          type="date"
                                          value={t.dueDate}
                                          onChange={(e) => updateTask(t.id, { dueDate: e.target.value })}
                                          className="bg-transparent text-muted outline-none"
                                        />
                                        <button
                                          onClick={() => deleteTask(t.id)}
                                          className="text-subtle hover:text-red-400"
                                          title="Delete task"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Milestones under project */}
                      <ProjectMilestones projectId={proj.id} color={proj.color} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectMilestones({ projectId, color }: { projectId: string; color: string }) {
  const { store, update } = usePMStore();
  const milestones = store.milestones.filter((m) => m.projectId === projectId);

  function addMilestone() {
    update({
      ...store,
      milestones: [
        ...store.milestones,
        { id: uid(), projectId, name: "Milestone", date: "", color },
      ],
    });
  }

  function updateM(id: string, patch: Partial<typeof milestones[number]>) {
    update({
      ...store,
      milestones: store.milestones.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    });
  }

  function deleteM(id: string) {
    update({ ...store, milestones: store.milestones.filter((m) => m.id !== id) });
  }

  return (
    <div className="mt-4 border-t border-border pt-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">
          Milestones · {milestones.length}
        </span>
        <button
          onClick={addMilestone}
          className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Add milestone
        </button>
      </div>
      {milestones.length === 0 ? (
        <p className="text-xs text-faint">No milestones</p>
      ) : (
        <div className="space-y-1.5">
          {milestones.map((m) => (
            <div key={m.id} className="flex items-center gap-2 text-xs">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M4 2v12l3-2 3 2 3-2V2z" stroke={m.color} strokeWidth="1.5" strokeLinejoin="round" fill={m.color + "33"} />
              </svg>
              <input
                value={m.name}
                onChange={(e) => updateM(m.id, { name: e.target.value })}
                className="flex-1 bg-transparent text-body outline-none"
              />
              <input
                type="date"
                value={m.date}
                onChange={(e) => updateM(m.id, { date: e.target.value })}
                className="bg-transparent text-muted outline-none"
              />
              {m.date && <span className="text-faint">· {fmtDateShort(m.date)}</span>}
              <button onClick={() => deleteM(m.id)} className="text-subtle hover:text-red-400" title="Delete">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
