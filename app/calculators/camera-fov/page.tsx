'use client';

import { useState } from 'react';
import { Camera, Settings, Ruler, BarChart2 } from 'lucide-react';
import { CalcPageWrapper } from '@/components/calc';

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
  const endX = W - 70;

  const distPx = endX - camX;
  const wideHalfTan = Math.tan((hfovWide / 2) * Math.PI / 180);
  const maxHalfPx = H / 2 - 16;
  const scale = Math.min(maxHalfPx / (wideHalfTan * distPx), 1);

  const wideHalfPx = wideHalfTan * distPx * scale;
  const zoomHalfPx = hfovZoom
    ? Math.tan((hfovZoom / 2) * Math.PI / 180) * distPx * scale
    : null;

  const col = accent === 'violet' ? '#a78bfa' : '#a78bfa';
  const wideFill = accent === 'violet' ? 'rgba(139,92,246,0.07)' : 'rgba(139,92,246,0.07)';
  const zoomFill = accent === 'violet' ? 'rgba(139,92,246,0.20)' : 'rgba(139,92,246,0.20)';
  const dimCol = 'rgba(148,163,184,0.45)';

  const midX = (camX + endX) / 2;
  const dimY = camY + wideHalfPx + 12;
  const wMidY = camY;
  const labelGap = 26;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', maxHeight: 230, display: 'block' }}>
      <defs>
        <marker id={`arr-${accent}`} markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto-start-reverse">
          <path d="M0,0 L8,3 L0,6 Z" fill={dimCol} />
        </marker>
      </defs>
      <polygon
        points={`${camX},${camY} ${endX},${camY - wideHalfPx} ${endX},${camY + wideHalfPx}`}
        fill={wideFill} stroke={col} strokeWidth="1.5" strokeOpacity="0.4"
      />
      {zoomHalfPx !== null && (
        <polygon
          points={`${camX},${camY} ${endX},${camY - zoomHalfPx} ${endX},${camY + zoomHalfPx}`}
          fill={zoomFill} stroke={col} strokeWidth="1.5"
        />
      )}
      <line x1={camX} y1={camY} x2={endX} y2={camY}
        stroke={col} strokeWidth="1" strokeDasharray="6,4" strokeOpacity="0.3" />
      <line x1={camX} y1={dimY - 5} x2={camX} y2={dimY + 5} stroke={dimCol} strokeWidth="1" />
      <line x1={endX} y1={dimY - 5} x2={endX} y2={dimY + 5} stroke={dimCol} strokeWidth="1" />
      <line x1={camX} y1={dimY} x2={midX - labelGap} y2={dimY}
        stroke={dimCol} strokeWidth="1" markerStart={`url(#arr-${accent})`} />
      <line x1={midX + labelGap} y1={dimY} x2={endX} y2={dimY}
        stroke={dimCol} strokeWidth="1" markerEnd={`url(#arr-${accent})`} />
      <text x={midX} y={dimY + 4} textAnchor="middle" fontSize="9" fill={dimCol} fontFamily="monospace">
        {distance} {unit}
      </text>
      <line x1={endX + 4} y1={camY - wideHalfPx} x2={endX + 14} y2={camY - wideHalfPx} stroke={dimCol} strokeWidth="1" />
      <line x1={endX + 4} y1={camY + wideHalfPx} x2={endX + 14} y2={camY + wideHalfPx} stroke={dimCol} strokeWidth="1" />
      <line x1={endX + 9} y1={camY - wideHalfPx} x2={endX + 9} y2={camY + wideHalfPx}
        stroke={dimCol} strokeWidth="1"
        markerStart={`url(#arr-${accent})`} markerEnd={`url(#arr-${accent})`} />
      <text x={endX + 16} y={wMidY + 4} textAnchor="start" fontSize="9" fill={dimCol} fontFamily="monospace">
        {parseFloat(widthWide.toFixed(1))} {unit}
      </text>
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
      <text x={camX + 18} y={camY - wideHalfPx * 0.48}
        fontSize="11" fill={col} fontFamily="monospace" fontWeight="700" opacity="0.9">
        {hfovWide}°
      </text>
      <text x={camX + 18} y={camY - wideHalfPx * 0.48 + 13}
        fontSize="9" fill={dimCol} fontFamily="monospace">
        wide
      </text>
      <g transform={`rotate(90, ${camX - 8}, ${camY})`}>
        <rect x={camX - 16} y={camY - 9} width={16} height={18} rx="2"
          fill="rgba(15,23,42,0.85)" stroke="rgba(148,163,184,0.55)" strokeWidth="1.5" />
        <rect x={camX - 12} y={camY - 14} width={8} height={5} rx="1"
          fill="rgba(15,23,42,0.85)" stroke="rgba(148,163,184,0.55)" strokeWidth="1.2" />
      </g>
    </svg>
  );
}

const SectionIcon = ({ title }: { icon?: React.ReactNode; title: string }) => (
  <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
    {title}
  </div>
);

export default function CameraFOVPage() {
  const [distance, setDistance] = useState(20);
  const [unit, setUnit] = useState<'ft' | 'm'>('ft');
  const [selectedCam, setSelectedCam] = useState<string>('custom');
  const [presetZoom, setPresetZoom] = useState(1);
  const [customHfovWide, setCustomHfovWide] = useState(70);
  const [customVfovWide, setCustomVfovWide] = useState(40);
  const [customVfovAuto, setCustomVfovAuto] = useState(true);
  const [customHfovZoom, setCustomHfovZoom] = useState(0);

  const customActive = selectedCam === 'custom';

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

  const derivedVfov = (Math.atan(Math.tan((customHfovWide / 2) * Math.PI / 180) * 9 / 16) * 2 * 180 / Math.PI).toFixed(1);

  const inputCls = "w-full rounded-lg border border-border bg-forge-surface px-3 py-2.5 font-mono text-[15px] text-body outline-none transition-colors focus:border-blue-500/40";
  const readonlyCls = "w-full rounded-lg border border-border bg-forge-surface/30 px-3 py-2.5 font-mono text-[15px] text-subtle";
  const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted";

  const ResultCard = ({ camName, subtitle, wide, zoom, zoomLabel, hfovWide, zoomHfovArg, accent, footerText }: {
    camName: string; subtitle: string;
    wide: { w: number; h: number };
    zoom: { w: number; h: number } | null;
    zoomLabel?: string;
    hfovWide: number;
    zoomHfovArg?: number;
    accent: 'blue' | 'violet';
    footerText: string;
  }) => (
    <div className="overflow-hidden rounded-xl border border-border bg-forge-surface/50">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{camName}</div>
        <div className="text-[11px] text-subtle">{subtitle}</div>
      </div>

      {/* Stat boxes */}
      <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
        <div className="px-4 py-3">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-subtle">Width</div>
          <div>
            <span className="font-mono text-2xl font-bold text-blue-400">{wide.w.toFixed(1)}</span>
            <span className="ml-1.5 text-sm text-subtle">{unit}</span>
          </div>
          {zoom && <div className="mt-0.5 font-mono text-[12px] text-subtle">{zoom.w.toFixed(1)} {unit} <span className="text-faint">({zoomLabel})</span></div>}
        </div>
        <div className="px-4 py-3">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-subtle">Height</div>
          <div>
            <span className="font-mono text-2xl font-bold text-blue-400">{wide.h.toFixed(1)}</span>
            <span className="ml-1.5 text-sm text-subtle">{unit}</span>
          </div>
          {zoom && <div className="mt-0.5 font-mono text-[12px] text-subtle">{zoom.h.toFixed(1)} {unit} <span className="text-faint">({zoomLabel})</span></div>}
        </div>
      </div>

      {/* Plan view */}
      <div className="px-4 pb-2 pt-3">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-subtle">Plan View (Top-Down)</div>
        <FovPlanDiagram
          hfovWide={hfovWide} hfovZoom={zoomHfovArg}
          widthWide={wide.w} widthZoom={zoom?.w}
          distance={distance} unit={unit} accent={accent}
        />
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-2 text-[10px] text-faint">
        {footerText}
      </div>
    </div>
  );

  return (
    <CalcPageWrapper title="Camera FOV Calculator" desc="Field of view calculation at a distance">
      <div className="flex flex-col gap-6 lg:flex-row">

        {/* ── Left: inputs ── */}
        <div className="min-w-0 flex-1 space-y-4">

          {/* Camera Selection */}
          <div className="rounded-xl border border-border bg-forge-surface/50 p-4">
            <SectionIcon icon={<Camera size={13} />} title="Camera Selection" />
            <select
              value={selectedCam}
              onChange={e => { setSelectedCam(e.target.value); setPresetZoom(1); }}
              className="w-full rounded-md border border-border bg-forge-surface px-3 py-2 text-[13px] text-body outline-none focus:border-blue-500/40"
            >
              <option value="custom">Custom Camera — enter HFOV</option>
              {CAMERAS.map(cam => (
                <option key={cam.id} value={cam.id}>
                  {cam.name} — {cam.zoom} · {cam.hfovWide}° HFOV · {cam.sensor}
                </option>
              ))}
            </select>
          </div>

          {/* Camera Parameters */}
          <div className="rounded-xl border border-border bg-forge-surface/50 p-4">
            <SectionIcon icon={<Settings size={13} />} title={customActive ? 'Custom Camera Parameters' : 'Camera Parameters'} />
            <div className="grid grid-cols-3 gap-4">
              {/* HFOV */}
              <div>
                <label className={labelCls}>HFOV</label>
                {customActive ? (
                  <div className="flex items-center gap-1.5">
                    <input type="number" value={customHfovWide} onChange={e => setCustomHfovWide(parseFloat(e.target.value) || 0)} min={1} max={180} className={inputCls} />
                    <span className="text-sm text-subtle">°</span>
                  </div>
                ) : (
                  <div className={readonlyCls}>{activeCam?.hfovWide}°</div>
                )}
              </div>
              {/* VFOV */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-muted">VFOV</label>
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
                    <div className="flex items-center gap-1.5">
                      <input type="number" value={customVfovWide} onChange={e => setCustomVfovWide(parseFloat(e.target.value) || 0)} min={1} max={180} className={inputCls} />
                      <span className="text-sm text-subtle">°</span>
                    </div>
                  ) : (
                    <div className={readonlyCls}>{derivedVfov}°</div>
                  )
                ) : (
                  <div className={readonlyCls}>
                    {activeCam ? (Math.atan(Math.tan((activeCam.hfovWide / 2) * Math.PI / 180) * 9 / 16) * 2 * 180 / Math.PI).toFixed(1) : '—'}°
                  </div>
                )}
              </div>
              {/* ZOOM */}
              <div>
                <label className={labelCls}>Zoom</label>
                {customActive ? (
                  <div className="flex items-center gap-1.5">
                    <input type="number" value={customHfovZoom} onChange={e => setCustomHfovZoom(parseFloat(e.target.value) || 0)} min={0} max={200} className={inputCls} />
                    <span className="text-sm text-subtle">×</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5">
                      <input type="number" value={presetZoom} onChange={e => setPresetZoom(Math.min(Math.max(1, parseFloat(e.target.value) || 1), presetMaxZoom))} min={1} max={presetMaxZoom} step={0.5} className={inputCls} />
                      <span className="text-sm text-subtle">×</span>
                    </div>
                    <div className="mt-1 text-[10px] text-subtle">1× = wide · max {presetMaxZoom}×</div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Distance */}
          <div className="rounded-xl border border-border bg-forge-surface/50 p-4">
            <SectionIcon icon={<Ruler size={13} />} title="Distance from Camera to Subject" />
            <div className="flex items-center gap-3">
              <input
                type="number" value={distance} min={0} step={0.5}
                onChange={e => setDistance(parseFloat(e.target.value) || 0)}
                className={inputCls}
                style={{ maxWidth: 120 }}
              />
              <select value={unit} onChange={e => setUnit(e.target.value as 'ft' | 'm')}
                className="flex-shrink-0 rounded-md border border-border bg-forge-surface px-2.5 py-1.5 text-[13px] text-body outline-none">
                <option value="ft">feet</option>
                <option value="m">meters</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Vertical divider ── */}
        <div className="h-px w-full shrink-0 bg-border lg:h-auto lg:w-px" />

        {/* ── Right: results ── */}
        <div className="min-w-0 flex-1">
          <SectionIcon icon={<BarChart2 size={13} />} title="Field of View Results" />

          {customActive && (() => {
            const vfovWideResolved = customVfovAuto ? undefined : customVfovWide;
            const wide = calcFOV(customHfovWide, distance, vfovWideResolved);
            const zoom = hasZoom ? calcFOV(zoomHfovDeg, distance) : null;
            const subtitle = `HFOV ${customHfovWide}° · VFOV ${customVfovAuto ? `${derivedVfov}° (16:9)` : `${customVfovWide}°`}`;
            return (
              <ResultCard
                camName="Custom Camera"
                subtitle={subtitle}
                wide={wide}
                zoom={zoom}
                zoomLabel={`${customHfovZoom}× zoom`}
                hfovWide={customHfovWide}
                zoomHfovArg={hasZoom ? zoomHfovDeg : undefined}
                accent="violet"
                footerText={`HFOV ${customHfovWide}° wide${hasZoom ? ` → ${customHfovZoom}× zoom` : ''} · custom lens`}
              />
            );
          })()}

          {activeCam && (() => {
            const cam = activeCam;
            const wide = calcFOV(cam.hfovWide, distance);
            const zoom = presetZoomHfovDeg ? calcFOV(presetZoomHfovDeg, distance) : null;
            const subtitle = `HFOV ${cam.hfovWide}° · ${cam.zoom} · ${cam.sensor}`;
            return (
              <ResultCard
                camName={cam.name}
                subtitle={subtitle}
                wide={wide}
                zoom={zoom}
                zoomLabel={`${presetZoom}× zoom`}
                hfovWide={cam.hfovWide}
                zoomHfovArg={presetZoomHfovDeg ?? undefined}
                accent="blue"
                footerText={`${cam.hfovWide}° wide · ${cam.zoom} · ${cam.output}`}
              />
            );
          })()}
        </div>

      </div>
    </CalcPageWrapper>
  );
}
