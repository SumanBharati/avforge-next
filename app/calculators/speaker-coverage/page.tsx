'use client';

import { useState } from 'react';
import { CalcSection, InputField, ResultCard, CalcPageWrapper } from '@/components/calc';

export default function SpeakerCoveragePage() {
  const [ceilingH, setCeilingH] = useState(10);
  const [earH, setEarH] = useState(4);
  const [dispersion, setDispersion] = useState(90);
  const [roomW, setRoomW] = useState(30);
  const [roomL, setRoomL] = useState(40);
  const [overlap, setOverlap] = useState(15);

  const h = ceilingH - earH;
  const epr = 2 * h * Math.tan((dispersion / 2) * Math.PI / 180);
  const effectiveDia = epr * (1 - overlap / 100);
  const spkrsW = Math.ceil(roomW / effectiveDia);
  const spkrsL = Math.ceil(roomL / effectiveDia);

  return (
    <CalcPageWrapper title="Speaker Coverage" desc="EPR-based ceiling speaker aiming and count calculator">
      <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>

        {/* ── Left half: Inputs ── */}
        <div style={{ flex: 1, minWidth: 0, paddingRight: 32 }}>
          <CalcSection title="Inputs">
            <InputField label="Ceiling Height" value={ceilingH} onChange={setCeilingH} unit="ft" min={7} max={40} />
            <InputField label="Ear Height" value={earH} onChange={setEarH} unit="ft" min={3} max={6} />
            <InputField label="Speaker Dispersion" value={dispersion} onChange={setDispersion} unit="°" min={30} max={180} />
            <InputField label="Room Width" value={roomW} onChange={setRoomW} unit="ft" min={5} max={200} />
            <InputField label="Room Length" value={roomL} onChange={setRoomL} unit="ft" min={5} max={200} />
            <InputField label="Overlap %" value={overlap} onChange={setOverlap} unit="%" min={0} max={40} />
          </CalcSection>
        </div>

        {/* ── Vertical divider ── */}
        <div style={{ width: 1, background: 'rgb(var(--border))', flexShrink: 0 }} />

        {/* ── Right half: Results ── */}
        <div style={{ flex: 1, minWidth: 0, paddingLeft: 32 }}>
          <CalcSection title="Results">
            <div className="grid grid-cols-2 gap-2.5">
              <ResultCard label="Coverage Diameter" value={epr.toFixed(1)} unit="ft" accent />
              <ResultCard label="Effective Spacing" value={effectiveDia.toFixed(1)} unit="ft" />
              <ResultCard label="Speakers Wide" value={spkrsW} unit="" />
              <ResultCard label="Speakers Long" value={spkrsL} unit="" />
              <ResultCard label="Total Speakers" value={spkrsW * spkrsL} unit="spkrs" accent />
              <ResultCard label="Height Above Ear" value={h} unit="ft" />
            </div>
          </CalcSection>
        </div>

      </div>

      {/* ── Formulas ── */}
      <div style={{ marginTop: 32 }}>
        <h3 className="mb-3 border-b border-border pb-1.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">
          Formulas Used
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

          <div className="rounded-lg border border-border bg-forge-surface/40 px-4 py-3">
            <div className="mb-1.5 text-[11px] uppercase tracking-[0.06em] text-muted">Height Above Ear (h)</div>
            <div className="font-mono text-[13px] text-blue-400">h = ceiling height − ear height</div>
            <div className="mt-1.5 text-[11px] text-subtle">The vertical drop from speaker to listening plane — drives the entire coverage geometry</div>
          </div>

          <div className="rounded-lg border border-border bg-forge-surface/40 px-4 py-3">
            <div className="mb-1.5 text-[11px] uppercase tracking-[0.06em] text-muted">Coverage Diameter (EPR)</div>
            <div className="font-mono text-[13px] text-blue-400">D = 2 × h × tan(θ ÷ 2)</div>
            <div className="mt-1.5 text-[11px] text-subtle">θ = speaker dispersion angle. Derived from the Effective Pattern Radius (EPR) formula per AVIXA CTS-D</div>
          </div>

          <div className="rounded-lg border border-border bg-forge-surface/40 px-4 py-3">
            <div className="mb-1.5 text-[11px] uppercase tracking-[0.06em] text-muted">Effective Spacing</div>
            <div className="font-mono text-[13px] text-blue-400">S = D × (1 − overlap% ÷ 100)</div>
            <div className="mt-1.5 text-[11px] text-subtle">Overlap pulls speakers closer together to eliminate gaps and improve uniformity at the listening plane</div>
          </div>

          <div className="rounded-lg border border-border bg-forge-surface/40 px-4 py-3">
            <div className="mb-1.5 text-[11px] uppercase tracking-[0.06em] text-muted">Speaker Count</div>
            <div className="font-mono text-[13px] text-body">
              <div>Wide: <span className="text-blue-400">⌈ room width ÷ S ⌉</span></div>
              <div className="mt-0.5">Long: <span className="text-blue-400">⌈ room length ÷ S ⌉</span></div>
              <div className="mt-0.5">Total: <span className="text-blue-400">wide × long</span></div>
            </div>
            <div className="mt-1.5 text-[11px] text-subtle">Ceiling (⌈⌉) rounds up so no area is left uncovered</div>
          </div>

        </div>
      </div>
    </CalcPageWrapper>
  );
}
