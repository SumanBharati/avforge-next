import Link from 'next/link';
import React from 'react';

const VideoWallIcon = () => (
  <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
    <rect x="0"    y="0"    width="9" height="9" rx="1" fill="#3b82f6" />
    <rect x="10.5" y="0"    width="9" height="9" rx="1" fill="#3b82f6" />
    <rect x="21"   y="0"    width="9" height="9" rx="1" fill="#3b82f6" />
    <rect x="0"    y="10.5" width="9" height="9" rx="1" fill="#3b82f6" />
    <rect x="10.5" y="10.5" width="9" height="9" rx="1" fill="#3b82f6" />
    <rect x="21"   y="10.5" width="9" height="9" rx="1" fill="#3b82f6" />
    <rect x="0"    y="21"   width="9" height="9" rx="1" fill="#3b82f6" />
    <rect x="10.5" y="21"   width="9" height="9" rx="1" fill="#3b82f6" />
    <rect x="21"   y="21"   width="9" height="9" rx="1" fill="#3b82f6" />
  </svg>
);

export default function CalculatorsPage() {
  const calculators: { id: string; name: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'display-sizing',   name: 'Display Sizing',     icon: '📺', desc: 'DISCAS-based image height and viewer distance' },
    { id: 'screen-size',      name: 'Aspect Ratio to Display Size Converter', icon: '📐', desc: 'Aspect ratio and diagonal computation' },
    { id: 'camera-fov',       name: 'Camera FOV',         icon: '📷', desc: 'Camera Field of View Calculator' },
    { id: 'throw-ratio',      name: 'Throw & Lumens',     icon: '📽️', desc: 'Projector Throw and Lumens calculator' },
    { id: 'led-pitch',        name: 'LED Pixel Pitch',    icon: <VideoWallIcon />, desc: 'Optimal viewing distance for LED walls' },
    { id: 'speaker-coverage', name: 'Speaker Coverage',   icon: '🔊', desc: 'EPR-based speaker aiming calculator' },
    { id: 'speaker-wire',     name: 'Speaker Wire Gauge', icon: '🔧', desc: 'NEC/AVIXA minimum AWG for any speaker run' },
    { id: 'pag-nag',          name: 'PAG / NAG',          icon: '🎤', desc: 'Potential acoustic gain stability' },
    { id: '70v-tap',          name: '70V Tap',            icon: '⚡', desc: 'Transformer tap and wattage calculator' },
    { id: 'conduit-fill',     name: 'Conduit Fill',       icon: '🔌', desc: 'NEC conduit fill with jam ratio check' },
    { id: 'poe-budget',       name: 'PoE Budget',         icon: '🔋', desc: 'IEEE af/at/bt power budgeting' },
    { id: 'dante-bandwidth',  name: 'Dante Bandwidth',    icon: '📶', desc: 'Per-flow Dante/AES67 bandwidth' },
    { id: 'rack-heat',        name: 'Rack Heat Load',     icon: '🌡️', desc: 'BTU/hr thermal calculation' },
    { id: 'unit-converter',   name: 'Unit Converter',     icon: '🔄', desc: 'AV-specific unit conversions' },
    { id: 'standards',        name: 'Formula Sheet',      icon: '📐', desc: 'AVIXA / CTS-D engineering formulas with examples' },
    { id: 'poe-database',     name: 'PoE Device Database', icon: '📦', desc: 'Per-device PoE class and draw reference' },
  ];

  return (
    <div className="animate-fade-in p-8">
      <h2 style={{ fontSize: 22, marginBottom: 4, fontWeight: 600 }} className="text-heading">Calculators</h2>
      <p style={{ fontSize: 14, marginBottom: 28 }} className="text-subtle">
        Interactive tools with live results and INFOCOMM standard references
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
        {calculators.map((calc) => (
          <Link
            key={calc.id}
            href={`/calculators/${calc.id}`}
            className="forge-card text-left"
            style={{ width: 'calc(20% - 13px)', minHeight: 130, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}
          >
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 30, fontSize: 30 }}>{calc.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }} className="text-body">
              {calc.name}
            </div>
            <div style={{ fontSize: 13 }} className="text-subtle">{calc.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
