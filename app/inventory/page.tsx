"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createProduct, deleteProduct, getFilterOptions, getProductCount, listProducts, updateProduct, type AVProduct } from "@/lib/av-products";
import { type OrgEquipmentItem } from "@/lib/equipment-library";
import { supabase } from "@/lib/supabase";
import { useOrg } from "@/components/OrgProvider";
import EquipmentFormModal, { type EquipmentFormValue } from "@/components/EquipmentFormModal";
import ConfirmDialog from "@/components/ConfirmDialog";

type Section = "org" | "avforge" | "inventory";

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

// ── Icons ────────────────────────────────────────────────────────────────────

function BuildingIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </svg>
  );
}

function SparkleIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  );
}

function BoxIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

// ── Landing data ─────────────────────────────────────────────────────────────

const NEWS_ITEMS: { type: string; name: string; date: string; description: string; tags: string[] }[] = [];

const OLD_INVENTORY_ITEMS = [
  { name: "Epson PowerLite X123",     category: "Projector",               age: "5.2 years", status: "Review",         action: "Check lamp hours and condition" },
  { name: "Biamp TesiraFORTE AVB",    category: "DSP / Audio Processor",   age: "4.1 years", status: "Legacy",         action: "Confirm firmware and support" },
  { name: "Crestron DMPS3-4K-150-C", category: "Presentation Switcher",    age: "6.3 years", status: "End of Support", action: "Consider replacement" },
  { name: "Crown XTi 2002",           category: "Power Amplifier",          age: "5.7 years", status: "Review",         action: "Verify condition and usage" },
  { name: "Extron DTP CrossPoint 84", category: "Matrix Switcher",          age: "7.8 years", status: "Discontinued",   action: "Plan phased replacement" },
];

const OLD_INVENTORY_STATUS: Record<string, string> = {
  "Review":         "bg-amber-500/15 text-amber-600",
  "Legacy":         "bg-violet-500/15 text-violet-500",
  "End of Support": "bg-orange-500/15 text-orange-600",
  "Discontinued":   "bg-red-500/15 text-red-500",
};

const NEWS_TYPE_STYLE: Record<string, string> = {
  "NEW PRODUCT":    "text-emerald-500",
  "SOFTWARE UPDATE":"text-blue-400",
};

// ── Landing — 3 cards ────────────────────────────────────────────────────────

const CARDS: { key: Section; label: string; description: string; icon: React.ReactNode; iconBg: string; iconColor: string; stat?: string }[] = [
  {
    key: "org",
    label: "My Organization's Equipment Library",
    description: "Curated catalog of approved equipment specific to your organization.",
    icon: <BuildingIcon size={28} />,
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-400",
  },
  {
    key: "avforge",
    label: "AV Forge Equipment Library",
    description: "Vetted AV products and full specifications maintained by AV Forge.",
    icon: <SparkleIcon size={28} />,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
  },
  {
    key: "inventory",
    label: "Inventory",
    description: "Track equipment your organization currently has in stock.",
    icon: <BoxIcon size={28} />,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
    stat: `${SAMPLE_ITEMS.length} SKUs`,
  },
];

function LandingView({ onSelect }: { onSelect: (s: Section) => void }) {
  const { activeOrg } = useOrg();
  const [avForgeCount, setAvForgeCount] = useState<number | null>(null);
  const [orgCount, setOrgCount] = useState<number | null>(null);

  useEffect(() => {
    getProductCount().then(setAvForgeCount).catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeOrg) { setOrgCount(null); return; }
    supabase
      .from("equipment_library")
      .select("*", { count: "exact", head: true })
      .eq("org_id", activeOrg.id)
      .then(({ count }) => setOrgCount(count ?? 0));
  }, [activeOrg?.id]);

  const cards = CARDS.map((c) => {
    if (c.key === "avforge" && avForgeCount !== null) return { ...c, stat: `${avForgeCount} products` };
    if (c.key === "org" && orgCount !== null) return { ...c, stat: `${orgCount} items` };
    return c;
  });

  return (
    <div className="animate-fade-in px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-heading">Library</h2>
        <p className="mt-1 text-[13px] text-muted">Browse equipment catalogs and manage your organization's stock.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ key, label, description, icon, stat }) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className="group flex h-[190px] w-full flex-col items-center justify-start gap-2 rounded-xl border border-border bg-forge-surface/40 px-3 pb-3 pt-4 text-center transition-all hover:-translate-y-0.5 hover:border-border hover:shadow-lg"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-forge-panel text-muted">
              {icon}
            </div>
            <h3 className="text-[13px] font-bold leading-tight text-body group-hover:text-heading">{label}</h3>
            <p className="text-[11px] leading-relaxed text-subtle">{description}</p>
            <span className="mt-auto flex min-h-[2.25rem] w-full items-center justify-center rounded-xl border border-border bg-border/30 px-2 py-1 text-[10px] font-semibold leading-tight text-muted">
              {stat ?? "Coming soon"}
            </span>
          </button>
        ))}
      </div>

      {/* ── News + Old Inventory ─────────────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">

        {/* New Products on AVForge */}
        <div className="overflow-hidden rounded-xl border border-border bg-forge-surface/20">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h3 className="text-[13px] font-bold text-heading">New Products on AVForge</h3>
            <button className="text-[12px] font-medium text-blue-400 transition-colors hover:text-blue-300">View all</button>
          </div>
          {NEWS_ITEMS.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="mb-3 text-faint" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <p className="text-[13px] font-medium text-subtle">No products yet</p>
              <p className="mt-1 text-[12px] text-faint">Equipment added to the AV Forge Equipment Library will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {NEWS_ITEMS.map((item, i) => (
                <div key={i} className="flex gap-4 px-5 py-4 transition-colors hover:bg-forge-surface/30">
                  <div className="h-[72px] w-[72px] shrink-0 rounded-lg bg-slate-700/60" />
                  <div className="min-w-0 flex-1">
                    <div className={`mb-0.5 text-[10px] font-bold tracking-widest ${NEWS_TYPE_STYLE[item.type] ?? "text-muted"}`}>
                      {item.type}
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[13px] font-semibold text-heading">{item.name}</span>
                      <span className="shrink-0 text-[11px] text-subtle">{item.date}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted">{item.description}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex gap-1.5">
                        {item.tags.map((tag) => (
                          <span key={tag} className="rounded-full border border-border bg-forge-surface/60 px-2 py-0.5 text-[10px] font-medium text-subtle">{tag}</span>
                        ))}
                      </div>
                      <button className="whitespace-nowrap text-[11px] font-medium text-blue-400 transition-colors hover:text-blue-300">View details →</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Old Inventory Review */}
        <div className="overflow-hidden rounded-xl border border-border bg-forge-surface/20">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h3 className="text-[13px] font-bold text-heading">Old Inventory Review</h3>
            <button className="text-[12px] font-medium text-blue-400 transition-colors hover:text-blue-300">View all</button>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-border bg-forge-surface/40">
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-muted">Item</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted">Age</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted">Status</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted">Recommended Action</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {OLD_INVENTORY_ITEMS.map((item, i) => (
                <tr key={i} className="border-b border-border/50 transition-colors hover:bg-forge-surface/30">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 shrink-0 rounded-md bg-slate-700/60" />
                      <div>
                        <div className="text-[12px] font-semibold text-heading">{item.name}</div>
                        <div className="text-[11px] text-subtle">{item.category}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[12px] text-body">{item.age}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${OLD_INVENTORY_STATUS[item.status] ?? "bg-forge-surface text-muted"}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[11px] text-subtle">{item.action}</td>
                  <td className="px-3 py-3">
                    <button className="rounded-md p-1 text-muted transition-colors hover:text-heading">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <circle cx="8" cy="3" r="1.2" /><circle cx="8" cy="8" r="1.2" /><circle cx="8" cy="13" r="1.2" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Inventory section ────────────────────────────────────────────────────────

function InventoryView({ onBack }: { onBack: () => void }) {
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
    <div className="animate-fade-in px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-[13px] text-muted hover:text-heading transition-colors"
          >
            <ArrowLeftIcon />
            Library
          </button>
          <span className="text-border">/</span>
          <h2 className="text-xl font-bold text-heading">Inventory</h2>
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
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
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
      <div className="mb-4 flex flex-wrap items-center gap-3">
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
        <div className="overflow-x-auto">
        <table className="w-full min-w-[820px]">
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
      </div>

      {/* Add / Edit Modal */}
      {showModal && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
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

// ── AV Forge Equipment Library section ───────────────────────────────────────

const LIBRARY_PAGE_SIZE = 40;

function avProductToFormValue(p: AVProduct): EquipmentFormValue {
  return {
    manufacturer: p.manufacturer,
    model: p.model_name,
    category: p.category,
    notes: p.type,
    unitCost: p.price,
    partNumber: p.part_number,
    msrp: p.msrp,
    cost: p.cost,
    ports: p.ports,
    ampDraw: p.amp_draw,
    voltage: p.voltage,
    powerWatts: p.power_watts,
    btuHr: p.btu_hr,
    rackMounted: p.rack_mounted,
    rackUnits: p.rack_units,
    widthIn: p.width_in,
    heightIn: p.height_in,
    depthIn: p.depth_in,
    weightLb: p.weight_lb,
  };
}

function applyFormValueToAVProduct(base: AVProduct, v: EquipmentFormValue): AVProduct {
  return {
    ...base,
    manufacturer: v.manufacturer,
    model_name: v.model,
    category: v.category,
    type: v.notes,
    price: v.unitCost,
    part_number: v.partNumber,
    msrp: v.msrp,
    cost: v.cost,
    ports: v.ports,
    amp_draw: v.ampDraw,
    voltage: v.voltage,
    power_watts: v.powerWatts,
    btu_hr: v.btuHr,
    rack_mounted: v.rackMounted,
    rack_units: v.rackUnits,
    width_in: v.widthIn,
    height_in: v.heightIn,
    depth_in: v.depthIn,
    weight_lb: v.weightLb,
  };
}

const emptyAVProduct = (): AVProduct => ({
  id: "",
  manufacturer: "",
  model_name: "",
  category: "",
  type: "",
  price: 0,
  part_number: null,
  msrp: null,
  cost: null,
  margin: null,
  markup: null,
  color: "",
  ports: [],
  amp_draw: null,
  voltage: null,
  power_watts: null,
  btu_hr: null,
  rack_mounted: false,
  rack_units: null,
  width_in: null,
  height_in: null,
  depth_in: null,
  diameter_in: null,
  weight_lb: null,
  rack_mountable_detail: null,
  rack_ear_included: null,
  rack_ear_detail: null,
  shelf_required: null,
  shelf_requirement: null,
  voltage_detail: null,
  current_detail: null,
  power_supply_type: null,
  notes: null,
  rd_type: null,
  rd_wall: null,
  rd_width_ft: null,
  rd_height_ft: null,
  rd_icon: null,
});

function AVForgeLibraryView({ onBack }: { onBack: () => void }) {
  const { activeOrg } = useOrg();
  const [products, setProducts] = useState<AVProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterManufacturer, setFilterManufacturer] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [selected, setSelected] = useState<AVProduct | null>(null);
  const [editingProduct, setEditingProduct] = useState<AVProduct | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<AVProduct | null>(null);
  const [savingNewProduct, setSavingNewProduct] = useState(false);
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState<AVProduct | null>(null);
  const [deletingProduct, setDeletingProduct] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [anchorIndex, setAnchorIndex] = useState<number | null>(null);
  const [addingToOrg, setAddingToOrg] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [bulkAdding, setBulkAdding] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ added: number; skipped: number } | null>(null);

  async function addSelectedToOrgLibrary() {
    if (!activeOrg || selectedIds.size === 0) return;
    setBulkAdding(true);
    setBulkResult(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const toAdd = products.filter((p) => selectedIds.has(p.id));
      let added = 0;
      let skipped = 0;
      for (const product of toAdd) {
        const { data: existing } = await supabase
          .from("equipment_library")
          .select("id")
          .eq("org_id", activeOrg.id)
          .eq("manufacturer", product.manufacturer)
          .eq("model", product.model_name)
          .maybeSingle();
        if (existing) {
          skipped++;
        } else {
          const { error } = await supabase.from("equipment_library").insert({
            user_id: user.id,
            org_id: activeOrg.id,
            category: product.category,
            manufacturer: product.manufacturer,
            model: product.model_name,
            description: product.type || "",
            unit_cost: product.price ?? 0,
            part_number: product.part_number,
            msrp: product.msrp,
            cost: product.cost,
            color: product.color,
            ports: product.ports ?? [],
            amp_draw: product.amp_draw,
            voltage: product.voltage,
            power_watts: product.power_watts,
            btu_hr: product.btu_hr,
            rack_mounted: product.rack_mounted ?? false,
            rack_units: product.rack_units,
            width_in: product.width_in,
            height_in: product.height_in,
            depth_in: product.depth_in,
            weight_lb: product.weight_lb,
          });
          if (!error) added++;
          else skipped++;
        }
        setAddedIds((prev) => new Set(prev).add(product.id));
      }
      setBulkResult({ added, skipped });
      setTimeout(() => setBulkResult(null), 4000);
      setSelectedIds(new Set());
      setAnchorIndex(null);
    }
    setBulkAdding(false);
  }

  function handleRowClick(e: React.MouseEvent, index: number) {
    const product = products[index];
    if (e.shiftKey && anchorIndex !== null) {
      const [start, end] = [Math.min(anchorIndex, index), Math.max(anchorIndex, index)];
      setSelectedIds(new Set(products.slice(start, end + 1).map((p) => p.id)));
    } else if (e.ctrlKey || e.metaKey) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(product.id)) next.delete(product.id);
        else next.add(product.id);
        return next;
      });
      setAnchorIndex(index);
    } else {
      setSelectedIds(new Set([product.id]));
      setAnchorIndex(index);
    }
  }

  function handleRowContextMenu(e: React.MouseEvent, index: number) {
    e.preventDefault();
    const product = products[index];
    if (!selectedIds.has(product.id)) {
      setSelectedIds(new Set([product.id]));
      setAnchorIndex(index);
    }
    setContextMenu({ x: e.clientX, y: e.clientY });
  }

  const [overrideConfirm, setOverrideConfirm] = useState<{ product: AVProduct; existingId: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  async function addToOrgLibrary(product: AVProduct) {
    if (!activeOrg) return;
    setAddingToOrg(true);
    const { data: existing } = await supabase
      .from("equipment_library")
      .select("id")
      .eq("org_id", activeOrg.id)
      .eq("manufacturer", product.manufacturer)
      .eq("model", product.model_name)
      .maybeSingle();
    if (existing) {
      setAddingToOrg(false);
      setOverrideConfirm({ product, existingId: existing.id });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from("equipment_library").insert({
        user_id: user.id,
        org_id: activeOrg.id,
        category: product.category,
        manufacturer: product.manufacturer,
        model: product.model_name,
        description: product.type || "",
        unit_cost: product.price ?? 0,
        part_number: product.part_number,
        msrp: product.msrp,
        cost: product.cost,
        color: product.color,
        ports: product.ports ?? [],
        amp_draw: product.amp_draw,
        voltage: product.voltage,
        power_watts: product.power_watts,
        btu_hr: product.btu_hr,
        rack_mounted: product.rack_mounted ?? false,
        rack_units: product.rack_units,
        width_in: product.width_in,
        height_in: product.height_in,
        depth_in: product.depth_in,
        weight_lb: product.weight_lb,
      });
      if (!error) setAddedIds((prev) => new Set(prev).add(product.id));
    }
    setAddingToOrg(false);
  }

  async function confirmOverride() {
    if (!overrideConfirm) return;
    const { product, existingId } = overrideConfirm;
    setAddingToOrg(true);
    const { error } = await supabase
      .from("equipment_library")
      .update({
        category: product.category,
        manufacturer: product.manufacturer,
        model: product.model_name,
        description: product.type || "",
        unit_cost: product.price ?? 0,
        part_number: product.part_number,
        msrp: product.msrp,
        cost: product.cost,
        color: product.color,
        ports: product.ports ?? [],
        amp_draw: product.amp_draw,
        voltage: product.voltage,
        power_watts: product.power_watts,
        btu_hr: product.btu_hr,
        rack_mounted: product.rack_mounted ?? false,
        rack_units: product.rack_units,
        width_in: product.width_in,
        height_in: product.height_in,
        depth_in: product.depth_in,
        weight_lb: product.weight_lb,
      })
      .eq("id", existingId);
    if (!error) setAddedIds((prev) => new Set(prev).add(product.id));
    setAddingToOrg(false);
    setOverrideConfirm(null);
  }

  useEffect(() => {
    getFilterOptions()
      .then(({ categories, manufacturers }) => {
        setCategories(categories);
        setManufacturers(manufacturers);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    listProducts({ search: debouncedSearch, category: filterCategory, manufacturer: filterManufacturer, offset: 0, limit: LIBRARY_PAGE_SIZE })
      .then(({ data, count }) => {
        setProducts(data);
        setTotal(count);
      })
      .finally(() => setLoading(false));
  }, [debouncedSearch, filterCategory, filterManufacturer]);

  function loadMore() {
    setLoadingMore(true);
    listProducts({
      search: debouncedSearch,
      category: filterCategory,
      manufacturer: filterManufacturer,
      offset: products.length,
      limit: LIBRARY_PAGE_SIZE,
    })
      .then(({ data }) => setProducts((prev) => [...prev, ...data]))
      .finally(() => setLoadingMore(false));
  }

  async function handleSaveProduct() {
    if (!editingProduct || !editingProduct.manufacturer.trim() || !editingProduct.model_name.trim()) return;
    setSavingProduct(true);
    const { id, ...patch } = editingProduct;
    const { error } = await updateProduct(id, patch);
    if (!error) {
      setProducts((prev) => prev.map((p) => (p.id === id ? editingProduct : p)));
    }
    setSavingProduct(false);
    setEditingProduct(null);
  }

  async function handleSaveNewProduct() {
    if (!newProduct || !newProduct.manufacturer.trim() || !newProduct.model_name.trim()) return;
    setSavingNewProduct(true);
    const { id, ...rest } = newProduct;
    const { id: insertedId, error } = await createProduct(rest);
    if (!error && insertedId) {
      setProducts((prev) => [{ ...newProduct, id: insertedId }, ...prev]);
      setTotal((prev) => prev + 1);
      setNewProduct(null);
    }
    setSavingNewProduct(false);
  }

  async function handleDeleteProduct() {
    if (!pendingDeleteProduct) return;
    setDeletingProduct(true);
    await deleteProduct(pendingDeleteProduct.id);
    setProducts((prev) => prev.filter((p) => p.id !== pendingDeleteProduct.id));
    setTotal((prev) => Math.max(0, prev - 1));
    setDeletingProduct(false);
    setPendingDeleteProduct(null);
  }

  return (
    <div className="animate-fade-in px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-[13px] text-muted hover:text-heading transition-colors">
            <ArrowLeftIcon />
            Library
          </button>
          <span className="text-border">/</span>
          <h2 className="text-xl font-bold text-heading">AV Forge Equipment Library</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-subtle">{total} products</span>
          <button
            onClick={() => setNewProduct(emptyAVProduct())}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-blue-500"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by manufacturer, model, type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="forge-input w-full pl-8 text-[13px]"
          />
        </div>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="forge-input w-auto min-w-[140px] text-[13px]">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={filterManufacturer} onChange={(e) => setFilterManufacturer(e.target.value)} className="forge-input w-auto min-w-[160px] text-[13px]">
          <option value="">All manufacturers</option>
          {manufacturers.map((m) => <option key={m}>{m}</option>)}
        </select>
        {(search || filterCategory || filterManufacturer) && (
          <button
            onClick={() => { setSearch(""); setFilterCategory(""); setFilterManufacturer(""); }}
            className="text-[12px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
          >
            Clear
          </button>
        )}
        {selectedIds.size > 0 && (
          <span className="text-[12px] font-medium text-blue-400">
            {selectedIds.size} selected ·{" "}
            <button onClick={() => { setSelectedIds(new Set()); setAnchorIndex(null); }} className="font-medium text-blue-400 underline hover:text-blue-300">
              Clear
            </button>
          </span>
        )}
        <span className="ml-auto text-[12px] text-subtle">{products.length} of {total} loaded</span>
      </div>

      {bulkResult && (
        <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2 text-[12px] text-emerald-400">
          Added {bulkResult.added} item{bulkResult.added === 1 ? "" : "s"} to your organization&apos;s library.
          {bulkResult.skipped > 0 && ` ${bulkResult.skipped} already existed and ${bulkResult.skipped === 1 ? "was" : "were"} skipped.`}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-forge-surface/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="border-b border-border bg-forge-surface/60">
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted">Manufacturer / Model</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted">Category</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted">Type</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold text-muted">Price</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold text-muted">Rack</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted">Part #</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-[13px] text-subtle">Loading…</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-[13px] text-subtle">No products found.</td>
                </tr>
              ) : (
                products.map((p, index) => (
                  <tr
                    key={p.id}
                    onClick={(e) => handleRowClick(e, index)}
                    onDoubleClick={() => setSelected(p)}
                    onContextMenu={(e) => handleRowContextMenu(e, index)}
                    className={`cursor-pointer select-none border-b border-border/50 transition-colors ${
                      selectedIds.has(p.id) ? "bg-blue-500/10 hover:bg-blue-500/15" : "hover:bg-forge-surface/40"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: p.color || "#64748b" }} />
                        <div>
                          <div className="text-[13px] font-semibold text-heading">{p.manufacturer}</div>
                          <div className="text-[11px] text-subtle">{p.model_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-body">{p.category}</td>
                    <td className="px-4 py-3 text-[12px] text-subtle">{p.type}</td>
                    <td className="px-4 py-3 text-right font-mono text-[12px] text-body">
                      {p.price ? `$${p.price.toLocaleString()}` : <span className="text-faint">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-[12px] text-subtle">
                      {p.rack_mounted ? `${p.rack_units ?? "—"}U` : <span className="text-faint">—</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-subtle">{p.part_number || <span className="text-faint">—</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={(e) => { e.stopPropagation(); setEditingProduct({ ...p }); }} className="rounded-md p-1.5 text-muted transition-colors hover:bg-forge-surface hover:text-heading" title="Edit">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setPendingDeleteProduct(p); }} className="rounded-md p-1.5 text-muted transition-colors hover:bg-red-500/10 hover:text-red-400" title="Delete">
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && products.length < total && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-lg border border-border bg-forge-surface/40 px-4 py-2 text-[12px] font-semibold text-muted transition-colors hover:text-body disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : `Load ${Math.min(LIBRARY_PAGE_SIZE, total - products.length)} more`}
          </button>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="flex w-full max-w-lg max-h-[85vh] flex-col rounded-2xl border border-border bg-forge-bg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
              <h3 className="text-[15px] font-bold text-heading">{selected.manufacturer} {selected.model_name}</h3>
              <button onClick={() => setSelected(null)} className="text-muted hover:text-heading transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 p-6 text-[13px]">
              <div className="grid grid-cols-2 gap-3">
                <DetailField label="Manufacturer" value={selected.manufacturer} />
                <DetailField label="Model" value={selected.model_name} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <DetailField label="Category" value={selected.category} />
                <DetailField label="Part Number" value={selected.part_number} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <DetailField label="Unit Cost" value={selected.price ? `$${selected.price.toLocaleString()}` : null} />
                <DetailField label="MSRP" value={selected.msrp ? `$${selected.msrp.toLocaleString()}` : null} />
                <DetailField label="Cost" value={selected.cost ? `$${selected.cost.toLocaleString()}` : null} />
              </div>
              <DetailField label="Type" value={selected.type} />

              <div className="border-t border-border pt-4">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">Power &amp; Electrical</div>
                <div className="grid grid-cols-2 gap-3">
                  <DetailField label="Voltage" value={selected.voltage ? `${selected.voltage}V` : null} />
                  <DetailField label="Amp Draw" value={selected.amp_draw ? `${selected.amp_draw}A` : null} />
                  <DetailField label="Power" value={selected.power_watts ? `${selected.power_watts}W` : null} />
                  <DetailField label="BTU/hr" value={selected.btu_hr ? `${selected.btu_hr}` : null} />
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">Physical</div>
                <DetailField label="Rack Mounted" value={selected.rack_mounted ? `Yes (${selected.rack_units ?? "?"}U)` : "No"} />
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <DetailField label="Weight (lb)" value={selected.weight_lb} />
                  <div className="grid grid-cols-3 gap-2">
                    <DetailField label="W (in)" value={selected.width_in} />
                    <DetailField label="H (in)" value={selected.height_in} />
                    <DetailField label="D (in)" value={selected.depth_in} />
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">Ports</div>
                {selected.ports && selected.ports.length > 0 ? (
                  <div className="space-y-2">
                    {selected.ports.map((port, i) => (
                      <div key={i} className="grid grid-cols-5 gap-2 rounded-md border border-border bg-forge-surface/40 px-2.5 py-1.5 text-[12px]">
                        <span className="text-body capitalize">{port.side}</span>
                        <span className="text-body uppercase">{port.dir}</span>
                        <span className="text-body">{port.signal || <span className="text-faint">—</span>}</span>
                        <span className="text-body">{port.label || <span className="text-faint">—</span>}</span>
                        <span className="text-body">{port.connector || <span className="text-faint">—</span>}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] text-faint">No ports defined.</p>
                )}
              </div>

              {selected.notes && (
                <div className="border-t border-border pt-4">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-faint">Notes</div>
                  <p className="text-[12px] text-body">{selected.notes}</p>
                </div>
              )}
            </div>
            <div className="shrink-0 border-t border-border px-6 py-4">
              <button
                onClick={() => addToOrgLibrary(selected)}
                disabled={!activeOrg || addingToOrg}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {addedIds.has(selected.id) ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Added to My Organization&apos;s Equipment Library
                  </>
                ) : addingToOrg ? (
                  "Adding…"
                ) : (
                  "+ Add to My Organization's Equipment Library"
                )}
              </button>
              {!activeOrg && (
                <p className="mt-2 text-center text-[11px] text-faint">Select an organization first to add products to its library.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Override confirmation */}
      {overrideConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-forge-bg p-6 shadow-2xl">
            <h3 className="text-[15px] font-bold text-heading">Already in your library</h3>
            <p className="mt-2 text-[13px] text-muted">
              {overrideConfirm.product.manufacturer} {overrideConfirm.product.model_name} is already in your Organization&apos;s Equipment Library. Do you want to override it with the current AV Forge Equipment Library details?
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={() => setOverrideConfirm(null)}
                className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:text-body"
              >
                Cancel
              </button>
              <button
                onClick={confirmOverride}
                disabled={addingToOrg}
                className="rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                {addingToOrg ? "Updating…" : "Yes, Override"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right-click context menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
          />
          <div
            className="fixed z-50 w-64 overflow-hidden rounded-lg border border-border bg-forge-panel py-1 shadow-xl"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => { setContextMenu(null); addSelectedToOrgLibrary(); }}
              disabled={!activeOrg || bulkAdding}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-body transition-colors hover:bg-forge-surface/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </span>
              Add to My Organization&apos;s Equipment Library{selectedIds.size > 1 ? ` (${selectedIds.size})` : ""}
            </button>
          </div>
        </>
      )}

      {/* Edit Modal */}
      {editingProduct && (
        <EquipmentFormModal
          title="Edit Product"
          value={avProductToFormValue(editingProduct)}
          onChange={(v) => setEditingProduct(applyFormValueToAVProduct(editingProduct, v))}
          onCancel={() => setEditingProduct(null)}
          onSave={handleSaveProduct}
          saving={savingProduct}
          saveDisabled={!editingProduct.manufacturer.trim() || !editingProduct.model_name.trim()}
          categories={categories}
          notesLabel="Type"
        />
      )}

      {/* Add Modal */}
      {newProduct && (
        <EquipmentFormModal
          title="Add Product"
          value={avProductToFormValue(newProduct)}
          onChange={(v) => setNewProduct(applyFormValueToAVProduct(newProduct, v))}
          onCancel={() => setNewProduct(null)}
          onSave={handleSaveNewProduct}
          saving={savingNewProduct}
          saveDisabled={!newProduct.manufacturer.trim() || !newProduct.model_name.trim()}
          categories={categories}
          notesLabel="Type"
          showAIImport
        />
      )}

      {/* Delete confirmation */}
      {pendingDeleteProduct && (
        <ConfirmDialog
          title="Delete product"
          message={<>Delete <span className="font-semibold text-heading">{pendingDeleteProduct.manufacturer} {pendingDeleteProduct.model_name}</span> from the AV Forge Equipment Library? This removes it for every organization and cannot be undone.</>}
          busy={deletingProduct}
          onCancel={() => setPendingDeleteProduct(null)}
          onConfirm={handleDeleteProduct}
        />
      )}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <div className="text-[11px] text-muted">{label}</div>
      <div className="text-[13px] text-body">{value ?? <span className="text-faint">—</span>}</div>
    </div>
  );
}

// ── My Organization's Equipment Library ──────────────────────────────────────

const emptyOrgItem = (orgId: string): Omit<OrgEquipmentItem, "id" | "user_id"> => ({
  org_id: orgId,
  category: "",
  manufacturer: "",
  model: "",
  description: "",
  unit_cost: 0,
  part_number: null,
  msrp: null,
  cost: null,
  color: null,
  ports: [],
  amp_draw: null,
  voltage: null,
  power_watts: null,
  btu_hr: null,
  rack_mounted: false,
  rack_units: null,
  width_in: null,
  height_in: null,
  depth_in: null,
  weight_lb: null,
});

function orgItemToFormValue(item: OrgEquipmentItem | Omit<OrgEquipmentItem, "id" | "user_id">): EquipmentFormValue {
  return {
    manufacturer: item.manufacturer,
    model: item.model,
    category: item.category,
    notes: item.description,
    unitCost: item.unit_cost,
    partNumber: item.part_number,
    msrp: item.msrp,
    cost: item.cost,
    ports: item.ports,
    ampDraw: item.amp_draw,
    voltage: item.voltage,
    powerWatts: item.power_watts,
    btuHr: item.btu_hr,
    rackMounted: item.rack_mounted,
    rackUnits: item.rack_units,
    widthIn: item.width_in,
    heightIn: item.height_in,
    depthIn: item.depth_in,
    weightLb: item.weight_lb,
  };
}

function applyFormValueToOrgItem<T extends OrgEquipmentItem | Omit<OrgEquipmentItem, "id" | "user_id">>(base: T, v: EquipmentFormValue): T {
  return {
    ...base,
    manufacturer: v.manufacturer,
    model: v.model,
    category: v.category,
    description: v.notes,
    unit_cost: v.unitCost,
    part_number: v.partNumber,
    msrp: v.msrp,
    cost: v.cost,
    ports: v.ports,
    amp_draw: v.ampDraw,
    voltage: v.voltage,
    power_watts: v.powerWatts,
    btu_hr: v.btuHr,
    rack_mounted: v.rackMounted,
    rack_units: v.rackUnits,
    width_in: v.widthIn,
    height_in: v.heightIn,
    depth_in: v.depthIn,
    weight_lb: v.weightLb,
  };
}

function OrgLibraryView({ onBack }: { onBack: () => void }) {
  const { activeOrg } = useOrg();
  const [items, setItems] = useState<OrgEquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<OrgEquipmentItem | Omit<OrgEquipmentItem, "id" | "user_id"> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<OrgEquipmentItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [anchorIndex, setAnchorIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  useEffect(() => {
    if (!activeOrg) { setLoading(false); return; }
    setLoading(true);
    supabase
      .from("equipment_library")
      .select("*")
      .eq("org_id", activeOrg.id)
      .order("manufacturer")
      .order("model")
      .then(({ data }) => {
        setItems((data as OrgEquipmentItem[]) ?? []);
        setLoading(false);
      });
  }, [activeOrg?.id]);

  const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean))).sort();

  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    const matchSearch = !q || item.manufacturer.toLowerCase().includes(q) || item.model.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
    const matchCat = !filterCategory || item.category === filterCategory;
    return matchSearch && matchCat;
  });

  function handleRowClick(e: React.MouseEvent, index: number) {
    const item = filtered[index];
    if (e.shiftKey && anchorIndex !== null) {
      const [start, end] = [Math.min(anchorIndex, index), Math.max(anchorIndex, index)];
      setSelectedIds(new Set(filtered.slice(start, end + 1).map((i) => i.id)));
    } else if (e.ctrlKey || e.metaKey) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(item.id)) next.delete(item.id);
        else next.add(item.id);
        return next;
      });
      setAnchorIndex(index);
    } else {
      setSelectedIds(new Set([item.id]));
      setAnchorIndex(index);
    }
  }

  function handleRowContextMenu(e: React.MouseEvent, index: number) {
    e.preventDefault();
    const item = filtered[index];
    if (!selectedIds.has(item.id)) {
      setSelectedIds(new Set([item.id]));
      setAnchorIndex(index);
    }
    setContextMenu({ x: e.clientX, y: e.clientY });
  }

  async function confirmBulkDelete() {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    const ids = [...selectedIds];
    await supabase.from("equipment_library").delete().in("id", ids);
    setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
    setSelectedIds(new Set());
    setAnchorIndex(null);
    setDeleting(false);
    setBulkDeleteConfirm(false);
  }

  async function confirmBulkEdit() {
    if (selectedIds.size === 0 || !bulkCategory.trim()) return;
    setBulkSaving(true);
    const ids = [...selectedIds];
    const category = bulkCategory.trim();
    const { error } = await supabase.from("equipment_library").update({ category }).in("id", ids);
    if (!error) {
      setItems((prev) => prev.map((i) => (selectedIds.has(i.id) ? { ...i, category } : i)));
      setSelectedIds(new Set());
      setAnchorIndex(null);
    }
    setBulkSaving(false);
    setBulkEditOpen(false);
  }

  function openNew() {
    if (!activeOrg) return;
    setEditing(emptyOrgItem(activeOrg.id));
    setShowModal(true);
  }

  function openEdit(item: OrgEquipmentItem) {
    setEditing({ ...item });
    setShowModal(true);
  }

  async function handleSave() {
    if (!editing || !activeOrg || !editing.manufacturer.trim() || !editing.model.trim()) return;
    setSaving(true);
    if ("id" in editing) {
      const { error } = await supabase
        .from("equipment_library")
        .update({
          category: editing.category,
          manufacturer: editing.manufacturer,
          model: editing.model,
          description: editing.description,
          unit_cost: editing.unit_cost,
          part_number: editing.part_number,
          msrp: editing.msrp,
          cost: editing.cost,
          color: editing.color,
          ports: editing.ports,
          amp_draw: editing.amp_draw,
          voltage: editing.voltage,
          power_watts: editing.power_watts,
          btu_hr: editing.btu_hr,
          rack_mounted: editing.rack_mounted,
          rack_units: editing.rack_units,
          width_in: editing.width_in,
          height_in: editing.height_in,
          depth_in: editing.depth_in,
          weight_lb: editing.weight_lb,
        })
        .eq("id", editing.id);
      if (!error) setItems((prev) => prev.map((i) => (i.id === editing.id ? (editing as OrgEquipmentItem) : i)));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("equipment_library")
          .insert({ ...editing, user_id: user.id })
          .select("*")
          .single();
        if (!error && data) setItems((prev) => [...prev, data as OrgEquipmentItem]);
      }
    }
    setSaving(false);
    setShowModal(false);
    setEditing(null);
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    await supabase.from("equipment_library").delete().eq("id", deleteConfirm.id);
    setItems((prev) => prev.filter((i) => i.id !== deleteConfirm.id));
    setDeleting(false);
    setDeleteConfirm(null);
  }

  const inputCls = "w-full rounded-lg border border-border bg-forge-surface/60 px-3 py-2 text-[13px] text-heading placeholder:text-faint focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30";
  const labelCls = "mb-1 block text-[11px] font-medium text-muted";

  if (!activeOrg) {
    return (
      <div className="animate-fade-in px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-[13px] text-muted hover:text-heading transition-colors">
            <ArrowLeftIcon />
            Library
          </button>
        </div>
        <div className="py-20 text-center text-sm text-subtle">Select an organization first.</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-[13px] text-muted hover:text-heading transition-colors">
            <ArrowLeftIcon />
            Library
          </button>
          <span className="text-border">/</span>
          <h2 className="text-xl font-bold text-heading">My Organization&apos;s Equipment Library</h2>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-blue-500"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Equipment
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by manufacturer, model, description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="forge-input w-full pl-8 text-[13px]"
          />
        </div>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="forge-input w-auto min-w-[140px] text-[13px]">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        {(search || filterCategory) && (
          <button onClick={() => { setSearch(""); setFilterCategory(""); }} className="text-[12px] font-medium text-blue-400 hover:text-blue-300 transition-colors">
            Clear
          </button>
        )}
        {selectedIds.size > 0 && (
          <span className="text-[12px] font-medium text-blue-400">
            {selectedIds.size} selected ·{" "}
            <button onClick={() => { setSelectedIds(new Set()); setAnchorIndex(null); }} className="font-medium text-blue-400 underline hover:text-blue-300">
              Clear
            </button>
          </span>
        )}
        <span className="ml-auto text-[12px] text-subtle">{filtered.length} of {items.length} items</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-forge-surface/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-border bg-forge-surface/60">
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted">Manufacturer / Model</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted">Category</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted">Description</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold text-muted">Unit Cost</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-[13px] text-subtle">Loading…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-[13px] text-subtle">
                    {items.length === 0 ? (
                      <>
                        No equipment yet.{" "}
                        <button onClick={openNew} className="text-blue-400 hover:text-blue-300 transition-colors">Add your first equipment</button>
                        {" "}or add equipment from the AV Forge Equipment Library.
                      </>
                    ) : (
                      "No items found."
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((item, index) => (
                  <tr
                    key={item.id}
                    onClick={(e) => handleRowClick(e, index)}
                    onDoubleClick={() => openEdit(item)}
                    onContextMenu={(e) => handleRowContextMenu(e, index)}
                    className={`cursor-pointer select-none border-b border-border/50 transition-colors ${
                      selectedIds.has(item.id) ? "bg-blue-500/10 hover:bg-blue-500/15" : "hover:bg-forge-surface/40"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="text-[13px] font-semibold text-heading">{item.manufacturer}</div>
                      <div className="text-[11px] text-subtle">{item.model}</div>
                    </td>
                    <td className="px-4 py-3">
                      {item.category ? (
                        <span className="inline-flex items-center rounded-full bg-forge-surface px-2.5 py-0.5 text-[11px] font-medium text-muted">{item.category}</span>
                      ) : <span className="text-faint">—</span>}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-body">{item.description || <span className="text-faint">—</span>}</td>
                    <td className="px-4 py-3 text-right font-mono text-[12px] text-body">
                      {item.unit_cost ? `$${item.unit_cost.toLocaleString()}` : <span className="text-faint">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={(e) => { e.stopPropagation(); openEdit(item); }} className="rounded-md p-1.5 text-muted transition-colors hover:bg-forge-surface hover:text-heading">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(item); }} className="rounded-md p-1.5 text-muted transition-colors hover:bg-red-500/10 hover:text-red-400">
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && editing && (
        <EquipmentFormModal
          title={"id" in editing ? "Edit Item" : "Add Item"}
          value={orgItemToFormValue(editing)}
          onChange={(v) => setEditing(applyFormValueToOrgItem(editing, v))}
          onCancel={() => { setShowModal(false); setEditing(null); }}
          onSave={handleSave}
          saving={saving}
          saveDisabled={!editing.manufacturer.trim() || !editing.model.trim()}
          categories={categories}
          showAIImport={!("id" in editing)}
        />
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-forge-bg p-6 shadow-2xl">
            <h3 className="text-[15px] font-bold text-heading">Delete item?</h3>
            <p className="mt-2 text-[13px] text-muted">
              Delete <span className="font-medium text-body">{deleteConfirm.manufacturer} {deleteConfirm.model}</span> from your organization&apos;s equipment library? This cannot be undone.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:text-body"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right-click context menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
          />
          <div
            className="fixed z-50 w-44 overflow-hidden rounded-lg border border-border bg-forge-panel py-1 shadow-xl"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => { setContextMenu(null); setBulkCategory(""); setBulkEditOpen(true); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-body transition-colors hover:bg-forge-surface/60"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit{selectedIds.size > 1 ? ` (${selectedIds.size})` : ""}
            </button>
            <button
              onClick={() => { setContextMenu(null); setBulkDeleteConfirm(true); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-red-400 transition-colors hover:bg-red-500/10"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
              </svg>
              Delete{selectedIds.size > 1 ? ` (${selectedIds.size})` : ""}
            </button>
          </div>
        </>
      )}

      {/* Bulk delete confirmation */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-forge-bg p-6 shadow-2xl">
            <h3 className="text-[15px] font-bold text-heading">Delete {selectedIds.size} item{selectedIds.size === 1 ? "" : "s"}?</h3>
            <p className="mt-2 text-[13px] text-muted">
              This will permanently remove the selected equipment from your organization&apos;s library. This cannot be undone.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={() => setBulkDeleteConfirm(false)}
                className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:text-body"
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk edit — category only, for now */}
      {bulkEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-forge-bg shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="text-[15px] font-bold text-heading">Edit {selectedIds.size} item{selectedIds.size === 1 ? "" : "s"}</h3>
              <button onClick={() => setBulkEditOpen(false)} className="text-muted hover:text-heading transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-[12px] text-subtle">Only Category can be bulk-updated for now.</p>
              <div>
                <label className={labelCls}>Category</label>
                <input
                  type="text"
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. Display"
                  list="org-lib-bulk-categories"
                  autoFocus
                />
                <datalist id="org-lib-bulk-categories">
                  {categories.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
              <button onClick={() => setBulkEditOpen(false)} className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:text-body">
                Cancel
              </button>
              <button onClick={confirmBulkEdit} disabled={bulkSaving || !bulkCategory.trim()} className="rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50">
                {bulkSaving ? "Saving…" : "Update Category"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Placeholder sections ─────────────────────────────────────────────────────

function PlaceholderView({ label, description, icon, iconBg, iconColor, onBack }: {
  label: string; description: string; icon: React.ReactNode;
  iconBg: string; iconColor: string; onBack: () => void;
}) {
  return (
    <div className="animate-fade-in px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[13px] text-muted hover:text-heading transition-colors">
          <ArrowLeftIcon />
          Library
        </button>
        <span className="text-border">/</span>
        <h2 className="text-xl font-bold text-heading">{label}</h2>
      </div>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${iconBg} ${iconColor}`}>
          {icon}
        </div>
        <div className="text-[16px] font-semibold text-heading">{label}</div>
        <div className="mt-2 text-[13px] text-muted max-w-sm">{description}</div>
        <div className="mt-4 rounded-full border border-border px-4 py-1.5 text-[12px] text-subtle">Coming soon</div>
      </div>
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────

export default function LibraryPage() {
  return (
    <Suspense fallback={null}>
      <LibraryPageInner />
    </Suspense>
  );
}

function LibraryPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSection = searchParams.get("section") as Section | null;

  function goToSection(section: Section | null) {
    router.push(section ? `/inventory?section=${section}` : "/inventory");
  }

  if (activeSection === "inventory") {
    return <InventoryView onBack={() => goToSection(null)} />;
  }

  if (activeSection === "org") {
    return <OrgLibraryView onBack={() => goToSection(null)} />;
  }

  if (activeSection === "avforge") {
    return <AVForgeLibraryView onBack={() => goToSection(null)} />;
  }

  return <LandingView onSelect={goToSection} />;
}
