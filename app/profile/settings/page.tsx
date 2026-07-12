"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { useTheme } from "@/components/ThemeProvider";
import ProfileSettingsSkeleton from "@/components/skeletons/ProfileSettingsSkeleton";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${on ? "bg-blue-500" : "bg-border"}`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${on ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

const iconBg = "flex h-12 w-12 items-center justify-center rounded-2xl";

export default function ProfileSettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);
  const [savedInfo, setSavedInfo] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [emailAlerts, setEmailAlerts] = useState(true);
  const { theme, toggle: toggleTheme } = useTheme();

  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaEnrolling, setMfaEnrolling] = useState(false);
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaMsg, setMfaMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        const full = data.user.user_metadata?.full_name || "";
        const parts = full.split(" ");
        setFirstName(parts[0] || "");
        setLastName(parts.slice(1).join(" ") || "");
      }
    });
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const verified = data?.totp?.find((f) => f.status === "verified");
      if (verified) { setMfaEnabled(true); setMfaFactorId(verified.id); }
    });
  }, []);

  async function handleInfoSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingInfo(true);
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
    if (!error) { setSavedInfo(true); setTimeout(() => setSavedInfo(false), 2000); }
    setSavingInfo(false);
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Passwords do not match." });
      return;
    }
    setSavingPassword(true);
    setPasswordMsg(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: user?.email || "", password: currentPassword });
    if (signInError) { setPasswordMsg({ type: "error", text: "Current password is incorrect." }); setSavingPassword(false); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { setPasswordMsg({ type: "error", text: error.message }); }
    else { setPasswordMsg({ type: "success", text: "Password updated." }); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
    setSavingPassword(false);
  }

  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials = ((firstName[0] || "") + (lastName[0] || "")).toUpperCase() || (user?.email?.[0] || "?").toUpperCase();

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        const size = 128; canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        const min = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        const { error } = await supabase.auth.updateUser({ data: { avatar_url: dataUrl } });
        if (!error) setUser((prev) => prev ? { ...prev, user_metadata: { ...prev.user_metadata, avatar_url: dataUrl } } : null);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function handleRemoveAvatar() {
    const { error } = await supabase.auth.updateUser({ data: { avatar_url: null } });
    if (!error) setUser((prev) => prev ? { ...prev, user_metadata: { ...prev.user_metadata, avatar_url: null } } : null);
  }

  async function handleMfaEnable() {
    setMfaLoading(true); setMfaMsg(null);
    const { data: existing } = await supabase.auth.mfa.listFactors();
    const allFactors = existing?.totp ?? [];
    // If already verified, just reflect that in UI without re-enrolling
    const verified = allFactors.find((f) => f.status === "verified");
    if (verified) { setMfaEnabled(true); setMfaFactorId(verified.id); setMfaLoading(false); return; }
    // Unenroll all unverified/stale factors one by one
    for (const f of allFactors) { await supabase.auth.mfa.unenroll({ factorId: f.id }); }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator-${Date.now()}` });
    if (error || !data) { setMfaMsg({ type: "error", text: error?.message ?? "Failed to start enrollment." }); setMfaLoading(false); return; }
    setEnrollFactorId(data.id);
    setMfaQrCode(data.totp.qr_code);
    setMfaSecret(data.totp.secret);
    setMfaEnrolling(true);
    setMfaLoading(false);
  }

  async function handleMfaVerify() {
    if (!enrollFactorId || mfaCode.length !== 6) return;
    setMfaLoading(true); setMfaMsg(null);
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: enrollFactorId });
    if (challengeError || !challengeData) { setMfaMsg({ type: "error", text: "Failed to create challenge." }); setMfaLoading(false); return; }
    const { error } = await supabase.auth.mfa.verify({ factorId: enrollFactorId, challengeId: challengeData.id, code: mfaCode });
    if (error) { setMfaMsg({ type: "error", text: "Invalid code. Please try again." }); setMfaLoading(false); return; }
    setMfaEnabled(true); setMfaFactorId(enrollFactorId);
    setMfaEnrolling(false); setMfaQrCode(null); setMfaSecret(null); setMfaCode("");
    setMfaMsg({ type: "success", text: "Two-factor authentication enabled." });
    setMfaLoading(false);
  }

  async function handleMfaDisable() {
    if (!mfaFactorId) return;
    setMfaLoading(true); setMfaMsg(null);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: mfaFactorId });
    if (error) { setMfaMsg({ type: "error", text: error.message }); setMfaLoading(false); return; }
    setMfaEnabled(false); setMfaFactorId(null);
    setMfaMsg({ type: "success", text: "Two-factor authentication disabled." });
    setMfaLoading(false);
  }

  if (!user) return <ProfileSettingsSkeleton />;

  const inputCls = "w-full rounded-lg border border-border bg-forge-surface/60 px-3 py-2.5 text-[13px] text-heading placeholder:text-faint focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30";
  const labelCls = "mb-1.5 block text-[11px] font-medium text-muted";
  const cardCls = "rounded-2xl border border-border bg-forge-surface/40 p-6";

  return (
    <div className="animate-fade-in px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-heading">My Settings</h2>
        <p className="mt-1 text-[13px] text-muted">Manage your personal information, security, and preferences.</p>
      </div>

      <div className="grid grid-cols-2 gap-5">

        {/* ── Personal Information ── */}
        <form onSubmit={handleInfoSave} className={cardCls}>
          <div className="mb-5 flex items-center gap-4">
            <div className={`${iconBg} bg-gradient-to-br from-orange-400/30 to-amber-500/20`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke="#f97316" strokeWidth="1.8" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="text-[15px] font-bold text-heading">Personal Information</div>
              <div className="text-[12px] text-muted">Update your personal details and how your name appears.</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <label className={labelCls}>First Name</label>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} placeholder="First name" />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={user?.email ?? ""} className={inputCls + " opacity-60 cursor-not-allowed"} readOnly />
            </div>
            <div>
              <label className={labelCls}>Last Name</label>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} placeholder="Last name" />
            </div>
            <div>
              <label className={labelCls}>Phone Number</label>
              <input type="tel" className={inputCls} placeholder="e.g. +1 555 000 0000" />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="submit"
              disabled={savingInfo}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-500 disabled:opacity-60 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              {savingInfo ? "Saving..." : "Save"}
            </button>
            {savedInfo && <span className="text-[12px] text-emerald-400">Saved</span>}
          </div>
        </form>

        {/* ── Profile Photo ── */}
        <div className={cardCls}>
          <div className="mb-5 flex items-center gap-4">
            <div className={`${iconBg} bg-gradient-to-br from-sky-400/30 to-blue-500/20`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="#38bdf8" strokeWidth="1.8" strokeLinejoin="round" />
                <circle cx="12" cy="13" r="4" stroke="#38bdf8" strokeWidth="1.8" />
              </svg>
            </div>
            <div>
              <div className="text-[15px] font-bold text-heading">Profile Photo</div>
              <div className="text-[12px] text-muted">Add a profile photo to personalize your account.</div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-blue-500/20">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-blue-300">{initials}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-forge-surface px-3 py-2 text-[12px] font-medium text-body transition-colors hover:bg-forge-card-hover">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Upload Photo
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </label>
                {avatarUrl && (
                  <button type="button" onClick={handleRemoveAvatar} className="text-[12px] text-red-400 hover:text-red-300 transition-colors">Remove</button>
                )}
              </div>
              <p className="mt-2 text-[11px] text-faint">JPG, PNG or GIF. Max 5MB.</p>
            </div>
          </div>
        </div>

        {/* ── Password & Security ── */}
        <form onSubmit={handlePasswordSave} className={cardCls}>
          <div className="mb-5 flex items-center gap-4">
            <div className={`${iconBg} bg-gradient-to-br from-orange-400/30 to-amber-500/20`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L4 6v6c0 5.25 3.4 9.74 8 11 4.6-1.26 8-5.75 8-11V6l-8-4z" stroke="#f97316" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <div className="text-[15px] font-bold text-heading">Password &amp; Security</div>
              <div className="text-[12px] text-muted">Keep your account secure with a strong password.</div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className={labelCls}>Current Password</label>
              <div className="relative">
                <input type={showCurrent ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputCls + " pr-10"} placeholder="Enter current password" required />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-heading">
                  <EyeIcon open={showCurrent} />
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>New Password</label>
              <div className="relative">
                <input type={showNew ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputCls + " pr-10"} placeholder="Enter new password" required minLength={6} />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-heading">
                  <EyeIcon open={showNew} />
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>Confirm New Password</label>
              <div className="relative">
                <input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputCls + " pr-10"} placeholder="Confirm new password" required />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-heading">
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="submit"
              disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-500 disabled:opacity-60 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L4 6v6c0 5.25 3.4 9.74 8 11 4.6-1.26 8-5.75 8-11V6l-8-4z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
              {savingPassword ? "Updating..." : "Update Password"}
            </button>
            {passwordMsg && (
              <span className={`text-[12px] ${passwordMsg.type === "success" ? "text-emerald-400" : "text-red-400"}`}>{passwordMsg.text}</span>
            )}
          </div>

          {/* 2FA */}
          <div className="mt-6 border-t border-border pt-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-[13px] font-semibold text-heading">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect x="5" y="11" width="14" height="10" rx="2" stroke="#8b5cf6" strokeWidth="1.8" />
                    <path d="M8 11V7a4 4 0 018 0v4" stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  Two-Factor Authentication
                  {mfaEnabled && (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">Enabled</span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-muted">Add an extra layer of security using an authenticator app.</p>
              </div>
              {!mfaEnrolling && (
                mfaEnabled ? (
                  <button type="button" onClick={handleMfaDisable} disabled={mfaLoading}
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[12px] font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors">
                    {mfaLoading ? "Disabling..." : "Disable"}
                  </button>
                ) : (
                  <button type="button" onClick={handleMfaEnable} disabled={mfaLoading}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors">
                    {mfaLoading ? "Loading..." : "Enable"}
                  </button>
                )
              )}
            </div>

            {mfaMsg && (
              <p className={`mt-2 text-[12px] ${mfaMsg.type === "success" ? "text-emerald-400" : "text-red-400"}`}>{mfaMsg.text}</p>
            )}

            {mfaEnrolling && mfaQrCode && (
              <div className="mt-4 rounded-xl border border-border bg-forge-surface/40 p-4">
                <p className="mb-3 text-[12px] text-muted">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code to confirm.</p>
                <div className="flex items-start gap-5">
                  <img src={mfaQrCode} alt="2FA QR Code" className="h-32 w-32 rounded-lg border border-border bg-white p-1" />
                  <div className="flex-1">
                    <label className="mb-1 block text-[11px] font-medium text-muted">Verification Code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      className="mb-3 w-32 rounded-lg border border-border bg-forge-surface/60 px-3 py-2 text-center text-[14px] font-mono tracking-widest text-heading placeholder:text-faint focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                    />
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={handleMfaVerify} disabled={mfaLoading || mfaCode.length !== 6}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors">
                        {mfaLoading ? "Verifying..." : "Confirm"}
                      </button>
                      <button type="button" onClick={() => { setMfaEnrolling(false); setMfaQrCode(null); setMfaSecret(null); setMfaCode(""); setMfaMsg(null); }}
                        className="text-[12px] text-muted hover:text-body transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* ── Preferences ── */}
        <div className={cardCls}>
          <div className="mb-5 flex items-center gap-4">
            <div className={`${iconBg} bg-gradient-to-br from-orange-400/30 to-amber-500/20`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" stroke="#f97316" strokeWidth="1.8" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="#f97316" strokeWidth="1.8" />
              </svg>
            </div>
            <div>
              <div className="text-[15px] font-bold text-heading">Preferences</div>
              <div className="text-[12px] text-muted">Customize your experience and notification preferences.</div>
            </div>
          </div>

          <div className="space-y-3">
            {/* Email Alerts */}
            <div className="flex items-center gap-4 rounded-xl border border-border bg-forge-surface/30 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/15">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#8b5cf6" strokeWidth="1.5" />
                  <polyline points="22,6 12,13 2,6" stroke="#8b5cf6" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-semibold text-heading">Email Alerts</div>
                <div className="text-[11px] text-muted">Receive email notifications about important updates.</div>
              </div>
              <Toggle on={emailAlerts} onToggle={() => setEmailAlerts(!emailAlerts)} />
            </div>

            {/* Dark Mode — hidden for now, will enable later */}
            <div className="hidden items-center gap-4 rounded-xl border border-border bg-forge-surface/30 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/15">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="#8b5cf6" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-semibold text-heading">Dark Mode</div>
                <div className="text-[11px] text-muted">Keep the interface in dark theme.</div>
              </div>
              <Toggle on={theme === "dark"} onToggle={toggleTheme} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
