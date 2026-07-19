import { supabase } from "@/lib/supabase";

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
  ports: Array<{ side: string; signal: string; dir: string; label: string }>;
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

export async function searchProducts(query: string, limit = 30): Promise<AVProduct[]> {
  if (!query.trim()) return [];
  const q = query.trim();
  const { data, error } = await supabase
    .from("av_products")
    .select("*")
    .or(`type.ilike.%${q}%,manufacturer.ilike.%${q}%,model_name.ilike.%${q}%,category.ilike.%${q}%`)
    .order("manufacturer")
    .order("type")
    .limit(limit);
  if (error) throw error;
  return data ?? [];
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

export async function getProductCount(): Promise<number> {
  const { count } = await supabase
    .from("av_products")
    .select("*", { count: "exact", head: true });
  return count ?? 0;
}
