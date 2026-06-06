"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, Suspense } from "react";
import { supabase } from "@/lib/supabase";

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
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get("project");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!projectIdParam) return;
    setProjectId(projectIdParam);

    supabase.from("projects").select("name").eq("id", projectIdParam).single()
      .then(({ data }) => { if (data) setProjectName(data.name || ""); });

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
      <div className="border-b border-border bg-forge-panel/50 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            {projectId && (
              <Link href={`/projects/${projectId}`} className="mb-2 inline-flex items-center gap-1.5 text-xs text-subtle hover:text-secondary">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                {projectName}
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
      <div className="flex" style={{ minHeight: "calc(100vh - 72px - 85px)" }}>
      {/* Left sidebar */}
      <aside className="flex w-[300px] shrink-0 flex-col overflow-y-auto border-r border-border bg-forge-panel/30 px-4 py-5">
        <div className="mb-3 px-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-faint">Rooms</span>
        </div>

        {rooms.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-faint">No rooms found</p>
            <p className="mt-1 text-xs text-faint">Add rooms in Site Survey first</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {rooms.map((room) => {
              const isExpanded = expandedRooms.has(room.id);
              const roomName = room.data?.room_name || room.name;
              return (
                <div key={room.id}>
                  {/* Room header */}
                  <button
                    onClick={() => toggleRoom(room.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-secondary transition-all hover:bg-forge-surface/30 hover:text-heading"
                  >
                    <svg
                      width="12" height="12" viewBox="0 0 12 12" fill="none"
                      className={`shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                    >
                      <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <span className="truncate">{roomName}</span>
                  </button>

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
        {children}
      </div>
      </div>
    </div>
  );
}
