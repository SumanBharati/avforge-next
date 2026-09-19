export interface PlanComparisonFeature {
  name: string;
  pro: boolean;
  free: boolean;
  badge?: string;
  detail?: string;
}

export const PLAN_COMPARISON_FEATURES: PlanComparisonFeature[] = [
  { name: "Dashboard", pro: true, free: true },
  { name: "AV engineering calculators", pro: true, free: true, badge: "CORE" },
  { name: "Reference library", pro: true, free: true },
  { name: "AI assistant", pro: true, free: false, detail: "AI assistance is included during the 3-day Pro trial and with an active Pro subscription." },
  { name: "Organization settings", pro: true, free: false },
  { name: "Project workspaces", pro: true, free: false, badge: "POPULAR" },
  { name: "Site surveys", pro: true, free: false },
  { name: "Room Designer", pro: true, free: false },
  { name: "Signal Flow Builder", pro: true, free: false, badge: "POPULAR" },
  { name: "Rack Builder", pro: true, free: false },
  { name: "Shared project BOM", pro: true, free: false, detail: "Keep equipment identity and quantities coordinated across the design tools." },
  { name: "Proposals and change orders", pro: true, free: false },
  { name: "Project scheduling", pro: true, free: false },
  { name: "Resource management", pro: true, free: false },
  { name: "Project boards", pro: true, free: false },
  { name: "Time tracking", pro: true, free: false },
  { name: "Equipment library", pro: true, free: false },
  { name: "Procurement and receiving", pro: true, free: false },
];
