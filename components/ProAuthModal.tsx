"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Mode = "signin" | "signup";

function EmailIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>;
}

function UserIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></svg>;
}

function LockIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>;
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return hidden
    ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 3l18 18" /><path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" /><path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5 0 9 5 9 8a9.8 9.8 0 0 1-2 3.5M6.2 6.2C4.2 7.6 3 10 3 12c0 3 4 8 9 8 1.3 0 2.5-.3 3.6-.8" /></svg>
    : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>;
}

export default function ProAuthModal() {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setMessage(null);
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);

    if (mode === "signup" && password !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }
    if (password.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }

    setLoading(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage({ type: "error", text: error.message });
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/projects`,
      },
    });
    if (error) {
      setMessage({ type: "error", text: error.message });
    } else if (!data.session) {
      setMessage({ type: "success", text: "Check your email to confirm your account. The confirmation link will return you to Projects." });
    }
    setLoading(false);
  }

  async function handleForgotPassword() {
    if (!email) {
      setMessage({ type: "error", text: "Enter your email address first." });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` });
    setMessage(error ? { type: "error", text: error.message } : { type: "success", text: "Password reset instructions have been sent to your email." });
    setLoading(false);
  }

  const fieldClass = "w-full rounded-full border border-slate-300 bg-white py-3 pl-11 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 px-4 py-6 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="pro-auth-title">
      <div className="w-full max-w-[470px] rounded-3xl border border-violet-200/60 bg-gradient-to-br from-white via-white to-violet-50 p-7 text-slate-950 shadow-2xl sm:p-8">
        <h2 id="pro-auth-title" className="text-2xl font-bold">{mode === "signup" ? "Create your account" : "Welcome back"}</h2>
        <p className="mt-1 text-sm leading-5 text-slate-600">{mode === "signup" ? "Start your 3-day Pro trial. No credit card required." : "Sign in to continue designing, estimating, and delivering exceptional AV experiences."}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "signup" && <label className="block text-sm font-medium"><span className="mb-2 block">Full Name</span><span className="relative block"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"><UserIcon /></span><input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="John Doe" autoComplete="name" required /></span></label>}

          <label className="block text-sm font-medium"><span className="mb-2 block">Email address</span><span className="relative block"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"><EmailIcon /></span><input className={fieldClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></span></label>

          <label className="block text-sm font-medium"><span className="mb-2 block">Password</span><span className="relative block"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"><LockIcon /></span><input className={fieldClass} type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "signup" ? "Create a password" : "Enter your password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} required /><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-violet-600" aria-label={showPassword ? "Hide password" : "Show password"}><EyeIcon hidden={!showPassword} /></button></span></label>

          {mode === "signup" && <label className="block text-sm font-medium"><span className="mb-2 block">Confirm Password</span><span className="relative block"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"><LockIcon /></span><input className={fieldClass} type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm your password" autoComplete="new-password" required /><button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-violet-600" aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}><EyeIcon hidden={!showConfirmPassword} /></button></span></label>}

          {mode === "signin" && <div className="text-right"><button type="button" onClick={handleForgotPassword} className="text-sm font-medium text-violet-600 hover:text-violet-500">Forgot password?</button></div>}
          {message && <p className={`rounded-xl px-4 py-3 text-sm ${message.type === "error" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>{message.text}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-full bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-500 disabled:opacity-60">{loading ? "Please wait…" : mode === "signup" ? "Create Account" : "Sign In"}</button>
          {mode === "signup" && <p className="text-center text-xs leading-5 text-slate-500">Continue with Pro after your 3-day trial by choosing a subscription.</p>}
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-slate-200" /><span>or</span><span className="h-px flex-1 bg-slate-200" /></div>
        <p className="text-center text-sm text-slate-500">{mode === "signup" ? "Already have an account?" : "Don't have an account?"} <button type="button" onClick={() => switchMode(mode === "signup" ? "signin" : "signup")} className="font-medium text-violet-500 hover:text-violet-600">{mode === "signup" ? "Sign in ›" : "Create one and get 3 days of Pro access ›"}</button></p>
        <div className="mt-5 text-center"><Link href="/" className="text-xs text-slate-400 hover:text-slate-600">Return home</Link></div>
      </div>
    </div>
  );
}
