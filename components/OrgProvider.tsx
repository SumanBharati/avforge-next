"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

const AUTH_ROUTES = ["/login", "/register", "/org/invite", "/welcome"];

export interface Org {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  role: "owner" | "admin" | "member";
}

interface OrgContextValue {
  activeOrg: Org | null;
  orgs: Org[];
  switchOrg: (orgId: string) => Promise<void>;
  refreshOrgs: () => Promise<void>;
  loading: boolean;
}

const OrgContext = createContext<OrgContextValue>({
  activeOrg: null,
  orgs: [],
  switchOrg: async () => {},
  refreshOrgs: async () => {},
  loading: true,
});

export function useOrg() {
  return useContext(OrgContext);
}

export default function OrgProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const userLoadedRef = useRef(false);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrgs = useCallback(async () => {
    setOrgs([]);
    setActiveOrgId(null);
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    userLoadedRef.current = true;

    // Fetch memberships
    const { data: memberships } = await supabase
      .from("organization_members")
      .select("org_id, role")
      .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
      setOrgs([]);
      setActiveOrgId(null);
      setLoading(false);
      return;
    }

    // Fetch org details separately to avoid RLS circular dependency
    const orgIds = memberships.map((m) => m.org_id);
    const { data: orgsData } = await supabase
      .from("organizations")
      .select("id, name, slug, logo_url")
      .in("id", orgIds);

    if (!orgsData || orgsData.length === 0) {
      setOrgs([]);
      setActiveOrgId(null);
      setLoading(false);
      return;
    }

    const orgList: Org[] = memberships.map((m: any) => {
      const org = orgsData.find((o) => o.id === m.org_id);
      return {
        id: m.org_id,
        name: org?.name || "Unknown",
        slug: org?.slug || "",
        logo_url: org?.logo_url || null,
        role: m.role,
      };
    });

    setOrgs(orgList);

    // Get active org from preferences
    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("active_org_id")
      .eq("user_id", user.id)
      .single();

    const storedOrgId = prefs?.active_org_id;
    const validOrg = orgList.find((o) => o.id === storedOrgId);

    if (validOrg) {
      setActiveOrgId(validOrg.id);
    } else {
      // Default to first org
      setActiveOrgId(orgList[0].id);
      await supabase
        .from("user_preferences")
        .upsert({ user_id: user.id, active_org_id: orgList[0].id }, { onConflict: "user_id" });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrgs();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setOrgs([]);
        setActiveOrgId(null);
        setLoading(false);
        if (userLoadedRef.current && !AUTH_ROUTES.includes(pathnameRef.current)) {
          userLoadedRef.current = false;
          router.replace("/login");
        }
      } else {
        fetchOrgs();
      }
    });

    return () => {
      subscription.unsubscribe();
      userLoadedRef.current = false;
    };
  }, [fetchOrgs]);

  async function switchOrg(orgId: string) {
    const target = orgs.find((o) => o.id === orgId);
    if (!target) return;

    setActiveOrgId(orgId);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("user_preferences")
        .upsert({ user_id: user.id, active_org_id: orgId }, { onConflict: "user_id" });
    }
  }

  const activeOrg = orgs.find((o) => o.id === activeOrgId) ?? null;

  return (
    <OrgContext.Provider value={{ activeOrg, orgs, switchOrg, refreshOrgs: fetchOrgs, loading }}>
      {children}
    </OrgContext.Provider>
  );
}
