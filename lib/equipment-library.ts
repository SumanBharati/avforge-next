import { supabase } from "@/lib/supabase";
import { rankByFuzzyMatch, sanitizeIlikeWord } from "@/lib/fuzzy-search";

export interface OrgEquipmentItem {
  id: string;
  org_id: string;
  user_id: string;
  category: string;
  manufacturer: string;
  model: string;
  description: string;
  unit_cost: number;
  part_number: string | null;
  msrp: number | null;
  cost: number | null;
  color: string | null;
  ports: Array<{ side: string; signal: string; dir: string; label: string; connector?: string }>;
  amp_draw: number | null;
  voltage: number | null;
  power_watts: number | null;
  btu_hr: number | null;
  rack_mounted: boolean;
  rack_units: number | null;
  width_in: number | null;
  height_in: number | null;
  depth_in: number | null;
  weight_lb: number | null;
}

const SEARCHABLE_LIBRARY_COLUMNS = ["manufacturer", "model", "category", "part_number", "description"];

// Fuzzy, multi-field search across Manufacturer, Model, Category, Part number,
// and Description. See searchProducts (lib/av-products.ts) for the same
// broaden-then-rank approach applied to the org's own equipment library.
export async function searchOrgLibrary(query: string, orgId: string, limit = 30): Promise<OrgEquipmentItem[]> {
  const trimmed = query.trim();
  if (!trimmed || !orgId) return [];
  const words = trimmed.split(/\s+/).map(sanitizeIlikeWord).filter(Boolean);
  if (words.length === 0) return [];

  const orFilter = words
    .flatMap((w) => SEARCHABLE_LIBRARY_COLUMNS.map((col) => `${col}.ilike.%${w}%`))
    .join(",");
  const { data, error } = await supabase.from("equipment_library").select("*").eq("org_id", orgId).or(orFilter).limit(500);
  if (error) throw error;
  let candidates = data ?? [];

  if (candidates.length < 5) {
    const { data: broad, error: broadError } = await supabase.from("equipment_library").select("*").eq("org_id", orgId).limit(500);
    if (broadError) throw broadError;
    const seen = new Set(candidates.map((c: any) => c.id));
    for (const row of broad ?? []) if (!seen.has(row.id)) candidates.push(row);
  }

  return rankByFuzzyMatch(trimmed, candidates, (i: any) => [
    i.manufacturer, i.model, i.category, i.part_number, i.description,
  ], limit);
}

export async function getOrgLibraryItemById(id: string): Promise<OrgEquipmentItem | null> {
  const { data, error } = await supabase
    .from("equipment_library")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

// For the PoE Budget calculator's device picker. equipment_library has no
// PoE-specific field yet (unlike av_products' power_supply_type), so a known
// wattage is the best available signal — a future database improvement should
// add real PoE tagging here too.
export async function getOrgPoeItems(orgId: string): Promise<OrgEquipmentItem[]> {
  if (!orgId) return [];
  const { data, error } = await supabase
    .from("equipment_library")
    .select("*")
    .eq("org_id", orgId)
    .not("power_watts", "is", null)
    .order("manufacturer")
    .order("model");
  if (error) throw error;
  return data ?? [];
}
