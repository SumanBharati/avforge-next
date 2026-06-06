"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "./supabase";
import { useOrg } from "@/components/OrgProvider";

export interface AIChatContext {
  page: string;
  project?: {
    id: string;
    name: string;
    job_number?: string;
    client_name?: string;
    phase?: string;
    sales?: string;
    engineer?: string;
  };
  survey?: {
    buildings: {
      name: string;
      data: Record<string, string>;
      rooms: {
        name: string;
        data: Record<string, string>;
      }[];
    }[];
  };
  proposal?: {
    clientName?: string;
    projectName?: string;
    scopeOfWork?: string;
    sections?: {
      name: string;
      items: {
        category: string;
        manufacturer: string;
        model: string;
        description: string;
        qty: number;
        unitCost: number;
        laborHours: number;
      }[];
    }[];
    taxRate?: number;
    marginPercent?: number;
  };
  procurement?: {
    lineCount: number;
    poCount: number;
    vendorCount: number;
    pendingItems: number;
    orderedItems: number;
    receivedItems: number;
  };
  equipmentLibrary?: {
    category: string;
    manufacturer: string;
    model: string;
    description: string;
    unitCost: number;
  }[];
  laborRates?: Record<string, number>;
}

export function useAIChatContext(): AIChatContext {
  const pathname = usePathname();
  const { activeOrg } = useOrg();
  const [context, setContext] = useState<AIChatContext>({ page: pathname });

  useEffect(() => {
    const ctx: AIChatContext = { page: pathname };

    // Extract project ID from URL: /projects/[id] or /projects/[id]/sub-page
    const projectMatch = pathname.match(/\/projects\/([^/]+)/);
    const projectId = projectMatch?.[1];

    if (!projectId) {
      setContext(ctx);
      return;
    }

    // Determine which sub-page we're on
    const subPage = pathname.split(`/projects/${projectId}/`)[1] || "overview";

    async function fetchContext() {
      // Always fetch project basics
      const { data: project } = await supabase
        .from("projects")
        .select("id, name, job_number, client_name, phase, sales, engineer")
        .eq("id", projectId)
        .single();

      if (project) {
        ctx.project = project;
      }

      // Fetch sub-page specific data
      if (subPage === "site-survey" || subPage === "overview") {
        const { data: surveyRow } = await supabase
          .from("site_surveys")
          .select("data")
          .eq("project_id", projectId)
          .single();

        if (surveyRow?.data) {
          const survey = surveyRow.data as any;
          // Trim the data to avoid sending too much to the API
          ctx.survey = {
            buildings: (survey.buildings || []).map((b: any) => ({
              name: b.name,
              data: b.data || {},
              rooms: (b.rooms || []).map((r: any) => ({
                name: r.name,
                data: r.data || {},
              })),
            })),
          };
        }
      }

      if (subPage === "proposal" || subPage === "overview") {
        const { data: proposalRow } = await supabase
          .from("proposals")
          .select("data")
          .eq("project_id", projectId)
          .single();

        if (proposalRow?.data) {
          const p = proposalRow.data as any;
          ctx.proposal = {
            clientName: p.clientName,
            projectName: p.projectName,
            scopeOfWork: p.scopeOfWork,
            sections: p.sections?.map((s: any) => ({
              name: s.name,
              items: (s.items || []).map((item: any) => ({
                category: item.category,
                manufacturer: item.manufacturer,
                model: item.model,
                description: item.description,
                qty: item.qty,
                unitCost: item.unitCost,
                laborHours: item.laborHours,
              })),
            })),
            taxRate: p.taxRate,
            marginPercent: p.marginPercent,
          };
        }
      }

      if (subPage === "procurement") {
        const { data: procRow } = await supabase
          .from("procurement")
          .select("data")
          .eq("project_id", projectId)
          .single();

        if (procRow?.data) {
          const d = procRow.data as any;
          const lines = d.lines || [];
          ctx.procurement = {
            lineCount: lines.length,
            poCount: (d.purchaseOrders || []).length,
            vendorCount: (d.vendors || []).length,
            pendingItems: lines.filter((l: any) => l.status === "pending").length,
            orderedItems: lines.filter((l: any) => l.status === "ordered").length,
            receivedItems: lines.filter((l: any) => l.status === "received").length,
          };
        }
      }

      // Fetch equipment library (useful for proposal/design pages)
      if (activeOrg && (subPage === "proposal" || subPage === "overview" || subPage.startsWith("design"))) {
        const { data: libData } = await supabase
          .from("equipment_library")
          .select("category, manufacturer, model, description, unit_cost")
          .eq("org_id", activeOrg.id);

        if (libData && libData.length > 0) {
          ctx.equipmentLibrary = libData.map((e: any) => ({
            category: e.category,
            manufacturer: e.manufacturer,
            model: e.model,
            description: e.description,
            unitCost: e.unit_cost,
          }));
        }
      }

      // Fetch org labor rates
      if (activeOrg) {
        const { data: orgData } = await supabase
          .from("organizations")
          .select("engineering_rate, installation_rate, project_mgmt_rate, programming_rate, field_engineering_rate, engineering_cost, installation_cost, project_mgmt_cost, programming_cost, field_engineering_cost")
          .eq("id", activeOrg.id)
          .single();

        if (orgData) {
          ctx.laborRates = orgData;
        }
      }

      setContext(ctx);
    }

    fetchContext();
  }, [pathname, activeOrg?.id]);

  return context;
}
