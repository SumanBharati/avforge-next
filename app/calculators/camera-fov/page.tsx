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

  const midX = (camX + endX) / 2;
  const dimY = camY + wideHalfPx + 12;
  const wMidY = camY;
  const labelGap = 26; // half-width of text gap in dimension line

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '60%', height: 'auto', display: 'block' }}>
      <defs>
        {/* Right-pointing arrowhead; auto-start-reverse flips it at markerStart */}
        <marker id={`arr-${accent}`} markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto-start-reverse">
          <path d="M0,0 L8,3 L0,6 Z" fill={dimCol} />
        </marker>
      </defs>

      {/* Wide FOV cone */}
      <polygon
        points={`${camX},${camY} ${endX},${camY - wideHalfPx} ${endX},${camY + wideHalfPx}`}
        fill={wideFill} stroke={col} strokeWidth="1.5" strokeOpacity="0.4"
      />

      {/* Zoom FOV cone */}
      {zoomHalfPx !== null && (
        <polygon
          points={`${camX},${camY} ${endX},${camY - zoomHalfPx} ${endX},${camY + zoomHalfPx}`}
          fill={zoomFill} stroke={col} strokeWidth="1.5"
        />
      )}

      {/* Center dashed axis */}
      <line x1={camX} y1={camY} x2={endX} y2={camY}
        stroke={col} strokeWidth="1" strokeDasharray="6,4" strokeOpacity="0.3" />

      {/* ── Distance dimension ── */}
      {/* Extension ticks */}
      <line x1={camX} y1={dimY - 5} x2={camX} y2={dimY + 5} stroke={dimCol} strokeWidth="1" />
      <line x1={endX} y1={dimY - 5} x2={endX} y2={dimY + 5} stroke={dimCol} strokeWidth="1" />
      {/* Left half with ← arrow */}
      <line x1={camX} y1={dimY} x2={midX - labelGap} y2={dimY}
        stroke={dimCol} strokeWidth="1" markerStart={`url(#arr-${accent})`} />
      {/* Right half with → arrow */}
      <line x1={midX + labelGap} y1={dimY} x2={endX} y2={dimY}
        stroke={dimCol} strokeWidth="1" markerEnd={`url(#arr-${accent})`} />
      {/* Label */}
      <text x={midX} y={dimY + 4} textAnchor="middle" fontSize="9" fill={dimCol} fontFamily="monospace">
        {distance} {unit}
      </text>

      {/* ── Width dimension (vertical, right of cone) ── */}
      {/* Extension ticks */}
      <line x1={endX + 4} y1={camY - wideHalfPx} x2={endX + 14} y2={camY - wideHalfPx} stroke={dimCol} strokeWidth="1" />
      <line x1={endX + 4} y1={camY + wideHalfPx} x2={endX + 14} y2={camY + wideHalfPx} stroke={dimCol} strokeWidth="1" />
      {/* Full vertical line with ↑↓ arrows */}
      <line x1={endX + 9} y1={camY - wideHalfPx} x2={endX + 9} y2={camY + wideHalfPx}
        stroke={dimCol} strokeWidth="1"
        markerStart={`url(#arr-${accent})`} markerEnd={`url(#arr-${accent})`} />
      {/* Label to the right of the line, vertically centered */}
      <text x={endX + 16} y={wMidY + 4} textAnchor="start" fontSize="9" fill={dimCol} fontFamily="monospace">
        {parseFloat(widthWide.toFixed(1))} {unit}
      </text>

      {/* ── Zoom width dimension (inset, if zoom active) ── */}
      {zoomHalfPx !== null && widthZoom !== undefined && (
        <>
          <line x1={endX - 8} y1={camY - zoomHalfPx} x2={endX - 2} y2={camY - zoomHalfPx} stroke={col} strokeWidth="1" strokeOpacity="0.6" />
          <line x1={endX - 8} y1={camY + zoomHalfPx} x2={endX - 2} y2={camY + zoomHalfPx} stroke={col} strokeWidth="1" strokeOpacity="0.6" />
          <line x1={endX - 5} y1={camY - zoomHalfPx} x2={endX - 5} y2={camY + zoomHalfPx}
            stroke={col} strokeWidth="1" strokeOpacity="0.6"
            markerStart={`url(#arr-${accent})`} markerEnd={`url(#arr-${accent})`} />
          <text x={endX - 12} y={wMidY + 4} textAnchor="end" fontSize="9" fill={dimCol} fontFamily="monospace">
            {parseFloat(widthZoom.toFixed(1))} {unit}
          </text>
        </>
      )}

      {/* HFOV angle label */}
      <text x={camX + 18} y={camY - wideHalfPx * 0.48}
        fontSize="11" fill={col} fontFamily="monospace" fontWeight="700" opacity="0.9">
        {hfovWide}°
      </text>
      <text x={camX + 18} y={camY - wideHalfPx * 0.48 + 13}
        fontSize="9" fill={dimCol} fontFamily="monospace">
        wide
      </text>

      {/* Camera body — rotated 90° clockwise around its center */}
      <g transform={`rotate(90, ${camX - 8}, ${camY})`}>
        <rect x={camX - 16} y={camY - 9} width={16} height={18} rx="2"
          fill="rgba(15,23,42,0.85)" stroke="rgba(148,163,184,0.55)" strokeWidth="1.5" />
        <rect x={camX - 12} y={camY - 14} width={8} height={5} rx="1"
          fill="rgba(15,23,42,0.85)" stroke="rgba(148,163,184,0.55)" strokeWidth="1.2" />
      </g>

    </svg>
  );
}

export default function CameraFOVPage() {
  const [distance, setDistance] = useState(20);
  const [unit, setUnit] = useState<'ft' | 'm'>('ft');
  const [selectedCam, setSelectedCam] = useState<string>('custom');
  const [presetZoom, setPresetZoom] = useState(1);

  const customActive = selectedCam === 'custom';
  const [customHfovWide, setCustomHfovWide] = useState(70);
  const [customVfovWide, setCustomVfovWide] = useState(40);
  const [customVfovAuto, setCustomVfovAuto] = useState(true);
  const [customHfovZoom, setCustomHfovZoom] = useState(0);

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

  const activeCam = CAMERAS.find(c => c.id === selectedCam) ?? null;
  const hasZoom = customHfovZoom > 0;
  const zoomHfovDeg = hasZoom
    ? 2 * Math.atan(Math.tan((customHfovWide / 2) * Math.PI / 180) / customHfovZoom) * 180 / Math.PI
    : 0;
  const presetMaxZoom = activeCam ? parseFloat(activeCam.zoom) : 1;
  const presetZoomHfovDeg = activeCam && presetZoom > 1
    ? 2 * Math.atan(Math.tan((activeCam.hfovWide / 2) * Math.PI / 180) / presetZoom) * 180 / Math.PI
    : null;
  const totalResults = selectedCam ? 1 : 0;

  return (
    <CalcPageWrapper title="Camera FOV Calculator" desc="Field of view at distance — Q-SYS NC series and custom cameras">
      <div className="flex gap-6">

        {/* ── Left: inputs ── */}
        <div className="min-w-0 flex-1">
          <CalcSection title="Camera Selection">
            <select
              value={selectedCam}
              onChange={e => { setSelectedCam(e.target.value); setPresetZoom(1); }}
              className="w-full rounded-md border border-border bg-forge-surface px-3 py-2 text-[13px] text-body outline-none focus:border-blue-500/40"
            >
              <option value="custom">Custom Camera — enter HFOV · VFOV · any lens</option>
              {CAMERAS.map(cam => (
                <option key={cam.id} value={cam.id}>
                  {cam.name} — {cam.zoom} · {cam.hfovWide}° HFOV · {cam.sensor}
                </option>
              ))}
            </select>

            <div className="mt-3 rounded-xl border border-border bg-forge-surface/50 px-4 py-4">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
                {customActive ? 'Custom Camera Parameters' : 'Camera Parameters'}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {/* HFOV */}
                <div>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">HFOV</div>
                  {customActive ? (
                    <InputField label="" value={customHfovWide} onChange={setCustomHfovWide} unit="°" min={1} max={180} />
                  ) : (
                    <div className="rounded-lg border border-border bg-forge-surface/30 px-3 py-2.5 font-mono text-[15px] text-subtle">
                      {activeCam?.hfovWide}°
                    </div>
                  )}
                </div>
                {/* VFOV */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">VFOV</span>
                    {customActive && (
                      <button
                        onClick={() => setCustomVfovAuto(v => !v)}
                        className={`rounded px-1.5 py-0.5 text-[9px] font-semibold transition-colors ${customVfovAuto ? 'bg-blue-500/20 text-blue-400' : 'bg-forge-surface text-subtle'}`}
                      >
                        Auto
                      </button>
                    )}
                  </div>
                  {customActive ? (
                    !customVfovAuto ? (
                      <InputField label="" value={customVfovWide} onChange={setCustomVfovWide} unit="°" min={1} max={180} />
                    ) : (
                      <div className="rounded-lg border border-border bg-forge-surface px-3 py-2.5 font-mono text-[15px] text-subtle">
                        {(Math.atan(Math.tan((customHfovWide / 2) * Math.PI / 180) * 9 / 16) * 2 * 180 / Math.PI).toFixed(1)}°
                      </div>
                    )
                  ) : (
                    <div className="rounded-lg border border-border bg-forge-surface/30 px-3 py-2.5 font-mono text-[15px] text-subtle">
                      {activeCam ? (Math.atan(Math.tan((activeCam.hfovWide / 2) * Math.PI / 180) * 9 / 16) * 2 * 180 / Math.PI).toFixed(1) : '—'}°
                    </div>
                  )}
                </div>
                {/* ZOOM */}
                <div>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Zoom</div>
                  {customActive ? (
                    <InputField label="" value={customHfovZoom} onChange={setCustomHfovZoom} unit="×" min={0} max={200} />
                  ) : (
                    <InputField label="" value={presetZoom} onChange={v => setPresetZoom(Math.min(Math.max(1, v), presetMaxZoom))} unit="×" min={1} max={presetMaxZoom} step={0.5} />
                  )}
                  {!customActive && (
                    <div className="mt-1 text-[10px] text-subtle">1× = wide · max {presetMaxZoom}×</div>
                  )}
                </div>
              </div>
            </div>
          </CalcSection>

          <CalcSection title="Distance from Camera to Subject">
            <div className="mb-2 flex items-center gap-3">
              <span className="min-w-[48px] text-center font-mono text-2xl font-semibold text-body">{distance}</span>
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
          </CalcSection>
        </div>

        {/* ── Vertical divider ── */}
        <div style={{ width: 1, background: 'rgb(var(--border))', flexShrink: 0 }} />

        {/* ── Right: results ── */}
        <div className="min-w-0 flex-1">
          {totalResults > 0 && (
            <CalcSection title="Field of View Results">

              {activeCam && (() => {
                const cam = activeCam;
                const wide = calcFOV(cam.hfovWide, distance);
                const zoomed = presetZoomHfovDeg ? calcFOV(presetZoomHfovDeg, distance) : null;
                return (
                  <div key={cam.id} className="overflow-hidden rounded-xl border border-border bg-forge-surface/50">
                    <div className="border-b border-border bg-forge-surface/80 px-4 py-3">
                      <div className="font-mono text-base font-bold text-body">{cam.name}</div>
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
                        <tr className={zoomed ? 'border-b border-border' : ''}>
                          <td className={`px-3.5 py-2 text-xs font-medium text-muted ${zoomed ? 'border-b border-border' : ''}`}>Wide</td>
                          <td className={`px-2.5 py-2 text-center font-mono text-lg font-semibold text-body ${zoomed ? 'border-b border-border' : ''}`}>{wide.w.toFixed(1)}</td>
                          <td className={`px-2.5 py-2 text-center font-mono text-lg font-semibold text-body ${zoomed ? 'border-b border-border' : ''}`}>{wide.h.toFixed(1)}</td>
                        </tr>
                        {zoomed && (
                          <tr>
                            <td className="px-3.5 py-2 text-xs font-medium text-muted">{presetZoom}× Zoom</td>
                            <td className="px-2.5 py-2 text-center font-mono text-lg font-semibold text-body">{zoomed.w.toFixed(1)}</td>
                            <td className="px-2.5 py-2 text-center font-mono text-lg font-semibold text-body">{zoomed.h.toFixed(1)}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    <div className="border-t border-border bg-forge-surface/30 px-2 pb-1 pt-2">
                      <div className="mb-1 px-2 text-[10px] uppercase tracking-wide text-subtle">Plan View (top-down)</div>
                      <FovPlanDiagram
                        hfovWide={cam.hfovWide} hfovZoom={presetZoomHfovDeg ?? undefined}
                        widthWide={wide.w} widthZoom={zoomed?.w}
                        distance={distance} unit={unit} accent="blue"
                      />
                    </div>
                    <div className="border-t border-border px-3.5 py-2 text-[10px] text-faint">
                      {cam.hfovWide}° wide · {cam.zoom} · {cam.output}
                    </div>
                  </div>
                );
              })()}

              {customActive && (() => {
                const vfovWideResolved = customVfovAuto ? undefined : customVfovWide;
                const wide = calcFOV(customHfovWide, distance, vfovWideResolved);
                const zoom = hasZoom ? calcFOV(zoomHfovDeg, distance) : null;
                const derivedVfovWide = (Math.atan(Math.tan((customHfovWide / 2) * Math.PI / 180) * 9 / 16) * 2 * 180 / Math.PI).toFixed(1);
                return (
                  <div className="overflow-hidden rounded-xl border border-border bg-forge-surface/50">
                    <div className="border-b border-border bg-forge-surface/80 px-4 py-3">
                      <div className="font-mono text-base font-bold text-body">Custom Camera</div>
                      <div className="mt-0.5 text-[10px] text-subtle">
                        HFOV {customHfovWide}° · VFOV {customVfovAuto ? `${derivedVfovWide}° (16:9)` : `${customVfovWide}°`}
                        {hasZoom ? ` · Zoom ${customHfovZoom}× (${zoomHfovDeg.toFixed(1)}° HFOV)` : ''}
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
                            <td className="px-2.5 py-2 text-center font-mono text-lg font-semibold text-body">{zoom.w.toFixed(1)}</td>
                            <td className="px-2.5 py-2 text-center font-mono text-lg font-semibold text-body">{zoom.h.toFixed(1)}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    <div className="border-t border-border bg-forge-surface/30 px-2 pb-1 pt-2">
                      <div className="mb-1 px-2 text-[10px] uppercase tracking-wide text-subtle">Plan View (top-down)</div>
                      <FovPlanDiagram
                        hfovWide={customHfovWide} hfovZoom={hasZoom ? zoomHfovDeg : undefined}
                        widthWide={wide.w} widthZoom={zoom?.w}
                        distance={distance} unit={unit} accent="violet"
                      />
                    </div>
                    <div className="border-t border-border px-3.5 py-2 text-[10px] text-faint">
                      HFOV {customHfovWide}° wide{hasZoom ? ` → ${customHfovZoom}× zoom (${zoomHfovDeg.toFixed(1)}°)` : ''} · custom lens
                    </div>
                  </div>
                );
              })()}

            </CalcSection>
          )}
        </div>

      </div>
    </CalcPageWrapper>
  );
}
