"use client";

import { useOrg } from "./OrgProvider";
import ProAuthModal from "./ProAuthModal";
import UpgradeModal from "./UpgradeModal";
import ProjectsPageSkeleton from "./skeletons/ProjectsPageSkeleton";

export default function ProGate({ children }: { children: React.ReactNode }) {
  const { accessStatus } = useOrg();

  if (accessStatus === "loading") return <ProjectsPageSkeleton />;
  if (accessStatus === "anonymous") return <><div className="pointer-events-none select-none blur-sm" aria-hidden="true"><ProjectsPageSkeleton /></div><ProAuthModal /></>;
  if (accessStatus === "org_error") return <><div className="pointer-events-none select-none blur-sm" aria-hidden="true"><ProjectsPageSkeleton /></div><div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-md"><div className="max-w-md rounded-2xl border border-red-500/30 bg-forge-panel p-7 text-center shadow-2xl"><h2 className="text-xl font-bold text-heading">We could not load your organization</h2><p className="mt-2 text-sm text-muted">Your membership may still be intact. Refresh after the latest Supabase migrations have been applied.</p><button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-500">Refresh</button></div></div></>;
  if (accessStatus === "no_org") return <><div className="pointer-events-none select-none blur-sm" aria-hidden="true"><ProjectsPageSkeleton /></div><div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-md"><div className="max-w-md rounded-2xl border border-violet-500/30 bg-forge-panel p-7 text-center shadow-2xl"><h2 className="text-xl font-bold text-heading">Create an organization first</h2><p className="mt-2 text-sm text-muted">Projects and your three-day Pro trial are associated with an organization.</p><a href="/org/new" className="mt-5 inline-flex rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-500">Create Organization</a></div></div></>;
  if (accessStatus === "expired") return <><div className="pointer-events-none select-none blur-sm" aria-hidden="true"><ProjectsPageSkeleton /></div><UpgradeModal required /></>;
  return <>{children}</>;
}
