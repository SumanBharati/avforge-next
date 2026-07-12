"use client";

import { useMemo, useState } from "react";
import { usePMStore } from "@/components/PMStoreProvider";
import PMPageSkeleton from "@/components/skeletons/PMPageSkeleton";
import {
  addDays,
  fmtDateShort,
  startOfWeek,
  toISODate,
  uid,
  type TimeEntry,
} from "@/lib/pm-store";

export default function TimeTrackingPage() {
  const { store, update, loading } = usePMStore();
  const [cursor, setCursor] = useState<Date>(() => startOfWeek(new Date()));
  const [activePerson, setActivePerson] = useState<string>("");
  const [showPicker, setShowPicker] = useState(false);
  const [pickedProject, setPickedProject] = useState<string>("");
  const [pickedPhase, setPickedPhase] = useState<string>("");

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(cursor, i));
  }, [cursor]);

  const weekStart = toISODate(weekDays[0]);
  const weekEnd = toISODate(weekDays[6]);

  const people = store.people.filter((p) => !p.archived).sort((a, b) => a.name.localeCompare(b.name));

  const selectedPerson = activePerson || people[0]?.id || "";
  const person = store.people.find((p) => p.id === selectedPerson);

  const allocationsForPerson = store.allocations.filter(
    (a) =>
      a.personId === selectedPerson &&
      a.startDate <= weekEnd &&
      a.endDate >= weekStart,
  );

  const rows = useMemo(() => {
    const seen = new Set<string>();
    const out: { projectId: string; phaseId: string | null }[] = [];
    const push = (projectId: string, phaseId: string | null) => {
      const key = `${projectId}|${phaseId || ""}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ projectId, phaseId });
    };
    allocationsForPerson.forEach((a) => push(a.projectId, a.phaseId));
    store.timeEntries
      .filter(
        (e) =>
          e.personId === selectedPerson && e.date >= weekStart && e.date <= weekEnd,
      )
      .forEach((e) => push(e.projectId, e.phaseId));
    return out;
  }, [allocationsForPerson, store.timeEntries, selectedPerson, weekStart, weekEnd]);

  const availableProjects = useMemo(
    () =>
      store.projects
        .filter((p) => !p.archived)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [store.projects],
  );
  const phaseOptions = useMemo(
    () => store.phases.filter((ph) => ph.projectId === pickedProject),
    [store.phases, pickedProject],
  );

  if (loading) return <PMPageSkeleton />;

  function entriesFor(projectId: string, phaseId: string | null, date: string): TimeEntry[] {
    return store.timeEntries.filter(
      (e) =>
        e.personId === selectedPerson &&
        e.projectId === projectId &&
        (e.phaseId || null) === phaseId &&
        e.date === date,
    );
  }

  function hoursFor(projectId: string, phaseId: string | null, date: string): number {
    return entriesFor(projectId, phaseId, date).reduce((s, e) => s + e.hours, 0);
  }

  function setHours(projectId: string, phaseId: string | null, date: string, hours: number) {
    const existing = entriesFor(projectId, phaseId, date);
    if (existing.length > 0) {
      const keep = existing[0];
      const toRemove = existing.slice(1).map((e) => e.id);
      const newEntries = store.timeEntries
        .filter((e) => !toRemove.includes(e.id))
        .map((e) => (e.id === keep.id ? { ...e, hours } : e));
      update({
        ...store,
        timeEntries: hours > 0 ? newEntries : newEntries.filter((e) => e.id !== keep.id),
      });
    } else if (hours > 0) {
      const e: TimeEntry = {
        id: uid(),
        personId: selectedPerson,
        projectId,
        phaseId,
        date,
        hours,
        notes: "",
        billable: true,
      };
      update({ ...store, timeEntries: [...store.timeEntries, e] });
    }
  }

  function openAddRow() {
    if (!selectedPerson) return;
    const firstProj = availableProjects[0];
    setPickedProject(firstProj?.id || "");
    setPickedPhase("");
    setShowPicker(true);
  }

  function confirmAddRow() {
    if (!selectedPerson || !pickedProject) return;
    const phaseId = pickedPhase || null;
    const already = rows.some(
      (r) => r.projectId === pickedProject && (r.phaseId || null) === phaseId,
    );
    if (already) {
      setShowPicker(false);
      return;
    }
    const today = toISODate(new Date());
    const e: TimeEntry = {
      id: uid(),
      personId: selectedPerson,
      projectId: pickedProject,
      phaseId,
      date: today >= weekStart && today <= weekEnd ? today : weekStart,
      hours: 0,
      notes: "",
      billable: true,
    };
    update({ ...store, timeEntries: [...store.timeEntries, e] });
    setShowPicker(false);
  }

  const weekTotal = weekDays.reduce(
    (sum, d) => sum + rows.reduce((s, r) => s + hoursFor(r.projectId, r.phaseId, toISODate(d)), 0),
    0,
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center flex-wrap gap-3 justify-between border-b border-border px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-heading">Time Tracking</h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedPerson}
            onChange={(e) => setActivePerson(e.target.value)}
            className="forge-input text-sm"
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-forge-surface/60 p-0.5">
            <button
              onClick={() => setCursor((c) => addDays(c, -7))}
              className="rounded px-2 py-1 text-sm text-muted hover:bg-forge-surface hover:text-body"
              title="Previous week"
            >
              ‹
            </button>
            <span className="whitespace-nowrap px-3 py-1 text-sm font-semibold text-heading">
              {fmtDateShort(weekStart)} – {fmtDateShort(weekEnd)}
            </span>
            <button
              onClick={() => setCursor((c) => addDays(c, 7))}
              className="rounded px-2 py-1 text-sm text-muted hover:bg-forge-surface hover:text-body"
              title="Next week"
            >
              ›
            </button>
          </div>
          <button
            onClick={() => setCursor(startOfWeek(new Date()))}
            className="shrink-0 whitespace-nowrap rounded-lg border border-border bg-forge-surface/60 px-3 py-1.5 text-xs font-semibold text-body hover:bg-forge-surface"
          >
            This week
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-8">
        {!person ? (
          <div className="py-20 text-center text-sm text-subtle">Add a person first</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-forge-panel text-[11px] font-semibold uppercase tracking-wider text-faint">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left">Project / Phase</th>
                  {weekDays.map((d, i) => (
                    <th key={i} className="px-2 py-3 text-center">
                      <div>{d.toLocaleDateString("en-US", { weekday: "short" })}</div>
                      <div className="mt-0.5 font-mono text-[10px] text-subtle">{d.getDate()}</div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-subtle">
                      <div className="mb-3 text-sm">No allocations or entries this week</div>
                      <button
                        onClick={openAddRow}
                        className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600"
                      >
                        Add a row manually
                      </button>
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => {
                    const proj = store.projects.find((p) => p.id === r.projectId);
                    const phase = r.phaseId ? store.phases.find((ph) => ph.id === r.phaseId) : null;
                    const rowTotal = weekDays.reduce(
                      (s, d) => s + hoursFor(r.projectId, r.phaseId, toISODate(d)),
                      0,
                    );
                    return (
                      <tr key={i} className="border-b border-border hover:bg-forge-surface/30">
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 shrink-0 rounded-sm"
                              style={{ backgroundColor: phase?.color || proj?.color || "#94a3b8" }}
                            />
                            <div>
                              <div className="font-semibold text-body">{proj?.name || "—"}</div>
                              {phase && <div className="text-[11px] text-subtle">{phase.name}</div>}
                            </div>
                          </div>
                        </td>
                        {weekDays.map((d, j) => {
                          const iso = toISODate(d);
                          const scheduled = allocationsForPerson
                            .filter(
                              (a) =>
                                a.projectId === r.projectId &&
                                (a.phaseId || null) === r.phaseId &&
                                iso >= a.startDate &&
                                iso <= a.endDate,
                            )
                            .reduce((s, a) => s + a.hoursPerDay, 0);
                          const actual = hoursFor(r.projectId, r.phaseId, iso);
                          return (
                            <td key={j} className="px-2 py-2 text-center">
                              <input
                                type="number"
                                step="0.25"
                                value={actual || ""}
                                onChange={(e) => setHours(r.projectId, r.phaseId, iso, Number(e.target.value) || 0)}
                                placeholder={scheduled > 0 ? String(scheduled) : "—"}
                                className="w-14 rounded border border-border bg-forge-surface/40 px-2 py-1 text-center text-xs text-body outline-none focus:border-blue-500 focus:bg-forge-bg"
                              />
                              {scheduled > 0 && (
                                <div className="mt-0.5 text-[9px] text-faint">plan: {scheduled}h</div>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-2 text-right font-mono font-semibold text-body">{rowTotal.toFixed(1)}h</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="bg-forge-panel text-[11px] font-semibold uppercase tracking-wider text-faint">
                    <td className="px-4 py-3 text-right">Day total</td>
                    {weekDays.map((d, i) => {
                      const dayTotal = rows.reduce(
                        (s, r) => s + hoursFor(r.projectId, r.phaseId, toISODate(d)),
                        0,
                      );
                      return (
                        <td key={i} className="px-2 py-3 text-center font-mono text-body">
                          {dayTotal.toFixed(1)}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right font-mono text-heading">{weekTotal.toFixed(1)}h</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {rows.length > 0 && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={openAddRow}
              className="rounded-lg border border-border bg-forge-surface/40 px-3 py-1.5 text-xs font-semibold text-muted hover:text-body"
            >
              + Add row
            </button>
          </div>
        )}
      </div>

      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPicker(false)} />
          <div className="relative w-full max-w-[440px] animate-fade-in rounded-xl border border-border bg-forge-surface p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-heading">Log time on a project</h3>
              <button
                onClick={() => setShowPicker(false)}
                className="rounded-lg p-1.5 text-subtle transition-colors hover:bg-forge-card hover:text-secondary"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {availableProjects.length === 0 ? (
              <div className="rounded-lg border border-border bg-forge-bg/40 px-4 py-5 text-center text-sm text-subtle">
                No projects available yet. Create a project on the Projects page and it will appear here.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-muted">Project</label>
                  <select
                    value={pickedProject}
                    onChange={(e) => {
                      setPickedProject(e.target.value);
                      setPickedPhase("");
                    }}
                    className="forge-input"
                  >
                    {availableProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.client ? ` — ${p.client}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {phaseOptions.length > 0 && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-muted">
                      Phase <span className="text-faint">(optional)</span>
                    </label>
                    <select
                      value={pickedPhase}
                      onChange={(e) => setPickedPhase(e.target.value)}
                      className="forge-input"
                    >
                      <option value="">— No phase —</option>
                      {phaseOptions.map((ph) => (
                        <option key={ph.id} value={ph.id}>
                          {ph.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowPicker(false)}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:text-body"
              >
                Cancel
              </button>
              <button
                onClick={confirmAddRow}
                disabled={!pickedProject}
                className="forge-btn-primary text-[13px]"
              >
                Add row
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
