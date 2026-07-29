import Link from 'next/link';
import React from 'react';

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

const PolarPatternIcon = () => (
  <svg width="30" height="30" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
    <line x1="16" y1="2" x2="16" y2="30" stroke="#64748b" strokeWidth="1" />
    <line x1="2" y1="16" x2="30" y2="16" stroke="#64748b" strokeWidth="1" />
    <path d="M16 16 C7 2 30 3 28 16 C30 29 7 30 16 16Z" fill="rgba(34,211,238,.25)" stroke="#22d3ee" strokeWidth="1.5" />
    <circle cx="16" cy="16" r="2" fill="#f97316" />
  </svg>
);

const ResolutionIcon = () => (
  <svg width="30" height="30" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
    <rect x="3" y="5" width="26" height="20" rx="2" fill="#1a2035" />
    <rect x="6" y="8" width="20" height="14" rx="1" fill="#8b5cf6" />
    <path d="M9 19 L23 10 M9 19 L9 14 M9 19 L14 19 M23 10 L18 10 M23 10 L23 15" fill="none" stroke="#ede9fe" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="13" y="25" width="6" height="3" fill="#1a2035" />
  </svg>
);

export default function ReferencesPage() {
  const references: { id: string; name: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'connectors',       name: 'Connectors & Cables', icon: <ConnectorIcon />, desc: 'Pinouts, versions, and field wiring' },
    { id: 'microphone-polar-patterns', name: 'Microphone Polar Patterns', icon: <PolarPatternIcon />, desc: 'Pickup direction and rejection reference' },
    { id: 'resolution-reference', name: 'Resolution Reference', icon: <ResolutionIcon />, desc: 'Computed aspect ratios and megapixels' },
    { id: 'standards',        name: 'Formula Sheet',      icon: '📐', desc: 'AVIXA / CTS-D engineering formulas with examples' },
  ];

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8">
      <h2 style={{ fontSize: 22, marginBottom: 4, fontWeight: 600 }} className="text-heading">References</h2>
      <p style={{ fontSize: 14, marginBottom: 28 }} className="text-subtle">
        Lookup tables and standards for pinouts, polar patterns, and resolutions
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
        {references.map((ref) => (
          <Link
            key={ref.id}
            href={`/calculators/${ref.id}`}
            className="forge-card text-left"
            style={{ minHeight: 130, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}
          >
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 30, fontSize: 30 }}>{ref.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }} className="text-body">
              {ref.name}
            </div>
            <div style={{ fontSize: 13 }} className="text-subtle">{ref.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
