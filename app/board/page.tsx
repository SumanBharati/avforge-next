"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import BoardPageSkeleton from "@/components/skeletons/BoardPageSkeleton";

type Card = {
  id: string;
  title: string;
  description?: string;
  descriptionShown?: boolean;
};

type Column = {
  id: string;
  title: string;
  cards: Card[];
  color?: string;
};

type Board = {
  columns: Column[];
};

const COLUMN_COLORS: { name: string; value: string | null; swatch: string }[] = [
  { name: "None",   value: null,      swatch: "transparent" },
  { name: "Gray",   value: "#64748b", swatch: "#64748b" },
  { name: "Red",    value: "#ef4444", swatch: "#ef4444" },
  { name: "Orange", value: "#f97316", swatch: "#f97316" },
  { name: "Amber",  value: "#f59e0b", swatch: "#f59e0b" },
  { name: "Green",  value: "#22c55e", swatch: "#22c55e" },
  { name: "Teal",   value: "#14b8a6", swatch: "#14b8a6" },
  { name: "Cyan",   value: "#06b6d4", swatch: "#06b6d4" },
  { name: "Blue",   value: "#3b82f6", swatch: "#3b82f6" },
  { name: "Violet", value: "#8b5cf6", swatch: "#8b5cf6" },
  { name: "Pink",   value: "#ec4899", swatch: "#ec4899" },
];

const DEFAULT_BOARD: Board = {
  columns: [
    { id: "todo",        title: "To Do",       cards: [], color: "#64748b" },
    { id: "in-progress", title: "In Progress", cards: [], color: "#f59e0b" },
    { id: "done",        title: "Done",        cards: [], color: "#22c55e" },
  ],
};

const STORAGE_PREFIX = "avforge-board:";
const ANON_KEY = `${STORAGE_PREFIX}anon`;

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function loadBoard(key: string): Board {
  if (typeof window === "undefined") return DEFAULT_BOARD;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return DEFAULT_BOARD;
    const parsed = JSON.parse(raw) as Board;
    if (!parsed?.columns?.length) return DEFAULT_BOARD;
    return parsed;
  } catch {
    return DEFAULT_BOARD;
  }
}

function saveBoard(key: string, board: Board) {
  try {
    localStorage.setItem(key, JSON.stringify(board));
  } catch {
    /* ignore quota errors */
  }
}

export default function BoardPage() {
  const [storageKey, setStorageKey] = useState<string>(ANON_KEY);
  const [board, setBoard] = useState<Board>(DEFAULT_BOARD);
  const [hydrated, setHydrated] = useState(false);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [editingCard, setEditingCard] = useState<{ columnId: string; cardId: string } | null>(null);
  const [addingCardColumnId, setAddingCardColumnId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [colorPickerColumnId, setColorPickerColumnId] = useState<string | null>(null);
  const [openCard, setOpenCard] = useState<{ columnId: string; card: Card } | null>(null);

  const dragCard = useRef<{ columnId: string; cardId: string } | null>(null);
  const dragColumn = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const key = user?.id ? `${STORAGE_PREFIX}${user.id}` : ANON_KEY;
      setStorageKey(key);
      setBoard(loadBoard(key));
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveBoard(storageKey, board);
  }, [board, storageKey, hydrated]);

  useEffect(() => {
    if (!colorPickerColumnId) return;
    function handle(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-color-picker]")) setColorPickerColumnId(null);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [colorPickerColumnId]);

  function addColumn() {
    const title = newColumnTitle.trim();
    if (!title) {
      setAddingColumn(false);
      setNewColumnTitle("");
      return;
    }
    setBoard((b) => ({ columns: [...b.columns, { id: uid(), title, cards: [] }] }));
    setNewColumnTitle("");
    setAddingColumn(false);
  }

  function deleteColumn(columnId: string) {
    setBoard((b) => ({ columns: b.columns.filter((c) => c.id !== columnId) }));
  }

  function renameColumn(columnId: string, title: string) {
    setBoard((b) => ({
      columns: b.columns.map((c) => (c.id === columnId ? { ...c, title } : c)),
    }));
  }

  function setColumnColor(columnId: string, color: string | null) {
    setBoard((b) => ({
      columns: b.columns.map((c) =>
        c.id === columnId ? { ...c, color: color ?? undefined } : c,
      ),
    }));
  }

  function addCard(columnId: string) {
    const title = newCardTitle.trim();
    if (!title) {
      setAddingCardColumnId(null);
      setNewCardTitle("");
      return;
    }
    setBoard((b) => ({
      columns: b.columns.map((c) =>
        c.id === columnId ? { ...c, cards: [...c.cards, { id: uid(), title }] } : c,
      ),
    }));
    setNewCardTitle("");
    setAddingCardColumnId(null);
  }

  function updateCard(columnId: string, cardId: string, patch: Partial<Card>) {
    setBoard((b) => ({
      columns: b.columns.map((c) =>
        c.id === columnId
          ? { ...c, cards: c.cards.map((card) => (card.id === cardId ? { ...card, ...patch } : card)) }
          : c,
      ),
    }));
    setOpenCard((prev) =>
      prev && prev.columnId === columnId && prev.card.id === cardId
        ? { columnId, card: { ...prev.card, ...patch } }
        : prev,
    );
  }

  function deleteCard(columnId: string, cardId: string) {
    setBoard((b) => ({
      columns: b.columns.map((c) =>
        c.id === columnId ? { ...c, cards: c.cards.filter((card) => card.id !== cardId) } : c,
      ),
    }));
    setOpenCard(null);
  }

  function moveCard(fromColumnId: string, cardId: string, toColumnId: string, toIndex: number) {
    setBoard((b) => {
      const from = b.columns.find((c) => c.id === fromColumnId);
      if (!from) return b;
      const card = from.cards.find((c) => c.id === cardId);
      if (!card) return b;

      return {
        columns: b.columns.map((col) => {
          if (col.id === fromColumnId && col.id === toColumnId) {
            const without = col.cards.filter((c) => c.id !== cardId);
            const clamped = Math.max(0, Math.min(toIndex, without.length));
            return { ...col, cards: [...without.slice(0, clamped), card, ...without.slice(clamped)] };
          }
          if (col.id === fromColumnId) {
            return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
          }
          if (col.id === toColumnId) {
            const clamped = Math.max(0, Math.min(toIndex, col.cards.length));
            return { ...col, cards: [...col.cards.slice(0, clamped), card, ...col.cards.slice(clamped)] };
          }
          return col;
        }),
      };
    });
  }

  function moveColumn(fromId: string, toId: string) {
    if (fromId === toId) return;
    setBoard((b) => {
      const fromIdx = b.columns.findIndex((c) => c.id === fromId);
      const toIdx = b.columns.findIndex((c) => c.id === toId);
      if (fromIdx < 0 || toIdx < 0) return b;
      const next = [...b.columns];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return { columns: next };
    });
  }

  if (!hydrated) return <BoardPageSkeleton />;

  const totalCards = board.columns.reduce((s, c) => s + c.cards.length, 0);

  return (
    <div className="animate-fade-in flex h-full flex-col px-8 py-6" style={{ minHeight: "calc(100vh - 72px)" }}>
      <div className="mb-5 flex items-center gap-3">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="9" y1="3" x2="9" y2="21" />
          <line x1="15" y1="3" x2="15" y2="21" />
        </svg>
        <div>
          <h1 className="text-[22px] font-bold text-heading">Board</h1>
          <p className="text-[13px] text-subtle">
            Track your individual tasks across columns. {totalCards} {totalCards === 1 ? "card" : "cards"}.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-start gap-4 overflow-x-auto pb-6">
        {board.columns.map((column) => (
          <div
            key={column.id}
            className="flex w-[300px] shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-forge-panel/60"
            draggable={editingColumnId !== column.id}
            onDragStart={(e) => {
              if (dragCard.current) return;
              dragColumn.current = column.id;
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              if (dragColumn.current && dragColumn.current !== column.id) {
                e.preventDefault();
              }
            }}
            onDrop={(e) => {
              if (dragColumn.current && dragColumn.current !== column.id) {
                e.preventDefault();
                moveColumn(dragColumn.current, column.id);
                dragColumn.current = null;
              }
            }}
            onDragEnd={() => {
              dragColumn.current = null;
            }}
          >
            {column.color && (
              <div
                className="h-1.5 w-full"
                style={{ backgroundColor: column.color }}
              />
            )}
            <div
              className="relative flex items-center gap-2 px-3 py-3"
              style={
                column.color
                  ? { backgroundColor: `${column.color}14`, color: column.color }
                  : undefined
              }
            >
              {editingColumnId === column.id ? (
                <input
                  autoFocus
                  defaultValue={column.title}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v) renameColumn(column.id, v);
                    setEditingColumnId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const v = (e.target as HTMLInputElement).value.trim();
                      if (v) renameColumn(column.id, v);
                      setEditingColumnId(null);
                    } else if (e.key === "Escape") {
                      setEditingColumnId(null);
                    }
                  }}
                  className="flex-1 rounded-md border border-blue-500/40 bg-forge-surface px-2 py-1 text-[13px] font-semibold text-heading outline-none focus:border-blue-500"
                />
              ) : (
                <button
                  onClick={() => setEditingColumnId(column.id)}
                  className="flex-1 cursor-text text-left text-[13px] font-semibold uppercase tracking-wide hover:brightness-110"
                  style={column.color ? { color: column.color } : undefined}
                >
                  <span className={column.color ? "" : "text-secondary hover:text-heading"}>
                    {column.title}
                  </span>
                </button>
              )}
              <span className="rounded bg-forge-surface px-1.5 py-0.5 font-mono text-[10px] text-muted">
                {column.cards.length}
              </span>
              <div className="relative" data-color-picker>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setColorPickerColumnId(
                      colorPickerColumnId === column.id ? null : column.id,
                    );
                  }}
                  className="flex h-5 w-5 items-center justify-center rounded border border-border bg-forge-surface transition-colors hover:border-blue-500/50"
                  title="Change column color"
                >
                  <span
                    className="block h-3 w-3 rounded-sm"
                    style={{
                      backgroundColor: column.color ?? "transparent",
                      backgroundImage: column.color
                        ? undefined
                        : "linear-gradient(45deg, transparent 45%, #94a3b8 45%, #94a3b8 55%, transparent 55%)",
                      border: column.color ? "none" : "1px solid #94a3b8",
                    }}
                  />
                </button>
                {colorPickerColumnId === column.id && (
                  <div
                    className="absolute right-0 top-7 z-20 w-[168px] rounded-lg border border-border bg-forge-bg p-2 shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-subtle">
                      Column color
                    </div>
                    <div className="grid grid-cols-6 gap-1">
                      {COLUMN_COLORS.map((c) => {
                        const active = (column.color ?? null) === c.value;
                        return (
                          <button
                            key={c.name}
                            onClick={() => {
                              setColumnColor(column.id, c.value);
                              setColorPickerColumnId(null);
                            }}
                            title={c.name}
                            className={`flex h-6 w-6 items-center justify-center rounded-md border transition-transform hover:scale-110 ${
                              active ? "border-heading" : "border-border"
                            }`}
                            style={{
                              backgroundColor: c.value ?? "transparent",
                              backgroundImage: c.value
                                ? undefined
                                : "linear-gradient(45deg, transparent 45%, #94a3b8 45%, #94a3b8 55%, transparent 55%)",
                            }}
                          >
                            {active && (
                              <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                                <path
                                  d="M3 8l3 3 7-7"
                                  stroke={c.value ? "#ffffff" : "#0f172a"}
                                  strokeWidth="2.2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  if (column.cards.length === 0 || confirm(`Delete column "${column.title}" and its ${column.cards.length} card(s)?`)) {
                    deleteColumn(column.id);
                  }
                }}
                className="rounded p-1 text-faint transition-colors hover:bg-red-500/10 hover:text-red-400"
                title="Delete column"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div
              className="flex min-h-[40px] flex-1 flex-col gap-2 px-2"
              onDragOver={(e) => {
                if (dragCard.current) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }
              }}
              onDrop={(e) => {
                if (dragCard.current) {
                  e.preventDefault();
                  const { columnId: fromCol, cardId } = dragCard.current;
                  moveCard(fromCol, cardId, column.id, column.cards.length);
                  dragCard.current = null;
                }
              }}
            >
              {column.cards.map((card, index) => (
                <div
                  key={card.id}
                  draggable
                  onDragStart={(e) => {
                    dragCard.current = { columnId: column.id, cardId: card.id };
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => {
                    dragCard.current = null;
                  }}
                  onDragOver={(e) => {
                    if (dragCard.current) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                  onDrop={(e) => {
                    if (dragCard.current) {
                      e.preventDefault();
                      e.stopPropagation();
                      const { columnId: fromCol, cardId } = dragCard.current;
                      if (cardId !== card.id) {
                        moveCard(fromCol, cardId, column.id, index);
                      }
                      dragCard.current = null;
                    }
                  }}
                  className="group cursor-grab rounded-lg border border-border bg-forge-surface px-3 py-2.5 text-[13px] text-body shadow-sm transition-colors hover:border-blue-500/40 active:cursor-grabbing"
                  onClick={() => {
                    if (editingCard?.cardId !== card.id) {
                      setOpenCard({ columnId: column.id, card });
                    }
                  }}
                >
                  {editingCard?.columnId === column.id && editingCard?.cardId === card.id ? (
                    <textarea
                      autoFocus
                      defaultValue={card.title}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v) updateCard(column.id, card.id, { title: v });
                        setEditingCard(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          const v = (e.target as HTMLTextAreaElement).value.trim();
                          if (v) updateCard(column.id, card.id, { title: v });
                          setEditingCard(null);
                        } else if (e.key === "Escape") {
                          setEditingCard(null);
                        }
                      }}
                      rows={2}
                      className="w-full resize-none rounded bg-transparent text-[13px] text-body outline-none"
                    />
                  ) : (
                    <div className="flex items-start gap-2">
                      <span className="flex-1 whitespace-pre-wrap break-words leading-snug">{card.title}</span>
                      <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCard({ columnId: column.id, cardId: card.id });
                          }}
                          className="rounded p-0.5 text-faint hover:bg-forge-card hover:text-secondary"
                          title="Edit title"
                        >
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                            <path d="M11 2l3 3-8 8H3v-3l8-8z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCard(column.id, card.id);
                          }}
                          className="rounded p-0.5 text-faint hover:bg-red-500/10 hover:text-red-400"
                          title="Delete card"
                        >
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                  {card.description && editingCard?.cardId !== card.id && (
                    <div className="mt-1.5 flex flex-col gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateCard(column.id, card.id, { descriptionShown: !card.descriptionShown });
                        }}
                        title={card.descriptionShown ? "Hide description" : "Show description"}
                        className="flex items-center gap-1 self-start rounded px-1 py-0.5 text-[11px] text-faint transition-colors hover:bg-forge-card hover:text-secondary"
                      >
                        {card.descriptionShown ? (
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                            <path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.3" />
                            <circle cx="8" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.3" />
                            <path d="M3 3l10 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                          </svg>
                        ) : (
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                            <path d="M3 4h10M3 8h10M3 12h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                          </svg>
                        )}
                        <span>{card.descriptionShown ? "Hide" : "Show"} description</span>
                      </button>
                      {card.descriptionShown && (
                        <div className="whitespace-pre-wrap break-words rounded border border-border/60 bg-forge-bg/40 px-2 py-1.5 text-[12px] leading-snug text-muted">
                          {card.description}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {addingCardColumnId === column.id ? (
                <div className="rounded-lg border border-blue-500/40 bg-forge-surface p-2">
                  <textarea
                    autoFocus
                    value={newCardTitle}
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        addCard(column.id);
                      } else if (e.key === "Escape") {
                        setAddingCardColumnId(null);
                        setNewCardTitle("");
                      }
                    }}
                    placeholder="Enter a task..."
                    rows={2}
                    className="w-full resize-none rounded bg-transparent text-[13px] text-body outline-none placeholder:text-faint"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => addCard(column.id)}
                      className="forge-btn-primary text-[12px]"
                    >
                      Add card
                    </button>
                    <button
                      onClick={() => {
                        setAddingCardColumnId(null);
                        setNewCardTitle("");
                      }}
                      className="rounded px-2 py-1 text-[12px] text-muted hover:text-body"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setAddingCardColumnId(column.id);
                    setNewCardTitle("");
                  }}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-left text-[13px] text-muted transition-colors hover:bg-forge-surface/60 hover:text-body"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Add a card
                </button>
              )}
            </div>
            <div className="h-2" />
          </div>
        ))}

        <div className="w-[300px] shrink-0">
          {addingColumn ? (
            <div className="rounded-xl border border-blue-500/40 bg-forge-panel/60 p-3">
              <input
                autoFocus
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addColumn();
                  else if (e.key === "Escape") {
                    setAddingColumn(false);
                    setNewColumnTitle("");
                  }
                }}
                placeholder="Column title"
                className="forge-input text-[13px]"
              />
              <div className="mt-2 flex items-center gap-2">
                <button onClick={addColumn} className="forge-btn-primary text-[12px]">
                  Add column
                </button>
                <button
                  onClick={() => {
                    setAddingColumn(false);
                    setNewColumnTitle("");
                  }}
                  className="rounded px-2 py-1 text-[12px] text-muted hover:text-body"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingColumn(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-forge-panel/30 px-3 py-3 text-[13px] font-medium text-muted transition-colors hover:border-blue-500/40 hover:bg-forge-panel/60 hover:text-body"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Add another column
            </button>
          )}
        </div>
      </div>

      {openCard && (
        <CardDetailModal
          column={board.columns.find((c) => c.id === openCard.columnId)?.title ?? ""}
          card={openCard.card}
          onClose={() => setOpenCard(null)}
          onSave={(patch) => updateCard(openCard.columnId, openCard.card.id, patch)}
          onDelete={() => deleteCard(openCard.columnId, openCard.card.id)}
        />
      )}
    </div>
  );
}

function CardDetailModal({
  column,
  card,
  onClose,
  onSave,
  onDelete,
}: {
  column: string;
  card: Card;
  onClose: () => void;
  onSave: (patch: Partial<Card>) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");

  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description ?? "");
  }, [card.id]);

  function commitTitle() {
    const v = title.trim();
    if (v && v !== card.title) onSave({ title: v });
    else if (!v) setTitle(card.title);
  }

  function commitDescription() {
    const v = description.trim();
    if (v !== (card.description ?? "")) onSave({ description: v });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[560px] animate-fade-in rounded-xl border border-border bg-forge-surface p-6 shadow-2xl">
        <div className="mb-1 flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="mb-1 text-[11px] uppercase tracking-wide text-subtle">in {column}</div>
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  (e.target as HTMLTextAreaElement).blur();
                }
              }}
              rows={1}
              className="w-full resize-none rounded border border-transparent bg-transparent text-lg font-semibold text-heading outline-none hover:border-border focus:border-blue-500"
            />
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-subtle transition-colors hover:bg-forge-card hover:text-secondary"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mt-5">
          <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-subtle">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={commitDescription}
            placeholder="Add a more detailed description..."
            rows={6}
            className="forge-input w-full resize-y text-[13px]"
          />
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => {
              if (confirm("Delete this card?")) onDelete();
            }}
            className="rounded-lg px-3 py-2 text-[13px] font-medium text-red-400 transition-colors hover:bg-red-500/10"
          >
            Delete card
          </button>
          <button onClick={onClose} className="forge-btn-primary text-[13px]">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
