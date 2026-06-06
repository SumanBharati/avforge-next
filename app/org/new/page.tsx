"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useOrg } from "@/components/OrgProvider";

export default function NewOrgPage() {
  const router = useRouter();
  const { refreshOrgs, switchOrg } = useOrg();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  function generateSlug(n: string) {
    return n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated"); setLoading(false); return; }

    const slug = generateSlug(name) + "-" + crypto.randomUUID().slice(0, 8);

    const { data: org, error: insertErr } = await supabase
      .from("organizations")
      .insert({ name: name.trim(), slug, created_by: user.id })
      .select()
      .single();

    if (insertErr || !org) {
      setError(insertErr?.message || "Failed to create organization");
      setLoading(false);
      return;
    }

    // Add creator as owner
    await supabase.from("organization_members").insert({
      org_id: org.id,
      user_id: user.id,
      role: "owner",
    });

    // Switch to new org
    await supabase
      .from("user_preferences")
      .upsert({ user_id: user.id, active_org_id: org.id }, { onConflict: "user_id" });

    await refreshOrgs();
    await switchOrg(org.id);
    router.push("/home");
  }

  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-4">
      <div className="w-full max-w-[440px] animate-fade-in rounded-xl border border-border bg-forge-surface p-8">
        <h2 className="mb-2 text-xl font-semibold text-heading">Create Organization</h2>
        <p className="mb-6 text-sm text-muted">
          Organizations let your team collaborate on projects together.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[13px] text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted">
              Organization Name <span className="text-red-400">*</span>
            </label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme AV Solutions"
              className="forge-input"
              required
            />
            {name.trim() && (
              <p className="mt-1.5 text-xs text-faint">
                Slug: {generateSlug(name) || "—"}
              </p>
            )}
          </div>

          <div className="mt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:text-body"
            >
              Cancel
            </button>
            <button type="submit" disabled={loading || !name.trim()} className="forge-btn-primary text-[13px]">
              {loading ? "Creating..." : "Create Organization"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
