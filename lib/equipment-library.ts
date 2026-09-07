import { supabase } from "@/lib/supabase";

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
  ports: Array<{ side: string; signal: string; dir: string; label: string }>;
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

export async function searchOrgLibrary(query: string, orgId: string, limit = 30): Promise<OrgEquipmentItem[]> {
  if (!query.trim() || !orgId) return [];
  const words = query.trim().split(/\s+/);
  let q = supabase.from("equipment_library").select("*").eq("org_id", orgId);
  for (const w of words) {
    q = q.or(`manufacturer.ilike.%${w}%,model.ilike.%${w}%,description.ilike.%${w}%,category.ilike.%${w}%`);
  }
  const { data, error } = await q.order("manufacturer").order("model").limit(limit);
  if (error) throw error;
  return data ?? [];
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
