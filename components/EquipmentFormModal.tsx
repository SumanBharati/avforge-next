"use client";

import { useId } from "react";

export interface EquipmentFormValue {
  manufacturer: string;
  model: string;
  category: string;
  notes: string;
  unitCost: number;
  partNumber: string | null;
  msrp: number | null;
  cost: number | null;
  ports: Array<{ side: string; signal: string; dir: string; label: string; connector?: string }>;
  ampDraw: number | null;
  voltage: number | null;
  powerWatts: number | null;
  btuHr: number | null;
  rackMounted: boolean;
  rackUnits: number | null;
  widthIn: number | null;
  heightIn: number | null;
  depthIn: number | null;
  weightLb: number | null;
}

const inputCls = "w-full rounded-lg border border-border bg-forge-surface/60 px-3 py-2 text-[13px] text-heading placeholder:text-faint focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30";
const labelCls = "mb-1 block text-[11px] font-medium text-muted";

export default function EquipmentFormModal({
  title,
  value,
  onChange,
  onCancel,
  onSave,
  saving,
  saveDisabled,
  categories,
  notesLabel = "Description",
  saveLabel = "Save Item",
}: {
  title: string;
  value: EquipmentFormValue;
  onChange: (next: EquipmentFormValue) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  saveDisabled?: boolean;
  categories: string[];
  notesLabel?: string;
  saveLabel?: string;
}) {
  const categoryListId = useId();
  const rackMountedId = useId();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="flex w-full max-w-2xl max-h-[85vh] flex-col rounded-2xl border border-border bg-forge-bg shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-[15px] font-bold text-heading">{title}</h3>
          <button onClick={onCancel} className="text-muted hover:text-heading transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Manufacturer *</label>
              <input type="text" value={value.manufacturer} onChange={(e) => onChange({ ...value, manufacturer: e.target.value })} className={inputCls} placeholder="e.g. Samsung" />
            </div>
            <div>
              <label className={labelCls}>Model *</label>
              <input type="text" value={value.model} onChange={(e) => onChange({ ...value, model: e.target.value })} className={inputCls} placeholder="e.g. QM85B" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Category</label>
              <input type="text" value={value.category} onChange={(e) => onChange({ ...value, category: e.target.value })} className={inputCls} placeholder="e.g. Display" list={categoryListId} />
              <datalist id={categoryListId}>
                {categories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className={labelCls}>Part Number</label>
              <input type="text" value={value.partNumber ?? ""} onChange={(e) => onChange({ ...value, partNumber: e.target.value || null })} className={inputCls} placeholder="Optional" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Unit Cost</label>
              <input type="number" min={0} step="0.01" value={value.unitCost} onChange={(e) => onChange({ ...value, unitCost: Math.max(0, Number(e.target.value)) })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>MSRP</label>
              <input type="number" min={0} step="0.01" value={value.msrp ?? ""} onChange={(e) => onChange({ ...value, msrp: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })} className={inputCls} placeholder="—" />
            </div>
            <div>
              <label className={labelCls}>Cost</label>
              <input type="number" min={0} step="0.01" value={value.cost ?? ""} onChange={(e) => onChange({ ...value, cost: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })} className={inputCls} placeholder="—" />
            </div>
          </div>
          <div>
            <label className={labelCls}>{notesLabel}</label>
            <textarea value={value.notes} onChange={(e) => onChange({ ...value, notes: e.target.value })} className={inputCls + " resize-none"} rows={2} placeholder="Optional…" />
          </div>

          <div className="border-t border-border pt-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">Power &amp; Electrical</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Voltage (V)</label>
                <input type="number" min={0} step="0.1" value={value.voltage ?? ""} onChange={(e) => onChange({ ...value, voltage: e.target.value === "" ? null : Number(e.target.value) })} className={inputCls} placeholder="—" />
              </div>
              <div>
                <label className={labelCls}>Amp Draw (A)</label>
                <input type="number" min={0} step="0.1" value={value.ampDraw ?? ""} onChange={(e) => onChange({ ...value, ampDraw: e.target.value === "" ? null : Number(e.target.value) })} className={inputCls} placeholder="—" />
              </div>
              <div>
                <label className={labelCls}>Power (W)</label>
                <input type="number" min={0} step="1" value={value.powerWatts ?? ""} onChange={(e) => onChange({ ...value, powerWatts: e.target.value === "" ? null : Number(e.target.value) })} className={inputCls} placeholder="—" />
              </div>
              <div>
                <label className={labelCls}>BTU/hr</label>
                <input type="number" min={0} step="1" value={value.btuHr ?? ""} onChange={(e) => onChange({ ...value, btuHr: e.target.value === "" ? null : Number(e.target.value) })} className={inputCls} placeholder="—" />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">Physical</div>
            <div className="mb-3 flex items-center gap-2">
              <input
                id={rackMountedId}
                type="checkbox"
                checked={value.rackMounted}
                onChange={(e) => onChange({ ...value, rackMounted: e.target.checked })}
                className="h-3.5 w-3.5 rounded border-border"
              />
              <label htmlFor={rackMountedId} className="text-[12px] text-body">Rack mounted</label>
              {value.rackMounted && (
                <input
                  type="number" min={0} step="0.5"
                  value={value.rackUnits ?? ""}
                  onChange={(e) => onChange({ ...value, rackUnits: e.target.value === "" ? null : Number(e.target.value) })}
                  className={inputCls + " ml-2 w-24"}
                  placeholder="RU"
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Weight (lb)</label>
                <input type="number" min={0} step="0.1" value={value.weightLb ?? ""} onChange={(e) => onChange({ ...value, weightLb: e.target.value === "" ? null : Number(e.target.value) })} className={inputCls} placeholder="—" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={labelCls}>W (in)</label>
                  <input type="number" min={0} step="0.1" value={value.widthIn ?? ""} onChange={(e) => onChange({ ...value, widthIn: e.target.value === "" ? null : Number(e.target.value) })} className={inputCls} placeholder="—" />
                </div>
                <div>
                  <label className={labelCls}>H (in)</label>
                  <input type="number" min={0} step="0.1" value={value.heightIn ?? ""} onChange={(e) => onChange({ ...value, heightIn: e.target.value === "" ? null : Number(e.target.value) })} className={inputCls} placeholder="—" />
                </div>
                <div>
                  <label className={labelCls}>D (in)</label>
                  <input type="number" min={0} step="0.1" value={value.depthIn ?? ""} onChange={(e) => onChange({ ...value, depthIn: e.target.value === "" ? null : Number(e.target.value) })} className={inputCls} placeholder="—" />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-faint">Ports</div>
              <button
                type="button"
                onClick={() => onChange({ ...value, ports: [...value.ports, { side: "right", dir: "out", signal: "", label: "", connector: "" }] })}
                className="text-[11px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
              >
                + Add port
              </button>
            </div>
            {value.ports.length === 0 ? (
              <p className="text-[12px] text-faint">No ports defined.</p>
            ) : (
              <div className="space-y-2">
                {value.ports.map((port, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      value={port.side}
                      onChange={(e) => onChange({ ...value, ports: value.ports.map((p, j) => j === i ? { ...p, side: e.target.value } : p) })}
                      className={inputCls + " w-24"}
                    >
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                      <option value="top">Top</option>
                      <option value="bottom">Bottom</option>
                    </select>
                    <select
                      value={port.dir}
                      onChange={(e) => onChange({ ...value, ports: value.ports.map((p, j) => j === i ? { ...p, dir: e.target.value } : p) })}
                      className={inputCls + " w-20"}
                    >
                      <option value="in">In</option>
                      <option value="out">Out</option>
                    </select>
                    <input
                      type="text" value={port.signal}
                      onChange={(e) => onChange({ ...value, ports: value.ports.map((p, j) => j === i ? { ...p, signal: e.target.value } : p) })}
                      className={inputCls} placeholder="signal (hdmi, usb…)"
                    />
                    <input
                      type="text" value={port.label}
                      onChange={(e) => onChange({ ...value, ports: value.ports.map((p, j) => j === i ? { ...p, label: e.target.value } : p) })}
                      className={inputCls} placeholder="label"
                    />
                    <input
                      type="text" value={port.connector || ""}
                      onChange={(e) => onChange({ ...value, ports: value.ports.map((p, j) => j === i ? { ...p, connector: e.target.value } : p) })}
                      className={inputCls} placeholder="connector (RJ45, XLR-3…)"
                    />
                    <button
                      type="button"
                      onClick={() => onChange({ ...value, ports: value.ports.filter((_, j) => j !== i) })}
                      className="shrink-0 rounded-md p-1.5 text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:text-body">
            Cancel
          </button>
          <button onClick={onSave} disabled={saving || saveDisabled} className="rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50">
            {saving ? "Saving…" : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
