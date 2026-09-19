// Cross-tool identity for a single physical piece of equipment.
//
// Room Designer, Signal Flow and Rack Builder each keep their own store with
// their own object shape. `itemId` is the one field that means the same thing
// in all three: one itemId === one physical unit the customer will buy. The
// BOM counts units by itemId, and the sync steps use it to decide what a tool
// is missing.
//
// The backfill for saves made before itemId existed is DETERMINISTIC on
// purpose. Each tool derives the same id from links that already existed (a
// Signal Flow block's roomDesignerUid IS the Room Designer device's uid), so
// whichever tool happens to load first, both arrive at the same answer and the
// unit merges instead of splitting into two BOM rows. That also makes the
// backfill safe to re-run, so correctness never depends on it being persisted.

export interface IdentityCarrier {
  itemId?: string | null;
  productKey?: string | null;
}

export function newItemId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `i-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// Collision-safe suffixing. Room Designer mints uids with a bare Date.now()
// (room-designer/page.tsx addDeviceToRoom), so two devices added in the same
// millisecond genuinely can share one. Suffixing by occurrence keeps the
// result deterministic where a fresh UUID would not be.
function uniquify(base: string, used: Set<string>): string {
  if (!used.has(base)) { used.add(base); return base; }
  let n = 2;
  while (used.has(`${base}#${n}`)) n++;
  const id = `${base}#${n}`;
  used.add(id);
  return id;
}

function collectExisting(lists: Array<Array<IdentityCarrier>>): Set<string> {
  const used = new Set<string>();
  lists.forEach(list => list.forEach(o => { if (o?.itemId) used.add(o.itemId); }));
  return used;
}

type BackfillResult<T> = { items: T[]; changed: boolean };

export function ensureRoomDeviceItemIds<T extends IdentityCarrier & { uid?: number }>(
  devices: T[],
): BackfillResult<T> {
  const used = collectExisting([devices]);
  let changed = false;
  const items = devices.map(d => {
    if (d.itemId) return d;
    changed = true;
    return { ...d, itemId: uniquify(d.uid != null ? `rd-${d.uid}` : `rd-${newItemId()}`, used) };
  });
  return { items, changed };
}

export function ensureSignalFlowItemIds<T extends IdentityCarrier & { id?: unknown; roomDesignerUid?: unknown }>(
  devices: T[],
): BackfillResult<T> {
  const used = collectExisting([devices]);
  let changed = false;
  const items = devices.map(d => {
    if (d.itemId) return d;
    changed = true;
    // A block imported from Room Designer must resolve to the SAME id the Room
    // Designer side derives from its own uid, or the unit splits in two.
    const base = d.roomDesignerUid != null
      ? `rd-${d.roomDesignerUid}`
      : d.id != null ? `sf-${d.id}` : `sf-${newItemId()}`;
    return { ...d, itemId: uniquify(base, used) };
  });
  return { items, changed };
}

export function ensureRackItemIds<T extends IdentityCarrier & { sourceDeviceId?: unknown; name?: string }>(
  items: T[],
  signalFlowDevices: Array<IdentityCarrier & { id?: unknown }>,
): BackfillResult<T> {
  const used = collectExisting([items]);
  const byDeviceId = new Map<string, string>();
  signalFlowDevices.forEach(d => {
    if (d.id != null && d.itemId) byDeviceId.set(String(d.id), d.itemId);
  });
  let changed = false;
  const out = items.map(it => {
    if (it.itemId) return it;
    changed = true;
    // Rack rows derived from a Signal Flow block adopt that block's identity —
    // they are the same unit seen from the rack elevation, not a new one.
    const fromSource = it.sourceDeviceId != null ? byDeviceId.get(String(it.sourceDeviceId)) : undefined;
    if (fromSource && !used.has(fromSource)) { used.add(fromSource); return { ...it, itemId: fromSource }; }
    const base = it.sourceDeviceId != null ? `sf-${it.sourceDeviceId}` : `rack-${slug(it.name || "item")}`;
    return { ...it, itemId: uniquify(base, used) };
  });
  return { items: out, changed };
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
}

// --- Product grouping -------------------------------------------------------
//
// `productKey` answers "are these the same model of thing", which is what the
// BOM groups rows by. It must be STAMPED at creation, never re-derived from the
// display name: the scope generator renames multi-quantity units to
// "<label> 1", "<label> 2", ... so deriving from the name would split four
// identical displays into four rows of one.

const GENERIC_MFRS = new Set(["", "generic", "—", "-"]);
const EMPTY_MODELS = new Set(["", "—", "-"]);

export function meaningfulMfr(v: unknown): string {
  const s = String(v ?? "").trim();
  return GENERIC_MFRS.has(s.toLowerCase()) ? "" : s;
}

export function meaningfulModel(v: unknown): string {
  const s = String(v ?? "").trim();
  return EMPTY_MODELS.has(s.toLowerCase()) ? "" : s;
}

export interface ProductLike {
  productKey?: string | null;
  productId?: string | null;
  libraryProductId?: string | null;
  orgLibraryId?: string | null;
  mfr?: unknown;
  model?: unknown;
  name?: unknown;
  type?: unknown;
}

export function productKeyOf(o: ProductLike): string {
  if (o.productKey) return o.productKey;
  const pid = o.productId || o.libraryProductId || o.orgLibraryId;
  if (pid) return `p:${pid}`;
  const mfr = meaningfulMfr(o.mfr), model = meaningfulModel(o.model);
  if (mfr || model) return `m:${mfr.toLowerCase()}|${model.toLowerCase()}`;
  return `n:${displayNameOf(o).toLowerCase()}`;
}

/** The label shown in the BOM and on a Signal Flow block. */
export function displayNameOf(o: ProductLike): string {
  const combined = [meaningfulMfr(o.mfr), meaningfulModel(o.model)].filter(Boolean).join(" ");
  if (combined) return combined;
  const fallback = String(o.name ?? o.type ?? "").trim();
  return fallback || "Unnamed";
}

// --- Rack applicability -----------------------------------------------------
//
// Split from the single `rackMounted` flag the tools used to share, which was
// doing double duty as both "this model lives in a rack" (a fact about the
// product) and "show it in the rack elevation" (the user's choice). Merging
// them meant auto-detection kept re-enabling something the user had just
// switched off.

export interface RackApplicabilityLike {
  rackMountedOverride?: boolean | null;
  rackApplicable?: boolean | null;
  rackMounted?: boolean | null;
  rack_mounted?: boolean | null;
  rackUnits?: number | null;
  rack_units?: number | null;
}

export function isRackApplicable(o: RackApplicabilityLike): boolean {
  if (typeof o.rackMountedOverride === "boolean") return o.rackMountedOverride;
  if (typeof o.rackApplicable === "boolean") return o.rackApplicable;
  if (o.rackMounted === true || o.rack_mounted === true) return true;
  const ru = Number(o.rackUnits ?? o.rack_units);
  return Number.isFinite(ru) && ru > 0;
}
