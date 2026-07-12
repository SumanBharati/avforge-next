import Link from 'next/link';
import React from 'react';

const VideoWallIcon = () => (
  <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
    <rect x="0"    y="0"    width="9" height="9" rx="1" fill="#8b5cf6" />
    <rect x="10.5" y="0"    width="9" height="9" rx="1" fill="#8b5cf6" />
    <rect x="21"   y="0"    width="9" height="9" rx="1" fill="#8b5cf6" />
    <rect x="0"    y="10.5" width="9" height="9" rx="1" fill="#8b5cf6" />
    <rect x="10.5" y="10.5" width="9" height="9" rx="1" fill="#8b5cf6" />
    <rect x="21"   y="10.5" width="9" height="9" rx="1" fill="#8b5cf6" />
    <rect x="0"    y="21"   width="9" height="9" rx="1" fill="#8b5cf6" />
    <rect x="10.5" y="21"   width="9" height="9" rx="1" fill="#8b5cf6" />
    <rect x="21"   y="21"   width="9" height="9" rx="1" fill="#8b5cf6" />
  </svg>
);

const DisplaySizingIcon = () => (
  <svg width="30" height="30" viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
    {/* Monitor body */}
    <rect x="2" y="2" width="96" height="62" rx="4" fill="#1a2035" stroke="#1a2035" strokeWidth="3" />
    {/* Screen */}
    <rect x="7" y="7" width="86" height="52" rx="2" fill="#22d3ee" />
    {/* Screen shine */}
    <polygon points="15,10 40,10 20,37" fill="#67e8f9" opacity="0.45" />
    <polygon points="22,10 35,10 18,28" fill="white" opacity="0.18" />
    {/* Stand neck */}
    <rect x="44" y="64" width="12" height="8" rx="1" fill="#1a2035" />
    {/* Stand base */}
    <rect x="30" y="72" width="40" height="6" rx="3" fill="#1a2035" />
    {/* Diagonal arrow line */}
    <line x1="22" y1="52" x2="72" y2="14" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
    {/* Arrow head top-right */}
    <polygon points="72,14 60,16 68,24" fill="#0f172a" />
    {/* Arrow head bottom-left */}
    <polygon points="22,52 34,50 26,42" fill="#0f172a" />
  </svg>
);

const ConnectorIcon = () => (
  <svg width="30" height="30" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
    {/* HDMI-style connector body */}
    <path d="M4 10 h24 v7 l-4 5 H8 l-4 -5 Z" fill="#1a2035" />
    <path d="M6.5 12.5 h19 v4.5 l-3 3.5 H9.5 l-3 -3.5 Z" fill="#8b5cf6" />
    {/* Pins */}
    {[9.5, 12.5, 15.5, 18.5, 21.5].map(x => (
      <rect key={x} x={x} y={13.5} width={1.6} height={4} rx={0.6} fill="#ede9fe" />
    ))}
    {/* Cable */}
    <rect x="14" y="4" width="4" height="6" rx="1.5" fill="#1a2035" />
  </svg>
);

export default function CalculatorsPage() {
  const calculators: { id: string; name: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'display-sizing',   name: 'Display Sizing',     icon: <DisplaySizingIcon />, desc: 'Image height and viewer distance' },
    { id: 'screen-size',      name: 'Aspect Ratio to Display Size Converter', icon: '📐', desc: 'Aspect ratio and diagonal computation' },
    { id: 'camera-fov',       name: 'Camera FOV',         icon: '📷', desc: 'Camera Field of View Calculator' },
    { id: 'projector-throw',   name: 'Projector Throw',    icon: '📽️', desc: 'Throw ratio, lens type, and image dimensions' },
    { id: 'projector-lumens', name: 'Projector Lumens',   icon: '💡', desc: 'Required lumens based on screen size and room' },
    { id: 'led-pitch',        name: 'LED Pixel Pitch',    icon: <VideoWallIcon />, desc: 'Optimal viewing distance for LED walls' },
    { id: 'speaker-coverage', name: 'Speaker Coverage',   icon: '🔊', desc: 'EPR-based speaker aiming calculator' },
    { id: 'speaker-wire',     name: 'Speaker Wire Gauge', icon: '🔧', desc: 'NEC/AVIXA minimum AWG for any speaker run' },
    { id: 'pag-nag',          name: 'PAG / NAG',          icon: '🎤', desc: 'Potential acoustic gain stability' },
    { id: '70v-tap',          name: '70V Tap',            icon: '⚡', desc: 'Transformer tap and wattage calculator' },
    { id: 'conduit-fill',     name: 'Conduit Fill',       icon: '🔌', desc: 'NEC conduit fill with jam ratio check' },
    { id: 'rack-heat',        name: 'Rack Heat Load',     icon: '🌡️', desc: 'BTU/hr thermal calculation' },
    { id: 'unit-converter',   name: 'Unit Converter',     icon: '🔄', desc: 'AV-specific unit conversions' },
    { id: 'connectors',       name: 'Connectors & Cables', icon: <ConnectorIcon />, desc: 'Pinouts, versions & resolution reference' },
    { id: 'standards',        name: 'Formula Sheet',      icon: '📐', desc: 'AVIXA / CTS-D engineering formulas with examples' },
    { id: 'poe-database',     name: 'PoE Device Database', icon: '📦', desc: 'Per-device PoE class and draw reference' },
    { id: 'poe-budget',       name: 'PoE Budget',         icon: '🔋', desc: 'IEEE af/at/bt power budgeting' },
    { id: 'dante-bandwidth',  name: 'Dante Bandwidth',    icon: '📶', desc: 'Per-flow Dante/AES67 bandwidth' },
  ];

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8">
      <h2 style={{ fontSize: 22, marginBottom: 4, fontWeight: 600 }} className="text-heading">Calculators</h2>
      <p style={{ fontSize: 14, marginBottom: 28 }} className="text-subtle">
        Interactive tools with live results and INFOCOMM standard references
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
        {calculators.map((calc) => (
          <Link
            key={calc.id}
            href={`/calculators/${calc.id}`}
            className="forge-card text-left"
            style={{ minHeight: 130, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}
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
