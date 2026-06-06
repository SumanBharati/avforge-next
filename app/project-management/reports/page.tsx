"use client";

import { useMemo, useState } from "react";
import { usePMStore } from "@/components/PMStoreProvider";
import PMPageSkeleton from "@/components/skeletons/PMPageSkeleton";
import {
  addDays,
  businessDaysBetween,
  fmtDateShort,
  parseISODate,
  personDailyCapacity,
  personScheduledHoursInRange,
  personWeeklyHours,
  projectAllocatedHours,
  projectSpentHours,
  startOfWeek,
  toISODate,
} from "@/lib/pm-store";

type ReportTab = "utilization" | "budget" | "forecast" | "timesheet";

export default function ReportsPage() {
  const { store, loading } = usePMStore();
  const [tab, setTab] = useState<ReportTab>("utilization");
  const [rangeStart, setRangeStart] = useState<string>(() => toISODate(startOfWeek(new Date())));
  const [rangeEnd, setRangeEnd] = useState<string>(() => toISODate(addDays(startOfWeek(new Date()), 27)));

  if (loading) return <PMPageSkeleton />;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-8 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-heading">Reports</h1>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-forge-surface/60 p-0.5 text-xs">
            {(["utilization", "budget", "forecast", "timesheet"] as ReportTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded px-3 py-1 font-semibold capitalize transition-colors ${
                  tab === t ? "bg-blue-500 text-white" : "text-muted hover:text-body"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
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

      <div className="flex-1 overflow-auto px-8 py-6">
        {tab === "utilization" && <UtilizationReport rangeStart={rangeStart} rangeEnd={rangeEnd} />}
        {tab === "budget" && <BudgetReport />}
        {tab === "forecast" && <ForecastReport rangeStart={rangeStart} rangeEnd={rangeEnd} />}
        {tab === "timesheet" && <TimesheetReport rangeStart={rangeStart} rangeEnd={rangeEnd} />}
      </div>
    </div>
  );

  function UtilizationReport({ rangeStart, rangeEnd }: { rangeStart: string; rangeEnd: string }) {
    const rows = useMemo(() => {
      return store.people
        .filter((p) => !p.archived)
        .map((p) => {
          const scheduled = personScheduledHoursInRange(p.id, rangeStart, rangeEnd, store.allocations);
          const days = businessDaysBetween(rangeStart, rangeEnd);
          const capacity = personDailyCapacity(p) * days;
          const pct = capacity > 0 ? (scheduled / capacity) * 100 : 0;
          const logged = store.timeEntries
            .filter((e) => e.personId === p.id && e.date >= rangeStart && e.date <= rangeEnd)
            .reduce((s, e) => s + e.hours, 0);
          return { person: p, scheduled, capacity, pct, logged };
        })
        .sort((a, b) => b.pct - a.pct);
    }, [rangeStart, rangeEnd]);

    const avgUtilization = rows.length > 0 ? rows.reduce((s, r) => s + r.pct, 0) / rows.length : 0;
    const totalScheduled = rows.reduce((s, r) => s + r.scheduled, 0);
    const totalCapacity = rows.reduce((s, r) => s + r.capacity, 0);
    const totalLogged = rows.reduce((s, r) => s + r.logged, 0);

    return (
      <>
        <div className="mb-6 grid grid-cols-4 gap-3">
          <Stat label="Avg utilization" value={`${avgUtilization.toFixed(0)}%`} color={avgUtilization > 100 ? "#ef4444" : "#3b82f6"} />
          <Stat label="Scheduled" value={`${totalScheduled.toFixed(0)}h`} color="#8b5cf6" />
          <Stat label="Capacity" value={`${totalCapacity.toFixed(0)}h`} color="#64748b" />
          <Stat label="Logged (actual)" value={`${totalLogged.toFixed(0)}h`} color="#22c55e" />
        </div>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-forge-panel text-[11px] font-semibold uppercase tracking-wider text-faint">
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left">Person</th>
                <th className="px-4 py-3 text-right">Scheduled</th>
                <th className="px-4 py-3 text-right">Capacity</th>
                <th className="px-4 py-3 text-right">Logged</th>
                <th className="px-4 py-3 text-left">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const over = r.pct > 100;
                return (
                  <tr key={r.person.id} className="border-b border-border hover:bg-forge-surface/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: r.person.color }}
                        >
                          {r.person.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-body">{r.person.name}</div>
                          <div className="text-[11px] text-subtle">{r.person.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted">{r.scheduled.toFixed(1)}h</td>
                    <td className="px-4 py-3 text-right font-mono text-subtle">{r.capacity.toFixed(1)}h</td>
                    <td className="px-4 py-3 text-right font-mono text-muted">{r.logged.toFixed(1)}h</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-forge-surface">
                          <div
                            className="h-full"
                            style={{
                              width: `${Math.min(r.pct, 150)}%`,
                              backgroundColor: over ? "#ef4444" : r.pct > 80 ? "#f59e0b" : "#22c55e",
                            }}
                          />
                        </div>
                        <span className={`w-12 text-right font-mono text-xs ${over ? "font-bold text-red-400" : "text-muted"}`}>
                          {r.pct.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  function BudgetReport() {
    const rows = useMemo(() => {
      return store.projects
        .filter((p) => !p.archived)
        .map((p) => {
          const allocated = projectAllocatedHours(p.id, store.allocations);
          const spent = projectSpentHours(p.id, store.timeEntries);
          const budgetH = p.budgetHours;
          const budget$ = p.budgetAmount;
          // avg hourly rate from allocated people
          const personIds = new Set(store.allocations.filter((a) => a.projectId === p.id).map((a) => a.personId));
          const rates = [...personIds]
            .map((id) => store.people.find((pp) => pp.id === id)?.hourlyRate || 0)
            .filter((r) => r > 0);
          const avgRate = rates.length > 0 ? rates.reduce((s, r) => s + r, 0) / rates.length : 0;
          const spent$ = spent * avgRate;
          const burnPct = budgetH > 0 ? (spent / budgetH) * 100 : 0;
          return { project: p, allocated, spent, budgetH, budget$, spent$, avgRate, burnPct };
        })
        .sort((a, b) => b.burnPct - a.burnPct);
    }, []);

    const totalBudgetH = rows.reduce((s, r) => s + r.budgetH, 0);
    const totalSpentH = rows.reduce((s, r) => s + r.spent, 0);
    const totalAllocatedH = rows.reduce((s, r) => s + r.allocated, 0);
    const totalBudget$ = rows.reduce((s, r) => s + r.budget$, 0);
    const totalSpent$ = rows.reduce((s, r) => s + r.spent$, 0);

    return (
      <>
        <div className="mb-6 grid grid-cols-4 gap-3">
          <Stat label="Total budget" value={`${totalBudgetH.toFixed(0)}h`} color="#64748b" />
          <Stat label="Scheduled" value={`${totalAllocatedH.toFixed(0)}h`} color="#8b5cf6" />
          <Stat label="Spent" value={`${totalSpentH.toFixed(0)}h`} color="#22c55e" />
          <Stat
            label="$ spent / budget"
            value={totalBudget$ > 0 ? `${((totalSpent$ / totalBudget$) * 100).toFixed(0)}%` : "—"}
            color="#3b82f6"
          />
        </div>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-forge-panel text-[11px] font-semibold uppercase tracking-wider text-faint">
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left">Project</th>
                <th className="px-4 py-3 text-right">Budget</th>
                <th className="px-4 py-3 text-right">Scheduled</th>
                <th className="px-4 py-3 text-right">Spent</th>
                <th className="px-4 py-3 text-right">$ Spent</th>
                <th className="px-4 py-3 text-left">Burn</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const over = r.burnPct > 100;
                return (
                  <tr key={r.project.id} className="border-b border-border hover:bg-forge-surface/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: r.project.color }} />
                        <div>
                          <div className="font-semibold text-body">{r.project.name}</div>
                          {r.project.client && <div className="text-[11px] text-subtle">{r.project.client}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted">
                      {r.budgetH > 0 ? `${r.budgetH}h` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted">{r.allocated.toFixed(1)}h</td>
                    <td className="px-4 py-3 text-right font-mono text-muted">{r.spent.toFixed(1)}h</td>
                    <td className="px-4 py-3 text-right font-mono text-muted">
                      {r.spent$ > 0 ? `$${r.spent$.toFixed(0)}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {r.budgetH > 0 ? (
                        <div className="flex items-center gap-3">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-forge-surface">
                            <div
                              className="h-full"
                              style={{
                                width: `${Math.min(r.burnPct, 100)}%`,
                                backgroundColor: over ? "#ef4444" : r.burnPct > 80 ? "#f59e0b" : r.project.color,
                              }}
                            />
                          </div>
                          <span className={`w-12 text-right font-mono text-xs ${over ? "font-bold text-red-400" : "text-muted"}`}>
                            {r.burnPct.toFixed(0)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-faint">No budget set</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  function ForecastReport({ rangeStart, rangeEnd }: { rangeStart: string; rangeEnd: string }) {
    const weeks = useMemo(() => {
      const out: { start: Date; end: Date }[] = [];
      let d = startOfWeek(parseISODate(rangeStart));
      const endDate = parseISODate(rangeEnd);
      while (d <= endDate) {
        out.push({ start: d, end: addDays(d, 6) });
        d = addDays(d, 7);
      }
      return out;
    }, [rangeStart, rangeEnd]);

    const totalCapacity = store.people
      .filter((p) => !p.archived)
      .reduce((s, p) => s + personWeeklyHours(p), 0);

    const weekData = weeks.map((w) => {
      const wStart = toISODate(w.start);
      const wEnd = toISODate(w.end);
      const scheduled = store.people
        .filter((p) => !p.archived)
        .reduce(
          (s, p) => s + personScheduledHoursInRange(p.id, wStart, wEnd, store.allocations),
          0,
        );
      return { start: w.start, scheduled, capacity: totalCapacity };
    });

    const maxVal = Math.max(totalCapacity, ...weekData.map((w) => w.scheduled), 1);

    return (
      <>
        <div className="mb-6 grid grid-cols-3 gap-3">
          <Stat label="Weeks in range" value={`${weeks.length}`} color="#3b82f6" />
          <Stat label="Team capacity / week" value={`${totalCapacity}h`} color="#64748b" />
          <Stat
            label="Avg load"
            value={`${(
              (weekData.reduce((s, w) => s + w.scheduled, 0) / (totalCapacity * weeks.length || 1)) *
              100
            ).toFixed(0)}%`}
            color="#8b5cf6"
          />
        </div>

        <div className="rounded-xl border border-border bg-forge-surface/40 p-6">
          <h3 className="mb-4 text-sm font-semibold text-heading">Weekly load forecast</h3>
          <div className="flex items-end gap-1.5" style={{ height: 240 }}>
            {weekData.map((w, i) => {
              const pct = (w.scheduled / maxVal) * 100;
              const capPct = (totalCapacity / maxVal) * 100;
              const over = w.scheduled > totalCapacity;
              return (
                <div key={i} className="flex flex-1 flex-col items-center justify-end">
                  <div className="relative w-full" style={{ height: 200 }}>
                    <div className="absolute bottom-0 left-0 right-0">
                      <div
                        className="rounded-t"
                        style={{
                          height: `${pct}%`,
                          backgroundColor: over ? "#ef4444" : "#3b82f6",
                          opacity: 0.9,
                        }}
                      />
                    </div>
                    <div
                      className="absolute left-0 right-0 border-t border-dashed border-emerald-500/60"
                      style={{ bottom: `${capPct}%` }}
                      title={`Capacity: ${totalCapacity}h`}
                    />
                  </div>
                  <div className="mt-2 text-center">
                    <div className="font-mono text-xs text-body">{w.scheduled.toFixed(0)}h</div>
                    <div className="mt-0.5 text-[9px] text-subtle">
                      {w.start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-4 text-[11px] text-subtle">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-3 rounded-sm bg-blue-500" /> Scheduled
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-3 rounded-sm bg-red-500" /> Overbooked
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-px w-3 border-t border-dashed border-emerald-500" /> Team capacity ({totalCapacity}h/week)
            </span>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-forge-panel text-[11px] font-semibold uppercase tracking-wider text-faint">
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left">Week</th>
                <th className="px-4 py-3 text-right">Scheduled</th>
                <th className="px-4 py-3 text-right">Capacity</th>
                <th className="px-4 py-3 text-right">Load</th>
              </tr>
            </thead>
            <tbody>
              {weekData.map((w, i) => {
                const pct = totalCapacity > 0 ? (w.scheduled / totalCapacity) * 100 : 0;
                return (
                  <tr key={i} className="border-b border-border">
                    <td className="px-4 py-3 text-body">
                      {fmtDateShort(toISODate(w.start))} – {fmtDateShort(toISODate(addDays(w.start, 6)))}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted">{w.scheduled.toFixed(1)}h</td>
                    <td className="px-4 py-3 text-right font-mono text-subtle">{totalCapacity}h</td>
                    <td className={`px-4 py-3 text-right font-mono ${pct > 100 ? "font-bold text-red-400" : "text-muted"}`}>
                      {pct.toFixed(0)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  function TimesheetReport({ rangeStart, rangeEnd }: { rangeStart: string; rangeEnd: string }) {
    const { entries, personRows } = useMemo(() => {
      const inRange = store.timeEntries.filter((e) => e.date >= rangeStart && e.date <= rangeEnd);

      const byPerson = new Map<
        string,
        { logged: number; billable: number; nonBillable: number; count: number }
      >();
      for (const e of inRange) {
        const prev =
          byPerson.get(e.personId) ?? { logged: 0, billable: 0, nonBillable: 0, count: 0 };
        prev.logged += e.hours;
        if (e.billable) prev.billable += e.hours;
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
    }, [rangeStart, rangeEnd]);

    const totalLogged = personRows.reduce((s, r) => s + r.logged, 0);
    const totalBillable = personRows.reduce((s, r) => s + r.billable, 0);
    const totalNonBillable = personRows.reduce((s, r) => s + r.nonBillable, 0);

    return (
      <>
        <div className="mb-6 grid grid-cols-4 gap-3">
          <Stat label="Total logged" value={`${totalLogged.toFixed(1)}h`} color="#3b82f6" />
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
                            e.billable
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-amber-500/15 text-amber-400"
                          }`}
                        >
                          {e.billable ? "Billable" : "Non-bill"}
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
      </>
    );
  }
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
