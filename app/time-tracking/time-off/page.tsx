"use client";

import { useMemo, useState } from "react";
import { usePMStore } from "@/components/PMStoreProvider";
import PMPageSkeleton from "@/components/skeletons/PMPageSkeleton";
import {
  businessDaysBetween,
  fmtDateFull,
  TIME_OFF_COLORS,
  toISODate,
  uid,
  type TimeOff,
  type TimeOffType,
} from "@/lib/pm-store";

const TYPE_LABELS: Record<TimeOffType, string> = {
  vacation: "Vacation",
  sick: "Sick",
  holiday: "Holiday",
  other: "Other",
};

export default function TimeOffPage() {
  const { store, update, loading } = usePMStore();
  const [filterPerson, setFilterPerson] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [editing, setEditing] = useState<TimeOff | null>(null);
  const [creating, setCreating] = useState(false);

  const sorted = useMemo(() => {
    return [...store.timeOff]
      .filter((t) => !filterPerson || t.personId === filterPerson)
      .filter((t) => !filterType || t.type === filterType)
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [store.timeOff, filterPerson, filterType]);

  if (loading) return <PMPageSkeleton />;

  const peopleById = Object.fromEntries(store.people.map((p) => [p.id, p]));
  const todayISO = toISODate(new Date());

  function save(t: TimeOff) {
    if (store.timeOff.some((x) => x.id === t.id)) {
      update({ ...store, timeOff: store.timeOff.map((x) => (x.id === t.id ? t : x)) });
    } else {
      update({ ...store, timeOff: [...store.timeOff, t] });
    }
    setEditing(null);
    setCreating(false);
  }

  function del(id: string) {
    update({ ...store, timeOff: store.timeOff.filter((t) => t.id !== id) });
    setEditing(null);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-8 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-heading">Time Off</h1>
          <span className="rounded-md bg-forge-surface/60 px-2 py-0.5 text-[11px] text-subtle">
            {sorted.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterPerson}
            onChange={(e) => setFilterPerson(e.target.value)}
            className="forge-input text-sm"
          >
            <option value="">All people</option>
            {store.people.filter((p) => !p.archived).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="forge-input text-sm"
          >
            <option value="">All types</option>
            {(Object.keys(TYPE_LABELS) as TimeOffType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <button
            onClick={() => setCreating(true)}
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-500 px-3 py-2 text-[12px] font-semibold text-white hover:bg-blue-600"
          >
            <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
              <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            New time off
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="py-20 text-center">
            <p className="mb-3 text-sm text-faint">No time off recorded</p>
            <button
              onClick={() => setCreating(true)}
              className="rounded-lg bg-blue-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-600"
            >
              Add time off
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-forge-panel text-left text-[11px] font-semibold uppercase tracking-wider text-faint">
              <tr className="border-b border-border">
                <th className="px-8 py-3">Person</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Dates</th>
                <th className="px-3 py-3 text-right">Business days</th>
                <th className="px-3 py-3">Notes</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => {
                const p = peopleById[t.personId];
                const days = businessDaysBetween(t.startDate, t.endDate);
                const current = todayISO >= t.startDate && todayISO <= t.endDate;
                const upcoming = t.startDate > todayISO;
                return (
                  <tr key={t.id} className="border-b border-border hover:bg-forge-surface/30">
                    <td className="px-8 py-3">
                      <div className="flex items-center gap-3">
                        {p && (
                          <div
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                            style={{ backgroundColor: p.color }}
                          >
                            {p.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="font-semibold text-body">{p?.name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                        style={{
                          backgroundColor: TIME_OFF_COLORS[t.type] + "22",
                          color: TIME_OFF_COLORS[t.type],
                          border: `1px solid ${TIME_OFF_COLORS[t.type]}44`,
                        }}
                      >
                        {TYPE_LABELS[t.type]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-body">
                      {fmtDateFull(t.startDate)} – {fmtDateFull(t.endDate)}
                      {current && <span className="ml-2 text-[10px] font-semibold text-emerald-400">ONGOING</span>}
                      {upcoming && <span className="ml-2 text-[10px] font-semibold text-blue-400">UPCOMING</span>}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-muted">{days}</td>
                    <td className="px-3 py-3 max-w-xs truncate text-subtle">{t.notes}</td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => setEditing(t)}
                        className="mr-1 rounded px-2 py-1 text-xs text-subtle hover:bg-forge-surface hover:text-body"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => del(t.id)}
                        className="rounded px-2 py-1 text-xs text-subtle hover:bg-red-500/10 hover:text-red-400"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {(editing || creating) && (
        <TimeOffModal
          initial={
            editing || {
              id: uid(),
              personId: store.people.find((p) => !p.archived)?.id || "",
              startDate: todayISO,
              endDate: todayISO,
              type: "vacation",
              notes: "",
            }
          }
          isNew={!editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSave={save}
          onDelete={editing ? () => del(editing.id) : undefined}
        />
      )}
    </div>
  );
}

function TimeOffModal({
  initial,
  isNew,
  onClose,
  onSave,
  onDelete,
}: {
  initial: TimeOff;
  isNew: boolean;
  onClose: () => void;
  onSave: (t: TimeOff) => void;
  onDelete?: () => void;
}) {
  const { store } = usePMStore();
  const [form, setForm] = useState<TimeOff>(initial);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-forge-bg shadow-2xl">
        <div className="border-b border-border px-6 py-4">
          <h3 className="text-lg font-semibold text-heading">
            {isNew ? "New time off" : "Edit time off"}
          </h3>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faint">Person</label>
            <select
              value={form.personId}
              onChange={(e) => setForm({ ...form, personId: e.target.value })}
              className="forge-input w-full text-sm"
            >
              {store.people.filter((p) => !p.archived).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faint">Type</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TYPE_LABELS) as TimeOffType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm({ ...form, type: t })}
                  className="rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors"
                  style={{
                    backgroundColor: form.type === t ? TIME_OFF_COLORS[t] + "33" : "transparent",
                    borderColor: form.type === t ? TIME_OFF_COLORS[t] : "rgb(var(--border))",
                    color: form.type === t ? TIME_OFF_COLORS[t] : "rgb(var(--text-muted))",
                  }}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faint">Start</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="forge-input w-full text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faint">End</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="forge-input w-full text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faint">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="forge-input w-full text-sm"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border px-6 py-4">
          <div>
            {onDelete && (
              <button
                onClick={onDelete}
                className="rounded-lg px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:text-body">
              Cancel
            </button>
            <button
              onClick={() => onSave(form)}
              disabled={!form.personId || !form.startDate || !form.endDate}
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-40"
            >
              {isNew ? "Create" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
