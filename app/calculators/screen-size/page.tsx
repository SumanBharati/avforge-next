'use client';

import { useState } from 'react';
import { Calculator, Trash2 } from 'lucide-react';
import { CalcPageWrapper } from '@/components/calc';

type Unit = 'cm' | 'in' | 'ft';
interface DimState { cm: string; in: string; ft: string; last: Unit | null; }
const emptyDim = (): DimState => ({ cm: '', in: '', ft: '', last: null });

export default function ScreenSizePage() {
  const [arW, setArW] = useState(16);
  const [arH, setArH] = useState(9);
  const [diag, setDiag] = useState<DimState>(emptyDim());
  const [width, setWidth] = useState<DimState>(emptyDim());
  const [height, setHeight] = useState<DimState>(emptyDim());

  const ar = arW / arH;

  const presets = [
    { name: '4K Ultra HD', res: '3840×2160', ratio: '16:9',  w: 16,   h: 9  },
    { name: 'Full HD',     res: '1920×1080', ratio: '16:9',  w: 16,   h: 9  },
    { name: 'WUXGA',       res: '1920×1200', ratio: '16:10', w: 16,   h: 10 },
    { name: 'UWQHD',       res: '3440×1440', ratio: '21:9',  w: 21,   h: 9  },
    { name: 'Anamorphic',  res: '',          ratio: '2.39:1',w: 2.39, h: 1  },
    { name: 'NTSC/PAL',    res: '',          ratio: '4:3',   w: 4,    h: 3  },
  ];

  const toInches = (val: string, unit: Unit): number => {
    const n = parseFloat(val);
    if (!n || isNaN(n)) return 0;
    return unit === 'cm' ? n / 2.54 : unit === 'ft' ? n * 12 : n;
  };

  const fromInches = (inches: number): DimState => ({
    in: inches.toFixed(2),
    cm: (inches * 2.54).toFixed(2),
    ft: (inches / 12).toFixed(4),
    last: null,
  });

  const calcFromDiag = (val: string, unit: Unit) => {
    const inches = toInches(val, unit);
    if (!inches) return;
    const w = inches * (ar / Math.sqrt(1 + ar * ar));
    const h = w / ar;
    setDiag(fromInches(inches));
    setWidth(fromInches(w));
    setHeight(fromInches(h));
  };

  const calcFromWidth = (val: string, unit: Unit) => {
    const inches = toInches(val, unit);
    if (!inches) return;
    const h = inches / ar;
    const d = Math.sqrt(inches * inches + h * h);
    setWidth(fromInches(inches));
    setHeight(fromInches(h));
    setDiag(fromInches(d));
  };

  const calcFromHeight = (val: string, unit: Unit) => {
    const inches = toInches(val, unit);
    if (!inches) return;
    const w = inches * ar;
    const d = Math.sqrt(w * w + inches * inches);
    setHeight(fromInches(inches));
    setWidth(fromInches(w));
    setDiag(fromInches(d));
  };

  const clearAll = () => {
    setDiag(emptyDim()); setWidth(emptyDim()); setHeight(emptyDim());
  };

  const inputSt: React.CSSProperties = {
    padding: '8px 34px 8px 10px',
    background: 'rgb(var(--forge-surface))',
    border: '1px solid rgb(var(--border))',
    borderRadius: 6,
    color: 'rgb(var(--text-body))',
    fontSize: 14,
    fontFamily: "'JetBrains Mono', monospace",
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };

  const rows = [
    {
      label: 'Diagonal',
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <line x1="3" y1="15" x2="15" y2="3" />
          <polyline points="8,3 15,3 15,10" />
          <polyline points="3,8 3,15 10,15" />
        </svg>
      ),
      dim: diag, setDim: setDiag, calc: calcFromDiag,
    },
    {
      label: 'Width',
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <line x1="2" y1="9" x2="16" y2="9" />
          <polyline points="6,5 2,9 6,13" />
          <polyline points="12,5 16,9 12,13" />
        </svg>
      ),
      dim: width, setDim: setWidth, calc: calcFromWidth,
    },
    {
      label: 'Height',
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <line x1="9" y1="2" x2="9" y2="16" />
          <polyline points="5,6 9,2 13,6" />
          <polyline points="5,12 9,16 13,12" />
        </svg>
      ),
      dim: height, setDim: setHeight, calc: calcFromHeight,
    },
  ];

  const unitLabel: React.CSSProperties = {
    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
    fontSize: 11, color: 'rgb(var(--text-faint))', pointerEvents: 'none',
    userSelect: 'none', fontFamily: "'JetBrains Mono', monospace",
  };

  return (
    <CalcPageWrapper title="Aspect Ratio to Display Size Converter" desc="Diagonal / width / height in cm, inches & feet from aspect ratio">

      {/* ── Section 1: Choose or Enter Aspect Ratio ── */}
      <div className="mb-4 rounded-xl border border-border bg-forge-surface/50 p-4">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          Choose or Enter Aspect Ratio
        </div>
        <div className="mb-4 flex items-center gap-2">
          <span className="text-[13px] font-medium text-muted">Aspect ratio</span>
          <input type="number" value={arW} onChange={e => { setArW(parseFloat(e.target.value) || 0); clearAll(); }} min={1} max={100} step={0.01}
            style={{ width: 64, padding: '6px 8px', background: 'rgb(var(--forge-surface))', border: '1px solid rgb(var(--border))', borderRadius: 6, color: 'rgb(var(--text-body))', fontSize: 14, fontFamily: "'JetBrains Mono', monospace", outline: 'none', textAlign: 'center' }} />
          <span className="text-base font-semibold text-subtle">:</span>
          <input type="number" value={arH} onChange={e => { setArH(parseFloat(e.target.value) || 0); clearAll(); }} min={1} max={100} step={0.01}
            style={{ width: 64, padding: '6px 8px', background: 'rgb(var(--forge-surface))', border: '1px solid rgb(var(--border))', borderRadius: 6, color: 'rgb(var(--text-body))', fontSize: 14, fontFamily: "'JetBrains Mono', monospace", outline: 'none', textAlign: 'center' }} />
        </div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-faint">Select predefined format:</div>
        <div className="flex flex-wrap gap-2">
          {presets.map((p, i) => {
            const active = arW === p.w && arH === p.h;
            return (
              <button key={i} onClick={() => { setArW(p.w); setArH(p.h); clearAll(); }}
                className="rounded-md px-3 py-2 text-left transition-colors"
                style={{
                  background: active ? 'rgba(59,130,246,0.15)' : 'rgb(var(--forge-surface) / 0.5)',
                  border: '1px solid ' + (active ? 'rgba(59,130,246,0.4)' : 'rgb(var(--border))'),
                  minWidth: 120,
                }}>
                <div className="text-[12px] font-semibold" style={{ color: active ? '#60a5fa' : 'rgb(var(--text-body))' }}>{p.name}</div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  {p.res && <span className="text-[10px]" style={{ color: 'rgb(var(--text-subtle))' }}>{p.res}</span>}
                  <span className="text-[10px] font-mono" style={{ color: active ? '#60a5fa' : 'rgb(var(--text-faint))' }}>[{p.ratio}]</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Section 2: Enter One Value ── */}
      <div className="mb-4 rounded-xl border border-border bg-forge-surface/50 p-4">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          Enter One Value to Calculate Other Two
        </div>
        <p className="mb-4 text-[13px] text-muted">Enter a known measurement and click Calculate — the other two compute automatically.</p>

        {rows.map(row => {
          const onCalc = () => {
            const u = row.dim.last;
            if (u && row.dim[u]) return row.calc(row.dim[u], u);
            if (row.dim.ft) return row.calc(row.dim.ft, 'ft');
            if (row.dim.in) return row.calc(row.dim.in, 'in');
            if (row.dim.cm) return row.calc(row.dim.cm, 'cm');
          };
          return (
            <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '24px 76px 1fr 1fr 1fr 100px', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              <span className="text-subtle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{row.icon}</span>
              <span className="text-[13px] font-medium text-body">{row.label}</span>
              {(['cm', 'in', 'ft'] as Unit[]).map(unit => (
                <div key={unit} style={{ position: 'relative' }}>
                  <input
                    type="number"
                    value={row.dim[unit]}
                    onChange={e => row.setDim(prev => ({ ...prev, [unit]: e.target.value, last: unit }))}
                    placeholder="—"
                    style={inputSt}
                  />
                  <span style={unitLabel}>{unit}</span>
                </div>
              ))}
              <button onClick={onCalc}
                className="flex items-center justify-center gap-1.5 rounded-md text-[12px] font-semibold text-white transition-colors hover:bg-blue-600"
                style={{ padding: '8px 10px', background: '#2563eb', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <Calculator size={12} />
                Calculate
              </button>
            </div>
          );
        })}

        <button onClick={clearAll}
          className="mt-2 flex items-center gap-1.5 rounded-md border border-red-500/25 bg-red-500/10 px-3.5 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/20">
          <Trash2 size={12} />
          Clear All
        </button>
      </div>

    </CalcPageWrapper>
  );
}
