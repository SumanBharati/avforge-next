"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface Room {
  id: string;
  name: string;
  data: Record<string, string>;
}

const toolsPerRoom = [
  { id: "cable-pull", name: "Cable Pull Sheet", icon: "📡", base: "/designEngineering/cable-pull" },
  { id: "edid-hdcp",  name: "EDID & HDCP Strategy", icon: "🔒", base: "/designEngineering/edid-hdcp" },
];

export default function ProjectEngineeringLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const pathname = usePathname();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [projectName, setProjectName] = useState<string>("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from("projects").select("name").eq("id", params.id).single()
      .then(({ data }) => { if (data) setProjectName(data.name || ""); });

    supabase.from("site_surveys").select("data").eq("project_id", params.id).single()
      .then(({ data: surveyRow }) => {
        const survey = surveyRow?.data as { buildings?: { rooms?: Room[] }[] } | null;
        const building = survey?.buildings?.[0];
        if (!building) return;
        setRooms((building.rooms || []) as Room[]);
        if (building.rooms?.length) setExpandedRooms(new Set([building.rooms[0].id]));
      });
  }, [params.id]);

  const handleSave = useCallback(() => {
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
            <Link href={`/projects/${params.id}`} className="mb-2 inline-flex items-center gap-1.5 text-xs text-subtle hover:text-secondary">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              {projectName}
            </Link>
            <h1 className="flex items-center gap-2.5 text-xl font-bold text-heading">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
                <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
              </svg>
              Project Engineering & Programming
            </h1>
          </div>
          <div className="flex items-center gap-4">
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
      <aside className="flex w-[260px] shrink-0 flex-col overflow-y-auto border-r border-border bg-forge-panel/30 px-3 py-5">
        <div className="mb-4 px-3">
          <h2 className="text-sm font-bold text-heading">Rooms</h2>
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
                    <svg width="14" height="14" viewBox="0 0 12 12" fill="none" className="shrink-0 text-subtle">
                      <rect x="1" y="1" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1" />
                    </svg>
                    <span className="truncate">{roomName}</span>
                  </button>

                  {isExpanded && (
                    <div className="ml-5 mt-0.5 flex flex-col gap-0.5 border-l border-border/50 pl-3">
                      {toolsPerRoom.map((tool) => {
                        const toolHref = `${tool.base}?room=${room.id}`;
                        const isActive = pathname === tool.base && typeof window !== "undefined" && window.location.search.includes(room.id);
                        return (
                          <Link
                            key={tool.id}
                            href={toolHref}
                            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-all ${
                              isActive
                                ? "bg-forge-surface/60 font-semibold text-heading"
                                : "text-subtle hover:bg-forge-surface/30 hover:text-secondary"
                            }`}
                          >
                            <span className="text-sm">{tool.icon}</span>
                            <span>{tool.name}</span>
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
