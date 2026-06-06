import { supabase } from "./supabase";

export async function loadToolData(tool: string, roomId?: string | null): Promise<Record<string, unknown> | null> {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const projectId = params.get("project");
  if (!projectId) return null;

  const rid = roomId || params.get("room") || "default";
  const { data } = await supabase
    .from("tool_data")
    .select("data")
    .eq("project_id", projectId)
    .eq("tool", tool)
    .eq("room_id", rid)
    .single();

  return data?.data as Record<string, unknown> | null;
}

export async function saveToolData(tool: string, payload: unknown, roomId?: string | null): Promise<void> {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const projectId = params.get("project");
  if (!projectId) return;

  const rid = roomId || params.get("room") || "default";
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from("tool_data")
    .select("id")
    .eq("project_id", projectId)
    .eq("tool", tool)
    .eq("room_id", rid)
    .single();

  if (existing) {
    await supabase.from("tool_data")
      .update({ data: payload, updated_at: new Date().toISOString() })
      .eq("project_id", projectId)
      .eq("tool", tool)
      .eq("room_id", rid);
  } else {
    await supabase.from("tool_data")
      .insert({ project_id: projectId, user_id: user.id, tool, room_id: rid, data: payload });
  }
}
