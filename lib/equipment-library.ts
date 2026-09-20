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
  margin: number | null;
  markup: number | null;
  color: string | null;
  ports: Array<{ side: string; signal: string; dir: string; label: string; connector?: string }>;
  amp_draw: number | null;
  voltage: number | null;
  power_watts: number | null;
  btu_hr: number | null;
  rack_mounted: boolean;
  rack_units: number | null;
  rack_ear_included: boolean | null;
  width_in: number | null;
  height_in: number | null;
  depth_in: number | null;
  weight_lb: number | null;
  // Cameras: lens field of view, in degrees.
  hfov_deg: number | null;
  vfov_deg: number | null;
  // Mics/speakers/sensors: the coverage footprint Room Designer can draw on
  // the floor plan — circular (diameter + optional cone angle) or
  // rectangular (W x D). Diameter (not radius) matches how manufacturers
  // publish ceiling mic/speaker coverage specs, and Room Designer's own
  // existing covDiameter convention.
  coverage_pattern: "circular" | "rectangular" | null;
  coverage_diameter_ft: number | null;
  coverage_angle_deg: number | null;
  coverage_width_ft: number | null;
  coverage_depth_ft: number | null;
  // Physical diameter of a round unit, in inches (migration 025). Optional so
  // everything still compiles and runs against a database that doesn't have
  // the column yet — it is only ever sent when it has a value.
  diameter_in?: number | null;
}

const SEARCHABLE_LIBRARY_COLUMNS = ["manufacturer", "model", "part_number"];

// Fuzzy search restricted to Manufacturer, Model, and Part Number only —
// deliberately excludes Category/Description, which used to pull in every
// item in a broad category (e.g. searching "camera" surfacing unrelated
// makes/models just because their category field said "Camera"). See
// searchProducts (lib/av-products.ts) for the same broaden-then-rank approach
// applied to the global product library.
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
    i.manufacturer, i.model, i.part_number,
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
