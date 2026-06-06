"use client";

import { useMemo, useState } from "react";
import { usePMStore } from "@/components/PMStoreProvider";
import PMPageSkeleton from "@/components/skeletons/PMPageSkeleton";
import {
  PERSON_COLORS,
  ROLE_OPTIONS,
  personScheduledHoursInRange,
  personWeeklyHours,
  toISODate,
  startOfWeek,
  addDays,
  uid,
  type Person,
} from "@/lib/pm-store";

export default function PeoplePage() {
  const { store, update, loading } = usePMStore();
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const weekStart = useMemo(() => toISODate(startOfWeek(new Date())), []);
  const weekEnd = useMemo(() => toISODate(addDays(startOfWeek(new Date()), 6)), []);

  if (loading) return <PMPageSkeleton />;

  const filtered = store.people
    .filter((p) => showArchived || !p.archived)
    .filter((p) =>
      search === "" ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.role.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  function addPerson() {
    const color = PERSON_COLORS[store.people.length % PERSON_COLORS.length];
    const p: Person = {
      id: uid(),
      name: "New person",
      role: ROLE_OPTIONS[0],
      email: "",
      color,
      weeklyHours: 40,
      hourlyRate: 0,
      tags: [],
      archived: false,
    };
    update({ ...store, people: [...store.people, p] });
    setEditing(p.id);
  }

  function updatePerson(id: string, patch: Partial<Person>) {
    update({
      ...store,
      people: store.people.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
  }

  function deletePerson(id: string) {
    update({
      ...store,
      people: store.people.filter((p) => p.id !== id),
      allocations: store.allocations.filter((a) => a.personId !== id),
      timeOff: store.timeOff.filter((t) => t.personId !== id),
      timeEntries: store.timeEntries.filter((e) => e.personId !== id),
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-8 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-heading">Resources</h1>
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
            onClick={addPerson}
            className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-2 text-[12px] font-semibold text-white hover:bg-blue-600"
          >
            <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
              <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Add person
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="mb-3 text-sm text-faint">No people yet</p>
            <button
              onClick={addPerson}
              className="rounded-lg bg-blue-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-600"
            >
              Add your first person
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-forge-panel text-left text-[11px] font-semibold uppercase tracking-wider text-faint">
              <tr className="border-b border-border">
                <th className="px-8 py-3">Name</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3 text-right">Weekly hrs</th>
                <th className="px-3 py-3 text-right">Rate</th>
                <th className="px-3 py-3 text-right">This week</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const scheduled = personScheduledHoursInRange(
                  p.id,
                  weekStart,
                  weekEnd,
                  store.allocations,
                );
                const capacity = personWeeklyHours(p);
                const pct = capacity > 0 ? Math.round((scheduled / capacity) * 100) : 0;
                const over = pct > 100;

                return (
                  <tr
                    key={p.id}
                    className={`group border-b border-border transition-colors hover:bg-forge-surface/30 ${
                      p.archived ? "opacity-50" : ""
                    }`}
                  >
                    <td className="px-8 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: p.color }}
                        >
                          {p.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase() || "·"}
                        </div>
                        {editing === p.id ? (
                          <input
                            value={p.name}
                            onChange={(e) => updatePerson(p.id, { name: e.target.value })}
                            onBlur={() => setEditing(null)}
                            onKeyDown={(e) => e.key === "Enter" && setEditing(null)}
                            autoFocus
                            className="forge-input w-48 text-sm"
                          />
                        ) : (
                          <button
                            onClick={() => setEditing(p.id)}
                            className="text-left font-semibold text-heading hover:text-blue-400"
                          >
                            {p.name}
                          </button>
                        )}
                        {p.memberUserId && (
                          <span
                            title="Linked to an organization member"
                            className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400"
                          >
                            Member
                          </span>
                        )}
                        {!p.memberUserId && p.inviteId && (
                          <span
                            title="Linked to a pending invite"
                            className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400"
                          >
                            Invited
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={p.role}
                        onChange={(e) => updatePerson(p.id, { role: e.target.value })}
                        className="forge-input text-sm"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        value={p.email}
                        onChange={(e) => updatePerson(p.id, { email: e.target.value })}
                        placeholder="email@…"
                        className="forge-input w-full text-sm"
                      />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <input
                        type="number"
                        value={p.weeklyHours}
                        onChange={(e) => updatePerson(p.id, { weeklyHours: Number(e.target.value) || 0 })}
                        className="forge-input w-20 text-right text-sm"
                      />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <input
                        type="number"
                        value={p.hourlyRate}
                        onChange={(e) => updatePerson(p.id, { hourlyRate: Number(e.target.value) || 0 })}
                        className="forge-input w-24 text-right text-sm"
                        placeholder="$/hr"
                      />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <span className={`font-mono text-xs ${over ? "text-red-400" : "text-muted"}`}>
                          {scheduled}h / {capacity}h
                        </span>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-forge-surface">
                          <div
                            className="h-full transition-all"
                            style={{
                              width: `${Math.min(pct, 100)}%`,
                              backgroundColor: over ? "#ef4444" : pct > 80 ? "#f59e0b" : "#22c55e",
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => updatePerson(p.id, { archived: !p.archived })}
                          className="rounded p-1.5 text-subtle transition-colors hover:bg-forge-surface hover:text-body"
                          title={p.archived ? "Unarchive" : "Archive"}
                        >
                          {p.archived ? (
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                              <path d="M8 3v8M4 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                              <rect x="2" y="3" width="12" height="3" rx="1" stroke="currentColor" strokeWidth="1.2" />
                              <path d="M3 6v6a1 1 0 001 1h8a1 1 0 001-1V6M6.5 8.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete ${p.name}? This removes all their allocations and time.`)) {
                              deletePerson(p.id);
                            }
                          }}
                          className="rounded p-1.5 text-subtle transition-colors hover:bg-red-500/10 hover:text-red-400"
                          title="Delete"
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1M4 4v9a1 1 0 001 1h6a1 1 0 001-1V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
