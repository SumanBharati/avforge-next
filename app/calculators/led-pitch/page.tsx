'use client';

import { useState } from 'react';
import { CalcSection, ResultCard, CalcPageWrapper } from '@/components/calc';

const PITCHES = [0.7, 0.9, 1.2, 1.5, 1.8, 2.0, 2.5, 2.9, 3.9, 4.8];

const M_TO_IN = 39.3701;
const M_TO_FT = 3.28084;

function TriUnitInput({
  label,
  valueM,
  onChangeM,
}: {
  label: string;
  valueM: number;
  onChangeM: (m: number) => void;
}) {
  const mVal = parseFloat(valueM.toFixed(2));
  const inVal = parseFloat((valueM * M_TO_IN).toFixed(2));
  const ftVal = parseFloat((valueM * M_TO_FT).toFixed(2));

  const inputCls =
    'w-full rounded-lg border border-border bg-forge-surface px-3 py-2.5 pr-10 font-mono text-[15px] text-body outline-none transition-colors focus:border-blue-500/40';

  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-[13px] font-semibold uppercase tracking-[0.05em] text-muted">
        {label}
      </label>
      <div className="grid grid-cols-3 gap-2">
        <div className="relative">
          <input
            type="number"
            value={mVal}
            onChange={e => onChangeM(parseFloat(e.target.value) || 0)}
            min={0}
            step={0.1}
            className={inputCls}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-subtle">m</span>
        </div>
        <div className="relative">
          <input
            type="number"
            value={inVal}
            onChange={e => onChangeM((parseFloat(e.target.value) || 0) / M_TO_IN)}
            min={0}
            step={0.5}
            className={inputCls}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-subtle">in</span>
        </div>
        <div className="relative">
          <input
            type="number"
            value={ftVal}
            onChange={e => onChangeM((parseFloat(e.target.value) || 0) / M_TO_FT)}
            min={0}
            step={0.5}
            className={inputCls}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-subtle">ft</span>
        </div>
      </div>
    </div>
  );
}

export default function LEDPitchPage() {
  const [viewDistM, setViewDistM] = useState(6);
  const [wallWM, setWallWM] = useState(4.8);
  const [wallHM, setWallHM] = useState(2.7);

  const recPP = viewDistM / 2.75;
  const bestPP = PITCHES.reduce((a, b) => Math.abs(b - recPP) < Math.abs(a - recPP) ? b : a);
  const hPx = Math.round((wallWM * 1000) / bestPP);
  const vPx = Math.round((wallHM * 1000) / bestPP);
  const minViewM = bestPP * 1.5;

  return (
    <CalcPageWrapper title="LED Pixel Pitch" desc="Optimal pitch and resolution for LED walls">
      <div className="flex flex-col items-stretch gap-6 lg:flex-row lg:gap-0">

        {/* ── Left half: Inputs ── */}
        <div className="min-w-0 flex-1 lg:pr-8">
          <CalcSection title="Inputs">
            <TriUnitInput label="Viewing Distance" valueM={viewDistM} onChangeM={setViewDistM} />
            <TriUnitInput label="Wall Width" valueM={wallWM} onChangeM={setWallWM} />
            <TriUnitInput label="Wall Height" valueM={wallHM} onChangeM={setWallHM} />
          </CalcSection>
        </div>

        {/* ── Vertical divider ── */}
        <div className="h-px w-full shrink-0 bg-border lg:h-auto lg:w-px" />

        {/* ── Right half: Results + Formulas ── */}
        <div className="min-w-0 flex-1 lg:pl-8">
          <CalcSection title="Results">
            <div className="grid grid-cols-2 gap-2.5">
              <ResultCard label="Recommended Pitch" value={`P${bestPP}`} unit="mm" accent />
              <ResultCard label="Ideal Pitch" value={recPP.toFixed(2)} unit="mm" />
              <ResultCard label="Resolution" value={`${hPx}×${vPx}`} unit="px" />
              <ResultCard label="Total Pixels" value={((hPx * vPx) / 1e6).toFixed(2)} unit="MP" />
              <ResultCard label="Min Viewing Dist" value={`${minViewM.toFixed(1)}m / ${(minViewM * M_TO_FT).toFixed(1)}ft`} unit="" />
              <ResultCard label="Aspect Ratio" value={(wallWM / wallHM).toFixed(2)} unit=":1" />
            </div>
          </CalcSection>

          <div className="rounded-lg border border-border bg-forge-surface/40 p-3.5 leading-relaxed text-subtle">
            <div className="mb-2 text-[13px] font-semibold text-muted">Formulas Used</div>
            <div className="mb-2 font-mono text-[13px] text-muted">
              <span className="font-semibold text-blue-400">Ideal Pitch</span> = Viewing Distance (m) ÷ 2.75 = <span className="text-body">{viewDistM.toFixed(2)} ÷ 2.75 = {recPP.toFixed(2)} mm</span>
            </div>
            <div className="mb-2 font-mono text-[13px] text-muted">
              <span className="font-semibold text-blue-400">H Pixels</span> = (Wall Width (m) × 1000) ÷ Pitch = <span className="text-body">({wallWM.toFixed(2)} × 1000) ÷ {bestPP} = {hPx} px</span>
            </div>
            <div className="mb-2 font-mono text-[13px] text-muted">
              <span className="font-semibold text-blue-400">V Pixels</span> = (Wall Height (m) × 1000) ÷ Pitch = <span className="text-body">({wallHM.toFixed(2)} × 1000) ÷ {bestPP} = {vPx} px</span>
            </div>
            <div className="mb-2 font-mono text-[13px] text-muted">
              <span className="font-semibold text-blue-400">Min Viewing</span> = Pitch × 1.5 = <span className="text-body">{bestPP} × 1.5 = {minViewM.toFixed(1)} m ({(minViewM * M_TO_FT).toFixed(1)} ft)</span>
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
