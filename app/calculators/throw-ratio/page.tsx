'use client';

import { useState } from 'react';
import { CalcSection, InputField, ResultCard, CalcPageWrapper } from '@/components/calc';

export default function ThrowRatioPage() {
  const [mode, setMode] = useState<'dist' | 'ratio'>('dist');
  const [throwDist, setThrowDist] = useState(15);
  const [manualTR, setManualTR] = useState(1.5);
  const [imgWidth, setImgWidth] = useState(10);
  const [ambientFl, setAmbientFl] = useState(40);
  const [screenGain, setScreenGain] = useState(1.0);

  const tr = mode === 'dist' ? throwDist / imgWidth : manualTR;
  const computedDist = mode === 'ratio' ? manualTR * imgWidth : throwDist;
  const screenArea = imgWidth * (imgWidth / (16 / 9));
  const lumens = (ambientFl * screenArea) / screenGain;
  const lensType = tr < 0.5 ? 'UST' : tr < 1.0 ? 'Short Throw' : tr < 2.0 ? 'Standard' : 'Long Throw';

  return (
    <CalcPageWrapper title="Throw and Lumens Calculator" desc="Projector throw distance and required brightness calculator">
      <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>

        {/* ── Left half: Inputs ── */}
        <div style={{ flex: 1, minWidth: 0, paddingRight: 32 }}>
          <CalcSection title="Inputs">
            {/* Mode toggle */}
            <div className="mb-4 flex rounded-lg border border-border bg-forge-surface/50 p-0.5">
              <button
                onClick={() => setMode('dist')}
                className={`flex-1 rounded-md py-1.5 text-[12px] font-semibold transition-colors ${mode === 'dist' ? 'bg-white shadow-sm text-body' : 'text-subtle hover:text-muted'}`}
                style={mode === 'dist' ? { background: 'rgb(var(--forge-card))' } : {}}
              >
                Known value - Throw distance
              </button>
              <button
                onClick={() => setMode('ratio')}
                className={`flex-1 rounded-md py-1.5 text-[12px] font-semibold transition-colors ${mode === 'ratio' ? 'bg-white shadow-sm text-body' : 'text-subtle hover:text-muted'}`}
                style={mode === 'ratio' ? { background: 'rgb(var(--forge-card))' } : {}}
              >
                Known value - Throw ratio
              </button>
            </div>

            {mode === 'dist' ? (
              <InputField label="Throw Distance" value={throwDist} onChange={setThrowDist} unit="ft" min={1} max={200} step={0.5} />
            ) : (
              <InputField label="Throw Ratio" value={manualTR} onChange={setManualTR} unit=":1" min={0.1} max={10} step={0.05} />
            )}
            <InputField label="Image Width" value={imgWidth} onChange={setImgWidth} unit="ft" min={2} max={60} step={0.5} />
            <InputField label="Target Brightness" value={ambientFl} onChange={setAmbientFl} unit="fL" min={10} max={100} hint="≥40 for bright rooms" />
            <InputField label="Screen Gain" value={screenGain} onChange={setScreenGain} unit="×" min={0.5} max={3} step={0.1} />

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">
                  {mode === 'dist' ? 'Throw Ratio' : 'Throw Distance'}
                </div>
                <div className="rounded-lg border border-border bg-forge-surface/50 px-3 py-2.5 font-mono text-[15px] text-body">
                  {mode === 'dist' ? `${tr.toFixed(2)} :1` : `${computedDist.toFixed(1)} ft`}
                </div>
              </div>
              <div>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">Lens Type</div>
                <div className="rounded-lg border border-border bg-forge-surface/50 px-3 py-2.5 text-[15px] font-semibold text-body">
                  {lensType}
                </div>
              </div>
            </div>
          </CalcSection>
        </div>

        {/* ── Vertical divider ── */}
        <div style={{ width: 1, background: 'rgb(var(--border))', flexShrink: 0 }} />

        {/* ── Right half: Results + Formulas ── */}
        <div style={{ flex: 1, minWidth: 0, paddingLeft: 32 }}>
          <CalcSection title="Results">
            <div className="grid grid-cols-2 gap-2.5">
              <ResultCard label="Required Lumens" value={Math.ceil(lumens).toLocaleString()} unit="lm" accent />
              <ResultCard label="Screen Area" value={screenArea.toFixed(1)} unit="ft²" />
            </div>
          </CalcSection>

          <div className="rounded-lg border border-border bg-forge-surface/40 p-3.5 leading-relaxed text-subtle">
            <div className="mb-2 text-[13px] font-semibold text-muted">Formulas Used</div>
            <div className="mb-2 font-mono text-[13px] text-muted">
              <span className="font-semibold text-blue-400">Throw Ratio</span> = Throw Distance ÷ Image Width = <span className="text-body">{throwDist} ÷ {imgWidth} = {tr.toFixed(2)}:1</span>
            </div>
            <div className="mb-2 font-mono text-[13px] text-muted">
              <span className="font-semibold text-blue-400">Screen Area</span> = Width × (Width ÷ Aspect) = <span className="text-body">{imgWidth} × {(imgWidth / (16 / 9)).toFixed(2)} = {screenArea.toFixed(1)} ft²</span>
            </div>
            <div className="mb-2 font-mono text-[13px] text-muted">
              <span className="font-semibold text-blue-400">Required Lumens</span> = (Brightness × Area) ÷ Gain = <span className="text-body">({ambientFl} × {screenArea.toFixed(1)}) ÷ {screenGain} = {Math.ceil(lumens).toLocaleString()} lm</span>
            </div>
            <div className="mt-2.5 border-t border-border pt-2 text-[13px] leading-relaxed text-subtle">
              <div><span className="font-semibold text-muted">Lens Classification:</span> UST &lt; 0.5 | Short Throw 0.5–1.0 | Standard 1.0–2.0 | Long Throw &gt; 2.0</div>
              <div><span className="font-semibold text-muted">Brightness Guide:</span> 20–30 fL dark rooms | 40–60 fL ambient light | 80+ fL bright rooms</div>
              <div><span className="font-semibold text-muted">Screen Gain:</span> 1.0 = matte white | 1.3+ = high gain | 0.8 = ALR</div>
            </div>
          </div>
        </div>

      </div>
    </CalcPageWrapper>
  );
}
