"use client";

import { useRouter } from "next/navigation";
import { useOrg } from "@/components/OrgProvider";
import { useEffect } from "react";

export default function WelcomePage() {
  const router = useRouter();
  const { activeOrg, loading } = useOrg();

  // If user already has an org, skip this page
  useEffect(() => {
    if (!loading && activeOrg) {
      router.replace("/home");
    }
  }, [loading, activeOrg, router]);

  if (loading) return null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-[480px] animate-fade-in text-center">
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600">
            <span className="text-2xl font-extrabold text-white">▲</span>
          </div>
        </div>

        <h1 className="mb-2 font-display text-3xl font-bold text-heading">
          Welcome to AV<span className="text-blue-500">Forge</span>
        </h1>
        <p className="mb-10 text-muted">
          Are you a part of an Organization?
        </p>

        <div className="flex flex-col gap-4">
          {/* Yes — request invite */}
          <div className="rounded-xl border border-border bg-forge-surface/60 p-6 text-left">
            <div className="mb-1 text-sm font-semibold text-heading">Yes, I&apos;m part of an organization</div>
            <p className="text-[13px] leading-relaxed text-muted">
              Please request your admin to send you an invite. Once you receive the invite link, click it to join your team.
            </p>
          </div>

          {/* No — create org */}
          <div className="rounded-xl border border-border bg-forge-surface/60 p-6 text-left">
            <div className="mb-1 text-sm font-semibold text-heading">No, I&apos;m starting fresh</div>
            <p className="mb-4 text-[13px] leading-relaxed text-muted">
              Create an organization to get started. You can invite your team members later.
            </p>
            <button
              onClick={() => router.push("/org/new")}
              className="forge-btn-primary text-[13px]"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Create Organization
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
