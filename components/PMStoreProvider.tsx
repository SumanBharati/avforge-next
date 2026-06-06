"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useOrg } from "./OrgProvider";
import {
  emptyPMStore,
  loadPMStore,
  mergeOrgMembersAsPeople,
  mergeOrgProjectsAsSchedProjects,
  savePMStore,
  type PMStore,
} from "@/lib/pm-store";

interface PMStoreContextValue {
  store: PMStore;
  update: (next: PMStore | ((prev: PMStore) => PMStore)) => void;
  loading: boolean;
  saved: boolean;
  flush: () => Promise<void>;
  currentUserId: string | null;
}

const PMStoreContext = createContext<PMStoreContextValue>({
  store: emptyPMStore,
  update: () => {},
  loading: true,
  saved: false,
  flush: async () => {},
  currentUserId: null,
});

export function usePMStore() {
  return useContext(PMStoreContext);
}

export default function PMStoreProvider({ children }: { children: React.ReactNode }) {
  const { activeOrg, loading: orgLoading } = useOrg();
  const [store, setStore] = useState<PMStore>(emptyPMStore);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (orgLoading || !activeOrg) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const initial = await loadPMStore(activeOrg.id);
      const { store: withPeople, currentUserId: uid } = await mergeOrgMembersAsPeople(activeOrg.id, initial);
      const merged = await mergeOrgProjectsAsSchedProjects(activeOrg.id, withPeople);
      if (cancelled) return;
      setCurrentUserId(uid);
      setStore(merged);
      setLoading(false);
      if (merged !== initial) {
        await savePMStore(activeOrg.id, merged);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeOrg?.id, orgLoading]);

  const flush = useCallback(async () => {
    if (!activeOrg) return;
    await savePMStore(activeOrg.id, store);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [activeOrg?.id, store]);

  const update = useCallback(
    (next: PMStore | ((prev: PMStore) => PMStore)) => {
      setStore((prev) => {
        const resolved = typeof next === "function" ? (next as (p: PMStore) => PMStore)(prev) : next;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          if (activeOrg) savePMStore(activeOrg.id, resolved).then(() => {
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);
          });
        }, 800);
        return resolved;
      });
    },
    [activeOrg?.id],
  );

  return (
    <PMStoreContext.Provider value={{ store, update, loading, saved, flush, currentUserId }}>
      {children}
    </PMStoreContext.Provider>
  );
}
