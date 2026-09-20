// Keeps one physical unit's existence in step across Room Designer, Signal Flow
// and the rack. A unit is identified by its itemId everywhere, so when one tool
// deletes it the others must stop carrying it too — otherwise the BOM (which
// unions all three) keeps billing for something the user has removed.
//
// This rewrites the OTHER tools' saved data. It is only ever called for a tool
// that isn't currently open, because a tool that is open owns its own store and
// would overwrite the change on its next autosave.

import { supabase } from "@/lib/supabase";
import { loadToolData, saveToolData } from "@/lib/tool-data";
import { loadScopeManifest, saveScopeManifest } from "@/lib/scope-manifest";
import { ensureRoomDeviceItemIds, ensureSignalFlowItemIds } from "@/lib/design-identity";
import { removeUnitSpecs } from "@/lib/unit-specs";
import type { BOMSource } from "@/lib/bom-context";

export async function retireUnitsInStores(
  itemIds: string[], caller: BOMSource, roomId: string, projectId: string,
): Promise<void> {
  const ids = new Set(itemIds.filter(Boolean));
  if (!ids.size) return;
  const hit = (d: any) => !!(d?.itemId && ids.has(d.itemId));
  const tasks: Promise<unknown>[] = [];

  if (caller !== "room-designer") {
    tasks.push((async () => {
      const { data: row } = await supabase.from("room_designs").select("data")
        .eq("project_id", projectId).eq("room_id", roomId).maybeSingle();
      const design = (row as any)?.data;
      if (!design || !Array.isArray(design.devices)) return;
      // Same deterministic backfill Room Designer applies on load, so a unit
      // saved before ids existed is still matched by the id everyone derived.
      const devices = ensureRoomDeviceItemIds(design.devices).items;
      const next = devices.filter((d: any) => !hit(d));
      // A unit hidden in Room Designer is still that tool's unit.
      const hiddenBefore: any[] = Array.isArray(design.config?.hiddenDevices) ? design.config.hiddenDevices : [];
      const hiddenNext = ensureRoomDeviceItemIds(hiddenBefore).items.filter((d: any) => !hit(d));
      if (next.length === devices.length && hiddenNext.length === hiddenBefore.length) return;
      await supabase.from("room_designs")
        .update({
          // Leave `config` absent if it was — Room Designer reads its presence
          // as "this room has been set up".
          data: { ...design, devices: next, ...(design.config ? { config: { ...design.config, hiddenDevices: hiddenNext } } : {}) },
          updated_at: new Date().toISOString(),
        })
        .eq("project_id", projectId).eq("room_id", roomId);
    })());
  }

  if (caller !== "signal-flow") {
    tasks.push((async () => {
      const sf = await loadToolData("signal-flow", roomId, projectId);
      if (!sf || !Array.isArray(sf.devices)) return;
      const devices = ensureSignalFlowItemIds(sf.devices as any[]).items;
      const hiddenBefore: any[] = Array.isArray(sf.hiddenDevices) ? sf.hiddenDevices as any[] : [];
      const hiddenDevices = ensureSignalFlowItemIds(hiddenBefore).items;
      const removed = devices.filter(hit);
      const hiddenNext = hiddenDevices.filter(d => !hit(d));
      if (!removed.length && hiddenNext.length === hiddenDevices.length) return;
      // A removed block takes its cables with it — otherwise they'd dangle.
      const removedPorts = new Set(removed.flatMap((d: any) => (d.ports || []).map((p: any) => p.id)));
      const connections = ((sf.connections as any[]) || [])
        .filter(c => !removedPorts.has(c?.from?.portId) && !removedPorts.has(c?.to?.portId));
      await saveToolData("signal-flow", { ...sf, devices: devices.filter(d => !hit(d)), hiddenDevices: hiddenNext, connections }, roomId, projectId);
    })());
  }

  if (caller !== "rack-builder") {
    tasks.push((async () => {
      const rack = await loadToolData("rack-planner", roomId, projectId);
      if (!rack || !Array.isArray(rack.items)) return;
      const items = rack.items as any[];
      const next = items.filter(i => !hit(i));
      const hiddenBefore: any[] = Array.isArray(rack.hiddenItems) ? rack.hiddenItems as any[] : [];
      const hiddenNext = hiddenBefore.filter(i => !hit(i));
      if (next.length === items.length && hiddenNext.length === hiddenBefore.length) return;
      await saveToolData("rack-planner", { ...rack, items: next, hiddenItems: hiddenNext }, roomId, projectId);
    })());
  }

  // The unit's recorded product spec goes with it.
  tasks.push(removeUnitSpecs(Array.from(ids), roomId, projectId));

  // A scope import's record too: a tool that hasn't turned it into objects yet
  // would otherwise create the deleted unit the first time it is opened.
  tasks.push((async () => {
    const manifest = await loadScopeManifest(roomId, projectId);
    if (!manifest || !manifest.units.some(u => ids.has(u.itemId))) return;
    await saveScopeManifest({ ...manifest, units: manifest.units.filter(u => !ids.has(u.itemId)) }, roomId, projectId);
  })());

  await Promise.all(tasks);
}
