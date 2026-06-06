'use client';

import { useState, useMemo } from 'react';
import { CalcSection, SelectField, InputField, ResultCard, StatusBanner, CalcPageWrapper } from '@/components/calc';

const AWG_TABLE = [
  { gauge: '8 AWG',  ohmsPerKft: 0.628, necMaxA: 40, typical: 'Long runs, high power (500W+)' },
  { gauge: '10 AWG', ohmsPerKft: 0.999, necMaxA: 30, typical: 'High power installs (200–500W)' },
  { gauge: '12 AWG', ohmsPerKft: 1.588, necMaxA: 20, typical: 'Commercial standard, moderate power' },
  { gauge: '14 AWG', ohmsPerKft: 2.525, necMaxA: 15, typical: 'Background music, short-medium runs' },
  { gauge: '16 AWG', ohmsPerKft: 4.016, necMaxA: 13, typical: 'Low power, short runs (<50 ft)' },
  { gauge: '18 AWG', ohmsPerKft: 6.385, necMaxA: 10, typical: 'Low power only (<25W, <30 ft)' },
];

const LOSS_BUDGETS = [
  { value: '5',  label: 'Hi-fi / Critical — 5%' },
  { value: '8',  label: 'Boardroom / AV — 8%' },
  { value: '10', label: 'Commercial Foreground — 10%' },
  { value: '15', label: 'BGM / Paging — 15%' },
];

type SystemType = 'direct' | '70v' | '100v';

interface GaugeResult {
  gauge: string;
  ohmsPerKft: number;
  necMaxA: number;
  typical: string;
  rLoop: number;
  pLoss: number;
  dbLoss: number;
  resistanceOk: boolean;
  currentOk: boolean;
  passes: boolean;
}

export default function SpeakerWirePage() {
  const [systemType, setSystemType] = useState<SystemType>('direct');
  const [power, setPower] = useState(200);
  const [impedance, setImpedance] = useState(8);
  const [runLength, setRunLength] = useState(150);
  const [lossBudget, setLossBudget] = useState('10');

  const lineVoltage = systemType === '100v' ? 100 : 70;
  const lossPercent = parseFloat(lossBudget);

  const results = useMemo(() => {
    const Z = systemType === 'direct'
      ? impedance
      : (lineVoltage ** 2) / power;
    const rMax = (lossPercent / 100) * Z;
    const rPerFt = rMax / (2 * runLength);
    const ohmsKftNeeded = rPerFt * 1000;
    const current = systemType === 'direct'
      ? Math.sqrt(power / Z)
      : power / lineVoltage;

    const gaugeResults: GaugeResult[] = AWG_TABLE.map(awg => {
      const rLoop = (awg.ohmsPerKft / 1000) * (2 * runLength);
      const pLoss = current ** 2 * rLoop;
      const dbLoss = 20 * Math.log10(Z / (Z + rLoop));
      const resistanceOk = rLoop <= rMax;
      const currentOk = awg.necMaxA > current;
      return { ...awg, rLoop, pLoss, dbLoss, resistanceOk, currentOk, passes: resistanceOk && currentOk };
    });

    const recommended = gaugeResults.findLast(g => g.passes) ?? null;
    return { Z, rMax, ohmsKftNeeded, current, gaugeResults, recommended };
  }, [systemType, power, impedance, runLength, lossPercent, lineVoltage]);

  const fmt = (v: number, d = 2) => isFinite(v) ? v.toFixed(d) : '—';

  return (
    <CalcPageWrapper
      title="Speaker Wire Gauge"
      desc="NEC Article 640 / AVIXA CTS-D — determine minimum AWG for any speaker run"
    >
      <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>

        {/* ── Inputs ── */}
        <div style={{ flex: 1, minWidth: 0, paddingRight: 32 }}>
          <CalcSection title="System Type">
            <div className="mb-4 flex gap-2">
              {(['direct', '70v', '100v'] as SystemType[]).map(type => (
                <button
                  key={type}
                  onClick={() => setSystemType(type)}
                  className={`flex-1 rounded-lg border py-2 text-[13px] font-semibold transition-colors ${
                    systemType === type
                      ? 'border-blue-500/50 bg-blue-500/15 text-blue-400'
                      : 'border-border bg-forge-surface/50 text-muted hover:text-body'
                  }`}
                >
                  {type === 'direct' ? '8Ω Direct' : type === '70v' ? '70V Line' : '100V Line'}
                </button>
              ))}
            </div>
          </CalcSection>

          <CalcSection title="Speaker Run">
            {systemType === 'direct' ? (
              <>
                <InputField
                  label="Amplifier Power"
                  value={power}
                  onChange={setPower}
                  unit="W"
                  min={1}
                  max={5000}
                />
                <SelectField
                  label="Speaker Impedance"
                  value={String(impedance)}
                  onChange={v => setImpedance(parseFloat(v))}
                  options={[
                    { value: '4',  label: '4Ω' },
                    { value: '8',  label: '8Ω' },
                    { value: '16', label: '16Ω' },
                  ]}
                />
              </>
            ) : (
              <InputField
                label="Tap Power (per speaker)"
                value={power}
                onChange={setPower}
                unit="W"
                min={1}
                max={1000}
              />
            )}
            <InputField
              label="Run Length"
              value={runLength}
              onChange={setRunLength}
              unit="ft"
              min={1}
              max={2000}
            />
          </CalcSection>

          <CalcSection title="Loss Budget">
            <SelectField
              label="Application"
              value={lossBudget}
              onChange={setLossBudget}
              options={LOSS_BUDGETS}
            />
          </CalcSection>
        </div>

        {/* ── Divider ── */}
        <div style={{ width: 1, background: 'rgb(var(--border))', flexShrink: 0, alignSelf: 'stretch' }} />

        {/* ── Results ── */}
        <div style={{ flex: 1, minWidth: 0, paddingLeft: 32 }}>
          <CalcSection title="Recommendation">
            {results.recommended ? (
              <div className="mb-3 rounded-xl border border-blue-500/30 bg-blue-500/10 px-5 py-4">
                <div className="mb-1 text-[11px] uppercase tracking-[0.06em] text-blue-400/70">
                  Minimum Passing Gauge
                </div>
                <div className="font-mono text-[32px] font-bold text-blue-400">
                  {results.recommended.gauge}
                </div>
                <div className="mt-1 text-[12px] text-subtle">
                  {results.recommended.typical}
                </div>
              </div>
            ) : (
              <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4">
                <div className="font-mono text-[18px] font-bold text-red-400">No standard gauge passes</div>
                <div className="mt-1 text-[12px] text-subtle">
                  Run is too long or power too high for standard gauges. Consider 70V distribution or splitting the run.
                </div>
              </div>
            )}
          </CalcSection>

          <CalcSection title="Design Values">
            <div className="mb-2.5 grid grid-cols-2 gap-2.5">
              <ResultCard label="Z Load" value={fmt(results.Z)} unit="Ω" />
              <ResultCard label="R_max Allowed" value={fmt(results.rMax)} unit="Ω" accent />
              <ResultCard label="Ω/kft Needed" value={fmt(results.ohmsKftNeeded)} unit="Ω/kft" />
              <ResultCard label="Load Current" value={fmt(results.current)} unit="A" />
            </div>
          </CalcSection>

          {results.recommended && (
            <CalcSection title="Selected Gauge Analysis">
              <div className="mb-2.5 grid grid-cols-2 gap-2.5">
                <ResultCard label="Loop Resistance" value={fmt(results.recommended.rLoop)} unit="Ω" />
                <ResultCard label="Power Loss" value={fmt(results.recommended.pLoss, 1)} unit="W" />
                <ResultCard label="Acoustic Loss" value={fmt(Math.abs(results.recommended.dbLoss), 2)} unit="dB" />
                <ResultCard label="NEC Rating" value={results.recommended.necMaxA} unit="A" />
              </div>
              <StatusBanner
                ok={Math.abs(results.recommended.dbLoss) < 1.0}
                okText={`✓ ${fmt(Math.abs(results.recommended.dbLoss), 2)} dB loss — acceptable`}
                failText={`✗ ${fmt(Math.abs(results.recommended.dbLoss), 2)} dB loss — exceeds 1.0 dB`}
              />
            </CalcSection>
          )}
        </div>
      </div>

      {/* ── AWG Comparison Table ── */}
      <div style={{ marginTop: 32 }}>
        <h3 className="mb-2 border-b border-border pb-1.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">
          All Gauge Comparison
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 pr-4 font-semibold text-muted">Gauge</th>
                <th className="pb-2 pr-4 text-right font-semibold text-muted">Ω/kft</th>
                <th className="pb-2 pr-4 text-right font-semibold text-muted">R_loop (Ω)</th>
                <th className="pb-2 pr-4 text-right font-semibold text-muted">Loss (dB)</th>
                <th className="pb-2 pr-4 text-right font-semibold text-muted">P_loss (W)</th>
                <th className="pb-2 pr-4 text-right font-semibold text-muted">NEC Max A</th>
                <th className="pb-2 text-left font-semibold text-muted">Status</th>
              </tr>
            </thead>
            <tbody>
              {results.gaugeResults.map(g => {
                const isRecommended = g === results.recommended;
                const absDb = Math.abs(g.dbLoss);
                const dbColor = absDb > 1 ? 'text-red-400' : absDb > 0.5 ? 'text-yellow-400' : 'text-green-400';
                return (
                  <tr
                    key={g.gauge}
                    className={`border-b border-border/40 ${isRecommended ? 'bg-blue-500/[0.06]' : ''}`}
                  >
                    <td className={`py-2 pr-4 font-mono font-semibold ${g.passes ? 'text-body' : 'text-subtle'}`}>
                      {g.gauge}
                      {isRecommended && (
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-blue-400">
                          recommended
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono text-subtle">{g.ohmsPerKft}</td>
                    <td className="py-2 pr-4 text-right font-mono text-subtle">{fmt(g.rLoop)}</td>
                    <td className={`py-2 pr-4 text-right font-mono ${dbColor}`}>
                      {fmt(g.dbLoss, 2)}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono text-subtle">{fmt(g.pLoss, 1)}</td>
                    <td className={`py-2 pr-4 text-right font-mono ${g.currentOk ? 'text-subtle' : 'text-red-400'}`}>
                      {g.necMaxA}
                    </td>
                    <td className="py-2">
                      {g.passes ? (
                        <span className="text-green-400">✓ Pass</span>
                      ) : (
                        <span className="text-red-400/70 text-[12px]">
                          {!g.resistanceOk && !g.currentOk
                            ? '✗ R + NEC fail'
                            : !g.resistanceOk
                            ? '✗ R too high'
                            : '✗ NEC exceeded'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-faint">
          Reference: NEC Article 640 · AVIXA CTS-D Standard · Loss &gt; 0.5 dB audible, &gt; 1.0 dB unacceptable
        </p>
      </div>

      {/* ── Formulas ── */}
      <div style={{ marginTop: 32 }}>
        <h3 className="mb-3 border-b border-border pb-1.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">
          Formulas Used
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

          <div className="rounded-lg border border-border bg-forge-surface/40 px-4 py-3">
            <div className="mb-1.5 text-[11px] uppercase tracking-[0.06em] text-muted">Load Impedance (Z)</div>
            <div className="font-mono text-[13px] text-body">
              <div>8Ω Direct: <span className="text-blue-400">Z = speaker impedance</span></div>
              <div className="mt-0.5">70V / 100V: <span className="text-blue-400">Z = V² ÷ P</span></div>
            </div>
            <div className="mt-1.5 text-[11px] text-subtle">V = line voltage (70 or 100), P = tap power per speaker</div>
          </div>

          <div className="rounded-lg border border-border bg-forge-surface/40 px-4 py-3">
            <div className="mb-1.5 text-[11px] uppercase tracking-[0.06em] text-muted">Load Current (I)</div>
            <div className="font-mono text-[13px] text-body">
              <div>8Ω Direct: <span className="text-blue-400">I = √(P ÷ Z)</span></div>
              <div className="mt-0.5">70V / 100V: <span className="text-blue-400">I = P ÷ V</span></div>
            </div>
            <div className="mt-1.5 text-[11px] text-subtle">Used to check NEC ampacity of each gauge</div>
          </div>

          <div className="rounded-lg border border-border bg-forge-surface/40 px-4 py-3">
            <div className="mb-1.5 text-[11px] uppercase tracking-[0.06em] text-muted">Max Allowable Loop Resistance (R_max)</div>
            <div className="font-mono text-[13px] text-blue-400">R_max = (loss% ÷ 100) × Z</div>
            <div className="mt-1.5 text-[11px] text-subtle">Sets the worst-case resistance the wire can add before loss exceeds the budget</div>
          </div>

          <div className="rounded-lg border border-border bg-forge-surface/40 px-4 py-3">
            <div className="mb-1.5 text-[11px] uppercase tracking-[0.06em] text-muted">Required Wire Resistance (Ω/kft needed)</div>
            <div className="font-mono text-[13px] text-blue-400">Ω/kft = (R_max ÷ (2 × run ft)) × 1000</div>
            <div className="mt-1.5 text-[11px] text-subtle">Factor of 2 accounts for the full loop (hot + return conductors)</div>
          </div>

          <div className="rounded-lg border border-border bg-forge-surface/40 px-4 py-3">
            <div className="mb-1.5 text-[11px] uppercase tracking-[0.06em] text-muted">Actual Loop Resistance per Gauge</div>
            <div className="font-mono text-[13px] text-blue-400">R_loop = (Ω/kft ÷ 1000) × (2 × run ft)</div>
            <div className="mt-1.5 text-[11px] text-subtle">Calculated for each AWG gauge from its published resistance table value</div>
          </div>

          <div className="rounded-lg border border-border bg-forge-surface/40 px-4 py-3">
            <div className="mb-1.5 text-[11px] uppercase tracking-[0.06em] text-muted">Acoustic Loss (dB)</div>
            <div className="font-mono text-[13px] text-blue-400">dB = 20 × log₁₀(Z ÷ (Z + R_loop))</div>
            <div className="mt-1.5 text-[11px] text-subtle">Voltage-divider model; negative result = loss. &gt; 0.5 dB audible, &gt; 1.0 dB unacceptable</div>
          </div>

          <div className="rounded-lg border border-border bg-forge-surface/40 px-4 py-3">
            <div className="mb-1.5 text-[11px] uppercase tracking-[0.06em] text-muted">Power Dissipated in Wire (P_loss)</div>
            <div className="font-mono text-[13px] text-blue-400">P_loss = I² × R_loop</div>
            <div className="mt-1.5 text-[11px] text-subtle">Heat generated in the conductor; informational only</div>
          </div>

          <div className="rounded-lg border border-border bg-forge-surface/40 px-4 py-3">
            <div className="mb-1.5 text-[11px] uppercase tracking-[0.06em] text-muted">Pass Criteria</div>
            <div className="font-mono text-[13px] text-body">
              <div><span className="text-green-400">✓</span> R_loop ≤ R_max</div>
              <div className="mt-0.5"><span className="text-green-400">✓</span> NEC ampacity &gt; I</div>
            </div>
            <div className="mt-1.5 text-[11px] text-subtle">Both conditions must hold. Recommended = thinnest gauge that passes both</div>
          </div>

        </div>
      </div>
    </CalcPageWrapper>
  );
}
