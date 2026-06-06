'use client';

import { useState } from 'react';
import { CalcSection, CalcPageWrapper } from '@/components/calc';

const cellInput: React.CSSProperties = { padding: '5px 6px', background: '#0f172a', border: '1px solid rgb(var(--border))', borderRadius: 5, color: '#e2e8f0', fontSize: 13, fontFamily: "'JetBrains Mono', monospace", outline: 'none', width: '100%', boxSizing: 'border-box', textAlign: 'center' };
const cellOutput: React.CSSProperties = { padding: '5px 6px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 5, color: '#60a5fa', fontSize: 13, fontFamily: "'JetBrains Mono', monospace", textAlign: 'center', minHeight: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const cellKeyOutput: React.CSSProperties = { ...cellOutput, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.35)', fontWeight: 600 };
const headerCol: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#e2e8f0', textAlign: 'center', padding: '6px 4px' };
const rowLabel: React.CSSProperties = { fontSize: 12, color: 'rgb(var(--text-muted))', fontWeight: 500, padding: '5px 4px', whiteSpace: 'nowrap' };
const calcBtn: React.CSSProperties = { padding: '7px 12px', background: '#2563eb', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', width: '100%', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '0.03em' };
const fmt = (v: number | undefined | null) => v !== undefined && v !== null && !isNaN(v) ? v.toFixed(2) : '0.00';

interface CalcResult {
  imageH: number;
  minElemH: number;
  farthestViewer: number;
  floorToBottom: number;
  closestViewer: number;
  maxCVPlane: number;
  imageW: number;
  imageDiag: number;
  viewingRatio: number;
}

export default function DisplaySizingPage() {
  const [eyeLevel, setEyeLevel] = useState(48);
  const [aspectRatio, setAspectRatio] = useState(1.78);
  const [c1ImageH, setC1ImageH] = useState('');
  const [c1MinElem, setC1MinElem] = useState('');
  const [c2Farthest, setC2Farthest] = useState('');
  const [c2MinElem, setC2MinElem] = useState('');
  const [c3Farthest, setC3Farthest] = useState('');
  const [c3ImageH, setC3ImageH] = useState('');
  const [c1Floor, setC1Floor] = useState('');
  const [c2Floor, setC2Floor] = useState('');
  const [c3Floor, setC3Floor] = useState('');
  const [results1, setResults1] = useState<CalcResult | null>(null);
  const [results2, setResults2] = useState<CalcResult | null>(null);
  const [results3, setResults3] = useState<CalcResult | null>(null);

  const compute = (imageH: number, farthestViewer: number, floorToBottom: number | null, minElemH: number): CalcResult => {
    const ar = aspectRatio || 1.78;
    const el = eyeLevel || 48;
    const w = imageH * ar;
    const diag = Math.sqrt(w * w + imageH * imageH);
    const vr = farthestViewer / imageH;
    const fb = floorToBottom || (el - imageH / 2);
    const topOfScreen = fb + imageH;
    const aboveEye = topOfScreen - el;
    const closestByAngle = aboveEye > 0 ? aboveEye / Math.tan(35 * Math.PI / 180) : imageH * 0.87;
    const closestViewer = Math.max(imageH * 0.87, closestByAngle);
    const maxCVPlane = Math.max(farthestViewer - closestViewer, 0);
    return { imageH, minElemH, farthestViewer, floorToBottom: fb, closestViewer, maxCVPlane, imageW: w, imageDiag: diag, viewingRatio: vr };
  };

  const calcCol1 = () => {
    const h = parseFloat(c1ImageH);
    if (!h || h <= 0) return;
    const pctElem = parseFloat(c1MinElem);
    let fv: number, pctEH: number;
    if (pctElem && pctElem > 0) {
      fv = h * 2 * pctElem;
      pctEH = pctElem;
    } else {
      fv = h * 6;
      pctEH = 3;
    }
    const fb = parseFloat(c1Floor) || 0;
    setResults1(compute(h, fv, fb || null, pctEH));
  };

  const calcCol2 = () => {
    const fv = parseFloat(c2Farthest);
    if (!fv || fv <= 0) return;
    const pctElem = parseFloat(c2MinElem);
    let h: number, minE: number;
    if (pctElem && pctElem > 0) {
      h = fv / (2 * pctElem);
      minE = pctElem;
    } else {
      h = fv / 6;
      minE = 3;
    }
    const fb = parseFloat(c2Floor) || 0;
    setResults2(compute(h, fv, fb || null, minE));
  };

  const calcCol3 = () => {
    const fv = parseFloat(c3Farthest);
    const h = parseFloat(c3ImageH);
    if (!fv || fv <= 0 || !h || h <= 0) return;
    const vr = fv / h;
    const pctEH = vr / 2;
    const fb = parseFloat(c3Floor) || 0;
    setResults3(compute(h, fv, fb || null, pctEH));
  };

  const reset = () => {
    setC1ImageH(''); setC1MinElem(''); setC2Farthest(''); setC2MinElem(''); setC3Farthest(''); setC3ImageH('');
    setC1Floor(''); setC2Floor(''); setC3Floor('');
    setResults1(null); setResults2(null); setResults3(null);
  };

  const presets = [
    { label: '16:9 (HD/4K)', val: 1.78 },
    { label: '16:10 (WUXGA)', val: 1.60 },
    { label: '21:9 (Ultra-Wide)', val: 2.33 },
    { label: '4:3 (NTSC/PAL)', val: 1.33 },
    { label: '2.39:1 (Anamorphic)', val: 2.39 },
  ];

  return (
    <CalcPageWrapper title="Display Sizing" desc="DISCAS-based image height and viewer distance calculator">
      <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>

        {/* ── Left half: Step 1 + Step 2 ── */}
        <div style={{ flex: 1, minWidth: 0, paddingRight: 32 }}>

          <CalcSection title="Step 1: Setup">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">
                  Standard Eye Level <span className="font-normal opacity-60">(use consistent units)</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input type="number" value={eyeLevel} onChange={e => setEyeLevel(parseFloat(e.target.value) || 0)}
                    className="flex-1 rounded-lg border border-border bg-forge-surface px-2.5 py-2 font-mono text-sm text-body outline-none focus:border-blue-500/40" />
                  <span className="text-xs text-subtle">in</span>
                </div>
                <div className="mt-1 text-[10px] text-faint">48" seated / 60" standing</div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">
                  Image Aspect Ratio <span className="font-normal opacity-60">(as X.XX)</span>
                </label>
                <input type="number" value={aspectRatio} onChange={e => setAspectRatio(parseFloat(e.target.value) || 0)} step={0.01}
                  className="forge-input mb-1.5 font-mono" />
                <div className="flex flex-wrap gap-1">
                  {presets.map((p, i) => (
                    <button key={i} onClick={() => setAspectRatio(p.val)}
                      className="rounded px-2 py-0.5 text-[10px] transition-colors"
                      style={{ background: Math.abs(aspectRatio - p.val) < 0.01 ? 'rgba(59,130,246,0.15)' : 'rgb(var(--forge-surface) / 0.5)', border: '1px solid ' + (Math.abs(aspectRatio - p.val) < 0.01 ? 'rgba(59,130,246,0.4)' : 'rgb(var(--border))'), color: Math.abs(aspectRatio - p.val) < 0.01 ? '#60a5fa' : 'rgb(var(--text-subtle))' }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CalcSection>

          <CalcSection title="Step 2: Calculate">
            <p className="mb-3.5 text-xs text-subtle">Enter known values in one column and click Calculate. All outputs use the same units as your inputs.</p>
            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr 1fr', gap: 1, minWidth: 520 }}>
                <div style={{ padding: '8px 4px' }}></div>
                <div style={headerCol}>To Find:<br /><span style={{ color: '#60a5fa' }}>Farthest Viewer</span></div>
                <div style={headerCol}>To Find:<br /><span style={{ color: '#f59e0b' }}>Min Image Height</span></div>
                <div style={headerCol}>To Find:<br /><span style={{ color: '#a78bfa' }}>Min %Element Height</span></div>

                <div style={rowLabel}>Image Height</div>
                <div style={{ padding: 2 }}><input type="number" value={c1ImageH} onChange={e => setC1ImageH(e.target.value)} placeholder="enter" style={cellInput} /></div>
                <div style={{ padding: 2 }}><div style={cellKeyOutput}>{results2 ? fmt(results2.imageH) : '0.00'}</div></div>
                <div style={{ padding: 2 }}><input type="number" value={c3ImageH} onChange={e => setC3ImageH(e.target.value)} placeholder="enter" style={cellInput} /></div>

                <div style={rowLabel}>Minimum %Element Height</div>
                <div style={{ padding: 2 }}><input type="number" value={c1MinElem} onChange={e => setC1MinElem(e.target.value)} placeholder="enter %" style={cellInput} /></div>
                <div style={{ padding: 2 }}><input type="number" value={c2MinElem} onChange={e => setC2MinElem(e.target.value)} placeholder="enter %" style={cellInput} /></div>
                <div style={{ padding: 2 }}><div style={cellKeyOutput}>{results3 ? fmt(results3.minElemH) + '%' : '0.00'}</div></div>

                <div style={rowLabel}>Farthest Viewer</div>
                <div style={{ padding: 2 }}><div style={cellKeyOutput}>{results1 ? fmt(results1.farthestViewer) : '0.00'}</div></div>
                <div style={{ padding: 2 }}><input type="number" value={c2Farthest} onChange={e => setC2Farthest(e.target.value)} placeholder="enter" style={cellInput} /></div>
                <div style={{ padding: 2 }}><input type="number" value={c3Farthest} onChange={e => setC3Farthest(e.target.value)} placeholder="enter" style={cellInput} /></div>

                <div style={rowLabel}>Floor to Bottom of Image*</div>
                <div style={{ padding: 2 }}><input type="number" value={c1Floor} onChange={e => setC1Floor(e.target.value)} placeholder="optional" style={{ ...cellInput, opacity: 0.7 }} /></div>
                <div style={{ padding: 2 }}><input type="number" value={c2Floor} onChange={e => setC2Floor(e.target.value)} placeholder="optional" style={{ ...cellInput, opacity: 0.7 }} /></div>
                <div style={{ padding: 2 }}><input type="number" value={c3Floor} onChange={e => setC3Floor(e.target.value)} placeholder="optional" style={{ ...cellInput, opacity: 0.7 }} /></div>

                <div style={rowLabel}>Closest Viewer</div>
                <div style={{ padding: 2 }}><div style={cellOutput}>{results1 ? fmt(results1.closestViewer) : '0.00'}</div></div>
                <div style={{ padding: 2 }}><div style={cellOutput}>{results2 ? fmt(results2.closestViewer) : '0.00'}</div></div>
                <div style={{ padding: 2 }}><div style={cellOutput}>{results3 ? fmt(results3.closestViewer) : '0.00'}</div></div>

                <div style={rowLabel}>Max Length of CV Plane</div>
                <div style={{ padding: 2 }}><div style={cellOutput}>{results1 ? fmt(results1.maxCVPlane) : '0.00'}</div></div>
                <div style={{ padding: 2 }}><div style={cellOutput}>{results2 ? fmt(results2.maxCVPlane) : '0.00'}</div></div>
                <div style={{ padding: 2 }}><div style={cellOutput}>{results3 ? fmt(results3.maxCVPlane) : '0.00'}</div></div>

                <div style={rowLabel}>Image Width</div>
                <div style={{ padding: 2 }}><div style={cellOutput}>{results1 ? fmt(results1.imageW) : '0.00'}</div></div>
                <div style={{ padding: 2 }}><div style={cellOutput}>{results2 ? fmt(results2.imageW) : '0.00'}</div></div>
                <div style={{ padding: 2 }}><div style={cellOutput}>{results3 ? fmt(results3.imageW) : '0.00'}</div></div>

                <div style={rowLabel}>Image Diagonal</div>
                <div style={{ padding: 2 }}><div style={cellOutput}>{results1 ? fmt(results1.imageDiag) : '0.00'}</div></div>
                <div style={{ padding: 2 }}><div style={cellOutput}>{results2 ? fmt(results2.imageDiag) : '0.00'}</div></div>
                <div style={{ padding: 2 }}><div style={cellOutput}>{results3 ? fmt(results3.imageDiag) : '0.00'}</div></div>

                <div style={rowLabel}>Viewing Ratio</div>
                <div style={{ padding: 2 }}><div style={cellOutput}>{results1 ? fmt(results1.viewingRatio) : '0.00'}</div></div>
                <div style={{ padding: 2 }}><div style={cellOutput}>{results2 ? fmt(results2.viewingRatio) : '0.00'}</div></div>
                <div style={{ padding: 2 }}><div style={cellOutput}>{results3 ? fmt(results3.viewingRatio) : '0.00'}</div></div>

                <div style={{ padding: '8px 4px', fontSize: 10, color: '#475569' }}>*Optional input</div>
                <div style={{ padding: '6px 2px' }}><button onClick={calcCol1} style={calcBtn}>Calculate</button></div>
                <div style={{ padding: '6px 2px' }}><button onClick={calcCol2} style={{ ...calcBtn, background: '#d97706' }}>Calculate</button></div>
                <div style={{ padding: '6px 2px' }}><button onClick={calcCol3} style={{ ...calcBtn, background: '#7c3aed' }}>Calculate</button></div>
              </div>
            </div>
            <div className="mt-3.5 flex gap-2">
              <button onClick={reset} className="rounded-md border border-red-500/25 bg-red-500/10 px-5 py-2 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/20">
                Reset All
              </button>
            </div>
          </CalcSection>

        </div>

        {/* ── Vertical divider ── */}
        <div style={{ width: 1, background: 'rgb(var(--border))', flexShrink: 0 }} />

        {/* ── Right half: AVIXA Reference ── */}
        <div style={{ flex: 1, minWidth: 0, paddingLeft: 32, paddingTop: 60 }}>
          <div className="rounded-lg border border-border bg-forge-surface/40 p-4 text-xs leading-relaxed text-subtle">
            <div className="mb-2 text-sm font-semibold text-secondary">AVIXA DISCAS Reference</div>
            <div className="mb-3 space-y-1">
              <div><strong className="text-muted">Key Formula:</strong> Image Height = Farthest Viewer ÷ (2 × %Element Height)</div>
              <div><strong className="text-muted">Viewing Ratio:</strong> VR = 2 × %Element Height &nbsp;|&nbsp; VR = Farthest Viewer ÷ Image Height</div>
              <div><strong className="text-muted">Closest Viewer:</strong> Based on 35° max vertical viewing angle above eye level</div>
            </div>
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr>
                  <th className="border-b border-border px-2 py-1.5 text-center font-semibold text-muted">Min Viewing Ratio</th>
                  <th className="border-b border-border px-2 py-1.5 text-center font-semibold text-muted">Max Viewing Ratio</th>
                  <th className="border-b border-border px-2 py-1.5 text-center font-semibold text-muted">Min %Element Height</th>
                </tr>
              </thead>
              <tbody>
                {[[0.8,1,0.5],[1,1.5,0.75],[1.5,2,1],[2,3,1.5],[3,4,2],[4,5,2.5],[5,6,3],[6,7,3.5],[7,8,4],[8,9,4.5],[9,10,5]].map((r, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgb(var(--forge-surface) / 0.3)' }}>
                    <td className="border-b border-border px-2 py-1.5 text-center text-body">{r[0].toFixed(2)}</td>
                    <td className="border-b border-border px-2 py-1.5 text-center text-body">{r[1].toFixed(2)}</td>
                    <td className="border-b border-border px-2 py-1.5 text-center font-medium text-blue-400">{r[2].toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </CalcPageWrapper>
  );
}
