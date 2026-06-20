'use client';

import { useState } from 'react';
import { CalcSection, CalcPageWrapper } from '@/components/calc';

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
    { label: '4K Ultra HD (3840×2160)', w: 16, h: 9 },
    { label: 'Full HD (1920×1080)', w: 16, h: 9 },
    { label: 'WUXGA (1920×1200)', w: 16, h: 10 },
    { label: 'UWQHD (3440×1440)', w: 21, h: 9 },
    { label: 'Anamorphic', w: 2.39, h: 1 },
    { label: 'NTSC/PAL', w: 4, h: 3 },
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

  const inputSt: React.CSSProperties = { padding: '8px 10px', background: 'rgb(var(--forge-surface))', border: '1px solid rgb(var(--border))', borderRadius: 6, color: 'rgb(var(--text-body))', fontSize: 14, fontFamily: "'JetBrains Mono', monospace", outline: 'none', width: '100%', boxSizing: 'border-box' };
  const calcBtnSt: React.CSSProperties = { padding: '7px 14px', background: '#2563eb', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' };

  const rows = [
    { label: 'Diagonal', dim: diag, setDim: setDiag, calc: calcFromDiag },
    { label: 'Width',    dim: width, setDim: setWidth, calc: calcFromWidth },
    { label: 'Height',   dim: height, setDim: setHeight, calc: calcFromHeight },
  ];

  const hasAll = !!(diag.in && width.in && height.in);
  const fmt = (v: string, digits: number, suffix: string) =>
    v ? `${parseFloat(v).toFixed(digits)}${suffix}` : '—';
  const area  = hasAll ? (parseFloat(width.in) * parseFloat(height.in) / 144).toFixed(2) : '—';
  const perim = hasAll ? ((parseFloat(width.in) + parseFloat(height.in)) * 2).toFixed(1) : '—';

  return (
    <CalcPageWrapper title="Aspect Ratio to Display Size Converter" desc="Diagonal / width / height in cm, inches & feet from aspect ratio">
      <CalcSection title="1. Choose Aspect Ratio">
        <div className="mb-3.5 flex items-center gap-2">
          <span className="text-[13px] font-medium text-muted">Aspect ratio</span>
          <input type="number" value={arW} onChange={e => { setArW(parseFloat(e.target.value) || 0); clearAll(); }} min={1} max={100} step={0.01}
            style={{ width: 60, padding: '6px 8px', background: 'rgb(var(--forge-surface))', border: '1px solid rgb(var(--border))', borderRadius: 6, color: 'rgb(var(--text-body))', fontSize: 14, fontFamily: "'JetBrains Mono', monospace", outline: 'none', textAlign: 'center' }} />
          <span className="text-base font-semibold text-subtle">:</span>
          <input type="number" value={arH} onChange={e => { setArH(parseFloat(e.target.value) || 0); clearAll(); }} min={1} max={100} step={0.01}
            style={{ width: 60, padding: '6px 8px', background: 'rgb(var(--forge-surface))', border: '1px solid rgb(var(--border))', borderRadius: 6, color: 'rgb(var(--text-body))', fontSize: 14, fontFamily: "'JetBrains Mono', monospace", outline: 'none', textAlign: 'center' }} />
        </div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-faint">Select predefined format:</div>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p, i) => {
            const active = arW === p.w && arH === p.h;
            return (
              <button key={i} onClick={() => { setArW(p.w); setArH(p.h); clearAll(); }}
                className="rounded-md px-3 py-1 text-xs transition-colors"
                style={{ background: active ? 'rgba(59,130,246,0.15)' : 'rgb(var(--forge-surface) / 0.5)', border: '1px solid ' + (active ? 'rgba(59,130,246,0.4)' : 'rgb(var(--border))'), color: active ? '#60a5fa' : 'rgb(var(--text-muted))' }}>
                {p.label} <span style={{ opacity: 0.5, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>[{p.w}:{p.h}]</span>
              </button>
            );
          })}
        </div>
      </CalcSection>

      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        <div className="min-w-0 flex-1">
          <CalcSection title="2. Calculate">
            <p className="mb-4 text-[13px] text-muted">Enter a known measurement and click Calculate — the other two compute automatically.</p>

            {rows.map(row => {
              const onCalc = () => {
                const u = row.dim.last;
                if (u && row.dim[u]) return row.calc(row.dim[u], u);
                if (row.dim.ft) return row.calc(row.dim.ft, 'ft');
                if (row.dim.in) return row.calc(row.dim.in, 'in');
                if (row.dim.cm) return row.calc(row.dim.cm, 'cm');
              };
              const unitInputSt: React.CSSProperties = { ...inputSt, paddingRight: 34 };
              const unitLabel: React.CSSProperties = { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'rgb(var(--text-faint))', pointerEvents: 'none', userSelect: 'none', fontFamily: "'JetBrains Mono', monospace" };
              return (
                <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr 1fr 90px', gap: 6, alignItems: 'center', marginBottom: 10 }}>
                  <span className="text-[13px] font-medium text-body">{row.label}</span>
                  <div style={{ position: 'relative' }}>
                    <input type="number" value={row.dim.cm} onChange={e => row.setDim(prev => ({ ...prev, cm: e.target.value, last: 'cm' }))} placeholder="—" style={unitInputSt} />
                    <span style={unitLabel}>cm</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input type="number" value={row.dim.in} onChange={e => row.setDim(prev => ({ ...prev, in: e.target.value, last: 'in' }))} placeholder="—" style={unitInputSt} />
                    <span style={unitLabel}>in</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input type="number" value={row.dim.ft} onChange={e => row.setDim(prev => ({ ...prev, ft: e.target.value, last: 'ft' }))} placeholder="—" style={unitInputSt} />
                    <span style={unitLabel}>ft</span>
                  </div>
                  <button onClick={onCalc} style={calcBtnSt}>Calculate</button>
                </div>
              );
            })}

            <button onClick={clearAll} className="mt-2 rounded-md border border-red-500/25 bg-red-500/10 px-3.5 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/20">
              Clear All
            </button>
          </CalcSection>
        </div>

        <div className="min-w-0 flex-1">
          <CalcSection title="Summary">
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.06] p-4">
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr', gap: 8, fontSize: 13 }}>
                <div></div>
                <div className="text-center text-[11px] font-semibold uppercase text-subtle">Inches</div>
                <div className="text-center text-[11px] font-semibold uppercase text-subtle">Centimeters</div>
                <div className="text-center text-[11px] font-semibold uppercase text-subtle">Feet</div>
                <div className="font-medium text-body">Diagonal</div>
                <div className="text-center font-mono text-blue-400">{fmt(diag.in, 2, '"')}</div>
                <div className="text-center font-mono text-blue-400">{fmt(diag.cm, 2, ' cm')}</div>
                <div className="text-center font-mono text-blue-400">{fmt(diag.ft, 4, ' ft')}</div>
                <div className="font-medium text-body">Width</div>
                <div className="text-center font-mono text-body">{fmt(width.in, 2, '"')}</div>
                <div className="text-center font-mono text-body">{fmt(width.cm, 2, ' cm')}</div>
                <div className="text-center font-mono text-body">{fmt(width.ft, 4, ' ft')}</div>
                <div className="font-medium text-body">Height</div>
                <div className="text-center font-mono text-body">{fmt(height.in, 2, '"')}</div>
                <div className="text-center font-mono text-body">{fmt(height.cm, 2, ' cm')}</div>
                <div className="text-center font-mono text-body">{fmt(height.ft, 4, ' ft')}</div>
              </div>
              <div className="mt-3 border-t border-blue-500/15 pt-2.5 text-xs text-muted">
                Aspect ratio: <span className="font-medium text-body">{arW}:{arH}</span> &nbsp;|&nbsp;
                Area: <span className="font-medium text-body">{area}{hasAll ? ' ft²' : ''}</span> &nbsp;|&nbsp;
                Perimeter: <span className="font-medium text-body">{perim}{hasAll ? '"' : ''}</span>
              </div>
            </div>
          </CalcSection>
        </div>
      </div>
    </CalcPageWrapper>
  );
}
