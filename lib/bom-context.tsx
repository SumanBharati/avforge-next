'use client';
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { loadToolData, saveToolData } from '@/lib/tool-data';

export type BOMSource = 'signal-flow' | 'room-designer' | 'rack-builder';

export interface BOMDeviceEntry {
  name: string;
  mfr?: string;
  cat?: string;
  listPrice?: number;
}

export interface BOMLineItem {
  name: string;
  mfr: string;
  cat: string;
  listPrice: number;
  qty: number;
  sources: BOMSource[];
}

interface BOMContextType {
  prices: Record<string, number>;
  collapsed: boolean;
  bomItems: BOMLineItem[];
  totalQty: number;
  totalCost: number;
  updateSlice: (source: BOMSource, devices: BOMDeviceEntry[]) => void;
  setPrice: (name: string, price: number) => void;
  setCollapsed: (v: boolean) => void;
}

const BOMContext = createContext<BOMContextType | null>(null);

const SOURCES: BOMSource[] = ['signal-flow', 'room-designer', 'rack-builder'];

export function BOMProvider({ children }: { children: React.ReactNode }) {
  const [slices, setSlices] = useState<Record<BOMSource, BOMDeviceEntry[]>>({
    'signal-flow': [],
    'room-designer': [],
    'rack-builder': [],
  });
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [collapsed, setCollapsed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadToolData('shared-bom').then(data => {
      if (data?.prices) setPrices(data.prices as Record<string, number>);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveToolData('shared-bom', { prices });
    }, 1000);
  }, [prices, loaded]);

  const updateSlice = useCallback((source: BOMSource, devices: BOMDeviceEntry[]) => {
    setSlices(prev => ({ ...prev, [source]: devices }));
  }, []);

  const setPrice = useCallback((name: string, price: number) => {
    setPrices(prev => ({ ...prev, [name]: price }));
  }, []);

  // Aggregate all slices into unified BOM line items
  const itemMap: Record<string, BOMLineItem> = {};
  SOURCES.forEach(source => {
    slices[source].forEach(d => {
      if (!itemMap[d.name]) {
        itemMap[d.name] = {
          name: d.name,
          mfr: d.mfr || '',
          cat: d.cat || '',
          listPrice: d.listPrice || 0,
          qty: 0,
          sources: [],
        };
      }
      itemMap[d.name].qty++;
      if (!itemMap[d.name].sources.includes(source)) {
        itemMap[d.name].sources.push(source);
      }
    });
  });

  const bomItems = Object.values(itemMap).sort(
    (a, b) => a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name)
  );
  const totalQty = bomItems.reduce((s, i) => s + i.qty, 0);
  const totalCost = bomItems.reduce((s, i) => {
    const up = prices[i.name] !== undefined ? prices[i.name] : i.listPrice;
    return s + up * i.qty;
  }, 0);

  return (
    <BOMContext.Provider value={{ prices, collapsed, bomItems, totalQty, totalCost, updateSlice, setPrice, setCollapsed }}>
      {children}
    </BOMContext.Provider>
  );
}

export function useBOM() {
  const ctx = useContext(BOMContext);
  if (!ctx) throw new Error('useBOM must be used within BOMProvider');
  return ctx;
}
