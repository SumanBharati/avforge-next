"use client";

import { useMemo, useState } from "react";
import { usePMStore } from "@/components/PMStoreProvider";
import PMPageSkeleton from "@/components/skeletons/PMPageSkeleton";
import { addDays, fmtDateShort, startOfWeek, toISODate } from "@/lib/pm-store";

export default function TimesheetReportPage() {
  const { store, loading } = usePMStore();
  const [rangeStart, setRangeStart] = useState<string>(() => toISODate(startOfWeek(new Date())));
  const [rangeEnd, setRangeEnd] = useState<string>(() => toISODate(addDays(startOfWeek(new Date()), 27)));

  const { entries, personRows } = useMemo(() => {
    const inRange = store.timeEntries.filter((e) => e.date >= rangeStart && e.date <= rangeEnd);

    const byPerson = new Map<
      string,
      { logged: number; billable: number; nonBillable: number; count: number }
    >();
    const projectIds = new Set(store.projects.map((p) => p.id));
    for (const e of inRange) {
      const prev =
        byPerson.get(e.personId) ?? { logged: 0, billable: 0, nonBillable: 0, count: 0 };
      prev.logged += e.hours;
      // Billable = logged against a real project; non-billable = an ad-hoc task
      // (created via "Add Row → Create New Task" in Time Tracking).
      if (projectIds.has(e.projectId)) prev.billable += e.hours;
      else prev.nonBillable += e.hours;
      prev.count += 1;
      byPerson.set(e.personId, prev);
    }

    const personRows = store.people
      .filter((p) => !p.archived && byPerson.has(p.id))
      .map((p) => ({ person: p, ...byPerson.get(p.id)! }))
      .sort((a, b) => b.logged - a.logged);

    const entries = [...inRange].sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
    );

    return { entries, personRows };
  }, [rangeStart, rangeEnd, store.timeEntries, store.people, store.projects]);

  if (loading) return <PMPageSkeleton />;

  const totalLogged = personRows.reduce((s, r) => s + r.logged, 0);
  const totalBillable = personRows.reduce((s, r) => s + r.billable, 0);
  const totalNonBillable = personRows.reduce((s, r) => s + r.nonBillable, 0);

  return (
    <div className="h-full overflow-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6 lg:px-8">
        <h1 className="text-xl font-bold text-heading">Reports</h1>
        <div className="flex items-center gap-2 text-sm">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-faint">Range</label>
          <input
            type="date"
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
            className="forge-input text-sm"
          />
          <span className="text-subtle">→</span>
          <input
            type="date"
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
            className="forge-input text-sm"
          />
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 grid grid-cols-4 gap-3">
          <Stat label="Total logged" value={`${totalLogged.toFixed(1)}h`} color="#8b5cf6" />
          <Stat label="Billable" value={`${totalBillable.toFixed(1)}h`} color="#22c55e" />
          <Stat label="Non-billable" value={`${totalNonBillable.toFixed(1)}h`} color="#f59e0b" />
          <Stat label="Entries" value={`${entries.length}`} color="#64748b" />
        </div>

        <div className="mb-6 overflow-hidden rounded-xl border border-border">
          <div className="border-b border-border bg-forge-panel px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-faint">
            By person
          </div>
          <table className="w-full text-sm">
            <thead className="bg-forge-panel/60 text-[11px] font-semibold uppercase tracking-wider text-faint">
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left">Person</th>
                <th className="px-4 py-2 text-right">Logged</th>
                <th className="px-4 py-2 text-right">Billable</th>
                <th className="px-4 py-2 text-right">Non-billable</th>
                <th className="px-4 py-2 text-right">Entries</th>
              </tr>
            </thead>
            <tbody>
              {personRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-faint">
                    No time logged in this range.
                  </td>
                </tr>
              ) : (
                personRows.map((r) => (
                  <tr key={r.person.id} className="border-b border-border hover:bg-forge-surface/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: r.person.color }}
                        >
                          {r.person.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-body">{r.person.name}</div>
                          <div className="text-[11px] text-subtle">{r.person.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted">{r.logged.toFixed(1)}h</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-400">{r.billable.toFixed(1)}h</td>
                    <td className="px-4 py-3 text-right font-mono text-amber-400">{r.nonBillable.toFixed(1)}h</td>
                    <td className="px-4 py-3 text-right font-mono text-subtle">{r.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <div className="border-b border-border bg-forge-panel px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-faint">
            Entries
          </div>
          <table className="w-full text-sm">
            <thead className="bg-forge-panel/60 text-[11px] font-semibold uppercase tracking-wider text-faint">
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Person</th>
                <th className="px-4 py-2 text-left">Project</th>
                <th className="px-4 py-2 text-left">Phase</th>
                <th className="px-4 py-2 text-right">Hours</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-faint">
                    No time entries in this range.
                  </td>
                </tr>
              ) : (
                entries.map((e) => {
                  const person = store.people.find((p) => p.id === e.personId);
                  const project = store.projects.find((p) => p.id === e.projectId);
                  const phase = e.phaseId ? store.phases.find((ph) => ph.id === e.phaseId) : null;
                  const isBillable = !!project;
                  return (
                    <tr key={e.id} className="border-b border-border hover:bg-forge-surface/30">
                      <td className="px-4 py-2 font-mono text-[12px] text-muted">{fmtDateShort(e.date)}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {person && (
                            <div
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: person.color }}
                            />
                          )}
                          <span className="text-body">{person?.name ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {project && (
                            <div
                              className="h-2 w-2 shrink-0 rounded-sm"
                              style={{ backgroundColor: project.color }}
                            />
                          )}
                          <span className="text-body">{project?.name ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-subtle">{phase?.name ?? "—"}</td>
                      <td className="px-4 py-2 text-right font-mono text-body">{e.hours.toFixed(1)}h</td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            isBillable
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-amber-500/15 text-amber-400"
                          }`}
                        >
                          {isBillable ? "Billable" : "Non-bill"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-subtle">{e.notes || "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-border bg-forge-surface/40 px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-faint">{label}</div>
      <div className="mt-1 font-mono text-xl font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
