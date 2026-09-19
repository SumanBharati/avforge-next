'use client';
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { loadToolData, saveToolData } from '@/lib/tool-data';
import { supabase } from '@/lib/supabase';
import {
  displayNameOf, productKeyOf,
  ensureRoomDeviceItemIds, ensureSignalFlowItemIds, ensureRackItemIds,
} from '@/lib/design-identity';

export type BOMSource = 'signal-flow' | 'room-designer' | 'rack-builder';

/** tool_data keys differ from the BOM's own source ids — never derive one from the other. */
const STORE_KEY: Record<Exclude<BOMSource, 'room-designer'>, string> = {
  'signal-flow': 'signal-flow',
  'rack-builder': 'rack-planner',
};

export interface BOMDeviceEntry {
  /** Cross-tool unit identity. One itemId === one physical unit. */
  itemId?: string;
  /** What the BOM groups rows by. Stamped at creation, never parsed from the name. */
  productKey?: string;
  name: string;
  mfr?: string;
  cat?: string;
  listPrice?: number;
  partNumber?: string;
}

export interface BOMLineItem {
  /** Stable row identity — the product key, also the price-override key. */
  key: string;
  name: string;
  mfr: string;
  cat: string;
  listPrice: number;
  /** Distinct physical units, NOT the number of places they show up. */
  qty: number;
  sources: BOMSource[];
  partNumber?: string;
  /** The units making up this row. */
  itemIds: string[];
  /** Which of those units each tool currently shows — drives drag-from-BOM gating. */
  placement: Record<BOMSource, string[]>;
}

interface BOMContextType {
  prices: Record<string, number>;
  collapsed: boolean;
  bomItems: BOMLineItem[];
  totalQty: number;
  totalCost: number;
  updateSlice: (source: BOMSource, devices: BOMDeviceEntry[]) => void;
  setPrice: (key: string, price: number) => void;
  setCollapsed: (v: boolean) => void;
  unitPriceOf: (item: BOMLineItem) => number;
}

const BOMContext = createContext<BOMContextType | null>(null);

const SOURCES: BOMSource[] = ['signal-flow', 'room-designer', 'rack-builder'];

// --- Store → BOM entry mappers ---------------------------------------------
// Shared by the pages (for their live slices) and by the provider (for the
// baseline it loads itself), so a unit is described identically either way.

/** Walls and furniture are room geometry, not equipment — they never bill. */
export function roomDeviceToBOM(d: any): BOMDeviceEntry | null {
  if (!d || d.type === 'furniture' || d.id === 'wall-partition') return null;
  return {
    itemId: d.itemId,
    productKey: productKeyOf(d),
    name: displayNameOf(d),
    mfr: d.mfr || undefined,
    cat: d.cat || d.type || undefined,
    listPrice: d.price || 0,
    partNumber: d.part_number || undefined,
  };
}

export function signalFlowDeviceToBOM(d: any): BOMDeviceEntry {
  return {
    itemId: d.itemId,
    productKey: productKeyOf(d),
    name: displayNameOf(d),
    mfr: d.mfr || undefined,
    cat: d.cat || d.category || '',
    listPrice: d.price || 0,
    partNumber: d.part_number || undefined,
  };
}

export function rackItemToBOM(i: any): BOMDeviceEntry {
  return {
    itemId: i.itemId,
    productKey: productKeyOf(i),
    name: i.name || displayNameOf(i),
    mfr: i.mfr || undefined,
    cat: i.cat || 'Rack Equipment',
    listPrice: i.price || 0,
    partNumber: i.partNumber || undefined,
  };
}

export function BOMProvider({ children }: { children: React.ReactNode }) {
  // null means "this tool has not reported in this session" — its DB baseline
  // is used instead. An empty array is a real answer (the room was emptied)
  // and must win over the baseline, which is why this is not `[]`-initialised.
  const [slices, setSlices] = useState<Record<BOMSource, BOMDeviceEntry[] | null>>({
    'signal-flow': null, 'room-designer': null, 'rack-builder': null,
  });
  const [baseline, setBaseline] = useState<Record<BOMSource, BOMDeviceEntry[]>>({
    'signal-flow': [], 'room-designer': [], 'rack-builder': [],
  });
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [collapsed, setCollapsed] = useState(false);
  const [pricesLoadedFor, setPricesLoadedFor] = useState<string | null>(null);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');
  const roomId = searchParams.get('room') || 'default';
  const scope = projectId ? `${projectId}:${roomId}` : null;

  // Price overrides are per room, so they must reload when the room changes —
  // loading once on mount let one room's prices follow the user into the next
  // and then overwrite that room's saved row.
  useEffect(() => {
    if (!scope) return;
    let cancelled = false;
    setPricesLoadedFor(null);
    loadToolData('shared-bom', roomId, projectId).then(data => {
      if (cancelled) return;
      setPrices((data?.prices as Record<string, number>) || {});
      setPricesLoadedFor(scope);
    });
    return () => { cancelled = true; };
  }, [scope, projectId, roomId]);

  useEffect(() => {
    if (!scope || pricesLoadedFor !== scope) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveToolData('shared-bom', { prices }, roomId, projectId);
    }, 1000);
  }, [prices, scope, pricesLoadedFor, projectId, roomId]);

  // Read all three stores directly, so every tool page shows the same BOM even
  // on a hard refresh. Without this the panel only ever knew about whichever
  // tools the user had visited in this session.
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setSlices({ 'signal-flow': null, 'room-designer': null, 'rack-builder': null });
    (async () => {
      const [sf, rack, roomRow] = await Promise.all([
        loadToolData(STORE_KEY['signal-flow'], roomId, projectId),
        loadToolData(STORE_KEY['rack-builder'], roomId, projectId),
        supabase.from('room_designs').select('data')
          .eq('project_id', projectId).eq('room_id', roomId).maybeSingle(),
      ]);
      if (cancelled) return;
      const sfDevices = ensureSignalFlowItemIds((sf?.devices as any[]) || []).items;
      const rackItems = ensureRackItemIds((rack?.items as any[]) || [], sfDevices).items;
      const roomDevices = ensureRoomDeviceItemIds(((roomRow as any)?.data?.data?.devices as any[]) || []).items;
      setBaseline({
        'signal-flow': sfDevices.map(signalFlowDeviceToBOM),
        'room-designer': roomDevices.map(roomDeviceToBOM).filter(Boolean) as BOMDeviceEntry[],
        'rack-builder': rackItems.map(rackItemToBOM),
      });
    })();
    return () => { cancelled = true; };
  }, [projectId, roomId]);

  const updateSlice = useCallback((source: BOMSource, devices: BOMDeviceEntry[]) => {
    setSlices(prev => ({ ...prev, [source]: devices }));
  }, []);

  const setPrice = useCallback((key: string, price: number) => {
    setPrices(prev => ({ ...prev, [key]: price }));
  }, []);

  // --- Aggregate -----------------------------------------------------------
  // Count units, not appearances: the same display shown in Room Designer,
  // Signal Flow and the rack is one thing the customer buys, carrying three
  // location chips — not three line items.
  const units = new Map<string, { entry: BOMDeviceEntry; sources: Set<BOMSource> }>();
  SOURCES.forEach(source => {
    const list = slices[source] ?? baseline[source] ?? [];
    list.forEach((d, i) => {
      // Pre-identity saves may still lack an itemId; key those per occurrence
      // so they behave as they did before rather than silently collapsing.
      const id = d.itemId || `anon:${source}:${i}:${d.name}`;
      const existing = units.get(id);
      if (existing) {
        existing.sources.add(source);
        // First writer wins on the detail fields (SOURCES order puts the
        // richest, Signal Flow, first), but let a later source fill a gap.
        if (!existing.entry.mfr && d.mfr) existing.entry.mfr = d.mfr;
        if (!existing.entry.partNumber && d.partNumber) existing.entry.partNumber = d.partNumber;
        if (!existing.entry.listPrice && d.listPrice) existing.entry.listPrice = d.listPrice;
        if (!existing.entry.cat && d.cat) existing.entry.cat = d.cat;
      } else {
        units.set(id, { entry: { ...d }, sources: new Set([source]) });
      }
    });
  });

  const rows = new Map<string, BOMLineItem>();
  units.forEach(({ entry, sources }, id) => {
    const key = entry.productKey || productKeyOf({ name: entry.name, mfr: entry.mfr });
    let row = rows.get(key);
    if (!row) {
      row = {
        key, name: entry.name, mfr: entry.mfr || '', cat: entry.cat || '',
        listPrice: entry.listPrice || 0, qty: 0, sources: [],
        partNumber: entry.partNumber || undefined,
        itemIds: [],
        placement: { 'signal-flow': [], 'room-designer': [], 'rack-builder': [] },
      };
      rows.set(key, row);
    }
    row.qty++;
    row.itemIds.push(id);
    if (!row.partNumber && entry.partNumber) row.partNumber = entry.partNumber;
    if (!row.mfr && entry.mfr) row.mfr = entry.mfr;
    if (!row.listPrice && entry.listPrice) row.listPrice = entry.listPrice;
    sources.forEach(s => {
      if (!row!.sources.includes(s)) row!.sources.push(s);
      row!.placement[s].push(id);
    });
  });

  const bomItems = Array.from(rows.values()).sort(
    (a, b) => a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name)
  );
  bomItems.forEach(r => r.sources.sort((a, b) => SOURCES.indexOf(a) - SOURCES.indexOf(b)));

  // Overrides used to be keyed by display name; fall back to that so existing
  // saved prices survive the move to productKey.
  const unitPriceOf = useCallback((item: BOMLineItem) => {
    if (prices[item.key] !== undefined) return prices[item.key];
    if (prices[item.name] !== undefined) return prices[item.name];
    return item.listPrice;
  }, [prices]);

  const totalQty = bomItems.reduce((s, i) => s + i.qty, 0);
  const totalCost = bomItems.reduce((s, i) => s + unitPriceOf(i) * i.qty, 0);

  return (
    <BOMContext.Provider value={{ prices, collapsed, bomItems, totalQty, totalCost, updateSlice, setPrice, setCollapsed, unitPriceOf }}>
      {children}
    </BOMContext.Provider>
  );
}

export function useBOM() {
  const ctx = useContext(BOMContext);
  if (!ctx) throw new Error('useBOM must be used within BOMProvider');
  return ctx;
}
