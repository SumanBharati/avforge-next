// One unit, one product spec — across Room Designer, Signal Flow and the rack.
//
// Each tool keeps its own copy of a unit (a placed device, a diagram block, a
// rack row) and each stores the unit's make / model / price / specs under its
// own field names. When the user edits or replaces a unit in one tool, the
// other two need the same change, or the BOM (which unions all three) shows
// whichever copy it read first.
//
// The change is recorded once, per room, keyed by the unit's itemId, in the
// `shared-unit-specs` tool_data row. Every tool lays that record over its own
// copy of the unit when it loads (`applySpecTo…`), and the BOM patches itself
// live. Only units someone actually edited or replaced have an entry, so a
// unit nobody touched is never rewritten.
//
// Ports are shared too. A Signal Flow block's cables hang on its port ids, so a
// new port list is merged in rather than pasted over it: a port that matches an
// existing one (same side and label) keeps its id and its cables; a port the new
// product doesn't have is dropped along with whatever was wired to it.
//
// What is NOT shared, on purpose: each tool's own drawing geometry (plan
// footprint, diagram box size, rack position).

import { loadToolData, saveToolData } from "@/lib/tool-data";
import { displayNameOf, meaningfulMfr, meaningfulModel, productKeyOf } from "@/lib/design-identity";

export const UNIT_SPECS_TOOL = "shared-unit-specs";

export interface SpecPort { side: string; signal: string; dir: string; label: string; connector?: string }

export interface UnitSpec {
  /** The unit's ports, without the ids a tool gives its own copy. */
  ports?: SpecPort[] | null;
  mfr?: string | null;
  model?: string | null;
  /** The free-text description (Room Designer `name`, Signal Flow `type`, rack `name`). */
  description?: string | null;
  cat?: string | null;
  price?: number | null;
  part_number?: string | null;
  msrp?: number | null;
  cost?: number | null;
  margin?: number | null;
  markup?: number | null;
  productId?: string | null;
  productKey?: string | null;
  amp_draw?: number | null;
  voltage?: number | null;
  power_watts?: number | null;
  btu_hr?: number | null;
  rack_units?: number | null;
  rack_ear_included?: boolean | null;
  width_in?: number | null;
  height_in?: number | null;
  depth_in?: number | null;
  diameter_in?: number | null;
  weight_lb?: number | null;
}

export type UnitSpecMap = Record<string, UnitSpec>;

export async function loadUnitSpecs(roomId?: string | null, projectId?: string | null): Promise<UnitSpecMap> {
  const data = await loadToolData(UNIT_SPECS_TOOL, roomId, projectId);
  const specs = (data as any)?.specs;
  return specs && typeof specs === "object" ? (specs as UnitSpecMap) : {};
}

/**
 * A unit that is a real catalog product (a library pick), as opposed to a generic
 * placeholder ("Generic", or a scope import's descriptive name). Anything a tool
 * holds as a real product is worth sharing with the tools that still have it generic.
 */
export function isLibraryProduct(d: any): boolean {
  return !!(
    meaningfulMfr(d?.mfr) || d?.productId || d?.libraryProductId || d?.orgLibraryId
    || String(d?.productKey ?? "").startsWith("p:")
  );
}

/**
 * What Edit Equipment should save. Retyping the maker or model of a unit that is
 * tied to a library product makes it a different product, so it lets go of that
 * product's identity (its id and grouping key). Left in place, the stale key made
 * the BOM treat it as the library product it used to be — a "110" Display" that
 * was really the 98" product's id, counted together with a genuine 98" display.
 */
export function identityAfterEdit<T extends object>(before: any, after: T): T {
  if (!before) return after;
  const a: any = after;
  const changed = String(before.mfr ?? "") !== String(a.mfr ?? "") || String(before.model ?? "") !== String(a.model ?? "");
  const tied = !!(a.productId || a.libraryProductId || a.orgLibraryId || String(a.productKey ?? "").startsWith("p:"));
  if (!changed || !tied) return after;
  return { ...a, productId: undefined, libraryProductId: undefined, orgLibraryId: undefined, productKey: undefined };
}

/** Several units at once — one read-modify-write, so parallel saves can't drop each other. */
export async function saveUnitSpecs(entries: Array<[string, UnitSpec]>, roomId?: string | null, projectId?: string | null): Promise<void> {
  if (entries.length === 0) return;
  const specs = await loadUnitSpecs(roomId, projectId);
  for (const [itemId, spec] of entries) specs[itemId] = { ...(specs[itemId] || {}), ...spec };
  await saveToolData(UNIT_SPECS_TOOL, { specs }, roomId, projectId);
}

/** Merges `spec` into whatever is already recorded for the unit (a later change wins per field). */
export async function saveUnitSpec(itemId: string, spec: UnitSpec, roomId?: string | null, projectId?: string | null): Promise<void> {
  const specs = await loadUnitSpecs(roomId, projectId);
  specs[itemId] = { ...(specs[itemId] || {}), ...spec };
  await saveToolData(UNIT_SPECS_TOOL, { specs }, roomId, projectId);
}

/**
 * Only what an edit actually changed. Recording every field would let a stale
 * copy of the unit in one tool overwrite a real change made in another (a price
 * typed in Signal Flow, then an unrelated edit in Room Designer). A field the
 * edit removed comes back as null, which clears it everywhere.
 */
export function diffSpec(before: UnitSpec, after: UnitSpec): UnitSpec {
  const changes: any = {};
  const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  for (const key of Object.keys(after) as Array<keyof UnitSpec>) {
    if (!same(before[key], after[key])) changes[key] = after[key] ?? null;
  }
  for (const key of Object.keys(before) as Array<keyof UnitSpec>) {
    if (!(key in after) && before[key] != null) changes[key] = null;
  }
  return changes;
}

export async function removeUnitSpecs(itemIds: string[], roomId?: string | null, projectId?: string | null): Promise<void> {
  const specs = await loadUnitSpecs(roomId, projectId);
  let changed = false;
  for (const id of itemIds) if (id in specs) { delete specs[id]; changed = true; }
  if (changed) await saveToolData(UNIT_SPECS_TOOL, { specs }, roomId, projectId);
}

// --- Per-tool field mapping -------------------------------------------------

/** Copy `spec[k]` onto `target[k]` for every key the spec actually carries. */
function assign(target: any, mapping: Array<[keyof UnitSpec, string]>, spec: UnitSpec) {
  for (const [from, to] of mapping) {
    if (!(from in spec)) continue;
    const value = (spec as any)[from];
    // a null ports list means "no change to ports" — an empty one is a real (empty) list
    if (from === "ports") { if (Array.isArray(value)) target[to] = stripPortIds(value); continue; }
    target[to] = value ?? undefined;
  }
}
/** A port list as a spec carries it: no tool-local ids, no shared references. */
function stripPortIds(ports: any[]): SpecPort[] {
  return ports.map(({ id: _id, ...rest }) => ({ ...rest }) as SpecPort);
}
function read(source: any, mapping: Array<[keyof UnitSpec, string]>): UnitSpec {
  const out: any = {};
  for (const [from, to] of mapping) if (source[to] !== undefined) out[from] = source[to] ?? null;
  if (Array.isArray(out.ports)) out.ports = stripPortIds(out.ports);
  return out;
}

const SHARED_SNAKE: Array<[keyof UnitSpec, string]> = [
  ["ports", "ports"], ["mfr", "mfr"], ["model", "model"], ["cat", "cat"], ["price", "price"], ["part_number", "part_number"],
  ["msrp", "msrp"], ["cost", "cost"], ["margin", "margin"], ["markup", "markup"],
  ["productId", "productId"], ["productKey", "productKey"],
  ["amp_draw", "amp_draw"], ["voltage", "voltage"], ["power_watts", "power_watts"], ["btu_hr", "btu_hr"],
  ["rack_units", "rack_units"], ["rack_ear_included", "rack_ear_included"],
  ["width_in", "width_in"], ["height_in", "height_in"], ["depth_in", "depth_in"], ["diameter_in", "diameter_in"], ["weight_lb", "weight_lb"],
];

const RACK_FIELDS: Array<[keyof UnitSpec, string]> = [
  ["ports", "ports"], ["mfr", "mfr"], ["model", "model"], ["cat", "cat"], ["price", "price"], ["part_number", "partNumber"],
  ["msrp", "msrp"], ["cost", "cost"], ["margin", "margin"], ["markup", "markup"],
  ["productId", "productId"], ["productKey", "productKey"],
  ["amp_draw", "ampDraw"], ["voltage", "voltage"], ["power_watts", "powerWatts"], ["btu_hr", "btuHr"],
  ["rack_units", "ru"], ["rack_ear_included", "rackEarIncluded"],
  ["width_in", "widthIn"], ["height_in", "heightIn"], ["depth_in", "depthIn"], ["diameter_in", "diameterIn"], ["weight_lb", "weightLb"],
];

/** Room Designer device: description is `name`. */
export function specFromRoomDevice(d: any): UnitSpec {
  return { ...read(d, SHARED_SNAKE), description: d.name ?? null };
}
export function applySpecToRoomDevice<T extends object>(d: T, spec: UnitSpec): T {
  const out: any = { ...d };
  assign(out, SHARED_SNAKE, spec);
  if ("description" in spec && spec.description) out.name = spec.description;
  return out;
}

/** Signal Flow block: description is `type`. */
export function specFromSignalFlowDevice(d: any): UnitSpec {
  return { ...read(d, SHARED_SNAKE), description: d.type ?? null };
}
/**
 * A new port list for a Signal Flow block. A port that matches an existing one
 * (same side and label) keeps its id, and so its cables; the rest get fresh ids.
 * `removedIds` are the old ports that no longer exist — cables on them go.
 * `expand` is Signal Flow's own grouping ("HDMI 1-2" -> two ports).
 */
export function mergeSignalFlowPorts(
  d: any, newPorts: SpecPort[], expand?: (ports: any[]) => any[],
): { ports: any[]; removedIds: any[] } {
  const key = (p: any) => `${p.side}|${String(p.label ?? "").trim().toLowerCase()}`;
  const oldByKey = new Map<string, any[]>();
  for (const p of d.ports || []) {
    const list = oldByKey.get(key(p)) || [];
    list.push(p);
    oldByKey.set(key(p), list);
  }
  const fresh = expand ? expand(newPorts) : newPorts;
  const stamp = Date.now().toString(36);
  const kept = new Set<any>();
  const ports = fresh.map((p: any, i: number) => {
    const old = oldByKey.get(key(p))?.shift();
    const id = old?.id ?? `${d.id}-sync-${stamp}-${i}`;
    kept.add(id);
    return { ...p, id };
  });
  const removedIds = (d.ports || []).map((p: any) => p.id).filter((id: any) => !kept.has(id));
  return { ports, removedIds };
}

/** Ids of the block's ports that applying `spec` would remove (so their cables can go too). */
export function signalFlowPortsRemovedBySpec(d: any, spec: UnitSpec, expand?: (ports: any[]) => any[]): any[] {
  return Array.isArray(spec.ports) ? mergeSignalFlowPorts(d, spec.ports, expand).removedIds : [];
}

export function applySpecToSignalFlowDevice<T extends object>(d: T, spec: UnitSpec, expand?: (ports: any[]) => any[]): T {
  const out: any = { ...d };
  assign(out, SHARED_SNAKE.filter(([k]) => k !== "ports"), spec);
  if (Array.isArray(spec.ports)) out.ports = mergeSignalFlowPorts(d, spec.ports, expand).ports;
  if ("description" in spec && spec.description) out.type = spec.description;
  return out;
}

/**
 * Rack row: its label is `name` — "Maker Model" for a real product, else the
 * description — and the description itself is kept in `notes`.
 */
export function specFromRackItem(i: any): UnitSpec {
  const spec = read(i, RACK_FIELDS);
  const isRealProduct = !!(meaningfulMfr(i.mfr) || meaningfulModel(i.model));
  spec.description = i.notes ?? (isRealProduct ? null : i.name ?? null);
  return spec;
}
export function applySpecToRackItem<T extends object>(i: T, spec: UnitSpec): T {
  const out: any = { ...i };
  assign(out, RACK_FIELDS, spec);
  if ("description" in spec && spec.description) out.notes = spec.description;
  const mfr = "mfr" in spec ? spec.mfr : out.mfr;
  const model = "model" in spec ? spec.model : out.model;
  out.name = displayNameOf({ mfr, model, name: out.notes ?? out.name });
  return out;
}

/** The BOM entry equivalents (its own field names). */
export function applySpecToBOMEntry<T extends { name: string; mfr?: string; model?: string; description?: string; cat?: string; listPrice?: number; partNumber?: string; productKey?: string }>(e: T, spec: UnitSpec): T {
  const out: any = { ...e };
  if ("mfr" in spec) out.mfr = spec.mfr || undefined;
  if ("model" in spec) out.model = spec.model || undefined;
  if ("description" in spec && spec.description) out.description = spec.description;
  if ("cat" in spec && spec.cat) out.cat = spec.cat;
  if ("price" in spec) out.listPrice = spec.price || 0;
  if ("part_number" in spec) out.partNumber = spec.part_number || undefined;
  out.name = displayNameOf({ mfr: out.mfr, model: out.model, name: out.description ?? e.name });
  // A swap to another product changes what the row is grouped by; a spec that carries no key
  // (a hand-typed replacement) means "no longer that product", so it is worked out afresh.
  if ("productKey" in spec) out.productKey = spec.productKey || productKeyOf({ mfr: out.mfr, model: out.model, name: out.name });
  return out;
}
