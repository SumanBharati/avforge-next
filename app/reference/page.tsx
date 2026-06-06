import Link from "next/link";

export default function ReferencePage() {
  const refs = [
    { id: "standards",    name: "Formula Sheet",        icon: "📐", desc: "AVIXA / CTS-D engineering formulas with examples" },
    { id: "poe-database", name: "PoE Device Database",  icon: "📦", desc: "Per-device PoE class and draw reference" },
  ];

  return (
    <div className="animate-fade-in p-8">
      <h2 style={{ fontSize: 22, marginBottom: 4, fontWeight: 600 }} className="text-heading">Reference Library</h2>
      <p style={{ fontSize: 14, marginBottom: 28 }} className="text-subtle">Standards, formulas, and device databases</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
        {refs.map((ref) => (
          <Link
            key={ref.id}
            href={`/reference/${ref.id}`}
            className="forge-card"
            style={{ width: 'calc(20% - 13px)', minHeight: 130, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}
          >
            <div style={{ fontSize: 30, marginBottom: 12 }}>{ref.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }} className="text-body">{ref.name}</div>
            <div style={{ fontSize: 13 }} className="text-subtle">{ref.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
