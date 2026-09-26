"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ComingSoon from "@/components/ComingSoon";

interface Project {
  id: string;
  name: string;
  job_number: string;
}

export default function ProgrammingPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.from("projects").select("id, name, job_number").eq("id", params.id).single()
      .then(({ data }) => { if (!cancelled && data) setProject(data as Project); });
    return () => { cancelled = true; };
  }, [params.id]);

  return (
    <div className="animate-fade-in">
      <div className="border-b border-border bg-forge-panel/50 px-4 py-4 sm:px-6 lg:px-8">
        <Link href={`/projects/${params.id}`} className="mb-2 inline-flex items-center gap-1.5 text-xs text-subtle hover:text-secondary">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          {project?.name}
          {project?.job_number && <span className="text-subtle"> · #{project.job_number}</span>}
        </Link>
        <h1 className="flex items-center gap-2.5 text-xl font-bold text-heading">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
            <polyline points="7 8 10 11 7 14" />
            <line x1="12" y1="14" x2="17" y2="14" />
          </svg>
          Programming
        </h1>
      </div>

      <ComingSoon
        color="violet"
        icon={
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
            <polyline points="7 8 10 11 7 14" />
            <line x1="12" y1="14" x2="17" y2="14" />
          </svg>
        }
        description="System programming, commissioning, and integration testing tools are on the way."
      />
    </div>
  );
}
