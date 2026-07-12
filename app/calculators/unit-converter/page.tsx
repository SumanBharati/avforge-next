'use client';

import { useState } from 'react';
import { CalcSection, CalcPageWrapper } from '@/components/calc';

const CATEGORIES = [
  { name: 'Length', units: [
    { id: 'ft', label: 'Feet',         toBase: 0.3048 },
    { id: 'in', label: 'Inches',       toBase: 0.0254 },
    { id: 'm',  label: 'Meters',       toBase: 1 },
    { id: 'cm', label: 'Centimeters',  toBase: 0.01 },
    { id: 'mm', label: 'Millimeters',  toBase: 0.001 },
    { id: 'yd', label: 'Yards',        toBase: 0.9144 },
  ]},
  { name: 'Weight', units: [
    { id: 'kg', label: 'Kilograms', toBase: 1 },
    { id: 'lb', label: 'Pounds',    toBase: 0.453592 },
    { id: 'oz', label: 'Ounces',    toBase: 0.0283495 },
    { id: 'g',  label: 'Grams',     toBase: 0.001 },
  ]},
  { name: 'Temperature', units: [
    { id: 'c', label: '°C (Celsius)',    toBase: 1 },
    { id: 'f', label: '°F (Fahrenheit)', toBase: 1 },
    { id: 'k', label: 'K (Kelvin)',      toBase: 1 },
  ]},
  { name: 'Data Rate', units: [
    { id: 'bps',  label: 'bps',  toBase: 1 },
    { id: 'kbps', label: 'Kbps', toBase: 1e3 },
    { id: 'mbps', label: 'Mbps', toBase: 1e6 },
    { id: 'gbps', label: 'Gbps', toBase: 1e9 },
  ]},
  { name: 'Power', units: [
    { id: 'w',   label: 'Watts',         toBase: 1 },
    { id: 'kw',  label: 'Kilowatts',     toBase: 1000 },
    { id: 'btu', label: 'BTU/hr',        toBase: 0.29307107 },
    { id: 'hp',  label: 'Horsepower',    toBase: 745.7 },
    { id: 'ton', label: 'Cooling Tons',  toBase: 3516.85 },
  ]},
  { name: 'Area', units: [
    { id: 'sqft', label: 'sq ft', toBase: 0.092903 },
    { id: 'sqm',  label: 'sq m',  toBase: 1 },
    { id: 'sqin', label: 'sq in', toBase: 0.00064516 },
    { id: 'sqcm', label: 'sq cm', toBase: 0.0001 },
  ]},
];

const QUICK_REFS: Record<string, { from: number; fu: string; to: string; label: string }[]> = {
  Length:      [{ from:1, fu:'ft', to:'in', label:'1 ft' }, { from:1, fu:'ft', to:'mm', label:'1 ft' }, { from:1, fu:'in', to:'mm', label:'1 in' }, { from:1, fu:'m', to:'ft', label:'1 m' }, { from:1, fu:'cm', to:'in', label:'1 cm' }],
  Weight:      [{ from:1, fu:'kg', to:'lb', label:'1 kg' }, { from:1, fu:'lb', to:'kg', label:'1 lb' }, { from:1, fu:'oz', to:'g', label:'1 oz' }],
  Temperature: [{ from:0, fu:'c', to:'f', label:'0°C' }, { from:32, fu:'f', to:'c', label:'32°F' }, { from:100, fu:'c', to:'f', label:'100°C' }, { from:72, fu:'f', to:'c', label:'72°F' }],
  Power:       [{ from:1, fu:'kw', to:'btu', label:'1 kW' }, { from:1, fu:'ton', to:'btu', label:'1 ton' }, { from:1, fu:'hp', to:'w', label:'1 HP' }],
};

function convertTemp(val: number, from: string, to: string): number {
  let c: number;
  if (from === 'c') c = val;
  else if (from === 'f') c = (val - 32) * 5 / 9;
  else c = val - 273.15;
  if (to === 'c') return c;
  if (to === 'f') return c * 9 / 5 + 32;
  return c + 273.15;
}

function fmtResult(val: number): string {
  if (Math.abs(val) < 0.001 || Math.abs(val) > 999999) return val.toExponential(4);
  return parseFloat(val.toFixed(6)).toString();
}

export default function UnitConverterPage() {
  const [activeCat, setActiveCat] = useState('Length');
  const [fromUnit, setFromUnit] = useState('ft');
  const [toUnit, setToUnit] = useState('mm');
  const [fromVal, setFromVal] = useState('1');

  const cat = CATEGORIES.find(c => c.name === activeCat)!;

  const convert = (val: string, from: string, to: string): number | '' => {
    if (!val || isNaN(parseFloat(val))) return '';
    const v = parseFloat(val);
    if (activeCat === 'Temperature') return convertTemp(v, from, to);
    const fromU = cat.units.find(u => u.id === from);
    const toU = cat.units.find(u => u.id === to);
    if (!fromU || !toU) return '';
    return (v * fromU.toBase) / toU.toBase;
  };

  const result = convert(fromVal, fromUnit, toUnit);
  const resultStr = result === '' ? '' : fmtResult(result as number);

  const handleCatChange = (catName: string) => {
    setActiveCat(catName);
    const c = CATEGORIES.find(ct => ct.name === catName)!;
    if (c.units.length >= 2) { setFromUnit(c.units[0].id); setToUnit(c.units[1].id); }
    setFromVal('1');
  };

  const quickRefs = QUICK_REFS[activeCat] || [];

  return (
    <CalcPageWrapper title="Unit Converter" desc="AV-specific unit conversions for length, power, temperature, and more">
      {/* Category tabs */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {CATEGORIES.map(c => (
          <button key={c.name} onClick={() => handleCatChange(c.name)}
            className="rounded-md px-3.5 py-1.5 text-[11px] transition-colors"
            style={{ fontWeight: activeCat === c.name ? 700 : 400, background: activeCat === c.name ? 'rgba(139,92,246,0.15)' : 'rgb(var(--forge-surface) / 0.4)', border: '1px solid ' + (activeCat === c.name ? 'rgba(139,92,246,0.4)' : 'rgb(var(--border))'), color: activeCat === c.name ? '#a78bfa' : 'rgb(var(--text-muted))' }}>
            {c.name}
          </button>
        ))}
      </div>

      <CalcSection title="Convert">
        <div className="mb-3 flex items-center gap-2.5">
          {/* From */}
          <div className="flex-1">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.04em] text-subtle">From</label>
            <input value={fromVal} onChange={e => setFromVal(e.target.value)} type="number"
              className="mb-1.5 w-full rounded-md border-2 border-blue-500 bg-forge-surface px-3 py-2.5 font-mono text-lg font-bold text-body outline-none"
              style={{ boxSizing: 'border-box' }} />
            <select value={fromUnit} onChange={e => setFromUnit(e.target.value)}
              className="w-full rounded-md border border-border bg-forge-surface px-2.5 py-1.5 text-xs text-body outline-none">
              {cat.units.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
            </select>
          </div>

          {/* Swap */}
          <button onClick={() => { const t = fromUnit; setFromUnit(toUnit); setToUnit(t); setFromVal(resultStr || '1'); }}
            className="mt-3 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10 text-base text-blue-400 transition-colors hover:bg-blue-500/20"
            title="Swap">⇄</button>

          {/* To */}
          <div className="flex-1">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.04em] text-subtle">To</label>
            <div className="mb-1.5 w-full rounded-md border-2 border-green-500/30 bg-green-500/[0.06] px-3 py-2.5 font-mono text-lg font-bold text-green-400"
              style={{ minHeight: 46, boxSizing: 'border-box' }}>{resultStr}</div>
            <select value={toUnit} onChange={e => setToUnit(e.target.value)}
              className="w-full rounded-md border border-border bg-forge-surface px-2.5 py-1.5 text-xs text-body outline-none">
              {cat.units.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
            </select>
          </div>
        </div>

        {fromVal && resultStr && (
          <div className="rounded-md border border-border bg-forge-surface/50 p-2.5 text-center font-mono text-[13px] text-muted">
            <span className="font-semibold text-blue-400">{fromVal}</span>{' '}
            {cat.units.find(u => u.id === fromUnit)?.label} ={' '}
            <span className="font-semibold text-green-400">{resultStr}</span>{' '}
            {cat.units.find(u => u.id === toUnit)?.label}
          </div>
        )}
      </CalcSection>

      {/* All conversions at a glance */}
      {fromVal && !isNaN(parseFloat(fromVal)) && (
        <CalcSection title={`All ${activeCat} Conversions`}>
          <div className="grid grid-cols-2 gap-1.5">
            {cat.units.filter(u => u.id !== fromUnit).map(u => {
              const val = convert(fromVal, fromUnit, u.id);
              const valStr = val === '' ? '' : fmtResult(val as number);
              return (
                <div key={u.id} onClick={() => setToUnit(u.id)} className="cursor-pointer rounded-md border p-2 transition-all"
                  style={{ background: toUnit === u.id ? 'rgba(34,197,94,0.08)' : 'rgb(var(--forge-surface) / 0.3)', borderColor: toUnit === u.id ? 'rgba(34,197,94,0.25)' : 'rgb(var(--border))' }}>
                  <div className="font-mono text-sm font-bold" style={{ color: toUnit === u.id ? '#22c55e' : 'rgb(var(--text-body))' }}>{valStr}</div>
                  <div className="text-[10px] text-subtle">{u.label}</div>
                </div>
              );
            })}
          </div>
        </CalcSection>
      )}

      {/* Quick Reference */}
      {quickRefs.length > 0 && (
        <CalcSection title="Quick Reference">
          <div className="grid grid-cols-2 gap-1.5">
            {quickRefs.map((qr, i) => {
              const val = convert(String(qr.from), qr.fu, qr.to);
              const valStr = val === '' ? '' : parseFloat((val as number).toFixed(4)).toString();
              const toLabel = cat.units.find(u => u.id === qr.to)?.label || '';
              return (
                <div key={i} className="flex items-center justify-between rounded-md border border-border bg-forge-surface/30 px-2.5 py-1.5">
                  <span className="text-[11px] text-muted">{qr.label}</span>
                  <span className="font-mono text-xs font-semibold text-body">{valStr} {toLabel}</span>
                </div>
              );
            })}
          </div>
        </CalcSection>
      )}
    </CalcPageWrapper>
  );
}
