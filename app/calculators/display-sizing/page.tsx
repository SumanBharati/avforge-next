'use client';

import { useState } from 'react';
import { TableProperties, Calculator, BookOpen, RotateCcw } from 'lucide-react';
import { CalcPageWrapper } from '@/components/calc';

const fmt = (v: number | undefined | null) =>
  v !== undefined && v !== null && !isNaN(v) ? v.toFixed(2) : '0.00';

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

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2 border-b border-border pb-2.5">
      <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-500/15">
        {icon}
      </div>
      <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{title}</h3>
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 text-[12px]">
      <span className="text-subtle">{label}</span>
      <span className="font-mono font-semibold text-body">{value}</span>
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-border bg-forge-surface px-3 py-2 font-mono text-[13px] text-body outline-none transition-colors focus:border-blue-500/40 placeholder:text-faint';

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

  const updateFloor = (i: number, v: string) =>
    setColFloors(f => { const n = [...f]; n[i] = v; return n; });
  const updateResult = (i: number, r: CalcResult | null) =>
    setColResults(rs => { const n = [...rs]; n[i] = r; return n; });

  const compute = (imageH: number, farthestViewer: number, floorToBottom: number | null, minElemH: number): CalcResult => {
    const ar = aspectRatio || 1.78;
    const el = eyeLevel || 48;
    const w = imageH * ar;
    const diag = Math.sqrt(w * w + imageH * imageH);
    const vr = farthestViewer / imageH;
    const fb = floorToBottom || (el - imageH / 2);
    const topOfScreen = fb + imageH;
    const aboveEye = topOfScreen - el;
    const closestByAngle = aboveEye > 0 ? aboveEye / Math.tan(30 * Math.PI / 180) : imageH * 0.87;
    const closestViewer = Math.max(imageH * 0.87, closestByAngle);
    const maxCVPlane = Math.max(farthestViewer - w, 0);
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
    updateResult(0, compute(h, fv, parseFloat(colFloors[0]) || null, pctEH));
  };

  const calcCol2 = () => {
    const fv = parseFloat(c2Farthest);
    if (!fv || fv <= 0) return;
    const { h, minE } = resolveFromFarthest(fv, parseFloat(c2MinElem) || 0);
    updateResult(1, compute(h, fv, parseFloat(colFloors[1]) || null, minE));
  };

  const calcCol3 = () => {
    const fv = parseFloat(c3Farthest);
    const h = parseFloat(c3ImageH);
    if (!fv || fv <= 0 || !h || h <= 0) return;
    const pctEH = (fv / h) / 2;
    updateResult(2, compute(h, fv, parseFloat(colFloors[2]) || null, pctEH));
  };

  const reset = () => {
    setC1ImageH(''); setC1MinElem('');
    setC2Farthest(''); setC2MinElem('');
    setC3Farthest(''); setC3ImageH('');
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

        {/* ── Left column ── */}
        <div style={{ flex: 1, minWidth: 0, paddingRight: 32 }}>

          {/* BASE PARAMETERS */}
          <div className="mb-5 rounded-xl border border-border bg-forge-surface/50 p-4">
            <SectionHeader icon={<TableProperties size={13} className="text-blue-400" />} title="Base Parameters" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">
                  Standard Eye Level <span className="font-normal normal-case opacity-60">(use consistent units)</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number" value={eyeLevel}
                    onChange={e => setEyeLevel(parseFloat(e.target.value) || 0)}
                    className={inputCls}
                  />
                  <span className="text-xs text-subtle">in</span>
                </div>
                <div className="mt-1 text-[10px] text-faint">48" seated / 60" standing</div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">
                  Image Aspect Ratio <span className="font-normal normal-case opacity-60">(as X.XX)</span>
                </label>
                <input
                  type="number" value={aspectRatio} step={0.01}
                  onChange={e => setAspectRatio(parseFloat(e.target.value) || 0)}
                  className={inputCls + ' mb-1.5'}
                />
                <div className="flex flex-wrap gap-1">
                  {presets.map((p, i) => (
                    <button key={i} onClick={() => setAspectRatio(p.val)}
                      className="rounded px-2 py-0.5 text-[10px] transition-colors"
                      style={{
                        background: Math.abs(aspectRatio - p.val) < 0.01 ? 'rgba(59,130,246,0.15)' : 'rgb(var(--forge-surface) / 0.5)',
                        border: '1px solid ' + (Math.abs(aspectRatio - p.val) < 0.01 ? 'rgba(59,130,246,0.4)' : 'rgb(var(--border))'),
                        color: Math.abs(aspectRatio - p.val) < 0.01 ? '#60a5fa' : 'rgb(var(--text-subtle))',
                      }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ADDITIONAL PARAMETERS & CALCULATIONS */}
          <div className="rounded-xl border border-border bg-forge-surface/50 p-4">
            <SectionHeader icon={<Calculator size={13} className="text-blue-400" />} title="Additional Parameters & Calculations" />
            <p className="mb-3 text-[11px] text-subtle">
              Choose a card based on what value you need to solve. All outputs use the same units as your inputs.
            </p>

            <div className="grid grid-cols-3 gap-3">

              {/* Card 1: Find Farthest Viewer */}
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-forge-surface/50 p-3.5">
                <div>
                  <div className="text-[13px] font-bold text-body">Find Farthest Viewer</div>
                  <div className="mt-0.5 text-[11px] text-subtle">Required inputs</div>
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted">Image Height</label>
                    <input type="number" value={c1ImageH} onChange={e => setC1ImageH(e.target.value)} placeholder="Enter value" className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted">Min Element Height %</label>
                    <input type="number" value={c1MinElem} onChange={e => setC1MinElem(e.target.value)} placeholder="Enter value" className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted">
                      Bottom of Image Height <span className="opacity-50">(optional)</span>
                    </label>
                    <input type="number" value={colFloors[0]} onChange={e => updateFloor(0, e.target.value)} placeholder="Enter value"
                      className={inputCls + ' border-dashed'} />
                  </div>
                </div>
                <button onClick={calcCol1}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-blue-500">
                  <Calculator size={12} /> Calculate
                </button>
                <div className="flex items-center justify-between border-t border-border pt-2">
                  <span className="text-[12px] font-medium text-muted">Farthest Viewer</span>
                  <span className="font-mono text-[14px] font-bold text-body">{colResults[0] ? fmt(colResults[0].farthestViewer) : '—'}</span>
                </div>
                {colResults[0] ? (
                  <div className="divide-y divide-border border-t border-border">
                    <ResultRow label="Closest Viewer" value={fmt(colResults[0].closestViewer)} />
                    <ResultRow label="Max CV Plane" value={fmt(colResults[0].maxCVPlane)} />
                    <ResultRow label="Image Width" value={fmt(colResults[0].imageW)} />
                    <ResultRow label="Image Diagonal" value={fmt(colResults[0].imageDiag)} />
                    <ResultRow label="Viewing Ratio" value={fmt(colResults[0].viewingRatio)} />
                    <ResultRow label="Min Element Ht %" value={fmt(colResults[0].minElemH) + '%'} />
                  </div>
                ) : (
                  <p className="text-[10px] italic text-faint">More results shown after calculation</p>
                )}
              </div>

              {/* Card 2: Find Min Image Height */}
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-forge-surface/50 p-3.5">
                <div>
                  <div className="text-[13px] font-bold text-body">Find Min Image Height</div>
                  <div className="mt-0.5 text-[11px] text-subtle">Required inputs</div>
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted">Farthest Viewer</label>
                    <input type="number" value={c2Farthest} onChange={e => setC2Farthest(e.target.value)} placeholder="Enter value" className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted">Min Element Height %</label>
                    <input type="number" value={c2MinElem} onChange={e => setC2MinElem(e.target.value)} placeholder="Enter value" className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted">
                      Bottom of Image Height <span className="opacity-50">(optional)</span>
                    </label>
                    <input type="number" value={colFloors[1]} onChange={e => updateFloor(1, e.target.value)} placeholder="Enter value"
                      className={inputCls + ' border-dashed'} />
                  </div>
                </div>
                <button onClick={calcCol2}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-blue-500">
                  <Calculator size={12} /> Calculate
                </button>
                <div className="flex items-center justify-between border-t border-border pt-2">
                  <span className="text-[12px] font-medium text-muted">Min Image Height</span>
                  <span className="font-mono text-[14px] font-bold text-body">{colResults[1] ? fmt(colResults[1].imageH) : '—'}</span>
                </div>
                {colResults[1] ? (
                  <div className="divide-y divide-border border-t border-border">
                    <ResultRow label="Closest Viewer" value={fmt(colResults[1].closestViewer)} />
                    <ResultRow label="Max CV Plane" value={fmt(colResults[1].maxCVPlane)} />
                    <ResultRow label="Image Width" value={fmt(colResults[1].imageW)} />
                    <ResultRow label="Image Diagonal" value={fmt(colResults[1].imageDiag)} />
                    <ResultRow label="Viewing Ratio" value={fmt(colResults[1].viewingRatio)} />
                    <ResultRow label="Min Element Ht %" value={fmt(colResults[1].minElemH) + '%'} />
                  </div>
                ) : (
                  <p className="text-[10px] italic text-faint">More results shown after calculation</p>
                )}
              </div>

              {/* Card 3: Find Min % Element Height */}
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-forge-surface/50 p-3.5">
                <div>
                  <div className="text-[13px] font-bold text-body">Find Min % Element Height</div>
                  <div className="mt-0.5 text-[11px] text-subtle">Required inputs</div>
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted">Image Height</label>
                    <input type="number" value={c3ImageH} onChange={e => setC3ImageH(e.target.value)} placeholder="Enter value" className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted">Farthest Viewer</label>
                    <input type="number" value={c3Farthest} onChange={e => setC3Farthest(e.target.value)} placeholder="Enter value" className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted">
                      Bottom of Image Height <span className="opacity-50">(optional)</span>
                    </label>
                    <input type="number" value={colFloors[2]} onChange={e => updateFloor(2, e.target.value)} placeholder="Enter value"
                      className={inputCls + ' border-dashed'} />
                  </div>
                </div>
                <button onClick={calcCol3}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-blue-500">
                  <Calculator size={12} /> Calculate
                </button>
                <div className="flex items-center justify-between border-t border-border pt-2">
                  <span className="text-[12px] font-medium text-muted">Min Element Height %</span>
                  <span className="font-mono text-[14px] font-bold text-body">{colResults[2] ? fmt(colResults[2].minElemH) + '%' : '—'}</span>
                </div>
                {colResults[2] ? (
                  <div className="divide-y divide-border border-t border-border">
                    <ResultRow label="Closest Viewer" value={fmt(colResults[2].closestViewer)} />
                    <ResultRow label="Max CV Plane" value={fmt(colResults[2].maxCVPlane)} />
                    <ResultRow label="Image Width" value={fmt(colResults[2].imageW)} />
                    <ResultRow label="Image Diagonal" value={fmt(colResults[2].imageDiag)} />
                    <ResultRow label="Viewing Ratio" value={fmt(colResults[2].viewingRatio)} />
                    <ResultRow label="Farthest Viewer" value={fmt(colResults[2].farthestViewer)} />
                  </div>
                ) : (
                  <p className="text-[10px] italic text-faint">More results shown after calculation</p>
                )}
              </div>

            </div>

            <div className="mt-4">
              <button onClick={reset}
                className="flex items-center gap-1.5 rounded-md border border-red-500/25 bg-red-500/10 px-4 py-1.5 text-[11px] font-semibold text-red-400 transition-colors hover:bg-red-500/20">
                <RotateCcw size={11} /> Reset All
              </button>
            </div>
          </div>

        </div>

        {/* ── Vertical divider ── */}
        <div style={{ width: 1, background: 'rgb(var(--border))', flexShrink: 0 }} />

        {/* ── Right column: AVIXA Reference ── */}
        <div style={{ width: 675, flexShrink: 0, paddingLeft: 32 }}>
          <div className="rounded-xl border border-border bg-forge-surface/50 p-4">
          <SectionHeader icon={<BookOpen size={13} className="text-blue-400" />} title="AVIXA DISCAS Reference" />

          <div className="mb-4 space-y-2 text-[12px] leading-relaxed text-subtle">
            <div>
              <span className="font-semibold text-muted">Key Formula: </span>
              Image Height = Farthest Viewer ÷ (2 × %Element Height)
            </div>
            <div>
              <span className="font-semibold text-muted">Viewing Ratio: </span>
              VR = 2 × %Element Height &nbsp;|&nbsp; VR = Farthest Viewer ÷ Image Height
            </div>
            <div>
              <span className="font-semibold text-muted">Closest Viewer: </span>
              Based on 30° max vertical viewing angle above eye level
            </div>
          </div>

          <table className="w-full border-collapse text-[12px]" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr className="border-b-2 border-border">
                <th className="px-2 py-2 text-center font-semibold text-muted">Min VR</th>
                <th className="px-2 py-2 text-center font-semibold text-muted">Max VR</th>
                <th className="px-2 py-2 text-center font-semibold text-muted">Min %EH</th>
              </tr>
            </thead>
            <tbody>
              {[[0.8,1,0.5],[1,1.5,0.75],[1.5,2,1],[2,3,1.5],[3,4,2],[4,5,2.5],[5,6,3],[6,7,3.5],[7,8,4],[8,9,4.5],[9,10,5]].map((r, i) => (
                <tr key={i} className="border-b border-border" style={{ background: i % 2 === 0 ? 'transparent' : 'rgb(var(--forge-surface) / 0.4)' }}>
                  <td className="px-2 py-1.5 text-center text-body">{r[0].toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-center text-body">{r[1].toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-center font-semibold text-blue-400">{r[2].toFixed(2)}%</td>
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
