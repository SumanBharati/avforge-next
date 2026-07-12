"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/components/ThemeProvider";
import AuthPageSkeleton from "@/components/skeletons/AuthPageSkeleton";

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // With email confirmation enabled, Supabase "succeeds" silently for an
    // already-registered email but returns no identities — surface it
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError("An account with this email already exists. Try signing in, or use Forgot password.");
      setLoading(false);
      return;
    }

    // No session means email confirmation is required before they can log in
    if (!data.session) {
      setAwaitingConfirmation(true);
      setLoading(false);
      return;
    }

    router.push("/welcome");
  }

  if (!mounted) return <AuthPageSkeleton fields={3} />;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0" style={{
        background: theme === "dark"
          ? "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(139,92,246,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 20% 80%, rgba(139,92,246,0.08) 0%, transparent 50%), radial-gradient(ellipse 50% 40% at 80% 20%, rgba(16,185,129,0.06) 0%, transparent 50%), linear-gradient(180deg, #080d17 0%, #0c1220 40%, #0f172a 100%)"
          : "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(139,92,246,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 20% 80%, rgba(139,92,246,0.05) 0%, transparent 50%), radial-gradient(ellipse 50% 40% at 80% 20%, rgba(16,185,129,0.04) 0%, transparent 50%), linear-gradient(180deg, #ffffff 0%, #f8fafc 40%, #f1f5f9 100%)",
      }} />
      {/* Grid pattern overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: "linear-gradient(rgba(148,163,184,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.5) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />
      {/* Circuit-style decorative lines */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
        <line x1="20%" y1="0" x2="20%" y2="100%" stroke="#8b5cf6" strokeWidth="0.5" />
        <line x1="40%" y1="0" x2="40%" y2="100%" stroke="#8b5cf6" strokeWidth="0.5" />
        <line x1="60%" y1="0" x2="60%" y2="100%" stroke="#8b5cf6" strokeWidth="0.5" />
        <line x1="80%" y1="0" x2="80%" y2="100%" stroke="#8b5cf6" strokeWidth="0.5" />
        <line x1="0" y1="30%" x2="100%" y2="30%" stroke="#8b5cf6" strokeWidth="0.5" />
        <line x1="0" y1="60%" x2="100%" y2="60%" stroke="#8b5cf6" strokeWidth="0.5" />
        <circle cx="40%" cy="30%" r="4" fill="#8b5cf6" opacity="0.3" />
        <circle cx="60%" cy="60%" r="4" fill="#8b5cf6" opacity="0.3" />
        <circle cx="20%" cy="60%" r="3" fill="#10b981" opacity="0.2" />
        <circle cx="80%" cy="30%" r="3" fill="#8b5cf6" opacity="0.2" />
      </svg>

      {/* Header */}
      <header className="relative z-10 flex h-[72px] shrink-0 items-center justify-between px-8">
        <Link href="/login" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600">
            <span className="text-lg font-extrabold text-white">▲</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-heading">
            AV<span className="text-blue-500">Forge</span>
          </span>
        </Link>
        {/* <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-forge-surface hover:text-heading"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
        </div> */}
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

          {/* Left — form */}
          <div className="flex flex-col items-center gap-12 lg:w-[420px] shrink-0">

            {/* Register card */}
            <div className="w-full">
              {awaitingConfirmation ? (
                <div className="p-2 text-center">
                  <div className="mb-4 flex justify-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/30">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/>
                      </svg>
                    </div>
                  </div>
                  <h2 className="mb-2 text-2xl font-bold text-heading">Confirm your email</h2>
                  <p className="mb-1 text-sm text-muted">
                    We sent a confirmation link to <span className="font-semibold text-heading">{email}</span>.
                  </p>
                  <p className="mb-6 text-sm text-muted">
                    Click the link in that email to activate your account, then sign in. Don&apos;t forget to check your spam folder.
                  </p>
                  <button
                    type="button"
                    disabled={resendDone}
                    onClick={async () => {
                      const { error: resendErr } = await supabase.auth.resend({ type: "signup", email });
                      if (resendErr) { setError(resendErr.message); return; }
                      setResendDone(true);
                    }}
                    className="rounded-full border border-blue-500/30 bg-blue-500/10 px-5 py-2.5 text-[13px] text-blue-400 hover:bg-blue-500/20 disabled:opacity-60 transition-colors"
                  >
                    {resendDone ? "Confirmation email resent" : "Resend confirmation email"}
                  </button>
                  {error && <p className="mt-3 text-[13px] text-red-400">{error}</p>}
                  <p className="mt-6 text-center text-sm text-subtle">
                    Already confirmed?{" "}
                    <Link href="/login" className="font-medium text-blue-400 hover:text-blue-300">Sign in</Link>
                  </p>
                </div>
              ) : (
              <div className="p-2">
                <h2 className="mb-1 text-2xl font-bold text-heading">Create your account</h2>
                <p className="mb-6 text-sm text-muted">Start your AV project journey today</p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {error && (
                    <div className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[13px] text-red-400">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-heading">Full Name</label>
                    <div className="relative">
                      <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                      </svg>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="forge-input pl-10 !bg-white !rounded-full"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-heading">Email address</label>
                    <div className="relative">
                      <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/>
                      </svg>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="forge-input pl-10 !bg-white !rounded-full"
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-heading">Password</label>
                    <div className="relative">
                      <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a password"
                        className="forge-input pl-10 pr-10 !bg-white !rounded-full"
                        autoComplete="new-password"
                        required
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-heading transition-colors">
                        {showPassword ? (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-heading">Confirm Password</label>
                    <div className="relative">
                      <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        className="forge-input pl-10 pr-10 !bg-white !rounded-full"
                        autoComplete="new-password"
                        required
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-heading transition-colors">
                        {showConfirmPassword ? (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="forge-btn-primary mt-1 w-full justify-center !rounded-full disabled:opacity-50">
                    {loading ? "Creating account..." : "Create Account"}
                  </button>
                </form>

                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-subtle">or</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <p className="text-center text-sm text-subtle">
                  Already have an account?{" "}
                  <Link href="/login" className="font-medium text-blue-400 hover:text-blue-300 inline-flex items-center gap-0.5">
                    Sign in <span aria-hidden>›</span>
                  </Link>
                </p>
              </div>
              )}
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
