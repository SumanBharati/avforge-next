"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/components/ThemeProvider";
import AuthPageSkeleton from "@/components/skeletons/AuthPageSkeleton";

type FormView = "login" | "forgot" | "forgot-sent" | "reset";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const { theme } = useTheme();

  const [view, setView] = useState<FormView>("login");

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Reset fields
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showResendConfirm, setShowResendConfirm] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check URL hash directly — Supabase includes #type=recovery before the event fires
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    if (hashParams.get("type") === "recovery") setView("reset");
  }, []);

  // Fallback: catch PASSWORD_RECOVERY if it fires after mount
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setView("reset");
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setShowResendConfirm(false);
    setResendDone(false);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message === 'Invalid login credentials') {
        const { data: userExists } = await supabase.rpc('check_user_exists', { user_email: email });
        if (!userExists) {
          setError("No account found with this email address. Please sign up to get started.");
        } else {
          setError("Incorrect password. Please try again or use Forgot password.");
        }
      } else if (error.message === 'Email not confirmed') {
        setError("Your email address hasn't been confirmed yet. Check your inbox (and spam folder) for the confirmation link.");
        setShowResendConfirm(true);
      } else {
        setError(error.message);
      }
      setLoading(false);
      return;
    }

    if (inviteToken) {
      router.push(`/org/invite?token=${inviteToken}`);
      return;
    }

    const { data: { user: loggedInUser } } = await supabase.auth.getUser();
    if (loggedInUser) {
      const { data: memberships } = await supabase
        .from("organization_members")
        .select("org_id")
        .eq("user_id", loggedInUser.id)
        .limit(1);
      if (!memberships || memberships.length === 0) {
        router.push("/welcome");
        return;
      }
    }

    router.push("/home");
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setView("forgot-sent");
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (resetPassword !== resetConfirm) {
      setResetMsg({ type: "error", text: "Passwords do not match." });
      return;
    }
    if (resetPassword.length < 6) {
      setResetMsg({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }
    setLoading(true);
    setResetMsg(null);
    const { error } = await supabase.auth.updateUser({ password: resetPassword });
    setLoading(false);
    if (error) {
      setResetMsg({ type: "error", text: error.message });
      return;
    }
    setResetMsg({ type: "success", text: "Password updated! Signing you in…" });
    setTimeout(() => router.push("/home"), 1500);
  }

  if (!mounted) return <AuthPageSkeleton fields={2} />;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0" style={{
        background: theme === "dark"
          ? "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(59,130,246,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 20% 80%, rgba(139,92,246,0.08) 0%, transparent 50%), radial-gradient(ellipse 50% 40% at 80% 20%, rgba(16,185,129,0.06) 0%, transparent 50%), linear-gradient(180deg, #080d17 0%, #0c1220 40%, #0f172a 100%)"
          : "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(59,130,246,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 20% 80%, rgba(139,92,246,0.05) 0%, transparent 50%), radial-gradient(ellipse 50% 40% at 80% 20%, rgba(16,185,129,0.04) 0%, transparent 50%), linear-gradient(180deg, #ffffff 0%, #f8fafc 40%, #f1f5f9 100%)",
      }} />
      {/* Grid pattern overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: "linear-gradient(rgba(148,163,184,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.5) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />
      {/* Circuit-style decorative lines */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
        <line x1="20%" y1="0" x2="20%" y2="100%" stroke="#3b82f6" strokeWidth="0.5" />
        <line x1="40%" y1="0" x2="40%" y2="100%" stroke="#3b82f6" strokeWidth="0.5" />
        <line x1="60%" y1="0" x2="60%" y2="100%" stroke="#3b82f6" strokeWidth="0.5" />
        <line x1="80%" y1="0" x2="80%" y2="100%" stroke="#3b82f6" strokeWidth="0.5" />
        <line x1="0" y1="30%" x2="100%" y2="30%" stroke="#8b5cf6" strokeWidth="0.5" />
        <line x1="0" y1="60%" x2="100%" y2="60%" stroke="#8b5cf6" strokeWidth="0.5" />
        <circle cx="40%" cy="30%" r="4" fill="#3b82f6" opacity="0.3" />
        <circle cx="60%" cy="60%" r="4" fill="#8b5cf6" opacity="0.3" />
        <circle cx="20%" cy="60%" r="3" fill="#10b981" opacity="0.2" />
        <circle cx="80%" cy="30%" r="3" fill="#3b82f6" opacity="0.2" />
      </svg>

      {/* Auth header */}
      <header className="relative z-10 flex h-[72px] shrink-0 items-center justify-between px-8">
        <Link href="/login" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600">
            <span className="text-lg font-extrabold text-white">▲</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-heading">
            AV<span className="text-blue-500">Forge</span>
          </span>
        </Link>
      </header>

      {/* Content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-start px-16 lg:px-32 py-6">

        {/* Title + Subtitle */}
        <div className="mb-8 w-full max-w-[1400px] mx-auto text-center">
          <h1 className="mb-4 font-display text-5xl font-bold tracking-tight text-heading md:text-[56px]" style={{ lineHeight: 1.1 }}>
            One connected platform for your
            <br />
            <span className="bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent">complete AV workflow.</span>
          </h1>
          <p className="text-lg text-muted" style={{ lineHeight: 1.6 }}>
            Create site surveys, design engineering documents, proposals, and project engineering deliverables with ease.
          </p>
        </div>

        {/* Form + image row */}
        <div className="flex flex-col lg:flex-row items-center gap-24 w-full max-w-[1400px] mx-auto">

          {/* Left — form (only this area changes between views) */}
          <div className="flex flex-col items-center gap-12 lg:w-[420px] shrink-0">
            <div className="w-full">
              <div className="p-2">

                {/* ── Sign In ── */}
                {view === "login" && (
                  <>
                    <h2 className="mb-1 text-2xl font-bold text-heading">Welcome back</h2>
                    <p className="mb-6 text-sm text-muted">Sign in to continue designing, estimating, and delivering exceptional AV experiences.</p>

                    <form onSubmit={handleSignIn} className="flex flex-col gap-4">
                      {error && (
                        <div className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[13px] text-red-400">{error}</div>
                      )}
                      {showResendConfirm && (
                        <button
                          type="button"
                          disabled={resendDone}
                          onClick={async () => {
                            const { error: resendErr } = await supabase.auth.resend({ type: "signup", email });
                            if (resendErr) { setError(resendErr.message); return; }
                            setResendDone(true);
                            setError("");
                          }}
                          className="rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-[13px] text-blue-400 hover:bg-blue-500/20 disabled:opacity-60 transition-colors"
                        >
                          {resendDone ? "Confirmation email sent — check your inbox and spam folder" : "Resend confirmation email"}
                        </button>
                      )}

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-heading">Email address</label>
                        <div className="relative">
                          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/>
                          </svg>
                          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="forge-input pl-10 !bg-white !rounded-full" autoComplete="username" required />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-heading">Password</label>
                        <div className="relative">
                          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                          <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="forge-input pl-10 pr-10 !bg-white !rounded-full" autoComplete="current-password" required />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-heading transition-colors">
                            {showPassword ? (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                            ) : (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-end">
                        <button type="button" onClick={() => { setError(""); setView("forgot"); }} className="text-sm text-blue-500 hover:text-blue-400 transition-colors">
                          Forgot password?
                        </button>
                      </div>

                      <button type="submit" disabled={loading} className="forge-btn-primary mt-1 w-full justify-center !rounded-full disabled:opacity-50">
                        {loading ? "Signing in…" : "Sign In"}
                      </button>
                    </form>

                    <div className="my-5 flex items-center gap-3">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs text-subtle">or</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>

                    <p className="text-center text-sm text-subtle">
                      Don&apos;t have an account?{" "}
                      <Link href="/register" className="font-medium text-blue-500 hover:text-blue-400 inline-flex items-center gap-0.5">
                        Create one <span aria-hidden>›</span>
                      </Link>
                    </p>
                  </>
                )}

                {/* ── Forgot Password ── */}
                {view === "forgot" && (
                  <>
                    <button type="button" onClick={() => { setError(""); setView("login"); }} className="mb-4 flex items-center gap-1.5 text-sm text-muted hover:text-heading transition-colors">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      Back to sign in
                    </button>

                    <h2 className="mb-1 text-2xl font-bold text-heading">Reset your password</h2>
                    <p className="mb-6 text-sm text-muted">Enter your email and we&apos;ll send you a link to reset your password.</p>

                    <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
                      {error && (
                        <div className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[13px] text-red-400">{error}</div>
                      )}

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-heading">Email address</label>
                        <div className="relative">
                          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/>
                          </svg>
                          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="forge-input pl-10 !bg-white !rounded-full" autoComplete="email" required />
                        </div>
                      </div>

                      <button type="submit" disabled={loading} className="forge-btn-primary mt-1 w-full justify-center !rounded-full disabled:opacity-50">
                        {loading ? "Sending…" : "Send reset link"}
                      </button>
                    </form>
                  </>
                )}

                {/* ── Forgot Sent ── */}
                {view === "forgot-sent" && (
                  <>
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/>
                      </svg>
                    </div>

                    <h2 className="mb-1 text-2xl font-bold text-heading">Check your inbox</h2>
                    <p className="mb-2 text-sm text-muted">
                      We sent a password reset link to
                    </p>
                    <p className="mb-6 text-sm font-semibold text-heading">{email}</p>
                    <p className="mb-6 text-sm text-muted">
                      Click the link in the email to set a new password. The link expires in 1 hour.
                    </p>

                    <button
                      type="button"
                      onClick={() => { setError(""); setView("login"); }}
                      className="forge-btn-primary w-full justify-center !rounded-full"
                    >
                      Back to sign in
                    </button>

                    <p className="mt-4 text-center text-sm text-subtle">
                      Didn&apos;t receive it?{" "}
                      <button
                        type="button"
                        onClick={() => { setView("forgot"); }}
                        className="font-medium text-blue-500 hover:text-blue-400 transition-colors"
                      >
                        Try again
                      </button>
                    </p>
                  </>
                )}

                {/* ── Reset Password ── */}
                {view === "reset" && (
                  <>
                    <h2 className="mb-1 text-2xl font-bold text-heading">Set new password</h2>
                    <p className="mb-6 text-sm text-muted">Choose a strong password for your account.</p>

                    <form onSubmit={handleResetSubmit} className="flex flex-col gap-4">
                      {resetMsg && (
                        <div className={`rounded-full border px-4 py-2.5 text-[13px] ${
                          resetMsg.type === "error"
                            ? "border-red-500/30 bg-red-500/10 text-red-400"
                            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        }`}>
                          {resetMsg.text}
                        </div>
                      )}

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-heading">New password</label>
                        <div className="relative">
                          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                          <input type={showResetPassword ? "text" : "password"} value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="New password" className="forge-input pl-10 pr-10 !bg-white !rounded-full" autoComplete="new-password" required />
                          <button type="button" onClick={() => setShowResetPassword(!showResetPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-heading transition-colors">
                            {showResetPassword ? (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                            ) : (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-heading">Confirm new password</label>
                        <div className="relative">
                          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                          <input type={showResetConfirm ? "text" : "password"} value={resetConfirm} onChange={(e) => setResetConfirm(e.target.value)} placeholder="Confirm new password" className="forge-input pl-10 pr-10 !bg-white !rounded-full" autoComplete="new-password" required />
                          <button type="button" onClick={() => setShowResetConfirm(!showResetConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-heading transition-colors">
                            {showResetConfirm ? (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                            ) : (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            )}
                          </button>
                        </div>
                      </div>

                      <button type="submit" disabled={loading || resetMsg?.type === "success"} className="forge-btn-primary mt-1 w-full justify-center !rounded-full disabled:opacity-50">
                        {loading ? "Updating…" : "Update password"}
                      </button>
                    </form>
                  </>
                )}

              </div>
            </div>
          </div>

          {/* Right — dashboard preview */}
          <div className="hidden lg:flex items-center justify-end flex-1">
            <div className="w-[90%] overflow-hidden rounded-2xl border border-border/60 shadow-2xl">
              <img
                src="/dashboard-preview.png"
                alt="AVForge dashboard preview"
                className="w-full h-auto"
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
