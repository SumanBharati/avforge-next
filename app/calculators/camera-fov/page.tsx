'use client';

import { useState } from 'react';
import { CalcSection, CalcPageWrapper, InputField } from '@/components/calc';

const CAMERAS = [
  { id: 'nc-12x80', name: 'Q-SYS NC-12×80', mfr: 'QSC', zoom: '12× Optical', sensor: '4K', hfovWide: 80, hfovZoom: 7.44, mount: 'Wall/Ceiling PTZ', poe: 'PoE+', output: 'HDMI / SDI / Q-LAN' },
  { id: 'nc-20x60', name: 'Q-SYS NC-20×60', mfr: 'QSC', zoom: '20× Optical', sensor: '4K', hfovWide: 60, hfovZoom: 3.44, mount: 'Wall/Ceiling PTZ', poe: 'PoE+', output: 'HDMI / SDI / Q-LAN' },
];

interface FovDiagramProps {
  hfovWide: number;
  hfovZoom?: number;
  widthWide: number;
  widthZoom?: number;
  distance: number;
  unit: string;
  accent?: 'blue' | 'violet';
}

function FovPlanDiagram({ hfovWide, hfovZoom, widthWide, widthZoom, distance, unit, accent = 'blue' }: FovDiagramProps) {
  const W = 340, H = 160;
  const camX = 32, camY = H / 2;
  const endX = W - 70; // leave room for width labels on right

  const distPx = endX - camX;
  const wideHalfTan = Math.tan((hfovWide / 2) * Math.PI / 180);
  const maxHalfPx = H / 2 - 16;
  const scale = Math.min(maxHalfPx / (wideHalfTan * distPx), 1);

  const wideHalfPx = wideHalfTan * distPx * scale;
  const zoomHalfPx = hfovZoom
    ? Math.tan((hfovZoom / 2) * Math.PI / 180) * distPx * scale
    : null;

  const col = accent === 'violet' ? '#a78bfa' : '#60a5fa';
  const wideFill = accent === 'violet' ? 'rgba(139,92,246,0.07)' : 'rgba(59,130,246,0.07)';
  const zoomFill = accent === 'violet' ? 'rgba(139,92,246,0.20)' : 'rgba(59,130,246,0.20)';
  const dimCol = 'rgba(148,163,184,0.45)';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '50%', height: 'auto', display: 'block' }}>

      {/* Wide FOV cone */}
      <polygon
        points={`${camX},${camY} ${endX},${camY - wideHalfPx} ${endX},${camY + wideHalfPx}`}
        fill={wideFill}
        stroke={col}
        strokeWidth="1.5"
        strokeOpacity="0.4"
      />

      {/* Zoom FOV cone (on top, stronger) */}
      {zoomHalfPx !== null && (
        <polygon
          points={`${camX},${camY} ${endX},${camY - zoomHalfPx} ${endX},${camY + zoomHalfPx}`}
          fill={zoomFill}
          stroke={col}
          strokeWidth="1.5"
        />
      )}

      {/* Center dashed axis */}
      <line x1={camX} y1={camY} x2={endX} y2={camY}
        stroke={col} strokeWidth="1" strokeDasharray="6,4" strokeOpacity="0.3" />

      {/* Distance arrow line */}
      <line x1={camX} y1={camY + wideHalfPx + 10} x2={endX} y2={camY + wideHalfPx + 10}
        stroke={dimCol} strokeWidth="1" markerEnd="url(#arr)" />
      <line x1={camX} y1={camY + wideHalfPx + 7} x2={camX} y2={camY + wideHalfPx + 13}
        stroke={dimCol} strokeWidth="1" />
      <line x1={endX} y1={camY + wideHalfPx + 7} x2={endX} y2={camY + wideHalfPx + 13}
        stroke={dimCol} strokeWidth="1" />
      <text x={(camX + endX) / 2} y={camY + wideHalfPx + 22}
        textAnchor="middle" fontSize="9" fill={dimCol} fontFamily="monospace">
        {distance} {unit}
      </text>

      {/* Wide FOV width bracket at far end */}
      <line x1={endX + 3} y1={camY - wideHalfPx} x2={endX + 3} y2={camY + wideHalfPx}
        stroke={dimCol} strokeWidth="1" />
      <line x1={endX} y1={camY - wideHalfPx} x2={endX + 7} y2={camY - wideHalfPx}
        stroke={dimCol} strokeWidth="1" />
      <line x1={endX} y1={camY + wideHalfPx} x2={endX + 7} y2={camY + wideHalfPx}
        stroke={dimCol} strokeWidth="1" />
      <text x={endX + 11} y={camY + 3}
        fontSize="11" fill={col} fontFamily="monospace" fontWeight="600" opacity="0.75">
        {widthWide.toFixed(1)}
      </text>
      <text x={endX + 11} y={camY + 14}
        fontSize="9" fill={dimCol} fontFamily="monospace">
        {unit} wide
      </text>

      {/* Zoom FOV width bracket (inside, inset) */}
      {zoomHalfPx !== null && widthZoom !== undefined && (
        <>
          <line x1={endX - 5} y1={camY - zoomHalfPx} x2={endX - 5} y2={camY + zoomHalfPx}
            stroke={col} strokeWidth="1" strokeOpacity="0.7" />
          <line x1={endX - 9} y1={camY - zoomHalfPx} x2={endX - 1} y2={camY - zoomHalfPx}
            stroke={col} strokeWidth="1" strokeOpacity="0.7" />
          <line x1={endX - 9} y1={camY + zoomHalfPx} x2={endX - 1} y2={camY + zoomHalfPx}
            stroke={col} strokeWidth="1" strokeOpacity="0.7" />
          <text x={endX - 12} y={camY - zoomHalfPx - 4}
            textAnchor="end" fontSize="9" fill={col} fontFamily="monospace" opacity="0.85">
            {widthZoom.toFixed(1)} {unit} zoom
          </text>
        </>
      )}

      {/* Wide HFOV angle label */}
      <text x={camX + 18} y={camY - wideHalfPx * 0.48}
        fontSize="11" fill={col} fontFamily="monospace" fontWeight="700" opacity="0.9">
        {hfovWide}°
      </text>
      <text x={camX + 18} y={camY - wideHalfPx * 0.48 + 13}
        fontSize="9" fill={dimCol} fontFamily="monospace">
        wide
      </text>

      {/* Zoom HFOV angle label */}
      {zoomHalfPx !== null && hfovZoom !== undefined && (
        <>
          <text x={camX + 18} y={camY - zoomHalfPx * 0.55}
            fontSize="10" fill={col} fontFamily="monospace" fontWeight="600" opacity="0.75">
            {hfovZoom.toFixed(1)}°
          </text>
          <text x={camX + 18} y={camY - zoomHalfPx * 0.55 + 12}
            fontSize="9" fill={dimCol} fontFamily="monospace" opacity="0.7">
            zoom
          </text>
        </>
      )}

      {/* Camera body */}
      <rect x={camX - 16} y={camY - 9} width={16} height={18} rx="2"
        fill="rgba(15,23,42,0.85)" stroke="rgba(148,163,184,0.55)" strokeWidth="1.5" />
      {/* Viewfinder bump */}
      <rect x={camX - 12} y={camY - 14} width={8} height={5} rx="1"
        fill="rgba(15,23,42,0.85)" stroke="rgba(148,163,184,0.55)" strokeWidth="1.2" />
      {/* Lens circle */}
      <circle cx={camX - 8} cy={camY} r="4"
        fill="rgba(30,41,59,0.9)" stroke="rgba(148,163,184,0.5)" strokeWidth="1" />
      <circle cx={camX - 8} cy={camY} r="2" fill="rgba(96,165,250,0.3)" />

    </svg>
  );
}

export default function CameraFOVPage() {
  const [distance, setDistance] = useState(20);
  const [unit, setUnit] = useState<'ft' | 'm'>('ft');
  const [selectedCams, setSelectedCams] = useState(['nc-12x80', 'nc-20x60']);

  // Custom camera state
  const [customActive, setCustomActive] = useState(false);
  const [customHfovWide, setCustomHfovWide] = useState(70);
  const [customVfovWide, setCustomVfovWide] = useState(40);
  const [customVfovAuto, setCustomVfovAuto] = useState(true);
  const [customHfovZoom, setCustomHfovZoom] = useState(0);
  const [customVfovZoom, setCustomVfovZoom] = useState(0);
  const [customVfovZoomAuto, setCustomVfovZoomAuto] = useState(true);

  const calcFOV = (hfovDeg: number, dist: number, vfovDeg?: number) => {
    const hRad = (hfovDeg / 2) * Math.PI / 180;
    const w = 2 * dist * Math.tan(hRad);
    let h: number;
    if (vfovDeg !== undefined) {
      const vRad = (vfovDeg / 2) * Math.PI / 180;
      h = 2 * dist * Math.tan(vRad);
    } else {
      const vRad = Math.atan(Math.tan(hRad) * 9 / 16);
      h = 2 * dist * Math.tan(vRad);
    }
    return { w: Math.round(w * 10) / 10, h: Math.round(h * 10) / 10 };
  };

  const toggleCam = (id: string) => {
    setSelectedCams(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const activeCams = CAMERAS.filter(c => selectedCams.includes(c.id));
  const hasZoom = customHfovZoom > 0;
  const totalResults = activeCams.length + (customActive ? 1 : 0);

  return (
    <CalcPageWrapper title="Camera FOV Calculator" desc="Field of view at distance — Q-SYS NC series and custom cameras">
      <CalcSection title="Camera Selection">
        <div className="flex flex-wrap gap-1.5">
          {CAMERAS.map(cam => {
            const active = selectedCams.includes(cam.id);
            return (
              <button key={cam.id} onClick={() => toggleCam(cam.id)}
                className="rounded-lg px-3.5 py-2 text-left text-xs transition-all"
                style={{ background: active ? 'rgba(59,130,246,0.12)' : 'rgb(var(--forge-surface) / 0.5)', border: '1px solid ' + (active ? 'rgba(59,130,246,0.4)' : 'rgb(var(--border))'), color: active ? '#60a5fa' : 'rgb(var(--text-muted))' }}>
                <div className="mb-0.5 font-semibold">{cam.name}</div>
                <div className="opacity-70">{cam.zoom} · {cam.hfovWide}° HFOV · {cam.sensor}</div>
              </button>
            );
          })}
          <button onClick={() => setCustomActive(v => !v)}
            className="rounded-lg px-3.5 py-2 text-left text-xs transition-all"
            style={{ background: customActive ? 'rgba(139,92,246,0.12)' : 'rgb(var(--forge-surface) / 0.5)', border: '1px solid ' + (customActive ? 'rgba(139,92,246,0.4)' : 'rgb(var(--border))'), color: customActive ? '#a78bfa' : 'rgb(var(--text-muted))' }}>
            <div className="mb-0.5 font-semibold">Custom Camera</div>
            <div className="opacity-70">Enter HFOV · VFOV · any lens</div>
          </button>
        </div>

        {customActive && (
          <div className="mt-3 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] px-4 py-4">
            <div className="mb-3 text-[11px] uppercase tracking-[0.06em] text-violet-400/80">Custom Camera Parameters</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-0">
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Wide / Full</div>
                <InputField label="HFOV Wide" value={customHfovWide} onChange={setCustomHfovWide} unit="°" min={1} max={180} />
                <div className="mb-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[12px] text-muted">VFOV Wide</span>
                    <button
                      onClick={() => setCustomVfovAuto(v => !v)}
                      className={`rounded px-2 py-0.5 text-[10px] font-semibold transition-colors ${customVfovAuto ? 'bg-blue-500/20 text-blue-400' : 'bg-forge-surface text-subtle'}`}
                    >
                      Auto 16:9
                    </button>
                  </div>
                  {!customVfovAuto ? (
                    <InputField label="" value={customVfovWide} onChange={setCustomVfovWide} unit="°" min={1} max={180} />
                  ) : (
                    <div className="rounded-md border border-border bg-forge-surface/50 px-3 py-2 font-mono text-[13px] text-subtle">
                      {(Math.atan(Math.tan((customHfovWide / 2) * Math.PI / 180) * 9 / 16) * 2 * 180 / Math.PI).toFixed(1)}° (derived)
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Zoom (optional)</div>
                <InputField label="HFOV Zoom" value={customHfovZoom} onChange={setCustomHfovZoom} unit="°" min={0} max={180} />
                <div className="mb-1 text-[10px] text-subtle">Set to 0 to disable zoom row</div>
                {hasZoom && (
                  <div className="mt-2">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[12px] text-muted">VFOV Zoom</span>
                      <button
                        onClick={() => setCustomVfovZoomAuto(v => !v)}
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold transition-colors ${customVfovZoomAuto ? 'bg-blue-500/20 text-blue-400' : 'bg-forge-surface text-subtle'}`}
                      >
                        Auto 16:9
                      </button>
                    </div>
                    {!customVfovZoomAuto ? (
                      <InputField label="" value={customVfovZoom} onChange={setCustomVfovZoom} unit="°" min={1} max={180} />
                    ) : (
                      <div className="rounded-md border border-border bg-forge-surface/50 px-3 py-2 font-mono text-[13px] text-subtle">
                        {(Math.atan(Math.tan((customHfovZoom / 2) * Math.PI / 180) * 9 / 16) * 2 * 180 / Math.PI).toFixed(1)}° (derived)
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CalcSection>

      <CalcSection title="Distance from Camera to Subject">
        <div className="mb-2 flex items-center gap-3">
          <span className="min-w-[60px] text-center font-mono text-2xl font-semibold text-blue-400">{distance}</span>
          <div className="flex-1">
            <input type="range" min={1} max={80} step={0.5} value={distance} onChange={e => setDistance(parseFloat(e.target.value))}
              className="w-full cursor-pointer accent-blue-500" />
            <div className="mt-0.5 flex justify-between text-[10px] text-faint">
              <span>1</span><span>20</span><span>40</span><span>60</span><span>80</span>
            </div>
          </div>
          <select value={unit} onChange={e => setUnit(e.target.value as 'ft' | 'm')}
            className="rounded-md border border-border bg-forge-surface px-2.5 py-1.5 text-[13px] text-body outline-none">
            <option value="ft">feet</option>
            <option value="m">meters</option>
          </select>
        </div>
        <div className="text-center text-xs text-subtle">All distances in {unit === 'ft' ? 'feet' : 'meters'}</div>
      </CalcSection>

      {totalResults > 0 && (
        <CalcSection title="Field of View Results">
          <div className={`grid gap-4 ${totalResults > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>

            {activeCams.map(cam => {
              const wide = calcFOV(cam.hfovWide, distance);
              const zoom = calcFOV(cam.hfovZoom, distance);
              return (
                <div key={cam.id} className="overflow-hidden rounded-xl border border-border bg-forge-surface/50">
                  <div className="border-b border-border bg-blue-500/[0.06] px-4 py-3">
                    <div className="font-mono text-base font-bold text-body">{cam.name.split(' ').pop()}</div>
                    <div className="mt-0.5 text-[10px] text-subtle">{cam.mfr} · {cam.zoom} · {cam.sensor} sensor</div>
                  </div>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="border-b border-border px-3.5 py-2 text-left text-[10px] font-semibold uppercase text-subtle"></th>
                        <th className="border-b border-border px-2.5 py-2 text-center text-[10px] font-semibold uppercase text-subtle">Width</th>
                        <th className="border-b border-border px-2.5 py-2 text-center text-[10px] font-semibold uppercase text-subtle">Height</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border-b border-border px-3.5 py-2 text-xs font-medium text-muted">Full Wide</td>
                        <td className="border-b border-border px-2.5 py-2 text-center font-mono text-lg font-semibold text-body">{wide.w.toFixed(1)}</td>
                        <td className="border-b border-border px-2.5 py-2 text-center font-mono text-lg font-semibold text-body">{wide.h.toFixed(1)}</td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-2 text-xs font-medium text-muted">Full Zoom</td>
                        <td className="px-2.5 py-2 text-center font-mono text-lg font-semibold text-blue-400">{zoom.w.toFixed(1)}</td>
                        <td className="px-2.5 py-2 text-center font-mono text-lg font-semibold text-blue-400">{zoom.h.toFixed(1)}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Plan view diagram */}
                  <div className="border-t border-border bg-forge-surface/30 px-2 pb-1 pt-2">
                    <div className="mb-1 px-2 text-[10px] uppercase tracking-wide text-subtle">Plan View (top-down)</div>
                    <FovPlanDiagram
                      hfovWide={cam.hfovWide}
                      hfovZoom={cam.hfovZoom}
                      widthWide={wide.w}
                      widthZoom={zoom.w}
                      distance={distance}
                      unit={unit}
                      accent="blue"
                    />
                  </div>

                  <div className="border-t border-border px-3.5 py-2 text-[10px] text-faint">
                    {cam.hfovWide}° wide → {cam.hfovZoom.toFixed(1)}° zoom · {cam.output}
                  </div>
                </div>
              );
            })}

            {customActive && (() => {
              const vfovWideResolved = customVfovAuto ? undefined : customVfovWide;
              const vfovZoomResolved = customVfovZoomAuto ? undefined : customVfovZoom;
              const wide = calcFOV(customHfovWide, distance, vfovWideResolved);
              const zoom = hasZoom ? calcFOV(customHfovZoom, distance, vfovZoomResolved) : null;
              const derivedVfovWide = (Math.atan(Math.tan((customHfovWide / 2) * Math.PI / 180) * 9 / 16) * 2 * 180 / Math.PI).toFixed(1);
              return (
                <div className="overflow-hidden rounded-xl border border-violet-500/30 bg-forge-surface/50">
                  <div className="border-b border-violet-500/20 bg-violet-500/[0.06] px-4 py-3">
                    <div className="font-mono text-base font-bold text-body">Custom Camera</div>
                    <div className="mt-0.5 text-[10px] text-subtle">
                      HFOV {customHfovWide}° · VFOV {customVfovAuto ? `${derivedVfovWide}° (16:9)` : `${customVfovWide}°`}
                      {hasZoom ? ` · Zoom ${customHfovZoom}°` : ''}
                    </div>
                  </div>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="border-b border-border px-3.5 py-2 text-left text-[10px] font-semibold uppercase text-subtle"></th>
                        <th className="border-b border-border px-2.5 py-2 text-center text-[10px] font-semibold uppercase text-subtle">Width</th>
                        <th className="border-b border-border px-2.5 py-2 text-center text-[10px] font-semibold uppercase text-subtle">Height</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className={zoom ? 'border-b border-border' : ''}>
                        <td className={`px-3.5 py-2 text-xs font-medium text-muted ${zoom ? 'border-b border-border' : ''}`}>Wide</td>
                        <td className={`px-2.5 py-2 text-center font-mono text-lg font-semibold text-body ${zoom ? 'border-b border-border' : ''}`}>{wide.w.toFixed(1)}</td>
                        <td className={`px-2.5 py-2 text-center font-mono text-lg font-semibold text-body ${zoom ? 'border-b border-border' : ''}`}>{wide.h.toFixed(1)}</td>
                      </tr>
                      {zoom && (
                        <tr>
                          <td className="px-3.5 py-2 text-xs font-medium text-muted">Zoom</td>
                          <td className="px-2.5 py-2 text-center font-mono text-lg font-semibold text-violet-400">{zoom.w.toFixed(1)}</td>
                          <td className="px-2.5 py-2 text-center font-mono text-lg font-semibold text-violet-400">{zoom.h.toFixed(1)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Plan view diagram */}
                  <div className="border-t border-violet-500/15 bg-violet-500/[0.03] px-2 pb-1 pt-2">
                    <div className="mb-1 px-2 text-[10px] uppercase tracking-wide text-subtle">Plan View (top-down)</div>
                    <FovPlanDiagram
                      hfovWide={customHfovWide}
                      hfovZoom={hasZoom ? customHfovZoom : undefined}
                      widthWide={wide.w}
                      widthZoom={zoom?.w}
                      distance={distance}
                      unit={unit}
                      accent="violet"
                    />
                  </div>

                  <div className="border-t border-border px-3.5 py-2 text-[10px] text-faint">
                    HFOV {customHfovWide}° wide{hasZoom ? ` → ${customHfovZoom}° zoom` : ''} · custom lens
                  </div>
                </div>
              );
            })()}

          </div>
        </CalcSection>
      )}
    </CalcPageWrapper>
  );
}
