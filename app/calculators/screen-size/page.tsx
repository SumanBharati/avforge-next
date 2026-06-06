'use client';

import { useState } from 'react';
import { CalcSection, CalcPageWrapper } from '@/components/calc';

export default function ScreenSizePage() {
  const [arW, setArW] = useState(16);
  const [arH, setArH] = useState(9);
  const [diagIn, setDiagIn] = useState('');
  const [widthIn, setWidthIn] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [diagCm, setDiagCm] = useState('');
  const [widthCm, setWidthCm] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [diagFt, setDiagFt] = useState('');
  const [widthFt, setWidthFt] = useState('');
  const [heightFt, setHeightFt] = useState('');
  type Unit = 'cm' | 'in' | 'ft';
  const [diagLast, setDiagLast] = useState<Unit | null>(null);
  const [widthLast, setWidthLast] = useState<Unit | null>(null);
  const [heightLast, setHeightLast] = useState<Unit | null>(null);

  const inToCm = (v: number) => (v * 2.54).toFixed(2);
  const inToFt = (v: number) => (v / 12).toFixed(4);
  const ftToIn = (v: number) => v * 12;
  const ar = arW / arH;

  const presets = [
    { label: '4K Ultra HD (3840×2160)', w: 16, h: 9 },
    { label: 'Full HD (1920×1080)', w: 16, h: 9 },
    { label: 'WUXGA (1920×1200)', w: 16, h: 10 },
    { label: 'UWQHD (3440×1440)', w: 21, h: 9 },
    { label: 'Anamorphic', w: 2.39, h: 1 },
    { label: 'NTSC/PAL', w: 4, h: 3 },
  ];

  const calcFromDiag = (val: string, unit: 'in' | 'cm' | 'ft') => {
    const inches = unit === 'cm' ? parseFloat(val) / 2.54 : unit === 'ft' ? ftToIn(parseFloat(val)) : parseFloat(val);
    if (!inches || isNaN(inches)) return;
    const w = inches * (ar / Math.sqrt(1 + ar * ar));
    const h = w / ar;
    setDiagIn(inches.toFixed(2)); setDiagCm(inToCm(inches)); setDiagFt(inToFt(inches));
    setWidthIn(w.toFixed(2)); setWidthCm(inToCm(w)); setWidthFt(inToFt(w));
    setHeightIn(h.toFixed(2)); setHeightCm(inToCm(h)); setHeightFt(inToFt(h));
  };

  const calcFromWidth = (val: string, unit: 'in' | 'cm' | 'ft') => {
    const inches = unit === 'cm' ? parseFloat(val) / 2.54 : unit === 'ft' ? ftToIn(parseFloat(val)) : parseFloat(val);
    if (!inches || isNaN(inches)) return;
    const h = inches / ar;
    const d = Math.sqrt(inches * inches + h * h);
    setWidthIn(inches.toFixed(2)); setWidthCm(inToCm(inches)); setWidthFt(inToFt(inches));
    setDiagIn(d.toFixed(2)); setDiagCm(inToCm(d)); setDiagFt(inToFt(d));
    setHeightIn(h.toFixed(2)); setHeightCm(inToCm(h)); setHeightFt(inToFt(h));
  };

  const calcFromHeight = (val: string, unit: 'in' | 'cm' | 'ft') => {
    const inches = unit === 'cm' ? parseFloat(val) / 2.54 : unit === 'ft' ? ftToIn(parseFloat(val)) : parseFloat(val);
    if (!inches || isNaN(inches)) return;
    const w = inches * ar;
    const d = Math.sqrt(w * w + inches * inches);
    setHeightIn(inches.toFixed(2)); setHeightCm(inToCm(inches)); setHeightFt(inToFt(inches));
    setDiagIn(d.toFixed(2)); setDiagCm(inToCm(d)); setDiagFt(inToFt(d));
    setWidthIn(w.toFixed(2)); setWidthCm(inToCm(w)); setWidthFt(inToFt(w));
  };

  const clearAll = () => {
    setDiagIn(''); setDiagCm(''); setDiagFt('');
    setWidthIn(''); setWidthCm(''); setWidthFt('');
    setHeightIn(''); setHeightCm(''); setHeightFt('');
    setDiagLast(null); setWidthLast(null); setHeightLast(null);
  };

  const inputSt: React.CSSProperties = { padding: '8px 10px', background: 'rgb(var(--forge-surface))', border: '1px solid rgb(var(--border))', borderRadius: 6, color: 'rgb(var(--text-body))', fontSize: 14, fontFamily: "'JetBrains Mono', monospace", outline: 'none', width: '100%', boxSizing: 'border-box' };
  const calcBtnSt: React.CSSProperties = { padding: '7px 14px', background: '#2563eb', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' };

  return (
    <CalcPageWrapper title="Screen Size Calculator" desc="Diagonal / width / height in cm, inches & feet from aspect ratio">
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

        {[
          {
            label: 'Diagonal',
            cmVal: diagCm, setCm: setDiagCm, inVal: diagIn, setIn: setDiagIn, ftVal: diagFt, setFt: setDiagFt,
            last: diagLast, setLast: setDiagLast, calc: calcFromDiag,
          },
          {
            label: 'Width',
            cmVal: widthCm, setCm: setWidthCm, inVal: widthIn, setIn: setWidthIn, ftVal: widthFt, setFt: setWidthFt,
            last: widthLast, setLast: setWidthLast, calc: calcFromWidth,
          },
          {
            label: 'Height',
            cmVal: heightCm, setCm: setHeightCm, inVal: heightIn, setIn: setHeightIn, ftVal: heightFt, setFt: setHeightFt,
            last: heightLast, setLast: setHeightLast, calc: calcFromHeight,
          },
        ].map(row => {
          const onCalc = () => {
            const u = row.last;
            if (u === 'ft' && row.ftVal) return row.calc(row.ftVal, 'ft');
            if (u === 'in' && row.inVal) return row.calc(row.inVal, 'in');
            if (u === 'cm' && row.cmVal) return row.calc(row.cmVal, 'cm');
            if (row.ftVal) return row.calc(row.ftVal, 'ft');
            if (row.inVal) return row.calc(row.inVal, 'in');
            if (row.cmVal) return row.calc(row.cmVal, 'cm');
          };
          return (
            <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 30px 1fr 30px 1fr 30px 90px', gap: 6, alignItems: 'center', marginBottom: 10 }}>
              <span className="text-[13px] font-medium text-body">{row.label}</span>
              <input type="number" value={row.cmVal} onChange={e => { row.setCm(e.target.value); row.setLast('cm'); }} placeholder="—" style={inputSt} />
              <span className="text-center text-xs text-muted">cm</span>
              <input type="number" value={row.inVal} onChange={e => { row.setIn(e.target.value); row.setLast('in'); }} placeholder="—" style={inputSt} />
              <span className="text-center text-xs text-muted">in</span>
              <input type="number" value={row.ftVal} onChange={e => { row.setFt(e.target.value); row.setLast('ft'); }} placeholder="—" style={inputSt} />
              <span className="text-center text-xs text-muted">ft</span>
              <button onClick={onCalc} style={calcBtnSt}>Calculate</button>
            </div>
          );
        })}

        <button onClick={clearAll} className="mt-2 rounded-md border border-red-500/25 bg-red-500/10 px-3.5 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/20">
          Clear All
        </button>
      </CalcSection>
        </div>

      {(() => {
        const hasAll = !!(diagIn && widthIn && heightIn);
        const fmt = (v: string, digits: number, suffix: string) =>
          v ? `${parseFloat(v).toFixed(digits)}${suffix}` : '—';
        const area = hasAll ? (parseFloat(widthIn) * parseFloat(heightIn) / 144).toFixed(2) : '—';
        const perim = hasAll ? ((parseFloat(widthIn) + parseFloat(heightIn)) * 2).toFixed(1) : '—';
        return (
        <div className="min-w-0 flex-1">
        <CalcSection title="Summary">
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.06] p-4">
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr', gap: 8, fontSize: 13 }}>
              <div></div>
              <div className="text-center text-[11px] font-semibold uppercase text-subtle">Inches</div>
              <div className="text-center text-[11px] font-semibold uppercase text-subtle">Centimeters</div>
              <div className="text-center text-[11px] font-semibold uppercase text-subtle">Feet</div>
              <div className="font-medium text-body">Diagonal</div>
              <div className="text-center font-mono text-blue-400">{fmt(diagIn, 2, '"')}</div>
              <div className="text-center font-mono text-blue-400">{fmt(diagCm, 2, ' cm')}</div>
              <div className="text-center font-mono text-blue-400">{fmt(diagFt, 4, ' ft')}</div>
              <div className="font-medium text-body">Width</div>
              <div className="text-center font-mono text-body">{fmt(widthIn, 2, '"')}</div>
              <div className="text-center font-mono text-body">{fmt(widthCm, 2, ' cm')}</div>
              <div className="text-center font-mono text-body">{fmt(widthFt, 4, ' ft')}</div>
              <div className="font-medium text-body">Height</div>
              <div className="text-center font-mono text-body">{fmt(heightIn, 2, '"')}</div>
              <div className="text-center font-mono text-body">{fmt(heightCm, 2, ' cm')}</div>
              <div className="text-center font-mono text-body">{fmt(heightFt, 4, ' ft')}</div>
            </div>
            <div className="mt-3 border-t border-blue-500/15 pt-2.5 text-xs text-muted">
              Aspect ratio: <span className="font-medium text-body">{arW}:{arH}</span> &nbsp;|&nbsp;
              Area: <span className="font-medium text-body">{area}{hasAll ? ' ft²' : ''}</span> &nbsp;|&nbsp;
              Perimeter: <span className="font-medium text-body">{perim}{hasAll ? '"' : ''}</span>
            </div>
          </div>
        </CalcSection>
        </div>
        );
      })()}
      </div>
    </CalcPageWrapper>
  );
}
