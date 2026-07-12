"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useOrg } from "@/components/OrgProvider";

export default function OrgSettingsPage() {
  const router = useRouter();
  const { activeOrg, refreshOrgs } = useOrg();
  const [orgDetails, setOrgDetails] = useState({
    name: "", website: "", phone: "", country: "United States", timezone: "(GMT-05:00) Eastern Time (US & Canada)",
    street_address: "", city: "", state: "", zip: "",
    shipping_address: "", shipping_city: "", shipping_state: "", shipping_zip: "",
    shipping_same_as_primary: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [laborRates, setLaborRates] = useState({
    engineering_rate: 0, installation_rate: 0, project_mgmt_rate: 0, project_coord_rate: 0, programming_rate: 0, field_engineering_rate: 0,
    engineering_cost: 0, installation_cost: 0, project_mgmt_cost: 0, project_coord_cost: 0, programming_cost: 0, field_engineering_cost: 0,
  });
  const [savingLabor, setSavingLabor] = useState(false);
  const [savedLabor, setSavedLabor] = useState(false);

  const [currency, setCurrency] = useState("USD");
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [savedCurrency, setSavedCurrency] = useState(false);

  const [taxPrefs, setTaxPrefs] = useState({
    tax_equipment: true,
    tax_shipping: false,
    tax_set_default_rates: false,
    tax_independent_rates: false,
    tax_name: "Tax",
  });
  const [savingTax, setSavingTax] = useState(false);
  const [savedTax, setSavedTax] = useState(false);

  const [qbConnected, setQbConnected] = useState(false);
  const [qbCompany, setQbCompany] = useState<string | null>(null);
  const [disconnectingQb, setDisconnectingQb] = useState(false);

  useEffect(() => {
    if (activeOrg) {
      supabase
        .from("organizations")
        .select("name, website, phone, country, timezone, street_address, city, state, zip, shipping_address, shipping_city, shipping_state, shipping_zip, shipping_same_as_primary, engineering_rate, installation_rate, project_mgmt_rate, project_coord_rate, programming_rate, field_engineering_rate, engineering_cost, installation_cost, project_mgmt_cost, project_coord_cost, programming_cost, field_engineering_cost, currency, tax_equipment, tax_shipping, tax_set_default_rates, tax_independent_rates, tax_name, qb_connected, qb_company_name")
        .eq("id", activeOrg.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setOrgDetails({
              name: data.name ?? "",
              website: data.website ?? "",
              phone: data.phone ?? "",
              country: data.country ?? "United States",
              timezone: data.timezone ?? "(GMT-05:00) Eastern Time (US & Canada)",
              street_address: data.street_address ?? "",
              city: data.city ?? "",
              state: data.state ?? "",
              zip: data.zip ?? "",
              shipping_address: data.shipping_address ?? "",
              shipping_city: data.shipping_city ?? "",
              shipping_state: data.shipping_state ?? "",
              shipping_zip: data.shipping_zip ?? "",
              shipping_same_as_primary: data.shipping_same_as_primary ?? false,
            });
            setLaborRates({
              engineering_rate: data.engineering_rate ?? 0,
              installation_rate: data.installation_rate ?? 0,
              project_mgmt_rate: data.project_mgmt_rate ?? 0,
              project_coord_rate: data.project_coord_rate ?? 0,
              programming_rate: data.programming_rate ?? 0,
              field_engineering_rate: data.field_engineering_rate ?? 0,
              engineering_cost: data.engineering_cost ?? 0,
              installation_cost: data.installation_cost ?? 0,
              project_mgmt_cost: data.project_mgmt_cost ?? 0,
              project_coord_cost: data.project_coord_cost ?? 0,
              programming_cost: data.programming_cost ?? 0,
              field_engineering_cost: data.field_engineering_cost ?? 0,
            });
            setCurrency(data.currency ?? "USD");
            setQbConnected(data.qb_connected ?? false);
            setQbCompany(data.qb_company_name ?? null);
            setTaxPrefs({
              tax_equipment: data.tax_equipment ?? true,
              tax_shipping: data.tax_shipping ?? false,
              tax_set_default_rates: data.tax_set_default_rates ?? false,
              tax_independent_rates: data.tax_independent_rates ?? false,
              tax_name: data.tax_name ?? "Tax",
            });
          }
        });
    }
  }, [activeOrg]);

  if (!activeOrg) return <div className="px-8 py-20 text-center text-sm text-subtle">Loading...</div>;

  const isOwnerOrAdmin = activeOrg.role === "owner" || activeOrg.role === "admin";

  if (!isOwnerOrAdmin) {
    return (
      <div className="px-8 py-20 text-center">
        <p className="text-sm text-subtle">You don&apos;t have permission to manage this organization.</p>
      </div>
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!orgDetails.name.trim() || !activeOrg) return;
    setSaving(true);

    const { error } = await supabase
      .from("organizations")
      .update({
        name: orgDetails.name.trim(),
        website: orgDetails.website, phone: orgDetails.phone,
        country: orgDetails.country, timezone: orgDetails.timezone,
        street_address: orgDetails.street_address, city: orgDetails.city,
        state: orgDetails.state, zip: orgDetails.zip,
        shipping_address: orgDetails.shipping_address, shipping_city: orgDetails.shipping_city,
        shipping_state: orgDetails.shipping_state, shipping_zip: orgDetails.shipping_zip,
        shipping_same_as_primary: orgDetails.shipping_same_as_primary,
      })
      .eq("id", activeOrg.id);

    if (!error) {
      await refreshOrgs();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  async function handleLaborSave(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrg) return;
    setSavingLabor(true);

    const { error } = await supabase
      .from("organizations")
      .update(laborRates)
      .eq("id", activeOrg.id);

    if (!error) {
      setSavedLabor(true);
      setTimeout(() => setSavedLabor(false), 2000);
    }
    setSavingLabor(false);
  }

  async function handleCurrencySave(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrg) return;
    setSavingCurrency(true);
    const { error } = await supabase.from("organizations").update({ currency }).eq("id", activeOrg.id);
    if (!error) { setSavedCurrency(true); setTimeout(() => setSavedCurrency(false), 2000); }
    setSavingCurrency(false);
  }

  async function handleTaxSave(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrg) return;
    setSavingTax(true);
    const { error } = await supabase.from("organizations").update(taxPrefs).eq("id", activeOrg.id);
    if (!error) { setSavedTax(true); setTimeout(() => setSavedTax(false), 2000); }
    setSavingTax(false);
  }

  async function handleQbDisconnect() {
    if (!activeOrg) return;
    setDisconnectingQb(true);
    await supabase.from("organizations").update({ qb_connected: false, qb_company_name: null, qb_access_token: null, qb_refresh_token: null, qb_realm_id: null }).eq("id", activeOrg.id);
    setQbConnected(false); setQbCompany(null);
    setDisconnectingQb(false);
  }

  async function handleDelete() {
    if (!activeOrg || activeOrg.role !== "owner") return;
    const confirmed = window.confirm(
      `Delete "${activeOrg.name}"? This will permanently remove all projects and data in this organization. This cannot be undone.`
    );
    if (!confirmed) return;

    await supabase.from("organizations").delete().eq("id", activeOrg.id);
    await refreshOrgs();
    router.push("/home");
  }

  return (
    <div className="animate-fade-in px-4 py-4 sm:px-6 lg:px-8">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-heading">Organization Settings</h2>
        <p className="mt-0.5 text-sm text-muted">Manage your organization&apos;s details and members.</p>
      </div>

      {/* Nav tabs */}
      <div className="mb-4 flex gap-1 border-b border-border">
        <Link href="/org/settings" className="border-b-2 border-blue-500 px-4 py-2 text-sm font-medium text-blue-400">
          General
        </Link>
        <Link href="/org/members" className="border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-body">
          Members
        </Link>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-[2fr_3fr] gap-4 items-start">

        {/* ── Left column: Org Details + Danger Zone ── */}
        <div className="flex flex-col gap-4">

          <form onSubmit={handleSave}>
            <div className="rounded-xl border border-border bg-forge-surface/40 p-3">
              <h3 className="mb-2 text-sm font-semibold text-heading">Organization Details</h3>

              {/* Name / Website / Phone */}
              <div className="grid grid-cols-1 gap-2 mb-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted">Name</label>
                  <input type="text" value={orgDetails.name} onChange={(e) => setOrgDetails(p => ({ ...p, name: e.target.value }))} className="forge-input" required />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted">Website</label>
                  <input type="url" value={orgDetails.website} onChange={(e) => setOrgDetails(p => ({ ...p, website: e.target.value }))} className="forge-input" placeholder="https://" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted">Phone</label>
                  <input type="tel" value={orgDetails.phone} onChange={(e) => setOrgDetails(p => ({ ...p, phone: e.target.value }))} className="forge-input" placeholder="+1 555 000 0000" />
                </div>
              </div>

              {/* Country / Timezone */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted">Country</label>
                  <select value={orgDetails.country} onChange={(e) => setOrgDetails(p => ({ ...p, country: e.target.value }))} className="forge-input">
                    {["United States","Canada","United Kingdom","Australia","Germany","France","India","Japan","Singapore","UAE","Brazil","Mexico"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted">Time Zone</label>
                  <select value={orgDetails.timezone} onChange={(e) => setOrgDetails(p => ({ ...p, timezone: e.target.value }))} className="forge-input">
                    {["(GMT-08:00) Pacific Time (US & Canada)","(GMT-07:00) Mountain Time (US & Canada)","(GMT-06:00) Central Time (US & Canada)","(GMT-05:00) Eastern Time (US & Canada)","(GMT-04:00) Atlantic Time (Canada)","(GMT+00:00) UTC","(GMT+01:00) Central European Time","(GMT+05:30) India Standard Time","(GMT+08:00) Singapore Time","(GMT+09:00) Japan Standard Time","(GMT+10:00) Australian Eastern Time"].map(tz => <option key={tz}>{tz}</option>)}
                  </select>
                </div>
              </div>

              {/* Address */}
              <div className="mb-2">
                <label className="mb-1 block text-[11px] font-medium text-muted">Address</label>
                <input type="text" value={orgDetails.street_address} onChange={(e) => setOrgDetails(p => ({ ...p, street_address: e.target.value }))} className="forge-input" />
              </div>

              {/* City / State / Zip */}
              <div className="grid grid-cols-[1fr_80px_80px] gap-1.5">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted">City</label>
                  <input type="text" value={orgDetails.city} onChange={(e) => setOrgDetails(p => ({ ...p, city: e.target.value }))} className="forge-input" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted">State</label>
                  <input type="text" value={orgDetails.state} onChange={(e) => setOrgDetails(p => ({ ...p, state: e.target.value }))} className="forge-input" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted">Zip</label>
                  <input type="text" value={orgDetails.zip} onChange={(e) => setOrgDetails(p => ({ ...p, zip: e.target.value }))} className="forge-input" />
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
                <button type="submit" disabled={saving || !orgDetails.name.trim()} className="forge-btn-primary text-[13px]">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                {saved && <span className="text-sm text-emerald-400">Saved</span>}
              </div>
            </div>
          </form>

          {activeOrg.role === "owner" && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <h3 className="mb-1.5 text-sm font-semibold text-red-400">Danger Zone</h3>
              <p className="mb-3 text-[12px] text-muted">Permanently remove all projects, proposals, and data in this organization.</p>
              <button onClick={handleDelete} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[13px] font-medium text-red-400 transition-colors hover:bg-red-500/20">
                Delete Organization
              </button>
            </div>
          )}
        </div>

        {/* ── Right column ── */}
        <div className="flex flex-col gap-4">

          {/* Labor Rates & Costs */}
          <form onSubmit={handleLaborSave}>
            <div className="rounded-xl border border-border bg-forge-surface/40 p-4">
              <h3 className="text-sm font-semibold text-heading">Labor Rates and Costs</h3>
              <p className="mt-0.5 mb-4 text-[12px] text-muted">Hourly labor prices and average costs (including employment costs) used in your estimates.</p>

              <div className="grid grid-cols-6 gap-3">
                {(["engineering_rate", "installation_rate", "project_mgmt_rate", "project_coord_rate", "programming_rate", "field_engineering_rate"] as const).map((key) => {
                  const labels: Record<string, string> = {
                    engineering_rate: "Engineering Rate", installation_rate: "Installation Rate",
                    project_mgmt_rate: "Project Mgmt Rate", project_coord_rate: "Project Coord Rate",
                    programming_rate: "Programming Rate", field_engineering_rate: "Field Engineering Rate",
                  };
                  return (
                    <div key={key} className="flex flex-col">
                      <label className="mb-1 block text-[11px] font-medium text-muted">{labels[key]}</label>
                      <div className="relative mt-auto">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-muted">$</span>
                        <input type="number" min="0" step="0.01" value={laborRates[key]}
                          onChange={(e) => setLaborRates((prev) => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                          className="forge-input pl-6 text-[13px]" />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 grid grid-cols-6 gap-3">
                {(["engineering_cost", "installation_cost", "project_mgmt_cost", "project_coord_cost", "programming_cost", "field_engineering_cost"] as const).map((key) => {
                  const labels: Record<string, string> = {
                    engineering_cost: "Engineering Cost", installation_cost: "Installation Cost",
                    project_mgmt_cost: "Project Mgmt Cost", project_coord_cost: "Project Coord Cost",
                    programming_cost: "Programming Cost", field_engineering_cost: "Field Engineering Cost",
                  };
                  return (
                    <div key={key} className="flex flex-col">
                      <label className="mb-1 block text-[11px] font-medium text-muted">{labels[key]}</label>
                      <div className="relative mt-auto">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-muted">$</span>
                        <input type="number" min="0" step="0.01" value={laborRates[key]}
                          onChange={(e) => setLaborRates((prev) => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                          className="forge-input pl-6 text-[13px]" />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                <button type="submit" disabled={savingLabor} className="forge-btn-primary text-[13px]">
                  {savingLabor ? "Saving..." : "Save Labor Settings"}
                </button>
                {savedLabor && <span className="text-sm text-emerald-400">Saved</span>}
              </div>
            </div>
          </form>

          {/* Bottom row: Currency & Tax + Integrations */}
          <div className="grid grid-cols-2 gap-4">

            {/* Currency & Tax */}
            <div className="rounded-xl border border-border bg-forge-surface/40 p-4">
              <h3 className="mb-0.5 text-sm font-semibold text-heading">Currency &amp; Tax</h3>
              <p className="mb-4 text-[12px] text-muted">Default currency and tax settings for your projects.</p>

              <form onSubmit={handleCurrencySave} className="mb-4 border-b border-border pb-4">
                <label className="mb-1.5 block text-[12px] font-medium text-muted">Currency <span className="text-faint">default: USD</span></label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="forge-input mb-3">
                  {[
                    ["USD","US Dollar (USD)"],["EUR","Euro (EUR)"],["GBP","British Pound (GBP)"],
                    ["CAD","Canadian Dollar (CAD)"],["AUD","Australian Dollar (AUD)"],["JPY","Japanese Yen (JPY)"],
                    ["CHF","Swiss Franc (CHF)"],["INR","Indian Rupee (INR)"],["MXN","Mexican Peso (MXN)"],
                    ["BRL","Brazilian Real (BRL)"],["SGD","Singapore Dollar (SGD)"],["AED","UAE Dirham (AED)"],
                  ].map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                </select>
                <div className="flex items-center gap-3">
                  <button type="submit" disabled={savingCurrency} className="forge-btn-primary text-[13px]">
                    {savingCurrency ? "Saving..." : "Update Currency"}
                  </button>
                  {savedCurrency && <span className="text-sm text-emerald-400">Saved</span>}
                </div>
              </form>

              <form onSubmit={handleTaxSave}>
                <h4 className="mb-3 text-[13px] font-semibold text-heading">Tax Preferences</h4>
                <div className="space-y-2 mb-3">
                  {([
                    ["tax_equipment", "Tax All Equipment By Default"],
                    ["tax_shipping", "Tax All Shipping By Default"],
                    ["tax_set_default_rates", "Set Default Tax Rates When Projects Created"],
                    ["tax_independent_rates", "Use Independent Equipment And Labor Tax Rates"],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="flex cursor-pointer items-center gap-2">
                      <input type="checkbox" checked={taxPrefs[key]}
                        onChange={(e) => setTaxPrefs((prev) => ({ ...prev, [key]: e.target.checked }))}
                        className="h-3.5 w-3.5 rounded border-border accent-blue-500" />
                      <span className="text-[12px] text-body">{label}</span>
                    </label>
                  ))}
                </div>
                <label className="mb-1 block text-[12px] font-medium text-muted">Tax Name <span className="text-faint">e.g. Sales Tax, VAT</span></label>
                <input type="text" value={taxPrefs.tax_name}
                  onChange={(e) => setTaxPrefs((prev) => ({ ...prev, tax_name: e.target.value }))}
                  className="forge-input mb-3" placeholder="Tax" />
                <div className="flex items-center gap-3">
                  <button type="submit" disabled={savingTax} className="forge-btn-primary text-[13px]">
                    {savingTax ? "Saving..." : "Update Tax Preferences"}
                  </button>
                  {savedTax && <span className="text-sm text-emerald-400">Saved</span>}
                </div>
              </form>
            </div>

            {/* Integrations */}
            <div className="rounded-xl border border-border bg-forge-surface/40 p-4">
              <h3 className="mb-0.5 text-sm font-semibold text-heading">Integrations</h3>
              <p className="mb-4 text-[12px] text-muted">Connect third-party apps to sync data with your organization.</p>

              <div className="overflow-hidden rounded-lg border border-border">
                <div className="grid grid-cols-[1fr_130px_110px] bg-forge-surface px-3 py-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Application</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Status</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Actions</span>
                </div>
                <div className="grid grid-cols-[1fr_130px_110px] items-center border-t border-border px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <svg width="26" height="26" viewBox="0 0 40 40" fill="none">
                      <rect width="40" height="40" rx="8" fill="#2CA01C"/>
                      <path d="M20 8C13.37 8 8 13.37 8 20s5.37 12 12 12 12-5.37 12-12S26.63 8 20 8zm-2 17.5v-11l9.5 5.5-9.5 5.5z" fill="white"/>
                    </svg>
                    <div>
                      <div className="text-[13px] font-medium text-heading">QuickBooks Online</div>
                      <div className="text-[11px] text-muted">Sync invoices, customers &amp; payments</div>
                    </div>
                  </div>
                  <div>
                    {qbConnected ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        {qbCompany ?? "Connected"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-border/60 px-2 py-0.5 text-[11px] font-medium text-muted">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted" />
                        Not connected
                      </span>
                    )}
                  </div>
                  <div>
                    {qbConnected ? (
                      <button onClick={handleQbDisconnect} disabled={disconnectingQb}
                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[12px] font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors">
                        {disconnectingQb ? "..." : "Disconnect"}
                      </button>
                    ) : (
                      <a href={`/api/integrations/quickbooks/connect?org=${activeOrg.id}`}
                        className="inline-block rounded-lg bg-[#2CA01C] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#238a16] transition-colors">
                        Connect
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>{/* end bottom row */}
        </div>{/* end right column */}
      </div>{/* end grid */}
    </div>
  );
}
