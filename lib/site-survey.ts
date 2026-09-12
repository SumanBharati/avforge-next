import { supabase } from "@/lib/supabase";

export interface SurveyRoom {
  id: string;
  name: string;
  data: Record<string, string>;
}

interface SurveyBuilding {
  id: string;
  name: string;
  data: Record<string, string>;
  rooms: SurveyRoom[];
}

interface SurveyState {
  buildings: SurveyBuilding[];
}

// Creates a new room in a project's site survey (in its first building,
// creating a default building — and the survey row itself — if the project
// has never had a site survey at all). This is the exact same JSONB
// structure the Site Survey page itself edits, so a room created here shows
// up there, in the Design Engineering sidebar, and in every tool's room
// picker exactly as if it had been added from Site Survey — the whole point
// being that a space with no site survey done yet doesn't block starting
// design work.
export async function createSurveyRoom(projectId: string, roomName?: string): Promise<{ room: SurveyRoom } | { error: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { data: existing, error: fetchError } = await supabase
    .from("site_surveys").select("data").eq("project_id", projectId).maybeSingle();
  if (fetchError) return { error: fetchError.message };

  let survey = (existing?.data as SurveyState) || { buildings: [] };
  if (!survey.buildings || survey.buildings.length === 0) {
    survey = { buildings: [{ id: crypto.randomUUID(), name: "Site", data: {}, rooms: [] }] };
  }
  const building = survey.buildings[0];
  const room: SurveyRoom = { id: crypto.randomUUID(), name: roomName?.trim() || `Room ${building.rooms.length + 1}`, data: {} };
  const nextSurvey: SurveyState = {
    ...survey,
    buildings: survey.buildings.map((b, i) => (i === 0 ? { ...b, rooms: [...b.rooms, room] } : b)),
  };

  const { error: saveError } = await supabase
    .from("site_surveys")
    .upsert({ project_id: projectId, user_id: user.id, data: nextSurvey }, { onConflict: "project_id" });
  if (saveError) return { error: saveError.message };

  return { room };
}

// Renames a room from outside Site Survey (e.g. the Design Engineering
// sidebar) — writes to the same `data.room_name` field Site Survey's own
// room-name input edits (see updateRoomField there), so a rename from either
// place is interchangeable rather than a parallel/conflicting name source.
// Searches every building, not just the first, since a room created via
// Site Survey itself could live in any of them.
export async function renameSurveyRoom(projectId: string, roomId: string, newName: string): Promise<{ ok: true } | { error: string }> {
  const trimmed = newName.trim();
  if (!trimmed) return { error: "Room name can't be empty" };

  const { data: existing, error: fetchError } = await supabase
    .from("site_surveys").select("data").eq("project_id", projectId).maybeSingle();
  if (fetchError) return { error: fetchError.message };
  const survey = (existing?.data as SurveyState) || { buildings: [] };

  const nextSurvey: SurveyState = {
    ...survey,
    buildings: survey.buildings.map((b) => ({
      ...b,
      rooms: b.rooms.map((r) => (r.id === roomId ? { ...r, name: trimmed, data: { ...r.data, room_name: trimmed } } : r)),
    })),
  };

  const { error: saveError } = await supabase.from("site_surveys").update({ data: nextSurvey }).eq("project_id", projectId);
  if (saveError) return { error: saveError.message };
  return { ok: true };
}

// Deletes a room from outside Site Survey. Matches Site Survey's own
// removeRoom exactly (just removes the room entry) — it doesn't cascade-clean
// the room's tool_data/room_designs rows either, so this doesn't either,
// rather than behaving differently depending on where the delete came from.
export async function deleteSurveyRoom(projectId: string, roomId: string): Promise<{ ok: true } | { error: string }> {
  const { data: existing, error: fetchError } = await supabase
    .from("site_surveys").select("data").eq("project_id", projectId).maybeSingle();
  if (fetchError) return { error: fetchError.message };
  const survey = (existing?.data as SurveyState) || { buildings: [] };

  const nextSurvey: SurveyState = {
    ...survey,
    buildings: survey.buildings.map((b) => ({ ...b, rooms: b.rooms.filter((r) => r.id !== roomId) })),
  };

  const { error: saveError } = await supabase.from("site_surveys").update({ data: nextSurvey }).eq("project_id", projectId);
  if (saveError) return { error: saveError.message };
  return { ok: true };
}
