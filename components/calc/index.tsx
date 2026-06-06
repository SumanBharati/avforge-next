'use client';

import React from 'react';

// ─── CalcSection ──────────────────────────────────────────────────────────────

export function CalcSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="mb-2 border-b border-border pb-1.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">
        {title}
      </h3>
      {children}
    </div>
  );
}

// ─── InputField ───────────────────────────────────────────────────────────────

interface InputFieldProps {
  label: string;
  value: number | string;
  onChange: (v: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}

export function InputField({ label, value, onChange, unit, min, max, step = 1, hint }: InputFieldProps) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-[13px] font-semibold uppercase tracking-[0.05em] text-muted">
        {label}
        {hint && <span className="ml-1.5 font-normal normal-case tracking-normal opacity-60">{hint}</span>}
      </label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          min={min}
          max={max}
          step={step}
          className="flex-1 rounded-lg border border-border bg-forge-surface px-3 py-2.5 font-mono text-[15px] text-body outline-none transition-colors focus:border-blue-500/40"
        />
        {unit && <span className="min-w-[30px] text-sm text-subtle">{unit}</span>}
      </div>
    </div>
  );
}

// ─── SelectField ──────────────────────────────────────────────────────────────

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}

export function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-[13px] font-semibold uppercase tracking-[0.05em] text-muted">
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="forge-input cursor-pointer text-[15px]"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── ResultCard ───────────────────────────────────────────────────────────────

interface ResultCardProps {
  label: string;
  value: string | number;
  unit: string;
  accent?: boolean;
}

export function ResultCard({ label, value, unit, accent }: ResultCardProps) {
  return (
    <div className={`rounded-lg p-4 ${accent ? 'border border-blue-500/25 bg-blue-500/[0.08]' : 'border border-border bg-forge-surface/50'}`}>
      <div className="mb-1 text-[12px] uppercase tracking-[0.04em] text-muted">{label}</div>
      <div className={`font-mono text-[15px] font-semibold ${accent ? 'text-blue-400' : 'text-body'}`}>
        {value}
        <span className="ml-1 text-[13px] font-normal text-subtle">{unit}</span>
      </div>
    </div>
  );
}

// ─── StatusBanner ─────────────────────────────────────────────────────────────

interface StatusBannerProps {
  ok: boolean;
  okText: string;
  failText: string;
}

export function StatusBanner({ ok, okText, failText }: StatusBannerProps) {
  return (
    <div className={`rounded-lg border px-3.5 py-2.5 text-[15px] ${ok ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>
      {ok ? okText : failText}
    </div>
  );
}

// ─── CalcPageWrapper ──────────────────────────────────────────────────────────

interface CalcPageWrapperProps {
  title: string;
  desc: string;
  children: React.ReactNode;
}

export function CalcPageWrapper({ title, desc, children }: CalcPageWrapperProps) {
  return (
    <div className="animate-fade-in px-6 py-3">
      <div className="mb-2 flex items-center gap-2 text-[12px]">
        <a href="/calculators" className="text-subtle transition-colors hover:text-secondary">
          ← Calculators
        </a>
      </div>
      <h2 className="mb-0.5 text-xl font-semibold text-heading">{title}</h2>
      <p className="mb-3 text-[13px] text-subtle">{desc}</p>
      <div className="w-full">{children}</div>
    </div>
  );
}
