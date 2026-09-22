import { supabase } from "@/lib/supabase";
import { rankByFuzzyMatch, sanitizeIlikeWord, diceCoefficient } from "@/lib/fuzzy-search";
import type { EquipmentFormValue } from "@/components/EquipmentFormModal";

/** One component of a Kit product — see AVProduct.kit_items. */
export interface KitComponent {
  product_id: string;
  quantity: number;
}

export interface AVProduct {
  id: string;
  manufacturer: string;
  model_name: string;
  category: string;
  type: string;
  price: number;
  part_number: string | null;
  updated_at: string;
  msrp: number | null;
  cost: number | null;
  margin: number | null;
  markup: number | null;
  color: string;
  ports: Array<{ side: string; signal: string; dir: string; label: string; connector?: string }>;
  // Power & electrical
  amp_draw: number | null;
  voltage: number | null;
  power_watts: number | null;
  btu_hr: number | null;
  // Physical / rack
  rack_mounted: boolean;
  rack_units: number | null;
  width_in: number | null;
  height_in: number | null;
  depth_in: number | null;
  diameter_in: number | null;
  weight_lb: number | null;
  rack_mountable_detail: string | null;
  rack_ear_included: boolean | null;
  rack_ear_detail: string | null;
  shelf_required: boolean | null;
  shelf_requirement: string | null;
  voltage_detail: string | null;
  current_detail: string | null;
  power_supply_type: string | null;
  notes: string | null;
  // Room Designer placement properties
  rd_type: string | null;       // display | camera | mic | speaker | control
  rd_wall: string | null;       // front | ceiling | floor | table | side
  rd_width_ft: number | null;   // physical width in feet for floor-plan canvas
  rd_height_ft: number | null;  // physical height/depth in feet
  rd_icon: string | null;       // icon identifier: monitor | confbar | soundbar | emoji
  // Cameras: lens field of view, in degrees.
  hfov_deg: number | null;
  vfov_deg: number | null;
  // Mics/speakers/sensors: coverage footprint Room Designer draws on the
  // floor plan — circular (diameter + optional cone angle) or rectangular
  // (W x D). See equipment_library's identical fields for the full rationale.
  coverage_pattern: "circular" | "rectangular" | null;
  coverage_diameter_ft: number | null;
  coverage_angle_deg: number | null;
  coverage_width_ft: number | null;
  coverage_depth_ft: number | null;
  // A bundle SKU sold as separate physical parts (e.g. a Tap + a Cat5e kit +
  // a Cat5e-to-USB adapter, all under one Logitech part number) — each entry
  // is another av_products row's id + how many ship in the bundle. Empty
  // means this is an ordinary, non-kit product. See migration 028.
  kit_items: KitComponent[];
}

const SEARCHABLE_PRODUCT_COLUMNS = ["manufacturer", "model_name", "part_number"];

// Fuzzy search restricted to Manufacturer, Model, and Part Number only —
// deliberately excludes Category/Type/Notes, which used to pull in every
// product in a broad category (e.g. searching "camera" surfacing unrelated
// makes/models just because their category field said "Camera"). A broad
// ILIKE fetch first gathers candidates (any word matching any of those three
// fields), with a fallback to a larger unfiltered pool when that finds too
// few, then results are ranked by close-match relevance so near-misses
// (typos, partial part numbers, words in a different order) still surface.
export async function searchProducts(query: string, limit = 30): Promise<AVProduct[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const words = trimmed.split(/\s+/).map(sanitizeIlikeWord).filter(Boolean);
  if (words.length === 0) return [];

  const orFilter = words
    .flatMap((w) => SEARCHABLE_PRODUCT_COLUMNS.map((col) => `${col}.ilike.%${w}%`))
    .join(",");
  const { data, error } = await supabase.from("av_products").select("*").or(orFilter).limit(500);
  if (error) throw error;
  let candidates = data ?? [];

  // No word matched any field as a literal substring anywhere (e.g. every word
  // has a typo) — widen to a general pool so fuzzy scoring still has a chance.
  if (candidates.length < 5) {
    const { data: broad, error: broadError } = await supabase.from("av_products").select("*").limit(500);
    if (broadError) throw broadError;
    const seen = new Set(candidates.map((c: any) => c.id));
    for (const row of broad ?? []) if (!seen.has(row.id)) candidates.push(row);
  }

  return rankByFuzzyMatch(trimmed, candidates, (p: any) => [
    p.manufacturer, p.model_name, p.part_number,
  ], limit);
}

export async function getProductById(id: string): Promise<AVProduct | null> {
  const { data, error } = await supabase
    .from("av_products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

// Resolves a Kit's component ids (kit_items[].product_id) back to full
// product rows — used both by the Library's Kit editor (to show what a kit
// already contains) and by the "expand a Kit into its parts" add-to-canvas
// flow in Signal Flow, Room Designer, and Rack Builder. A component id that
// no longer exists (its product was deleted from the library) is silently
// left out rather than throwing — the kit just expands to whatever parts
// still exist.
export async function getProductsByIds(ids: string[]): Promise<AVProduct[]> {
  const unique = Array.from(new Set(ids)).filter(Boolean);
  if (unique.length === 0) return [];
  const { data, error } = await supabase.from("av_products").select("*").in("id", unique);
  if (error) throw error;
  return data ?? [];
}

/** A kit that lists the product being checked as one of its own components. */
export interface ReferencingKit {
  id: string;
  manufacturer: string;
  model_name: string;
}

// Deleting a product that a Kit references would silently break that kit
// (kit_items keeps pointing at an id that no longer exists — see
// getProductsByIds above, which quietly drops missing components when
// expanding a kit onto a canvas). This is the other side of that: a
// hard-block check the Library's delete flow runs first, so a component
// can't be deleted out from under a kit at all — it has to be removed from
// every kit that uses it before it can be deleted. kit_items is JSONB, not a
// real foreign key, so this is a table scan rather than an indexed lookup;
// fine at the AVGenix Library's scale (hundreds, not millions, of rows).
export async function getKitsReferencingProduct(productId: string): Promise<ReferencingKit[]> {
  const { data, error } = await supabase.from("av_products").select("id, manufacturer, model_name, kit_items");
  if (error) throw error;
  return (data ?? [])
    .filter((p) => Array.isArray(p.kit_items) && p.kit_items.some((i) => i.product_id === productId))
    .map((p) => ({ id: p.id, manufacturer: p.manufacturer, model_name: p.model_name }));
}

/** An existing product whose model name is a close-but-not-exact match. */
export interface SimilarProductMatch {
  id: string;
  manufacturer: string;
  model_name: string;
  part_number: string | null;
  category: string;
  score: number;
}

// Migration 027's UNIQUE constraint only catches EXACT duplicates (same
// manufacturer/model/part number, case-insensitively) — it can't catch two
// products that are the same thing described slightly differently, e.g.
// "MIC POD CAT COUPLER" vs. "Mic Pod CAT Coupler Tx" (a Tx/Rx split of what
// was already one library entry). That's this function's job: full-string
// Dice-coefficient similarity between model names, scoped to the same
// manufacturer (comparing model text across unrelated manufacturers isn't
// meaningful). The threshold is deliberately high — favors precision over
// recall, since this backs a hard-block confirmation (see addEquipmentToLibrary
// and the Library's save flow): a false positive costs the user one extra
// click to say "it's different," but a threshold loose enough to flag
// legitimately distinct siblings would make the block itself the annoyance.
//
// Tested against the real library (602 products): plain text similarity at
// this threshold alone flagged 61 clusters, and most were false positives —
// AV catalogs are full of product FAMILIES that read as near-identical text
// but are different real SKUs (Extron "DTP CrossPoint 82/84/86 4K", Crestron
// "HD-TX-4KZ-101" vs "-111", QSC "PL-SUB12/15/18"...). Where both sides carry
// a real part number, that's a much stronger signal than the text ever can
// be: different part numbers means different products, full stop, no matter
// how similar the names read — so that case skips text similarity entirely.
// Text similarity is the fallback for when a part number isn't on file for
// one or both sides (adding 38 clusters back instead of 61) — still not
// perfect (a same-family sibling with no part number recorded can still
// trip it), but the "It's different — save anyway" override is one click
// either way, so a false positive here is minor friction, not a hard wall.
const SIMILAR_PRODUCT_THRESHOLD = 0.85;

function looksLikeSameProduct(a: { model_name: string; part_number: string | null }, b: { model_name: string; part_number: string | null }): boolean {
  const partA = (a.part_number || "").trim().toLowerCase();
  const partB = (b.part_number || "").trim().toLowerCase();
  if (partA && partB) return partA === partB;
  return diceCoefficient((a.model_name || "").trim().toLowerCase(), (b.model_name || "").trim().toLowerCase()) >= SIMILAR_PRODUCT_THRESHOLD;
}

export async function findSimilarProducts(manufacturer: string, model_name: string, part_number?: string | null, excludeId?: string): Promise<SimilarProductMatch[]> {
  const mfr = manufacturer.trim();
  const model = model_name.trim();
  if (!mfr || !model) return [];
  const { data, error } = await supabase
    .from("av_products")
    .select("id, manufacturer, model_name, part_number, category")
    .ilike("manufacturer", mfr);
  if (error) throw error;
  const candidate = { model_name: model, part_number: part_number ?? null };
  return (data ?? [])
    .filter((p) => p.id !== excludeId)
    .filter((p) => looksLikeSameProduct(candidate, p))
    .map((p) => ({ ...p, score: diceCoefficient(model.toLowerCase(), (p.model_name || "").trim().toLowerCase()) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

export interface DuplicateCluster {
  products: Array<{ id: string; manufacturer: string; model_name: string; part_number: string | null; category: string }>;
}

// One-time-ish sweep over the whole library for the Library's "Review
// Duplicates" panel — surfaces near-duplicate clusters already sitting in
// the data (unlike findSimilarProducts, which only runs at save time for
// one new/edited product). Grouped by manufacturer first to keep the
// pairwise comparison cheap, then union-find within each group so a chain
// of pairwise-similar products (A~B, B~C but not directly A~C) still lands
// in one cluster instead of splitting into overlapping pairs.
export async function findLibraryDuplicateClusters(): Promise<DuplicateCluster[]> {
  const { data, error } = await supabase.from("av_products").select("id, manufacturer, model_name, part_number, category");
  if (error) throw error;
  const byMfr = new Map<string, NonNullable<typeof data>>();
  for (const p of data ?? []) {
    const key = (p.manufacturer || "").trim().toLowerCase();
    const list = byMfr.get(key) || [];
    list.push(p);
    byMfr.set(key, list);
  }

  const clusters: DuplicateCluster[] = [];
  for (const group of byMfr.values()) {
    if (group.length < 2) continue;
    const parent = group.map((_, i) => i);
    const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    const union = (a: number, b: number) => {
      const ra = find(a), rb = find(b);
      if (ra !== rb) parent[ra] = rb;
    };
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (looksLikeSameProduct(group[i], group[j])) union(i, j);
      }
    }
    const byRoot = new Map<number, number[]>();
    for (let i = 0; i < group.length; i++) {
      const list = byRoot.get(find(i)) || [];
      list.push(i);
      byRoot.set(find(i), list);
    }
    for (const idxs of byRoot.values()) {
      if (idxs.length < 2) continue;
      clusters.push({ products: idxs.map((i) => group[i]) });
    }
  }
  return clusters;
}

// Columns a spreadsheet import doesn't carry: Room Designer placement, camera
// FOV and mic/speaker coverage. Leaving them out of an upsert payload leaves
// whatever the row already has, where sending null would wipe it.
export type ProductPlacementKey =
  | "rd_type" | "rd_wall" | "rd_width_ft" | "rd_height_ft" | "rd_icon"
  | "hfov_deg" | "vfov_deg"
  | "coverage_pattern" | "coverage_diameter_ft" | "coverage_angle_deg" | "coverage_width_ft" | "coverage_depth_ft"
  // A spreadsheet import doesn't define Kits — leaving kit_items out of the
  // upsert payload the same way, rather than sending [], means re-importing
  // a catalog never wipes out a kit an admin built by hand in the Library.
  | "kit_items";

/** A product as a spreadsheet import supplies it — everything but the placement columns. */
export type ProductImportRow = Omit<AVProduct, "id" | "updated_at" | ProductPlacementKey> & Partial<Pick<AVProduct, ProductPlacementKey>>;

export async function upsertProducts(
  products: ProductImportRow[]
): Promise<{ count: number; error?: string }> {
  if (products.length === 0) return { count: 0 };
  const { data, error } = await supabase
    .from("av_products")
    .upsert(products, { onConflict: "manufacturer_key,model_name_key,part_number_key" })
    .select("id");
  if (error) return { count: 0, error: error.message };
  return { count: data?.length ?? 0 };
}

// manufacturer_key/model_name_key/part_number_key (migration 027) are
// GENERATED ALWAYS columns Postgres computes from manufacturer/model_name/
// part_number — it rejects any insert/update that writes to them directly.
// A product loaded via select("*") carries them at runtime even though
// AVProduct doesn't declare them, so a caller that spreads a loaded row
// (e.g. the Library's edit form, or a future "duplicate product" feature)
// would otherwise forward them straight back into the request. Strip them
// here so no caller has to know.
const GENERATED_PRODUCT_COLUMNS = ["manufacturer_key", "model_name_key", "part_number_key"] as const;

export async function createProduct(product: Omit<AVProduct, "id" | "updated_at">): Promise<{ id?: string; error?: string }> {
  const cleanProduct: Record<string, unknown> = { ...product };
  for (const key of GENERATED_PRODUCT_COLUMNS) delete cleanProduct[key];
  const { data, error } = await supabase.from("av_products").insert(cleanProduct).select("id").single();
  if (error) return { error: error.message };
  return { id: data?.id };
}

// Promotes a device/rack item placed in Signal Flow, Room Designer, or Rack
// Builder into the shared AVGenix Library — the "Add to AVGenix Library"
// right-click action on those canvases. Every one of those tools already
// converts its own item shape to/from the same EquipmentFormValue used by
// the library's own edit form (see each page's deviceToFormValue /
// rackItemToFormValue), so that's the one shape this needs to accept.
//
// "Already exists" is decided on all three of manufacturer, model, and part
// number — case-insensitively, so "Extron DTP" and "extron dtp" count as the
// same product — via the generated-column UNIQUE constraint from migration
// 027. Two entries with the same manufacturer/model but a different part
// number (a regional SKU, a hardware revision) are different products and
// both get added.
export async function addEquipmentToLibrary(
  v: EquipmentFormValue,
  opts?: { force?: boolean }
): Promise<{ status: "added" | "exists" | "similar" | "error"; error?: string; matches?: SimilarProductMatch[] }> {
  const manufacturer = v.manufacturer.trim();
  const model_name = v.model.trim();
  if (!manufacturer || !model_name) {
    return { status: "error", error: "Add a manufacturer and model before adding this to the AVGenix Library." };
  }

  // Hard-block: a near-duplicate (not an exact one — that's the DB
  // constraint's job) needs an explicit "it's different" before this
  // proceeds. See findSimilarProducts for why the threshold is strict.
  if (!opts?.force) {
    const matches = await findSimilarProducts(manufacturer, model_name, v.partNumber);
    if (matches.length > 0) return { status: "similar", matches };
  }

  const { error } = await createProduct({
    manufacturer,
    model_name,
    category: v.category || "Other",
    type: v.notes || "",
    price: v.unitCost || v.cost || v.msrp || 0,
    part_number: v.partNumber,
    msrp: v.msrp,
    cost: v.cost,
    margin: v.margin,
    markup: v.markup,
    color: "#64748b",
    ports: v.ports,
    amp_draw: v.ampDraw,
    voltage: v.voltage,
    power_watts: v.powerWatts,
    btu_hr: v.btuHr,
    rack_mounted: v.rackMounted,
    rack_units: v.rackUnits,
    width_in: v.widthIn,
    height_in: v.heightIn,
    depth_in: v.depthIn,
    diameter_in: v.diameterIn ?? null,
    weight_lb: v.weightLb,
    rack_mountable_detail: null,
    rack_ear_included: v.rackEarsIncluded,
    rack_ear_detail: null,
    shelf_required: null,
    shelf_requirement: null,
    voltage_detail: null,
    current_detail: null,
    power_supply_type: null,
    notes: null,
    rd_type: null,
    rd_wall: null,
    rd_width_ft: null,
    rd_height_ft: null,
    rd_icon: null,
    hfov_deg: v.hfovDeg,
    vfov_deg: v.vfovDeg,
    coverage_pattern: v.coveragePattern,
    coverage_diameter_ft: v.coverageDiameterFt,
    coverage_angle_deg: v.coverageAngleDeg,
    coverage_width_ft: v.coverageWidthFt,
    coverage_depth_ft: v.coverageDepthFt,
    kit_items: [],
  });

  if (error) {
    if (/duplicate key value/i.test(error)) return { status: "exists" };
    return { status: "error", error };
  }
  return { status: "added" };
}

// Wraps addEquipmentToLibrary's "similar" hard-block into a single call: on
// a near-duplicate, asks the caller-supplied confirmer (a window.confirm in
// each canvas tool's right-click handler, since this only ever runs from a
// one-click context-menu action, not an open form) whether to proceed, then
// retries with force once confirmed. Declining short-circuits to "cancelled"
// without ever creating the product.
export async function addEquipmentToLibraryConfirmed(
  v: EquipmentFormValue,
  confirmSimilar: (matches: SimilarProductMatch[]) => boolean
): Promise<{ status: "added" | "exists" | "cancelled" | "error"; error?: string }> {
  const first = await addEquipmentToLibrary(v);
  if (first.status === "similar") {
    if (!confirmSimilar(first.matches || [])) return { status: "cancelled" };
    const forced = await addEquipmentToLibrary(v, { force: true });
    return { status: forced.status === "similar" ? "error" : forced.status, error: forced.error };
  }
  return { status: first.status, error: first.error };
}

export async function deleteProduct(id: string): Promise<void> {
  await supabase.from("av_products").delete().eq("id", id);
}

export async function updateProduct(id: string, patch: Partial<Omit<AVProduct, "id" | "updated_at">>): Promise<{ error?: string }> {
  const cleanPatch: Record<string, unknown> = { ...patch };
  for (const key of GENERATED_PRODUCT_COLUMNS) delete cleanPatch[key];
  const { error } = await supabase.from("av_products").update(cleanPatch).eq("id", id);
  return error ? { error: error.message } : {};
}

export async function getProductCount(): Promise<number> {
  const { count } = await supabase
    .from("av_products")
    .select("*", { count: "exact", head: true });
  return count ?? 0;
}

// Products flagged as PoE-powered in power_supply_type (e.g. "PoE+ (IEEE 802.3at)"),
// for the PoE Budget calculator's device picker. power_supply_type is free text
// entered per product, not a dedicated PoE-class field yet — that's a future
// database improvement — so this is a best-effort filter/classification on it.
export async function getPoeProducts(): Promise<AVProduct[]> {
  const { data, error } = await supabase
    .from("av_products")
    .select("*")
    .not("power_watts", "is", null)
    .ilike("power_supply_type", "%poe%")
    .order("manufacturer")
    .order("model_name");
  if (error) throw error;
  return data ?? [];
}

export async function listProducts(opts: {
  search?: string;
  category?: string;
  manufacturer?: string;
  offset?: number;
  limit?: number;
  sortBy?: "updated_at";
  sortDir?: "asc" | "desc";
}): Promise<{ data: AVProduct[]; count: number }> {
  let query = supabase.from("av_products").select("*", { count: "exact" });

  const q = opts.search?.trim();
  if (q) {
    query = query.or(
      `manufacturer.ilike.%${q}%,model_name.ilike.%${q}%,type.ilike.%${q}%,category.ilike.%${q}%,part_number.ilike.%${q}%`
    );
  }
  if (opts.category) query = query.eq("category", opts.category);
  if (opts.manufacturer) query = query.eq("manufacturer", opts.manufacturer);

  const offset = opts.offset ?? 0;
  const limit = opts.limit ?? 40;
  if (opts.sortBy === "updated_at") {
    query = query.order("updated_at", { ascending: opts.sortDir !== "desc" });
  } else {
    query = query.order("manufacturer").order("model_name");
  }
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function getFilterOptions(): Promise<{ categories: string[]; manufacturers: string[] }> {
  const { data, error } = await supabase.from("av_products").select("category, manufacturer");
  if (error) throw error;
  const categories = Array.from(new Set((data ?? []).map((r) => r.category).filter(Boolean))).sort();
  const manufacturers = Array.from(new Set((data ?? []).map((r) => r.manufacturer).filter(Boolean))).sort();
  return { categories, manufacturers };
}
