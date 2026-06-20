'use client';

import { useState } from 'react';
import { CalcSection, CalcPageWrapper } from '@/components/calc';

const cellInput: React.CSSProperties = { padding: '5px 6px', background: 'rgb(var(--forge-surface))', border: '1px solid rgb(var(--border))', borderRadius: 5, color: 'rgb(var(--text-body))', fontSize: 13, fontFamily: "'JetBrains Mono', monospace", outline: 'none', width: '100%', boxSizing: 'border-box', textAlign: 'center' };
const cellOutput: React.CSSProperties = { padding: '5px 6px', background: 'transparent', border: 'none', color: 'rgb(var(--text-subtle))', fontSize: 13, fontFamily: "'JetBrains Mono', monospace", textAlign: 'center', minHeight: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const cellKeyOutput: React.CSSProperties = { ...cellOutput, color: 'rgb(var(--text-body))', fontWeight: 600 };
const headerCol: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'rgb(var(--text-muted))', textAlign: 'center', padding: '6px 4px' };
const rowLabel: React.CSSProperties = { fontSize: 12, color: 'rgb(var(--text-muted))', fontWeight: 500, padding: '5px 4px', whiteSpace: 'nowrap' };
const calcBtn: React.CSSProperties = { padding: '7px 14px', background: '#2563eb', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' };
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
  const [colFloors, setColFloors] = useState(['', '', '']);
  const [colResults, setColResults] = useState<(CalcResult | null)[]>([null, null, null]);

  const updateFloor = (i: number, v: string) => setColFloors(f => { const n = [...f]; n[i] = v; return n; });
  const updateResult = (i: number, r: CalcResult | null) => setColResults(rs => { const n = [...rs]; n[i] = r; return n; });

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

  const resolveFromImageH = (h: number, pctElem: number) =>
    pctElem > 0 ? { fv: h * 2 * pctElem, pctEH: pctElem } : { fv: h * 6, pctEH: 3 };

  const resolveFromFarthest = (fv: number, pctElem: number) =>
    pctElem > 0 ? { h: fv / (2 * pctElem), minE: pctElem } : { h: fv / 6, minE: 3 };

  const calcCol1 = () => {
    const h = parseFloat(c1ImageH);
    if (!h || h <= 0) return;
    const { fv, pctEH } = resolveFromImageH(h, parseFloat(c1MinElem) || 0);
    const fb = parseFloat(colFloors[0]) || 0;
    updateResult(0, compute(h, fv, fb || null, pctEH));
  };

  const calcCol2 = () => {
    const fv = parseFloat(c2Farthest);
    if (!fv || fv <= 0) return;
    const { h, minE } = resolveFromFarthest(fv, parseFloat(c2MinElem) || 0);
    const fb = parseFloat(colFloors[1]) || 0;
    updateResult(1, compute(h, fv, fb || null, minE));
  };

  const calcCol3 = () => {
    const fv = parseFloat(c3Farthest);
    const h = parseFloat(c3ImageH);
    if (!fv || fv <= 0 || !h || h <= 0) return;
    const pctEH = (fv / h) / 2;
    const fb = parseFloat(colFloors[2]) || 0;
    updateResult(2, compute(h, fv, fb || null, pctEH));
  };

  const reset = () => {
    setC1ImageH(''); setC1MinElem(''); setC2Farthest(''); setC2MinElem(''); setC3Farthest(''); setC3ImageH('');
    setColFloors(['', '', '']);
    setColResults([null, null, null]);
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
                <div style={headerCol}>To Find:<br /><span style={{ color: 'rgb(var(--text-body))', fontWeight: 700 }}>Farthest Viewer</span></div>
                <div style={headerCol}>To Find:<br /><span style={{ color: 'rgb(var(--text-body))', fontWeight: 700 }}>Min Image Height</span></div>
                <div style={headerCol}>To Find:<br /><span style={{ color: 'rgb(var(--text-body))', fontWeight: 700 }}>Min %Element Height</span></div>

                <div style={rowLabel}>Image Height</div>
                <div style={{ padding: 2 }}><input type="number" value={c1ImageH} onChange={e => setC1ImageH(e.target.value)} placeholder="enter" style={cellInput} /></div>
                <div style={{ padding: 2 }}><div style={cellKeyOutput}>{colResults[1] ? fmt(colResults[1].imageH) : '0.00'}</div></div>
                <div style={{ padding: 2 }}><input type="number" value={c3ImageH} onChange={e => setC3ImageH(e.target.value)} placeholder="enter" style={cellInput} /></div>

                <div style={rowLabel}>Minimum %Element Height</div>
                <div style={{ padding: 2 }}><input type="number" value={c1MinElem} onChange={e => setC1MinElem(e.target.value)} placeholder="enter %" style={cellInput} /></div>
                <div style={{ padding: 2 }}><input type="number" value={c2MinElem} onChange={e => setC2MinElem(e.target.value)} placeholder="enter %" style={cellInput} /></div>
                <div style={{ padding: 2 }}><div style={cellKeyOutput}>{colResults[2] ? fmt(colResults[2].minElemH) + '%' : '0.00'}</div></div>

                <div style={rowLabel}>Farthest Viewer</div>
                <div style={{ padding: 2 }}><div style={cellKeyOutput}>{colResults[0] ? fmt(colResults[0].farthestViewer) : '0.00'}</div></div>
                <div style={{ padding: 2 }}><input type="number" value={c2Farthest} onChange={e => setC2Farthest(e.target.value)} placeholder="enter" style={cellInput} /></div>
                <div style={{ padding: 2 }}><input type="number" value={c3Farthest} onChange={e => setC3Farthest(e.target.value)} placeholder="enter" style={cellInput} /></div>

                <div style={rowLabel}>Floor to Bottom of Image*</div>
                <div style={{ padding: 2 }}><input type="number" value={colFloors[0]} onChange={e => updateFloor(0, e.target.value)} placeholder="optional" style={{ ...cellInput, borderStyle: 'dashed', opacity: 0.6 }} /></div>
                <div style={{ padding: 2 }}><input type="number" value={colFloors[1]} onChange={e => updateFloor(1, e.target.value)} placeholder="optional" style={{ ...cellInput, borderStyle: 'dashed', opacity: 0.6 }} /></div>
                <div style={{ padding: 2 }}><input type="number" value={colFloors[2]} onChange={e => updateFloor(2, e.target.value)} placeholder="optional" style={{ ...cellInput, borderStyle: 'dashed', opacity: 0.6 }} /></div>

                <div style={rowLabel}>Closest Viewer</div>
                <div style={{ padding: 2 }}><div style={cellOutput}>{colResults[0] ? fmt(colResults[0].closestViewer) : '0.00'}</div></div>
                <div style={{ padding: 2 }}><div style={cellOutput}>{colResults[1] ? fmt(colResults[1].closestViewer) : '0.00'}</div></div>
                <div style={{ padding: 2 }}><div style={cellOutput}>{colResults[2] ? fmt(colResults[2].closestViewer) : '0.00'}</div></div>

                <div style={rowLabel}>Max Length of CV Plane</div>
                <div style={{ padding: 2 }}><div style={cellOutput}>{colResults[0] ? fmt(colResults[0].maxCVPlane) : '0.00'}</div></div>
                <div style={{ padding: 2 }}><div style={cellOutput}>{colResults[1] ? fmt(colResults[1].maxCVPlane) : '0.00'}</div></div>
                <div style={{ padding: 2 }}><div style={cellOutput}>{colResults[2] ? fmt(colResults[2].maxCVPlane) : '0.00'}</div></div>

                <div style={rowLabel}>Image Width</div>
                <div style={{ padding: 2 }}><div style={cellOutput}>{colResults[0] ? fmt(colResults[0].imageW) : '0.00'}</div></div>
                <div style={{ padding: 2 }}><div style={cellOutput}>{colResults[1] ? fmt(colResults[1].imageW) : '0.00'}</div></div>
                <div style={{ padding: 2 }}><div style={cellOutput}>{colResults[2] ? fmt(colResults[2].imageW) : '0.00'}</div></div>

                <div style={rowLabel}>Image Diagonal</div>
                <div style={{ padding: 2 }}><div style={cellOutput}>{colResults[0] ? fmt(colResults[0].imageDiag) : '0.00'}</div></div>
                <div style={{ padding: 2 }}><div style={cellOutput}>{colResults[1] ? fmt(colResults[1].imageDiag) : '0.00'}</div></div>
                <div style={{ padding: 2 }}><div style={cellOutput}>{colResults[2] ? fmt(colResults[2].imageDiag) : '0.00'}</div></div>

                <div style={rowLabel}>Viewing Ratio</div>
                <div style={{ padding: 2 }}><div style={cellOutput}>{colResults[0] ? fmt(colResults[0].viewingRatio) : '0.00'}</div></div>
                <div style={{ padding: 2 }}><div style={cellOutput}>{colResults[1] ? fmt(colResults[1].viewingRatio) : '0.00'}</div></div>
                <div style={{ padding: 2 }}><div style={cellOutput}>{colResults[2] ? fmt(colResults[2].viewingRatio) : '0.00'}</div></div>

                <div style={{ padding: '8px 4px', fontSize: 10, color: '#475569' }}>*Optional input</div>
                <div style={{ padding: '6px 2px' }}><button onClick={calcCol1} style={calcBtn}>Calculate</button></div>
                <div style={{ padding: '6px 2px' }}><button onClick={calcCol2} style={calcBtn}>Calculate</button></div>
                <div style={{ padding: '6px 2px' }}><button onClick={calcCol3} style={calcBtn}>Calculate</button></div>
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
