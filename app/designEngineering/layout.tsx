"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { BOMProvider } from "@/lib/bom-context";
import { createSurveyRoom, renameSurveyRoom, deleteSurveyRoom } from "@/lib/site-survey";
import ConfirmDialog from "@/components/ConfirmDialog";

interface Room {
  id: string;
  name: string;
  data: Record<string, string>;
}

const toolsPerRoom = [
  { id: "room-designer",  name: "Room Designer",       icon: "🏠", base: "/designEngineering/room-designer" },
  { id: "signal-flow",    name: "Signal Flow Builder", icon: "🔀", base: "/designEngineering/signal-flow" },
  { id: "rack-planner",   name: "Rack Builder",   icon: "🗄️", base: "/designEngineering/rack-planner" },
];

export default function DesignEngineeringLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <DesignEngineeringLayoutInner>{children}</DesignEngineeringLayoutInner>
    </Suspense>
  );
}

function DesignEngineeringLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get("project");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>("");
  const [jobNumber, setJobNumber] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingRoomName, setEditingRoomName] = useState("");
  const [savingRoomEdit, setSavingRoomEdit] = useState(false);
  const [deleteRoomConfirm, setDeleteRoomConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deletingRoom, setDeletingRoom] = useState(false);

  useEffect(() => {
    if (!projectIdParam) return;
    setProjectId(projectIdParam);

    supabase.from("projects").select("name, job_number").eq("id", projectIdParam).single()
      .then(({ data }) => { if (data) { setProjectName(data.name || ""); setJobNumber(data.job_number || ""); } });

    supabase.from("site_surveys").select("data").eq("project_id", projectIdParam).single()
      .then(({ data: surveyRow }) => {
        const survey = surveyRow?.data as { buildings?: { rooms?: Room[] }[] } | null;
        const building = survey?.buildings?.[0];
        if (!building) return;
        setRooms((building.rooms || []) as Room[]);
        if (building.rooms?.length) setExpandedRooms(new Set([building.rooms[0].id]));
      });
  }, [projectIdParam]);

  const handleSave = useCallback(() => {
    // Dispatch a custom event that child pages can listen to
    window.dispatchEvent(new Event("avforge-save"));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, []);

  // Lets a room be created straight from a design tool, for spaces that
  // never had a site survey done — writes into the same site_surveys JSONB
  // structure Site Survey itself edits, so it's not a parallel/duplicate room
  // list: it shows up there (and everywhere else that reads it) identically.
  // Updates this sidebar's own room list directly rather than re-fetching,
  // then jumps straight into Room Designer for the new (empty) room.
  async function handleAddRoom() {
    if (!projectId || creatingRoom) return;
    setCreatingRoom(true);
    const result = await createSurveyRoom(projectId);
    setCreatingRoom(false);
    if ("error" in result) {
      alert(`Couldn't create the room: ${result.error}`);
      return;
    }
    setRooms((prev) => [...prev, result.room]);
    setExpandedRooms((prev) => new Set(prev).add(result.room.id));
    router.push(`/designEngineering/room-designer?project=${projectId}&room=${result.room.id}`);
  }

  function startRenameRoom(room: Room) {
    setEditingRoomId(room.id);
    setEditingRoomName(room.data?.room_name || room.name);
  }

  async function commitRenameRoom() {
    if (!editingRoomId || !projectId) return;
    const name = editingRoomName.trim();
    const roomId = editingRoomId;
    if (!name) { setEditingRoomId(null); return; }
    setSavingRoomEdit(true);
    const result = await renameSurveyRoom(projectId, roomId, name);
    setSavingRoomEdit(false);
    if ("error" in result) {
      alert(`Couldn't rename the room: ${result.error}`);
      return;
    }
    setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, name, data: { ...r.data, room_name: name } } : r)));
    setEditingRoomId(null);
  }

  async function confirmDeleteRoom() {
    if (!deleteRoomConfirm || !projectId) return;
    setDeletingRoom(true);
    const result = await deleteSurveyRoom(projectId, deleteRoomConfirm.id);
    setDeletingRoom(false);
    if ("error" in result) {
      alert(`Couldn't delete the room: ${result.error}`);
      return;
    }
    setRooms((prev) => prev.filter((r) => r.id !== deleteRoomConfirm.id));
    setDeleteRoomConfirm(null);
  }

  function toggleRoom(roomId: string) {
    setExpandedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      return next;
    });
  }

  return (
    <div>
      {/* Top header */}
      <div className="border-b border-border bg-forge-panel/50 px-4 py-4 sm:px-6 lg:px-8" style={{flexShrink:0,position:"sticky",top:0,zIndex:20}}>
        <div className="flex items-center justify-between">
          <div>
            {projectId && (
              <Link href={`/projects/${projectId}`} className="mb-2 inline-flex items-center gap-1.5 text-xs text-subtle hover:text-secondary">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                {projectName}
                {jobNumber && <span className="text-subtle"> · #{jobNumber}</span>}
              </Link>
            )}
            <h1 className="flex items-center gap-2.5 text-xl font-bold text-heading">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
              </svg>
              Design Engineering
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSave} className="forge-btn-primary text-[13px]">
              {saved ? (
                <><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>Saved</>
              ) : (
                <><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M13 11v3H3v-3M8 2v9M5 5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Save</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Body: sidebar + content */}
      <div className="flex flex-col lg:flex-row" style={{ minHeight: "calc(100vh - 72px - 85px)" }}>
      {/* Left sidebar */}
      <aside className="flex w-full shrink-0 flex-col overflow-y-auto border-b border-border bg-forge-panel/30 px-4 py-5 lg:max-h-none lg:w-[300px] lg:border-b-0 lg:border-r max-h-[40vh]">
        <div className="mb-3 flex items-center justify-between px-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-faint">Rooms</span>
          <button
            onClick={handleAddRoom}
            disabled={!projectId || creatingRoom}
            title="Add a room — no site survey needed"
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-blue-400 transition-colors hover:bg-forge-surface/60 hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            {creatingRoom ? "Adding…" : "Add Room"}
          </button>
        </div>

        {rooms.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-faint">No rooms found</p>
            <p className="mt-1 text-xs text-faint">Add one above, or in Site Survey</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {rooms.map((room) => {
              const isExpanded = expandedRooms.has(room.id);
              const roomName = room.data?.room_name || room.name;
              return (
                <div key={room.id}>
                  {/* Room header */}
                  <div className="group flex w-full items-center gap-1 rounded-lg pr-1.5 transition-all hover:bg-forge-surface/30">
                    {editingRoomId === room.id ? (
                      <div className="flex flex-1 items-center gap-1 px-3 py-1.5">
                        <input
                          autoFocus
                          value={editingRoomName}
                          onChange={(e) => setEditingRoomName(e.target.value)}
                          onBlur={commitRenameRoom}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); commitRenameRoom(); }
                            if (e.key === "Escape") { e.preventDefault(); setEditingRoomId(null); }
                          }}
                          disabled={savingRoomEdit}
                          className="w-full rounded-md border border-blue-400/50 bg-forge-surface px-2 py-1 text-sm font-semibold text-heading outline-none"
                        />
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => toggleRoom(room.id)}
                          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-secondary transition-all hover:text-heading"
                        >
                          <svg
                            width="12" height="12" viewBox="0 0 12 12" fill="none"
                            className={`shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                          >
                            <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                          <span className="truncate">{roomName}</span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); startRenameRoom(room); }}
                          title="Rename room"
                          className="shrink-0 rounded-md p-1 text-faint opacity-0 transition-opacity hover:text-heading group-hover:opacity-100"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteRoomConfirm({ id: room.id, name: roomName }); }}
                          title="Delete room"
                          className="shrink-0 rounded-md p-1 text-faint opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                        </button>
                      </>
                    )}
                  </div>

                  {/* Tools under room */}
                  {isExpanded && (
                    <div className="mt-1 flex flex-col">
                      {toolsPerRoom.map((tool) => {
                        const toolHref = `${tool.base}?project=${projectIdParam}&room=${room.id}`;
                        const isActive = pathname === tool.base && searchParams.get("room") === room.id;
                        return (
                          <Link
                            key={tool.id}
                            href={toolHref}
                            className={`mb-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-all ${
                              isActive
                                ? "bg-forge-surface/60 font-semibold text-heading"
                                : "text-subtle hover:bg-forge-surface/30 hover:text-secondary"
                            }`}
                          >
                            <span className="flex-1 truncate">{tool.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <BOMProvider>
          {children}
        </BOMProvider>
      </div>
      </div>

      {deleteRoomConfirm && (
        <ConfirmDialog
          title="Delete room"
          message={<>Delete <span className="font-semibold text-heading">{deleteRoomConfirm.name}</span>? This removes it from Site Survey and every design tool. Any signal flow, rack, or room design already saved for it stays in the database but becomes unreachable, and this can&apos;t be undone from here.</>}
          busy={deletingRoom}
          onCancel={() => setDeleteRoomConfirm(null)}
          onConfirm={confirmDeleteRoom}
        />
      )}
    </div>
  );
}
