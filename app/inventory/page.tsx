"use client";

import { useState } from "react";

type Category = "Display" | "Audio" | "Control" | "Networking" | "Cable" | "Mount" | "Other";

type InventoryItem = {
  id: string;
  name: string;
  brand: string;
  model: string;
  category: Category;
  quantity: number;
  location: string;
  condition: "New" | "Good" | "Fair" | "Poor";
  serialNumber: string;
  notes: string;
};

const CATEGORIES: Category[] = ["Display", "Audio", "Control", "Networking", "Cable", "Mount", "Other"];
const CONDITIONS = ["New", "Good", "Fair", "Poor"] as const;

const CATEGORY_COLORS: Record<Category, string> = {
  Display:    "bg-blue-500/15 text-blue-400",
  Audio:      "bg-violet-500/15 text-violet-400",
  Control:    "bg-amber-500/15 text-amber-400",
  Networking: "bg-cyan-500/15 text-cyan-400",
  Cable:      "bg-slate-500/15 text-slate-400",
  Mount:      "bg-orange-500/15 text-orange-400",
  Other:      "bg-gray-500/15 text-gray-400",
};

const CONDITION_COLORS: Record<string, string> = {
  New:  "bg-emerald-500/15 text-emerald-400",
  Good: "bg-blue-500/15 text-blue-400",
  Fair: "bg-amber-500/15 text-amber-400",
  Poor: "bg-red-500/15 text-red-400",
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const SAMPLE_ITEMS: InventoryItem[] = [
  { id: uid(), name: "85\" 4K Display", brand: "Samsung", model: "QM85B", category: "Display", quantity: 3, location: "Warehouse A", condition: "New", serialNumber: "", notes: "" },
  { id: uid(), name: "Ceiling Speaker 6\"", brand: "Sonance", model: "C6R", category: "Audio", quantity: 12, location: "Warehouse A", condition: "Good", serialNumber: "", notes: "" },
  { id: uid(), name: "4K Video Switcher", brand: "Crestron", model: "DM-MD8X8", category: "Control", quantity: 1, location: "Warehouse B", condition: "Good", serialNumber: "SN-00123", notes: "" },
  { id: uid(), name: "8-Port PoE Switch", brand: "Cisco", model: "SG350-10P", category: "Networking", quantity: 5, location: "Warehouse A", condition: "New", serialNumber: "", notes: "" },
  { id: uid(), name: "HDMI 2.1 Cable 10ft", brand: "Monoprice", model: "MP-8K-10", category: "Cable", quantity: 30, location: "Shelf C-4", condition: "New", serialNumber: "", notes: "" },
];

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>(SAMPLE_ITEMS);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterCondition, setFilterCondition] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);

  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    const matchSearch = !q || item.name.toLowerCase().includes(q) || item.brand.toLowerCase().includes(q) || item.model.toLowerCase().includes(q);
    const matchCat = !filterCategory || item.category === filterCategory;
    const matchCond = !filterCondition || item.condition === filterCondition;
    return matchSearch && matchCat && matchCond;
  });

  function openNew() {
    setEditing({ id: uid(), name: "", brand: "", model: "", category: "Display", quantity: 1, location: "", condition: "New", serialNumber: "", notes: "" });
    setShowModal(true);
  }

  function openEdit(item: InventoryItem) {
    setEditing({ ...item });
    setShowModal(true);
  }

  function handleSave() {
    if (!editing || !editing.name.trim()) return;
    setItems((prev) => {
      const exists = prev.find((i) => i.id === editing.id);
      return exists ? prev.map((i) => i.id === editing.id ? editing : i) : [editing, ...prev];
    });
    setShowModal(false);
    setEditing(null);
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const categoryBreakdown = CATEGORIES.map((c) => ({
    cat: c,
    count: items.filter((i) => i.category === c).reduce((s, i) => s + i.quantity, 0),
  })).filter((c) => c.count > 0);

  const inputCls = "w-full rounded-lg border border-border bg-forge-surface/60 px-3 py-2 text-[13px] text-heading placeholder:text-faint focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30";
  const labelCls = "mb-1 block text-[11px] font-medium text-muted";

  return (
    <div className="animate-fade-in px-8 py-6">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-heading">Inventory</h2>
          <p className="mt-1 text-[13px] text-muted">Track equipment your organization has in stock.</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-blue-500"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Item
        </button>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-forge-surface/40 p-4">
          <div className="text-[11px] font-medium text-muted">Total Items</div>
          <div className="mt-1 text-2xl font-bold text-heading">{totalItems}</div>
          <div className="mt-0.5 text-[11px] text-subtle">{items.length} SKUs</div>
        </div>
        {categoryBreakdown.slice(0, 3).map(({ cat, count }) => (
          <div key={cat} className="rounded-xl border border-border bg-forge-surface/40 p-4">
            <div className="text-[11px] font-medium text-muted">{cat}</div>
            <div className="mt-1 text-2xl font-bold text-heading">{count}</div>
            <div className="mt-0.5 text-[11px] text-subtle">units</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, brand, model…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="forge-input w-full pl-8 text-[13px]"
          />
        </div>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="forge-input w-auto min-w-[140px] text-[13px]">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={filterCondition} onChange={(e) => setFilterCondition(e.target.value)} className="forge-input w-auto min-w-[130px] text-[13px]">
          <option value="">All conditions</option>
          {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
        </select>
        {(search || filterCategory || filterCondition) && (
          <button onClick={() => { setSearch(""); setFilterCategory(""); setFilterCondition(""); }} className="text-[12px] font-medium text-blue-400 hover:text-blue-300 transition-colors">
            Clear
          </button>
        )}
        <span className="ml-auto text-[12px] text-subtle">{filtered.length} of {items.length} items</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-forge-surface/20 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-forge-surface/60">
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted">Item</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted">Brand / Model</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted">Category</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold text-muted">Qty</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted">Location</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted">Condition</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted">Serial #</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center text-[13px] text-subtle">
                  No items found.{" "}
                  <button onClick={openNew} className="text-blue-400 hover:text-blue-300 transition-colors">Add the first item.</button>
                </td>
              </tr>
            )}
            {filtered.map((item) => (
              <tr key={item.id} className="border-b border-border/50 transition-colors hover:bg-forge-surface/40">
                <td className="px-4 py-3">
                  <div className="text-[13px] font-semibold text-heading">{item.name}</div>
                  {item.notes && <div className="mt-0.5 text-[11px] text-subtle truncate max-w-[200px]">{item.notes}</div>}
                </td>
                <td className="px-4 py-3">
                  <div className="text-[13px] text-body">{item.brand}</div>
                  <div className="text-[11px] text-subtle">{item.model}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${CATEGORY_COLORS[item.category]}`}>
                    {item.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-[14px] font-bold text-heading">{item.quantity}</span>
                </td>
                <td className="px-4 py-3 text-[13px] text-body">{item.location || <span className="text-faint">—</span>}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${CONDITION_COLORS[item.condition]}`}>
                    {item.condition}
                  </span>
                </td>
                <td className="px-4 py-3 text-[12px] font-mono text-subtle">{item.serialNumber || <span className="text-faint">—</span>}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(item)} className="rounded-md p-1.5 text-muted transition-colors hover:bg-forge-surface hover:text-heading">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="rounded-md p-1.5 text-muted transition-colors hover:bg-red-500/10 hover:text-red-400">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {showModal && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-forge-bg shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="text-[15px] font-bold text-heading">
                {items.find((i) => i.id === editing.id) ? "Edit Item" : "Add Item"}
              </h3>
              <button onClick={() => { setShowModal(false); setEditing(null); }} className="text-muted hover:text-heading transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className={labelCls}>Item Name *</label>
                <input type="text" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={inputCls} placeholder='e.g. 85" 4K Display' />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Brand</label>
                  <input type="text" value={editing.brand} onChange={(e) => setEditing({ ...editing, brand: e.target.value })} className={inputCls} placeholder="e.g. Samsung" />
                </div>
                <div>
                  <label className={labelCls}>Model</label>
                  <input type="text" value={editing.model} onChange={(e) => setEditing({ ...editing, model: e.target.value })} className={inputCls} placeholder="e.g. QM85B" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Category</label>
                  <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value as Category })} className={inputCls}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Condition</label>
                  <select value={editing.condition} onChange={(e) => setEditing({ ...editing, condition: e.target.value as InventoryItem["condition"] })} className={inputCls}>
                    {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Quantity</label>
                  <input type="number" min={0} value={editing.quantity} onChange={(e) => setEditing({ ...editing, quantity: Math.max(0, Number(e.target.value)) })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Location</label>
                  <input type="text" value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })} className={inputCls} placeholder="e.g. Warehouse A" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Serial Number</label>
                <input type="text" value={editing.serialNumber} onChange={(e) => setEditing({ ...editing, serialNumber: e.target.value })} className={inputCls} placeholder="Optional" />
              </div>
              <div>
                <label className={labelCls}>Notes</label>
                <textarea value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} className={inputCls + " resize-none"} rows={2} placeholder="Optional notes…" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
              <button onClick={() => { setShowModal(false); setEditing(null); }} className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:text-body">
                Cancel
              </button>
              <button onClick={handleSave} disabled={!editing.name.trim()} className="rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50">
                Save Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
