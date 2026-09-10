import { supabase } from "@/lib/supabase";
import { rankByFuzzyMatch, sanitizeIlikeWord } from "@/lib/fuzzy-search";

export interface AVProduct {
  id: string;
  manufacturer: string;
  model_name: string;
  category: string;
  type: string;
  price: number;
  part_number: string | null;
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
}

const SEARCHABLE_PRODUCT_COLUMNS = ["manufacturer", "model_name", "category", "part_number", "type", "notes"];

// Fuzzy, multi-field search: matches on Manufacturer, Model, Category, Part
// number, and Description (the "notes" column) — not just exact model numbers.
// A broad ILIKE fetch first gathers candidates (any word matching any field),
// with a fallback to a larger unfiltered pool when that finds too few, then
// results are ranked by close-match relevance so near-misses (typos, partial
// numbers, words in a different order) still surface.
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
    p.manufacturer, p.model_name, p.category, p.part_number, p.type, p.notes,
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

export async function upsertProducts(
  products: Omit<AVProduct, "id">[]
): Promise<{ count: number; error?: string }> {
  if (products.length === 0) return { count: 0 };
  const { data, error } = await supabase
    .from("av_products")
    .upsert(products, { onConflict: "manufacturer,model_name" })
    .select("id");
  if (error) return { count: 0, error: error.message };
  return { count: data?.length ?? 0 };
}

export async function deleteProduct(id: string): Promise<void> {
  await supabase.from("av_products").delete().eq("id", id);
}

export async function updateProduct(id: string, patch: Partial<Omit<AVProduct, "id">>): Promise<{ error?: string }> {
  const { error } = await supabase.from("av_products").update(patch).eq("id", id);
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
  query = query.order("manufacturer").order("model_name").range(offset, offset + limit - 1);

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
