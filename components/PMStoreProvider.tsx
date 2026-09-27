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
  // Which workspace `store` currently holds. Saves are only allowed when it
  // matches the active workspace: after a workspace switch the previous
  // workspace's data is still in state until the new load finishes, and saving
  // it then would copy people/projects/boards into the wrong workspace.
  const loadedOrgId = useRef<string | null>(null);
  // The debounced edit not yet written, with the workspace it belongs to.
  const pendingSave = useRef<{ orgId: string; store: PMStore } | null>(null);

  useEffect(() => {
    if (orgLoading || !activeOrg) return;
    const orgId = activeOrg.id;
    let cancelled = false;
    // Write any last edit to the workspace it was made in before switching.
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (pendingSave.current) {
      savePMStore(pendingSave.current.orgId, pendingSave.current.store);
      pendingSave.current = null;
    }
    loadedOrgId.current = null;
    setStore(emptyPMStore);
    setLoading(true);
    (async () => {
      const initial = await loadPMStore(orgId);
      const { store: withPeople, currentUserId: uid } = await mergeOrgMembersAsPeople(orgId, initial);
      const merged = await mergeOrgProjectsAsSchedProjects(orgId, withPeople);
      if (cancelled) return;
      loadedOrgId.current = orgId;
      setCurrentUserId(uid);
      setStore(merged);
      setLoading(false);
      if (merged !== initial) {
        await savePMStore(orgId, merged);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeOrg?.id, orgLoading]);

  const flush = useCallback(async () => {
    if (!activeOrg || loadedOrgId.current !== activeOrg.id) return;
    await savePMStore(activeOrg.id, store);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [activeOrg?.id, store]);

  const update = useCallback(
    (next: PMStore | ((prev: PMStore) => PMStore)) => {
      const orgId = activeOrg?.id;
      if (!orgId || loadedOrgId.current !== orgId) return;
      setStore((prev) => {
        const resolved = typeof next === "function" ? (next as (p: PMStore) => PMStore)(prev) : next;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        pendingSave.current = { orgId, store: resolved };
        saveTimer.current = setTimeout(() => {
          pendingSave.current = null;
          savePMStore(orgId, resolved).then(() => {
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
