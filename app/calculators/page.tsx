import Link from 'next/link';

export default function CalculatorsPage() {
  const calculators = [
    { id: 'display-sizing',   name: 'Display Sizing',     icon: '📺', desc: 'DISCAS-based image height and viewer distance' },
    { id: 'screen-size',      name: 'Screen Size',        icon: '📐', desc: 'Aspect ratio and diagonal computation' },
    { id: 'camera-fov',       name: 'Camera FOV',         icon: '📷', desc: 'Q-SYS NC series integration' },
    { id: 'throw-ratio',      name: 'Throw Ratio',        icon: '🎯', desc: 'Projector throw distance calculator' },
    { id: 'led-pitch',        name: 'LED Pixel Pitch',    icon: '💡', desc: 'Optimal viewing distance for LED walls' },
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
            <div style={{ fontSize: 30, marginBottom: 12 }}>{calc.icon}</div>
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
