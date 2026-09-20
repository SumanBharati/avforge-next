"use client";

import { useId, useRef, useState, useEffect } from "react";
import { compressPhotoFile, extractEquipmentFromPhotos } from "@/lib/ai-equipment-extract";
import { priceFromMargin, priceFromMarkup, marginFromPrice, markupFromPrice } from "@/lib/pricing";

export interface EquipmentFormValue {
  manufacturer: string;
  model: string;
  category: string;
  notes: string;
  unitCost: number;
  partNumber: string | null;
  msrp: number | null;
  cost: number | null;
  margin: number | null;
  markup: number | null;
  ports: Array<{ side: string; signal: string; dir: string; label: string; connector?: string }>;
  ampDraw: number | null;
  voltage: number | null;
  powerWatts: number | null;
  btuHr: number | null;
  rackMounted: boolean;
  rackUnits: number | null;
  rackEarsIncluded: boolean;
  widthIn: number | null;
  heightIn: number | null;
  depthIn: number | null;
  /** Physical diameter of a round unit (a ceiling speaker or mic). Optional so a host that doesn't store it can ignore it. */
  diameterIn?: number | null;
  weightLb: number | null;
  hfovDeg: number | null;
  vfovDeg: number | null;
  coveragePattern: "circular" | "rectangular" | null;
  coverageDiameterFt: number | null;
  coverageAngleDeg: number | null;
  coverageWidthFt: number | null;
  coverageDepthFt: number | null;
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
  saveError,
  categories,
  notesLabel = "Description",
  saveLabel = "Save Item",
  showAIImport = false,
  aiMode = "create",
}: {
  title: string;
  value: EquipmentFormValue;
  onChange: (next: EquipmentFormValue) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  saveDisabled?: boolean;
  // Surfaced from the host's own insert/update call — without this, a failed
  // save (RLS, a unique-constraint conflict, a bad value) used to fail
  // completely silently: the modal either closed or just sat there with no
  // indication anything went wrong.
  saveError?: string | null;
  categories: string[];
  notesLabel?: string;
  saveLabel?: string;
  showAIImport?: boolean;
  // "create": a field the user already typed wins over what AI reads (so
  // typing ahead of uploading photos doesn't get clobbered). "update": AI
  // wins whenever it reads a value, since the whole point of re-running it
  // on an existing library item is to refresh stale specs from new photos.
  aiMode?: "create" | "update";
}) {
  const categoryListId = useId();
  const rackMountedId = useId();
  const rackEarsId = useId();
  const [dragPortIndex, setDragPortIndex] = useState<number | null>(null);
  const [dragOverPortIndex, setDragOverPortIndex] = useState<number | null>(null);
  const [aiPhotos, setAiPhotos] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const aiFileRef = useRef<HTMLInputElement>(null);

  async function handleAiFiles(files: FileList | File[] | null) {
    if (!files || files.length === 0) return;
    setAiError(null);
    const room = Math.max(0, 6 - aiPhotos.length);
    const toAdd = Array.from(files).slice(0, room);
    try {
      const compressed = await Promise.all(toAdd.map((f) => compressPhotoFile(f)));
      setAiPhotos((prev) => [...prev, ...compressed]);
    } catch {
      setAiError("Couldn't read one of those photos.");
    }
  }

  // Lets a Snipping Tool / screenshot capture go straight from clipboard to
  // the AI photo list with a plain Ctrl+V — no save-to-file-then-upload
  // round trip. Attached at the document level (rather than on a specific
  // element) because a plain, non-editable drop zone never receives focus,
  // so it would never see a paste event otherwise; scoped to whichever
  // modal is actually mounted with AI import enabled, harmless to any other
  // paste (into a text field, etc.) since it only acts when the clipboard
  // actually contains an image and otherwise leaves the event alone.
  useEffect(() => {
    if (!showAIImport) return;
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const images: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) images.push(file);
        }
      }
      if (images.length > 0) {
        e.preventDefault();
        handleAiFiles(images);
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [showAIImport, aiPhotos.length]);

  async function handleAnalyzePhotos() {
    if (aiPhotos.length === 0) return;
    setAnalyzing(true);
    setAiError(null);
    setAiNote(null);
    const result = await extractEquipmentFromPhotos(aiPhotos, categories);
    setAnalyzing(false);
    if ("error" in result) {
      setAiError(result.error);
      return;
    }
    const d = result.data;
    // create: keep whatever the user already typed, only fill gaps.
    // update: AI's fresh reading wins whenever it found something.
    const str = (current: string, ai: string | null | undefined) =>
      aiMode === "update" ? (ai || current) : (current.trim() ? current : (ai || current));
    const strOrNull = (current: string | null, ai: string | null | undefined) =>
      aiMode === "update" ? (ai ?? current) : (current ? current : (ai ?? current));
    const num = (current: number | null, ai: number | null | undefined) =>
      aiMode === "update" ? (ai ?? current) : (current ?? ai ?? current);
    onChange({
      ...value,
      manufacturer: str(value.manufacturer, d.manufacturer),
      model: str(value.model, d.model),
      category: str(value.category, d.category),
      notes: str(value.notes, d.notes),
      partNumber: strOrNull(value.partNumber, d.partNumber),
      ports: aiMode === "update" ? (d.ports?.length ? d.ports : value.ports) : (value.ports.length > 0 ? value.ports : (d.ports?.length ? d.ports : value.ports)),
      ampDraw: num(value.ampDraw, d.ampDraw),
      voltage: num(value.voltage, d.voltage),
      powerWatts: num(value.powerWatts, d.powerWatts),
      btuHr: num(value.btuHr, d.btuHr),
      rackMounted: aiMode === "update" ? (d.rackMounted || value.rackMounted) : (value.rackMounted || d.rackMounted),
      rackUnits: num(value.rackUnits, d.rackUnits),
      widthIn: num(value.widthIn, d.widthIn),
      heightIn: num(value.heightIn, d.heightIn),
      depthIn: num(value.depthIn, d.depthIn),
      weightLb: num(value.weightLb, d.weightLb),
    });
    if (d.aiNotes) setAiNote(d.aiNotes);
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
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
          {showAIImport && (
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
              <div className="mb-1 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-violet-400">
                  <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z" />
                </svg>
                <span className="text-[12px] font-semibold text-heading">{aiMode === "update" ? "Update with AI" : "Fill in with AI"}</span>
                <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-violet-300">Beta</span>
              </div>
              <p className="mb-3 text-[11px] text-subtle">
                {aiMode === "update"
                  ? "Upload new photos — front panel, rear/connector panel, and any power or spec label — and AI will refresh any fields it can read, overwriting the current values. Review everything before saving."
                  : "Upload a few photos — front panel, rear/connector panel, and any power or spec label — and AI will fill in fields it can read. Review everything before saving."}
                {" "}Took a screenshot or snip? Just <span className="font-medium text-violet-300">paste it (Ctrl+V)</span> anywhere in this window.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {aiPhotos.map((src, i) => (
                  <div key={i} className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setAiPhotos((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </div>
                ))}
                {aiPhotos.length < 6 && (
                  <button
                    type="button"
                    onClick={() => aiFileRef.current?.click()}
                    className="flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-violet-500/40 text-violet-300 transition-colors hover:border-violet-500/70 hover:bg-violet-500/10"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    <span className="text-[9px]">Photo</span>
                  </button>
                )}
                <input ref={aiFileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { handleAiFiles(e.target.files); e.target.value = ""; }} />
                <button
                  type="button"
                  onClick={handleAnalyzePhotos}
                  disabled={aiPhotos.length === 0 || analyzing}
                  className="ml-auto rounded-lg bg-violet-600 px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-40"
                >
                  {analyzing ? "Analyzing…" : "Analyze Photos"}
                </button>
              </div>
              {aiError && <p className="mt-2 text-[11px] text-red-400">{aiError}</p>}
              {aiNote && <p className="mt-2 text-[11px] text-amber-400">⚠ {aiNote}</p>}
            </div>
          )}
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
          <div>
            <label className={labelCls}>{notesLabel}</label>
            <textarea value={value.notes} onChange={(e) => onChange({ ...value, notes: e.target.value })} className={inputCls + " resize-none"} rows={2} placeholder="Optional…" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Cost</label>
              <input
                type="number" min={0} step="0.01" value={value.unitCost}
                onChange={(e) => {
                  const unitCost = Math.max(0, Number(e.target.value));
                  // Keep whichever of margin/markup was already set, and let
                  // price follow it as cost changes; otherwise leave price
                  // (and the other two) alone — nothing to recompute from yet.
                  const cost = value.margin != null ? priceFromMargin(unitCost, value.margin)
                    : value.markup != null ? priceFromMarkup(unitCost, value.markup)
                    : value.cost;
                  onChange({
                    ...value, unitCost, cost,
                    markup: value.margin != null ? markupFromPrice(unitCost, cost) : value.markup,
                    margin: value.margin == null && value.markup != null ? marginFromPrice(unitCost, cost) : value.margin,
                  });
                }}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Margin %</label>
              <input
                type="number" step="0.1" value={value.margin ?? ""}
                onChange={(e) => {
                  const margin = e.target.value === "" ? null : Number(e.target.value);
                  const cost = priceFromMargin(value.unitCost, margin);
                  onChange({ ...value, margin, cost, markup: markupFromPrice(value.unitCost, cost) });
                }}
                className={inputCls} placeholder="—"
              />
            </div>
            <div>
              <label className={labelCls}>Markup %</label>
              <input
                type="number" step="0.1" value={value.markup ?? ""}
                onChange={(e) => {
                  const markup = e.target.value === "" ? null : Number(e.target.value);
                  const cost = priceFromMarkup(value.unitCost, markup);
                  onChange({ ...value, markup, cost, margin: marginFromPrice(value.unitCost, cost) });
                }}
                className={inputCls} placeholder="—"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Price</label>
              <input
                type="number" min={0} step="0.01" value={value.cost ?? ""}
                onChange={(e) => {
                  const cost = e.target.value === "" ? null : Math.max(0, Number(e.target.value));
                  onChange({ ...value, cost, margin: marginFromPrice(value.unitCost, cost), markup: markupFromPrice(value.unitCost, cost) });
                }}
                className={inputCls} placeholder="—"
              />
            </div>
            <div>
              <label className={labelCls}>MSRP</label>
              <input type="number" min={0} step="0.01" value={value.msrp ?? ""} onChange={(e) => onChange({ ...value, msrp: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })} className={inputCls} placeholder="—" />
            </div>
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
            <div className="mb-3 flex items-center gap-2">
              <input
                id={rackEarsId}
                type="checkbox"
                checked={value.rackEarsIncluded}
                onChange={(e) => onChange({ ...value, rackEarsIncluded: e.target.checked })}
                className="h-3.5 w-3.5 rounded border-border"
              />
              <label htmlFor={rackEarsId} className="text-[12px] text-body">Includes rack ears</label>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] gap-3">
              <div>
                <label className={labelCls}>Weight (lb)</label>
                <input type="number" min={0} step="0.1" value={value.weightLb ?? ""} onChange={(e) => onChange({ ...value, weightLb: e.target.value === "" ? null : Number(e.target.value) })} className={inputCls} placeholder="—" />
              </div>
              <div className="grid grid-cols-4 gap-2">
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
                <div>
                  <label className={labelCls}>Dia (in)</label>
                  {/* A round unit is as wide as it is tall, so entering a diameter also sets W and H to it
                      (still editable afterwards) — that is the footprint drawn on the plan. */}
                  <input
                    type="number" min={0} step="0.1" value={value.diameterIn ?? ""}
                    onChange={(e) => {
                      const dia = e.target.value === "" ? null : Number(e.target.value);
                      onChange({ ...value, diameterIn: dia, ...(dia != null && dia > 0 ? { widthIn: dia, heightIn: dia } : {}) });
                    }}
                    className={inputCls} placeholder="—"
                  />
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
              <div className="space-y-1">
                {/* Column headings — mirrors each row's layout below exactly
                    (same fixed widths for the drag-handle/side/dir/actions
                    columns, same flex sharing for the three text columns) so
                    it's clear at a glance which field is which. */}
                <div className="grid grid-cols-[16px_6rem_5rem_1fr_1fr_1fr_52px] items-center gap-2 px-0.5 text-[10px] font-medium uppercase tracking-wide text-faint">
                  <div />
                  <div>Side</div>
                  <div>Dir</div>
                  <div>Signal</div>
                  <div>Label</div>
                  <div>Connector</div>
                  <div />
                </div>
                {value.ports.map((port, i) => (
                  <div
                    key={i}
                    onDragOver={(e) => { e.preventDefault(); if (dragOverPortIndex !== i) setDragOverPortIndex(i); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverPortIndex(null);
                      if (dragPortIndex === null || dragPortIndex === i) return;
                      const next = [...value.ports];
                      const [moved] = next.splice(dragPortIndex, 1);
                      next.splice(i, 0, moved);
                      onChange({ ...value, ports: next });
                      setDragPortIndex(null);
                    }}
                    className={`grid grid-cols-[16px_6rem_5rem_1fr_1fr_1fr_52px] items-center gap-2 rounded-md py-0.5 transition-colors ${dragOverPortIndex === i && dragPortIndex !== null && dragPortIndex !== i ? "bg-blue-500/10 ring-1 ring-blue-500/30" : ""} ${dragPortIndex === i ? "opacity-40" : ""}`}
                  >
                    <span
                      draggable
                      onDragStart={(e) => { e.dataTransfer.setData("text/plain", String(i)); e.dataTransfer.effectAllowed = "move"; setDragPortIndex(i); }}
                      onDragEnd={() => { setDragPortIndex(null); setDragOverPortIndex(null); }}
                      title="Drag to reorder"
                      className="flex cursor-grab items-center justify-center text-faint transition-colors hover:text-muted active:cursor-grabbing"
                    >
                      <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor"><circle cx="2.5" cy="2.5" r="1.4" /><circle cx="7.5" cy="2.5" r="1.4" /><circle cx="2.5" cy="8" r="1.4" /><circle cx="7.5" cy="8" r="1.4" /><circle cx="2.5" cy="13.5" r="1.4" /><circle cx="7.5" cy="13.5" r="1.4" /></svg>
                    </span>
                    <select
                      value={port.side}
                      onChange={(e) => onChange({ ...value, ports: value.ports.map((p, j) => j === i ? { ...p, side: e.target.value } : p) })}
                      className={inputCls}
                    >
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                    </select>
                    <select
                      value={port.dir}
                      onChange={(e) => onChange({ ...value, ports: value.ports.map((p, j) => j === i ? { ...p, dir: e.target.value } : p) })}
                      className={inputCls}
                    >
                      <option value="in">In</option>
                      <option value="out">Out</option>
                    </select>
                    <input
                      type="text" value={port.signal}
                      onChange={(e) => onChange({ ...value, ports: value.ports.map((p, j) => j === i ? { ...p, signal: e.target.value } : p) })}
                      className={inputCls + " min-w-0"} placeholder="signal (hdmi, usb…)"
                    />
                    <input
                      type="text" value={port.label}
                      onChange={(e) => onChange({ ...value, ports: value.ports.map((p, j) => j === i ? { ...p, label: e.target.value } : p) })}
                      className={inputCls + " min-w-0"} placeholder="label"
                    />
                    <input
                      type="text" value={port.connector || ""}
                      onChange={(e) => onChange({ ...value, ports: value.ports.map((p, j) => j === i ? { ...p, connector: e.target.value } : p) })}
                      className={inputCls + " min-w-0"} placeholder="connector (RJ45, XLR-3…)"
                    />
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          const next = [...value.ports];
                          next.splice(i + 1, 0, { ...port });
                          onChange({ ...value, ports: next });
                        }}
                        title="Duplicate port"
                        className="rounded-md p-1.5 text-muted transition-colors hover:bg-blue-500/10 hover:text-blue-400"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => onChange({ ...value, ports: value.ports.filter((_, j) => j !== i) })}
                        title="Delete port"
                        className="rounded-md p-1.5 text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">Coverage &amp; Field of View if applicable</div>
            <p className="mb-3 text-[11px] text-faint">Used by Room Designer to draw camera FOV cone or mic/speaker coverage area on the floor plan. Leave blank for equipment that doesn&apos;t need one.</p>
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>HFOV (°)</label>
                <input type="number" min={0} max={360} step="1" value={value.hfovDeg ?? ""} onChange={(e) => onChange({ ...value, hfovDeg: e.target.value === "" ? null : Number(e.target.value) })} className={inputCls} placeholder="Cameras — e.g. 120" />
              </div>
              <div>
                <label className={labelCls}>VFOV (°)</label>
                <input type="number" min={0} max={360} step="1" value={value.vfovDeg ?? ""} onChange={(e) => onChange({ ...value, vfovDeg: e.target.value === "" ? null : Number(e.target.value) })} className={inputCls} placeholder="Cameras — e.g. 70" />
              </div>
            </div>
            <div className="mb-3">
              <label className={labelCls}>Coverage Pattern</label>
              <select
                value={value.coveragePattern ?? ""}
                onChange={(e) => onChange({ ...value, coveragePattern: e.target.value === "" ? null : (e.target.value as "circular" | "rectangular") })}
                className={inputCls}
              >
                <option value="">None</option>
                <option value="circular">Circular (mics, ceiling speakers)</option>
                <option value="rectangular">Rectangular (directional speakers, sensors)</option>
              </select>
            </div>
            {value.coveragePattern === "circular" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Coverage Diameter (ft)</label>
                  <input type="number" min={0} step="0.5" value={value.coverageDiameterFt ?? ""} onChange={(e) => onChange({ ...value, coverageDiameterFt: e.target.value === "" ? null : Number(e.target.value) })} className={inputCls} placeholder="e.g. 20" />
                </div>
                <div>
                  <label className={labelCls}>Coverage Angle (°)</label>
                  <input type="number" min={0} max={360} step="1" value={value.coverageAngleDeg ?? ""} onChange={(e) => onChange({ ...value, coverageAngleDeg: e.target.value === "" ? null : Number(e.target.value) })} className={inputCls} placeholder="360 = omni" />
                </div>
              </div>
            )}
            {value.coveragePattern === "rectangular" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Coverage Width (ft)</label>
                  <input type="number" min={0} step="0.5" value={value.coverageWidthFt ?? ""} onChange={(e) => onChange({ ...value, coverageWidthFt: e.target.value === "" ? null : Number(e.target.value) })} className={inputCls} placeholder="e.g. 12" />
                </div>
                <div>
                  <label className={labelCls}>Coverage Depth (ft)</label>
                  <input type="number" min={0} step="0.5" value={value.coverageDepthFt ?? ""} onChange={(e) => onChange({ ...value, coverageDepthFt: e.target.value === "" ? null : Number(e.target.value) })} className={inputCls} placeholder="e.g. 16" />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-6 py-4">
          <p className="text-[12px] text-red-400">{saveError || ""}</p>
          <div className="flex shrink-0 items-center gap-3">
            <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:text-body">
              Cancel
            </button>
            <button onClick={onSave} disabled={saving || saveDisabled} className="rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50">
              {saving ? "Saving…" : saveLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
