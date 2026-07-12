'use client';
import React from 'react';
import { useBOM, BOMSource } from '@/lib/bom-context';

const SOURCE_META: Record<BOMSource, { label: string; color: string }> = {
  'signal-flow':    { label: 'SIG',  color: '#8b5cf6' },
  'room-designer':  { label: 'ROOM', color: '#22c55e' },
  'rack-builder':   { label: 'RACK', color: '#a855f7' },
};

interface BOMPanelProps {
  collapsed: boolean;
  onToggle: () => void;
  /** Optional slot rendered below the Equipment Schedule table (e.g. device-specific controls for Room Designer) */
  propertiesSlot?: React.ReactNode;
}

export default function BOMPanel({ collapsed, onToggle, propertiesSlot }: BOMPanelProps) {
  const { bomItems, prices, totalQty, totalCost, setPrice } = useBOM();

  return (
    <div style={{
      width: collapsed ? 44 : 360,
      background: 'rgb(var(--forge-panel))',
      borderLeft: '1px solid rgb(var(--border))',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flexShrink: 0,
      transition: 'width 0.2s',
    }}>
      {/* Header */}
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid rgb(var(--border))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
          flexShrink: 0,
        }}
        onClick={onToggle}
      >
        {!collapsed && (
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgb(var(--text-body))' }}>
            Bill of Materials{' '}
            <span style={{ fontSize: 11, fontWeight: 400, color: 'rgb(var(--text-subtle))' }}>
              ({totalQty})
            </span>
          </span>
        )}
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="rgb(var(--text-subtle))" strokeWidth={2.5}
          strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      {!collapsed && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Equipment Schedule */}
          {bomItems.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'rgb(var(--text-subtle))', fontSize: 12 }}>
              Add devices in any design tool to generate BOM
            </div>
          ) : (
            <div>
              <div style={{ padding: '10px 14px 6px', fontSize: 10, fontWeight: 700, color: 'rgb(var(--text-subtle))', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Equipment Schedule
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>
                    <th style={{ ...thSt, textAlign: 'left', paddingLeft: 10 }}>#</th>
                    <th style={{ ...thSt, textAlign: 'left' }}>Device</th>
                    <th style={thSt}>Mfr</th>
                    <th style={thSt}>Qty</th>
                    <th style={{ ...thSt, textAlign: 'right' }}>Unit $</th>
                    <th style={{ ...thSt, textAlign: 'right', paddingRight: 10 }}>Ext $</th>
                  </tr>
                </thead>
                <tbody>
                  {bomItems.map((item, i) => {
                    const unitPrice = prices[item.name] !== undefined ? prices[item.name] : item.listPrice;
                    const extPrice = unitPrice * item.qty;
                    return (
                      <tr key={item.name} style={{ background: i % 2 === 0 ? 'transparent' : 'rgb(var(--forge-surface) / 0.3)' }}>
                        <td style={{ ...tdSt, paddingLeft: 10, color: 'rgb(var(--text-subtle))' }}>{i + 1}</td>
                        <td style={{ ...tdSt, padding: '6px 10px' }}>
                          <div style={{ color: 'rgb(var(--text-body))', fontWeight: 500, fontSize: 11 }}>{item.name}</div>
                          <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
                            {item.sources.map(src => (
                              <span key={src} style={{
                                fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 3,
                                background: SOURCE_META[src].color + '22',
                                color: SOURCE_META[src].color,
                                letterSpacing: '0.04em',
                              }}>
                                {SOURCE_META[src].label}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ ...tdSt, textAlign: 'center', color: 'rgb(var(--text-muted))', fontSize: 10 }}>
                          {item.mfr || '—'}
                        </td>
                        <td style={{ ...tdSt, textAlign: 'center' }}>
                          <span style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6', padding: '2px 8px', borderRadius: 10, fontWeight: 600, fontSize: 11 }}>
                            {item.qty}
                          </span>
                        </td>
                        <td style={{ ...tdSt, textAlign: 'right' }}>
                          <input
                            type="number"
                            value={unitPrice}
                            onChange={e => setPrice(item.name, parseFloat(e.target.value) || 0)}
                            style={{ width: 60, padding: '3px 5px', background: 'rgb(var(--forge-surface))', border: '1px solid rgb(var(--border))', borderRadius: 4, color: 'rgb(var(--text-body))', fontSize: 10, fontFamily: "'JetBrains Mono',monospace", textAlign: 'right', outline: 'none' }}
                          />
                        </td>
                        <td style={{ ...tdSt, textAlign: 'right', paddingRight: 10, color: extPrice > 0 ? '#a78bfa' : '#475569', fontFamily: "'JetBrains Mono',monospace", fontWeight: 500 }}>
                          {extPrice > 0 ? '$' + extPrice.toLocaleString() : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} style={{ padding: '8px 10px', fontWeight: 700, color: 'rgb(var(--text-body))', fontSize: 11, borderTop: '2px solid rgb(var(--border))' }}>TOTAL</td>
                    <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 700, color: 'rgb(var(--text-body))', fontSize: 11, borderTop: '2px solid rgb(var(--border))' }}>{totalQty}</td>
                    <td style={{ borderTop: '2px solid rgb(var(--border))' }} />
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#8b5cf6', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, borderTop: '2px solid rgb(var(--border))' }}>
                      {'$' + totalCost.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Source legend */}
          {bomItems.length > 0 && (
            <div style={{ padding: '10px 14px', borderTop: '1px solid rgb(var(--border))', marginTop: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {(['signal-flow', 'room-designer', 'rack-builder'] as BOMSource[]).map(src => (
                <span key={src} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, color: 'rgb(var(--text-subtle))' }}>
                  <span style={{ width: 6, height: 6, borderRadius: 2, background: SOURCE_META[src].color, display: 'inline-block', opacity: 0.8 }} />
                  {SOURCE_META[src].label} = {src.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
              ))}
            </div>
          )}

          {/* Tool-specific properties slot (e.g. Room Designer HFOV controls) */}
          {propertiesSlot && (
            <div style={{ borderTop: '1px solid rgb(var(--border))' }}>
              {propertiesSlot}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const thSt: React.CSSProperties = {
  padding: '6px 6px',
  textAlign: 'center',
  color: 'rgb(var(--text-subtle))',
  borderBottom: '1px solid rgb(var(--border))',
  fontWeight: 600,
  fontSize: 9,
  textTransform: 'uppercase',
};

const tdSt: React.CSSProperties = {
  padding: '6px 6px',
  borderBottom: '1px solid rgb(var(--border))',
  color: 'rgb(var(--text-body))',
};
