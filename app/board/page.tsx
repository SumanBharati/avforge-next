"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePMStore } from "@/components/PMStoreProvider";
import { uid, type BoardMeta } from "@/lib/pm-store";
import BoardPageSkeleton from "@/components/skeletons/BoardPageSkeleton";

const BOARD_COLORS = [
  "#8b5cf6", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#f59e0b", "#22c55e", "#14b8a6",
  "#06b6d4", "#6366f1",
];

export default function BoardsPage() {
  const router = useRouter();
  const { store, update, loading } = usePMStore();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(BOARD_COLORS[0]);
  const [pendingDelete, setPendingDelete] = useState<{ name: string; onConfirm: () => void } | null>(null);

  if (loading) return <BoardPageSkeleton />;

  const boards: BoardMeta[] = store.boards ?? [];

  function createBoard() {
    const name = newName.trim();
    if (!name) return;
    const board: BoardMeta = { id: uid(), name, color: newColor, createdAt: new Date().toISOString() };
    update((prev) => ({ ...prev, boards: [...(prev.boards ?? []), board] }));
    setCreating(false);
    setNewName("");
    setNewColor(BOARD_COLORS[0]);
    router.push(`/board/${board.id}`);
  }

  function deleteBoard(id: string, name: string) {
    setPendingDelete({
      name,
      onConfirm: () => {
        update((prev) => {
          const { [id]: _, ...restData } = prev.boardData ?? {};
          return { ...prev, boards: (prev.boards ?? []).filter((b) => b.id !== id), boardData: restData };
        });
        setPendingDelete(null);
      },
    });
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
            <line x1="15" y1="3" x2="15" y2="21" />
          </svg>
          <div>
            <h1 className="text-[22px] font-bold text-heading">Boards</h1>
            <p className="text-[13px] text-subtle">Select a board or create a new one.</p>
          </div>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-600"
        >
          <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
            <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Create Board
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {boards.map((board) => (
          <div key={board.id} className="group relative h-full">
            <button
              onClick={() => router.push(`/board/${board.id}`)}
              className="h-full w-full overflow-hidden rounded-xl border border-border bg-forge-panel text-left transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="relative h-20 w-full" style={{ backgroundColor: `${board.color}22` }}>
                <div className="h-1.5 w-full" style={{ backgroundColor: board.color }} />
                <div className="absolute bottom-2 left-3 flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-8 w-10 rounded-md opacity-30" style={{ backgroundColor: board.color }} />
                  ))}
                </div>
              </div>
              <div className="px-4 py-3">
                <div className="text-[14px] font-semibold text-heading">{board.name}</div>
                <div className="mt-0.5 text-[11px] text-subtle">
                  {new Date(board.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
              </div>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); deleteBoard(board.id, board.name); }}
              className="absolute right-2 top-3 hidden items-center justify-center rounded-md bg-black/40 p-1 text-white/80 hover:bg-red-500/80 group-hover:flex"
              title="Delete board"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}

        {/* Create form inline card */}
        {creating ? (
          <div className="rounded-xl border border-blue-500/40 bg-forge-panel p-4">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createBoard();
                if (e.key === "Escape") { setCreating(false); setNewName(""); }
              }}
              placeholder="Board name…"
              className="w-full rounded-md border border-border bg-forge-surface px-3 py-2 text-[13px] text-body outline-none focus:border-blue-500"
            />
            <div className="mt-3">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-subtle">Color</div>
              <div className="flex flex-wrap gap-1.5">
                {BOARD_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`h-6 w-6 rounded-md border-2 transition-transform hover:scale-110 ${newColor === c ? "border-white" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={createBoard}
                disabled={!newName.trim()}
                className="rounded-lg bg-blue-500 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-blue-600 disabled:opacity-40"
              >
                Create
              </button>
              <button
                onClick={() => { setCreating(false); setNewName(""); }}
                className="rounded-lg border border-border px-3 py-1.5 text-[12px] text-subtle hover:text-body"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="flex h-full min-h-[120px] w-full items-center justify-center rounded-xl border border-dashed border-border text-[13px] text-subtle transition-colors hover:border-blue-500/40 hover:text-blue-400"
          >
            + Create a board
          </button>
        )}
      </div>

      {boards.length === 0 && !creating && (
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-faint">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
            <line x1="15" y1="3" x2="15" y2="21" />
          </svg>
          <p className="text-[15px] font-semibold text-subtle">No boards yet</p>
          <p className="mt-1 text-[13px] text-faint">Create your first board to start tracking tasks.</p>
          <button
            onClick={() => setCreating(true)}
            className="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-600"
          >
            Create Board
          </button>
        </div>
      )}

      {/* Delete confirmation modal */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm" onClick={() => setPendingDelete(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-forge-panel shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5">
              <h3 className="text-[16px] font-bold text-heading">Delete board</h3>
              <p className="mt-1.5 text-[13px] text-body">
                Are you sure you want to delete <span className="font-semibold text-heading">"{pendingDelete.name}"</span>? All its cards will be permanently removed.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-6 py-3">
              <button onClick={() => setPendingDelete(null)} className="rounded-lg border border-border px-3 py-1.5 text-[12px] text-subtle hover:text-body">Cancel</button>
              <button onClick={pendingDelete.onConfirm} className="rounded-lg bg-red-500 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
