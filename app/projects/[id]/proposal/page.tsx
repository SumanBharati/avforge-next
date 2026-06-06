"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useOrg } from "@/components/OrgProvider";



interface LineItem {
  id: string;
  category: string;
  manufacturer: string;
  model: string;
  description: string;
  qty: number;
  unitCost: number;
  laborHours: number;
  laborRate: number;
}

interface ProposalData {
  clientName: string;
  projectName: string;
  scopeOfWork: string;
  sections: { id: string; name: string; items: LineItem[] }[];
  taxRate: number;
  marginPercent: number;
}

const CATEGORIES = [
  "Display", "Audio", "Video Processing", "Control System", "Cabling",
  "Mounting Hardware", "Networking", "Miscellaneous",
];

interface EquipmentEntry {
  id: string;
  category: string;
  manufacturer: string;
  model: string;
  description: string;
  unitCost: number;
}



const DEFAULT_LIBRARY: EquipmentEntry[] = [
  { id: "eq-1",  category: "Display",           manufacturer: "Samsung",     model: "QM85R",           description: "85\" 4K UHD Commercial Display",               unitCost: 3200 },
  { id: "eq-2",  category: "Display",           manufacturer: "LG",          model: "LAEC015",         description: "LED All-in-One 136\" Display",                  unitCost: 18500 },
  { id: "eq-3",  category: "Display",           manufacturer: "Epson",       model: "EB-PU2220B",      description: "20,000 Lumen WUXGA 3LCD Laser Projector",      unitCost: 14500 },
  { id: "eq-4",  category: "Audio",             manufacturer: "Shure",       model: "MXA920",          description: "Ceiling Array Microphone",                     unitCost: 2800 },
  { id: "eq-5",  category: "Audio",             manufacturer: "QSC",         model: "Core 110f",       description: "Q-SYS Network Audio DSP",                      unitCost: 4200 },
  { id: "eq-6",  category: "Audio",             manufacturer: "JBL",         model: "CBT 70J-1",       description: "Constant Beamwidth Column Speaker",            unitCost: 1100 },
  { id: "eq-7",  category: "Audio",             manufacturer: "Biamp",       model: "TesiraFORTE AI",  description: "AVB DSP with 12 analog inputs",                unitCost: 3600 },
  { id: "eq-8",  category: "Video Processing",  manufacturer: "Crestron",    model: "DM-NVX-363",      description: "4K60 HDR Network AV Encoder/Decoder",          unitCost: 2100 },
  { id: "eq-9",  category: "Video Processing",  manufacturer: "Extron",      model: "DTP2 T 212",      description: "4K/60 HDMI Twisted Pair Transmitter",          unitCost: 680 },
  { id: "eq-10", category: "Video Processing",  manufacturer: "Barco",       model: "E2",              description: "Event Master Presentation Processor",          unitCost: 32000 },
  { id: "eq-11", category: "Control System",    manufacturer: "Crestron",    model: "CP4N",            description: "4-Series Control Processor",                   unitCost: 3500 },
  { id: "eq-12", category: "Control System",    manufacturer: "Crestron",    model: "TSW-1070",        description: "10.1\" Touch Screen",                          unitCost: 2200 },
  { id: "eq-13", category: "Control System",    manufacturer: "Extron",      model: "IPCP Pro 550",    description: "IP Link Pro Control Processor",                unitCost: 2800 },
  { id: "eq-14", category: "Cabling",           manufacturer: "Crestron",    model: "CBL-HD-30",       description: "HDMI Cable, 30ft, Plenum Rated",               unitCost: 85 },
  { id: "eq-15", category: "Cabling",           manufacturer: "Liberty",     model: "?"  ,             description: "Cat6A Plenum Cable, 1000ft Box",               unitCost: 320 },
  { id: "eq-16", category: "Mounting Hardware",  manufacturer: "Chief",       model: "XTM1U",           description: "X-Large Flat Panel Tilt Wall Mount",           unitCost: 350 },
  { id: "eq-17", category: "Mounting Hardware",  manufacturer: "Peerless-AV", model: "DS-VW765-LQR",   description: "Full-Service Video Wall Mount",                unitCost: 280 },
  { id: "eq-18", category: "Networking",        manufacturer: "Cisco",       model: "C9300-48P",       description: "Catalyst 9300 48-Port PoE+ Switch",            unitCost: 8500 },
  { id: "eq-19", category: "Networking",        manufacturer: "Netgear",     model: "M4300-96X",       description: "96-Port Managed AV-over-IP Switch",            unitCost: 12000 },
  { id: "eq-20", category: "Audio",             manufacturer: "Sennheiser",  model: "TeamConnect Bar M", description: "All-in-One Video Bar for Medium Rooms",       unitCost: 3200 },
];


function newItem(): LineItem {
  return {
    id: crypto.randomUUID(),
    category: CATEGORIES[0],
    manufacturer: "",
    model: "",
    description: "",
    qty: 1,
    unitCost: 0,
    laborHours: 0,
    laborRate: 85,
  };
}

function newSection(name = "New Section"): { id: string; name: string; items: LineItem[] } {
  return { id: crypto.randomUUID(), name, items: [] };
}

const defaultProposal: ProposalData = {
  clientName: "",
  projectName: "",
  scopeOfWork: "",
  sections: [newSection("Bill of Materials")],
  taxRate: 8.25,
  marginPercent: 30,
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Room {
  id: string;
  name: string;
  data: Record<string, string>;
}

export default function ProposalPage({ params }: { params: { id: string } }) {
  const { activeOrg } = useOrg();
  const [proposal, setProposal] = useState<ProposalData>(defaultProposal);
  const [activeSection, setActiveSection] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [modalTab, setModalTab] = useState<"library" | "create">("library");
  const [library, setLibrary] = useState<EquipmentEntry[]>([]);
  const [newEquip, setNewEquip] = useState<Omit<EquipmentEntry, "id">>({
    category: CATEGORIES[0], manufacturer: "", model: "", description: "", unitCost: 0,
  });

  // Load
  useEffect(() => {
    // Load project name
    supabase.from("projects").select("name").eq("id", params.id).single()
      .then(({ data }) => { if (data) setProjectName(data.name || ""); });

    // Load equipment library (org-scoped)
    if (activeOrg) {
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) return;
        const { data } = await supabase.from("equipment_library").select("*").eq("org_id", activeOrg.id);
        if (data && data.length > 0) {
          setLibrary(data.map(d => ({ id: d.id, category: d.category, manufacturer: d.manufacturer, model: d.model, description: d.description || "", unitCost: Number(d.unit_cost) })));
        } else {
          // Seed default library for this org
          const rows = DEFAULT_LIBRARY.map(e => ({ org_id: activeOrg.id, user_id: user.id, category: e.category, manufacturer: e.manufacturer, model: e.model, description: e.description, unit_cost: e.unitCost }));
          await supabase.from("equipment_library").insert(rows);
          setLibrary(DEFAULT_LIBRARY);
        }
      });
    }

    // Load rooms from survey
    supabase.from("site_surveys").select("data").eq("project_id", params.id).single()
      .then(({ data: surveyRow }) => {
        const survey = surveyRow?.data as { buildings?: { rooms?: Room[] }[] } | null;
        const building = survey?.buildings?.[0];
        if (building?.rooms?.length) {
          setRooms(building.rooms as Room[]);
          setActiveRoom(building.rooms[0].id);
        }
      });

    // Load proposal
    supabase.from("proposals").select("data").eq("project_id", params.id).single()
      .then(({ data: row }) => {
        if (row?.data) {
          const data = row.data as ProposalData;
          setProposal(data);
          if (data.sections?.length > 0) setActiveSection(data.sections[0].id);
        } else {
          setActiveSection(defaultProposal.sections[0].id);
        }
      });
  }, [params.id]);

  const handleSave = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("proposals").upsert({
      project_id: params.id, user_id: user.id, data: proposal,
    }, { onConflict: "project_id" });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [params.id, proposal]);

  // Section helpers
  function addSection() {
    const s = newSection();
    setProposal((p) => ({ ...p, sections: [...p.sections, s] }));
    setActiveSection(s.id);
  }

  function removeSection(sectionId: string) {
    setProposal((p) => {
      const sections = p.sections.filter((s) => s.id !== sectionId);
      if (activeSection === sectionId && sections.length > 0) {
        setActiveSection(sections[0].id);
      }
      return { ...p, sections };
    });
  }

  function renameSection(sectionId: string, name: string) {
    setProposal((p) => ({
      ...p,
      sections: p.sections.map((s) => (s.id === sectionId ? { ...s, name } : s)),
    }));
  }

  // Item helpers
  function addItem(sectionId: string) {
    setProposal((p) => ({
      ...p,
      sections: p.sections.map((s) =>
        s.id === sectionId ? { ...s, items: [...s.items, newItem()] } : s
      ),
    }));
  }

  function removeItem(sectionId: string, itemId: string) {
    setProposal((p) => ({
      ...p,
      sections: p.sections.map((s) =>
        s.id === sectionId ? { ...s, items: s.items.filter((i) => i.id !== itemId) } : s
      ),
    }));
  }

  function updateItem(sectionId: string, itemId: string, field: keyof LineItem, value: string | number) {
    setProposal((p) => ({
      ...p,
      sections: p.sections.map((s) =>
        s.id === sectionId
          ? { ...s, items: s.items.map((i) => (i.id === itemId ? { ...i, [field]: value } : i)) }
          : s
      ),
    }));
  }

  function addItemFromEquipment(entry: EquipmentEntry) {
    if (!currentSection) return;
    const item: LineItem = {
      id: crypto.randomUUID(),
      category: entry.category,
      manufacturer: entry.manufacturer,
      model: entry.model,
      description: entry.description,
      qty: 1,
      unitCost: entry.unitCost,
      laborHours: 0,
      laborRate: 85,
    };
    setProposal((p) => ({
      ...p,
      sections: p.sections.map((s) =>
        s.id === currentSection.id ? { ...s, items: [...s.items, item] } : s
      ),
    }));
    setShowAddModal(false);
    setModalSearch("");
  }

  async function handleCreateAndAdd() {
    const entry: EquipmentEntry = { id: crypto.randomUUID(), ...newEquip };
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("equipment_library").insert({
        org_id: activeOrg?.id, user_id: user.id, category: entry.category, manufacturer: entry.manufacturer,
        model: entry.model, description: entry.description, unit_cost: entry.unitCost,
      });
    }
    setLibrary((prev) => [...prev, entry]);
    addItemFromEquipment(entry);
    setNewEquip({ category: CATEGORIES[0], manufacturer: "", model: "", description: "", unitCost: 0 });
    setModalTab("library");
  }

  const filteredLibrary = library.filter((e) => {
    if (!modalSearch) return true;
    const q = modalSearch.toLowerCase();
    return (
      e.manufacturer.toLowerCase().includes(q) ||
      e.model.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q)
    );
  });

  // Calculations
  const currentSection = proposal.sections.find((s) => s.id === activeSection);

  const allItems = proposal.sections.flatMap((s) => s.items);
  const totalEquipment = allItems.reduce((sum, i) => sum + i.qty * i.unitCost, 0);
  const totalLabor = allItems.reduce((sum, i) => sum + i.laborHours * i.laborRate, 0);
  const subtotal = totalEquipment + totalLabor;
  const tax = totalEquipment * (proposal.taxRate / 100);
  const marginAmount = subtotal * (proposal.marginPercent / 100);
  const grandTotal = subtotal + tax + marginAmount;

  function sectionSubtotal(s: { items: LineItem[] }) {
    return s.items.reduce((sum, i) => sum + i.qty * i.unitCost + i.laborHours * i.laborRate, 0);
  }

  return (
    <div className="animate-fade-in">
      {/* Top header */}
      <div className="border-b border-border bg-forge-panel/50 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <Link href={`/projects/${params.id}`} className="mb-2 inline-flex items-center gap-1.5 text-xs text-subtle hover:text-secondary">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              {projectName}
            </Link>
            <h1 className="flex items-center gap-2.5 text-xl font-bold text-heading">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Proposal
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
        {/* Sidebar */}
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
            <div className="flex flex-col gap-0.5">
              {rooms.map((room) => {
                const roomName = room.data?.room_name || room.name;
                const isActive = activeRoom === room.id;
                return (
                  <button
                    key={room.id}
                    onClick={() => setActiveRoom(room.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-all ${
                      isActive
                        ? "bg-forge-surface/60 font-semibold text-heading"
                        : "text-muted hover:bg-forge-surface/30 hover:text-secondary"
                    }`}
                  >
                    <svg width="14" height="14" viewBox="0 0 12 12" fill="none" className="shrink-0 text-subtle">
                      <rect x="1" y="1" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1" />
                    </svg>
                    <span className="truncate">{roomName}</span>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentSection ? (
            <div>
              {/* Section header */}
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    value={currentSection.name}
                    onChange={(e) => renameSection(currentSection.id, e.target.value)}
                    className="border-none bg-transparent text-lg font-bold text-heading outline-none focus:ring-0"
                  />
                  <span className="rounded-md bg-forge-surface/60 px-2 py-0.5 text-[11px] text-subtle">
                    {currentSection.items.length} item{currentSection.items.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {proposal.sections.length > 1 && (
                    <button
                      onClick={() => removeSection(currentSection.id)}
                      className="rounded-lg px-3 py-1.5 text-[12px] text-red-400 transition-colors hover:bg-red-500/10"
                    >
                      Delete Section
                    </button>
                  )}
                </div>
              </div>

              {/* Line items table */}
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-border bg-forge-panel/60 text-[11px] font-semibold uppercase tracking-wider text-subtle">
                      <th className="px-3 py-3">Category</th>
                      <th className="px-3 py-3">Manufacturer</th>
                      <th className="px-3 py-3">Model</th>
                      <th className="px-3 py-3 min-w-[200px]">Description</th>
                      <th className="px-3 py-3 text-right">Qty</th>
                      <th className="px-3 py-3 text-right">Unit Cost</th>
                      <th className="px-3 py-3 text-right">Labor Hrs</th>
                      <th className="px-3 py-3 text-right">Line Total</th>
                      <th className="w-10 px-2 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {currentSection.items.map((item) => {
                      const equipTotal = item.qty * item.unitCost;
                      const laborTotal = item.laborHours * item.laborRate;
                      const lineTotal = equipTotal + laborTotal;
                      return (
                        <tr key={item.id} className="border-b border-border/50 transition-colors hover:bg-forge-surface/20">
                          <td className="px-1 py-1">
                            <select
                              value={item.category}
                              onChange={(e) => updateItem(currentSection.id, item.id, "category", e.target.value)}
                              className="w-full rounded border-none bg-transparent px-2 py-2 text-[13px] text-secondary outline-none focus:ring-1 focus:ring-blue-500/40"
                            >
                              {CATEGORIES.map((c) => (
                                <option key={c} value={c} className="bg-forge-bg">{c}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-1 py-1">
                            <input
                              value={item.manufacturer}
                              onChange={(e) => updateItem(currentSection.id, item.id, "manufacturer", e.target.value)}
                              placeholder="e.g. Crestron"
                              className="w-full rounded border-none bg-transparent px-2 py-2 text-[13px] text-secondary outline-none placeholder:text-faint focus:ring-1 focus:ring-blue-500/40"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <input
                              value={item.model}
                              onChange={(e) => updateItem(currentSection.id, item.id, "model", e.target.value)}
                              placeholder="Model #"
                              className="w-full rounded border-none bg-transparent px-2 py-2 text-[13px] text-secondary outline-none placeholder:text-faint focus:ring-1 focus:ring-blue-500/40"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <input
                              value={item.description}
                              onChange={(e) => updateItem(currentSection.id, item.id, "description", e.target.value)}
                              placeholder="Item description"
                              className="w-full rounded border-none bg-transparent px-2 py-2 text-[13px] text-secondary outline-none placeholder:text-faint focus:ring-1 focus:ring-blue-500/40"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <input
                              type="number"
                              value={item.qty}
                              onChange={(e) => updateItem(currentSection.id, item.id, "qty", parseInt(e.target.value) || 0)}
                              className="w-full rounded border-none bg-transparent px-2 py-2 text-right text-[13px] text-secondary outline-none focus:ring-1 focus:ring-blue-500/40"
                              min="0"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <input
                              type="number"
                              value={item.unitCost}
                              onChange={(e) => updateItem(currentSection.id, item.id, "unitCost", parseFloat(e.target.value) || 0)}
                              className="w-full rounded border-none bg-transparent px-2 py-2 text-right text-[13px] text-secondary outline-none focus:ring-1 focus:ring-blue-500/40"
                              min="0"
                              step="0.01"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <input
                              type="number"
                              value={item.laborHours}
                              onChange={(e) => updateItem(currentSection.id, item.id, "laborHours", parseFloat(e.target.value) || 0)}
                              className="w-full rounded border-none bg-transparent px-2 py-2 text-right text-[13px] text-secondary outline-none focus:ring-1 focus:ring-blue-500/40"
                              min="0"
                              step="0.25"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-body">
                            ${fmt(lineTotal)}
                          </td>
                          <td className="px-2 py-2">
                            <button
                              onClick={() => removeItem(currentSection.id, item.id)}
                              className="rounded p-1 text-faint transition-colors hover:bg-red-500/10 hover:text-red-400"
                            >
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-forge-panel/30">
                      <td colSpan={7} className="px-3 py-3">
                        <button
                          onClick={() => { setShowAddModal(true); setModalSearch(""); setModalTab("library"); }}
                          className="flex items-center gap-1.5 text-[12px] font-medium text-blue-400 transition-colors hover:text-blue-300"
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                          Add Line Item
                        </button>
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-bold text-body">
                        ${fmt(sectionSubtotal(currentSection))}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Scope of Work */}
              <div className="mt-8">
                <h3 className="mb-2 text-sm font-bold text-heading">Scope of Work</h3>
                <textarea
                  value={proposal.scopeOfWork}
                  onChange={(e) => setProposal((p) => ({ ...p, scopeOfWork: e.target.value }))}
                  placeholder="Describe the scope of work, deliverables, exclusions, and assumptions..."
                  rows={6}
                  className="forge-input w-full resize-y text-[13px]"
                />
              </div>

            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-faint">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-sm text-subtle">Add a section to start building your proposal</p>
            </div>
          )}
        </div>
      </div>
      {/* Add Equipment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-[680px] rounded-2xl border border-border bg-forge-bg shadow-2xl shadow-black/50">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-bold text-heading">Add Equipment</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-subtle transition-colors hover:text-secondary"
              >
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setModalTab("library")}
                className={`px-6 py-3 text-[13px] font-medium transition-colors ${
                  modalTab === "library"
                    ? "border-b-2 border-blue-500 text-blue-400"
                    : "text-subtle hover:text-secondary"
                }`}
              >
                Search Library
              </button>
              <button
                onClick={() => setModalTab("create")}
                className={`px-6 py-3 text-[13px] font-medium transition-colors ${
                  modalTab === "create"
                    ? "border-b-2 border-blue-500 text-blue-400"
                    : "text-subtle hover:text-secondary"
                }`}
              >
                Create New
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6" style={{ maxHeight: "60vh", overflowY: "auto" }}>
              {modalTab === "library" ? (
                <div>
                  {/* Search */}
                  <div className="relative mb-4">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle">
                      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                    <input
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                      placeholder="Search by manufacturer, model, or description..."
                      className="forge-input w-full pl-10 text-[13px]"
                      autoFocus
                    />
                  </div>

                  {/* Results */}
                  {filteredLibrary.length === 0 ? (
                    <div className="py-10 text-center text-sm text-subtle">
                      No equipment found. Try a different search or create a new item.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {filteredLibrary.map((entry) => (
                        <button
                          key={entry.id}
                          onClick={() => addItemFromEquipment(entry)}
                          className="flex items-center justify-between rounded-lg px-4 py-3 text-left transition-all hover:bg-forge-surface/40"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-semibold text-body">
                                {entry.manufacturer}
                              </span>
                              <span className="text-[13px] text-muted">{entry.model}</span>
                              <span className="rounded bg-forge-surface/60 px-1.5 py-0.5 text-[10px] text-subtle">
                                {entry.category}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-[12px] text-subtle">{entry.description}</p>
                          </div>
                          <span className="ml-4 shrink-0 text-[13px] font-medium text-secondary">
                            ${fmt(entry.unitCost)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-subtle">Category</label>
                      <select
                        value={newEquip.category}
                        onChange={(e) => setNewEquip((p) => ({ ...p, category: e.target.value }))}
                        className="forge-input w-full text-[13px]"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-subtle">Manufacturer</label>
                      <input
                        value={newEquip.manufacturer}
                        onChange={(e) => setNewEquip((p) => ({ ...p, manufacturer: e.target.value }))}
                        placeholder="e.g. Crestron"
                        className="forge-input w-full text-[13px]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-subtle">Model</label>
                      <input
                        value={newEquip.model}
                        onChange={(e) => setNewEquip((p) => ({ ...p, model: e.target.value }))}
                        placeholder="Model number"
                        className="forge-input w-full text-[13px]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-subtle">Unit Cost ($)</label>
                      <input
                        type="number"
                        value={newEquip.unitCost}
                        onChange={(e) => setNewEquip((p) => ({ ...p, unitCost: parseFloat(e.target.value) || 0 }))}
                        className="forge-input w-full text-[13px]"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-subtle">Description</label>
                    <input
                      value={newEquip.description}
                      onChange={(e) => setNewEquip((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Brief description of the equipment"
                      className="forge-input w-full text-[13px]"
                    />
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleCreateAndAdd}
                      disabled={!newEquip.manufacturer || !newEquip.model}
                      className="forge-btn-primary text-[13px] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Add to Library & Insert
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
