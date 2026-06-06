'use client';

import { useState } from 'react';
import { CalcSection, InputField, ResultCard, StatusBanner, CalcPageWrapper } from '@/components/calc';

interface SpeakerZone {
  name: string;
  qty: number;
  tap: number;
}

const inputSt: React.CSSProperties = { padding: '6px 8px', background: '#0f172a', border: '1px solid rgb(var(--border))', borderRadius: 5, color: '#e2e8f0', fontSize: 12 };

export default function TapLoadPage() {
  const [ampWatts, setAmpWatts] = useState(240);
  const [speakers, setSpeakers] = useState<SpeakerZone[]>([
    { name: 'Zone 1 — Ceiling', qty: 8, tap: 8 },
    { name: 'Zone 2 — Corridor', qty: 6, tap: 4 },
    { name: 'Zone 3 — Lobby', qty: 4, tap: 16 },
  ]);

  const totalLoad = speakers.reduce((s, sp) => s + sp.qty * sp.tap, 0);
  const headroom = ampWatts * 0.8;

  const updateSpeaker = (i: number, field: keyof SpeakerZone, val: string) => {
    const n = [...speakers];
    n[i] = { ...n[i], [field]: field === 'name' ? val : parseFloat(val) || 0 };
    setSpeakers(n);
  };

  return (
    <CalcPageWrapper title="70V Tap Load" desc="Transformer tap and wattage calculator for 70V distribution">
      <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>

        {/* ── Left half: Inputs ── */}
        <div style={{ flex: 1, minWidth: 0, paddingRight: 32 }}>
          <CalcSection title="Amplifier">
            <InputField label="Amp Rated Power" value={ampWatts} onChange={setAmpWatts} unit="W" min={30} max={2000} />
          </CalcSection>

          <CalcSection title="Speaker Zones">
            <div className="mb-1.5 grid grid-cols-[1fr_60px_70px_30px] gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-faint">
              <span>Zone Name</span><span className="text-center">Qty</span><span className="text-center">Tap (W)</span><span></span>
            </div>
            {speakers.map((sp, i) => (
              <div key={i} className="mb-2 grid grid-cols-[1fr_60px_70px_30px] items-center gap-1.5">
                <input value={sp.name} onChange={e => updateSpeaker(i, 'name', e.target.value)} style={{ ...inputSt, width: '100%' }} />
                <input type="number" value={sp.qty} onChange={e => updateSpeaker(i, 'qty', e.target.value)} min={0} style={{ ...inputSt, textAlign: 'center', width: '100%' }} />
                <input type="number" value={sp.tap} onChange={e => updateSpeaker(i, 'tap', e.target.value)} min={0} style={{ ...inputSt, textAlign: 'center', width: '100%' }} />
                <button onClick={() => setSpeakers(speakers.filter((_, j) => j !== i))} className="text-base text-red-400 hover:text-red-300">×</button>
              </div>
            ))}
            <button onClick={() => setSpeakers([...speakers, { name: `Zone ${speakers.length + 1}`, qty: 4, tap: 8 }])}
              className="w-full rounded-md border border-dashed border-blue-500/40 bg-blue-500/10 py-1.5 text-[13px] text-blue-400 transition-colors hover:bg-blue-500/20">
              + Add Zone
            </button>
          </CalcSection>
        </div>

        {/* ── Vertical divider ── */}
        <div style={{ width: 1, background: 'rgb(var(--border))', flexShrink: 0 }} />

        {/* ── Right half: Results ── */}
        <div style={{ flex: 1, minWidth: 0, paddingLeft: 32 }}>
          <CalcSection title="Results">
            <div className="mb-2.5 grid grid-cols-2 gap-2.5">
              <ResultCard label="Total Load" value={totalLoad} unit="W" accent />
              <ResultCard label="80% Headroom" value={headroom} unit="W" />
              <ResultCard label="Utilization" value={((totalLoad / ampWatts) * 100).toFixed(0)} unit="%" />
            </div>
            <StatusBanner
              ok={totalLoad <= headroom}
              okText={`✓ Load (${totalLoad}W) within 80% headroom (${headroom}W)`}
              failText={`✗ Load (${totalLoad}W) exceeds 80% headroom (${headroom}W)`}
            />
          </CalcSection>
        </div>

      </div>
    </CalcPageWrapper>
  );
}
