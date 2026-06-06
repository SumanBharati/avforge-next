'use client';

import { useState } from 'react';
import { CalcSection, InputField, ResultCard, CalcPageWrapper } from '@/components/calc';

const ftToM = 0.3048;
const PITCHES = [0.7, 0.9, 1.2, 1.5, 1.8, 2.0, 2.5, 2.9, 3.9, 4.8];

export default function LEDPitchPage() {
  const [viewDist, setViewDist] = useState(6);
  const [wallW, setWallW] = useState(4.8);
  const [wallH, setWallH] = useState(2.7);
  const [useFeet, setUseFeet] = useState(false);

  const distM = useFeet ? viewDist * ftToM : viewDist;
  const wM = useFeet ? wallW * ftToM : wallW;
  const hM = useFeet ? wallH * ftToM : wallH;
  const recPP = distM / 2.75;
  const bestPP = PITCHES.reduce((a, b) => Math.abs(b - recPP) < Math.abs(a - recPP) ? b : a);
  const hPx = Math.round((wM * 1000) / bestPP);
  const vPx = Math.round((hM * 1000) / bestPP);
  const minViewM = bestPP * 1.5;
  const u = useFeet ? 'ft' : 'm';

  const switchUnit = (toFeet: boolean) => {
    if (toFeet && !useFeet) {
      setViewDist(parseFloat((viewDist / ftToM).toFixed(1)));
      setWallW(parseFloat((wallW / ftToM).toFixed(1)));
      setWallH(parseFloat((wallH / ftToM).toFixed(1)));
    } else if (!toFeet && useFeet) {
      setViewDist(parseFloat((viewDist * ftToM).toFixed(1)));
      setWallW(parseFloat((wallW * ftToM).toFixed(1)));
      setWallH(parseFloat((wallH * ftToM).toFixed(1)));
    }
    setUseFeet(toFeet);
  };

  return (
    <CalcPageWrapper title="LED Pixel Pitch" desc="Optimal pitch and resolution for LED walls">
      <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>

        {/* ── Left half: Inputs ── */}
        <div style={{ flex: 1, minWidth: 0, paddingRight: 32 }}>
          <CalcSection title="Inputs">
            <div className="mb-3 flex gap-1.5">
              <button onClick={() => switchUnit(true)}
                className="flex-1 rounded-md py-1.5 text-[13px] transition-colors"
                style={{ fontWeight: useFeet ? 700 : 400, background: useFeet ? 'rgba(59,130,246,0.15)' : 'rgb(var(--forge-surface) / 0.4)', border: '1px solid ' + (useFeet ? 'rgba(59,130,246,0.4)' : 'rgb(var(--border))'), color: useFeet ? '#60a5fa' : 'rgb(var(--text-subtle))' }}>
                Feet (ft)
              </button>
              <button onClick={() => switchUnit(false)}
                className="flex-1 rounded-md py-1.5 text-[13px] transition-colors"
                style={{ fontWeight: !useFeet ? 700 : 400, background: !useFeet ? 'rgba(59,130,246,0.15)' : 'rgb(var(--forge-surface) / 0.4)', border: '1px solid ' + (!useFeet ? 'rgba(59,130,246,0.4)' : 'rgb(var(--border))'), color: !useFeet ? '#60a5fa' : 'rgb(var(--text-subtle))' }}>
                Meters (m)
              </button>
            </div>
            <InputField label="Viewing Distance" value={viewDist} onChange={setViewDist} unit={u} min={1} max={useFeet ? 150 : 50} step={0.5} />
            <InputField label="Wall Width" value={wallW} onChange={setWallW} unit={u} min={0.5} max={useFeet ? 100 : 30} step={0.1} />
            <InputField label="Wall Height" value={wallH} onChange={setWallH} unit={u} min={0.5} max={useFeet ? 50 : 15} step={0.1} />
          </CalcSection>
        </div>

        {/* ── Vertical divider ── */}
        <div style={{ width: 1, background: 'rgb(var(--border))', flexShrink: 0 }} />

        {/* ── Right half: Results + Formulas ── */}
        <div style={{ flex: 1, minWidth: 0, paddingLeft: 32 }}>
          <CalcSection title="Results">
            <div className="grid grid-cols-2 gap-2.5">
              <ResultCard label="Recommended Pitch" value={`P${bestPP}`} unit="mm" accent />
              <ResultCard label="Ideal Pitch" value={recPP.toFixed(2)} unit="mm" />
              <ResultCard label="Resolution" value={`${hPx}×${vPx}`} unit="px" />
              <ResultCard label="Total Pixels" value={((hPx * vPx) / 1e6).toFixed(2)} unit="MP" />
              <ResultCard label="Min Viewing Dist" value={useFeet ? (minViewM / ftToM).toFixed(1) : minViewM.toFixed(1)} unit={u} />
              <ResultCard label="Aspect Ratio" value={(wM / hM).toFixed(2)} unit=":1" />
            </div>
          </CalcSection>

          <div className="rounded-lg border border-border bg-forge-surface/40 p-3.5 leading-relaxed text-subtle">
            <div className="mb-2 text-[13px] font-semibold text-muted">Formulas Used</div>
            <div className="mb-2 font-mono text-[13px] text-muted">
              <span className="font-semibold text-blue-400">Ideal Pitch</span> = Viewing Distance (m) ÷ 2.75 = <span className="text-body">{distM.toFixed(2)} ÷ 2.75 = {recPP.toFixed(2)} mm</span>
            </div>
            <div className="mb-2 font-mono text-[13px] text-muted">
              <span className="font-semibold text-blue-400">H Pixels</span> = (Wall Width (m) × 1000) ÷ Pitch = <span className="text-body">({wM.toFixed(2)} × 1000) ÷ {bestPP} = {hPx} px</span>
            </div>
            <div className="mb-2 font-mono text-[13px] text-muted">
              <span className="font-semibold text-blue-400">V Pixels</span> = (Wall Height (m) × 1000) ÷ Pitch = <span className="text-body">({hM.toFixed(2)} × 1000) ÷ {bestPP} = {vPx} px</span>
            </div>
            <div className="mb-2 font-mono text-[13px] text-muted">
              <span className="font-semibold text-blue-400">Min Viewing</span> = Pitch × 1.5 = <span className="text-body">{bestPP} × 1.5 = {minViewM.toFixed(1)} m{useFeet ? ` (${(minViewM / ftToM).toFixed(1)} ft)` : ''}</span>
            </div>
            <div className="mt-2.5 border-t border-border pt-2 text-[13px] leading-relaxed text-subtle">
              <div><span className="font-semibold text-muted">Rule of Thumb:</span> Ideal pitch (mm) ≈ viewing distance (m) ÷ 2.75</div>
              <div><span className="font-semibold text-muted">Standard Pitches:</span> P0.7, P0.9, P1.2, P1.5, P1.8, P2.0, P2.5, P2.9, P3.9, P4.8</div>
              <div><span className="font-semibold text-muted">Min Viewing:</span> Closest distance before pixels visible ≈ pitch × 1.5m</div>
            </div>
          </div>
        </div>

      </div>
    </CalcPageWrapper>
  );
}
