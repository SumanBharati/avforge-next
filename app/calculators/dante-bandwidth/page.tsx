'use client';

import { useState } from 'react';
import { CalcSection, InputField, SelectField, ResultCard, CalcPageWrapper } from '@/components/calc';

export default function DanteBandwidthPage() {
  const [channels, setChannels] = useState(64);
  const [sampleRate, setSampleRate] = useState('48000');
  const [bitDepth, setBitDepth] = useState('24');
  const [flows, setFlows] = useState(4);
  const [redundancy, setRedundancy] = useState('yes');

  const bwPerFlow = (channels * parseInt(sampleRate) * parseInt(bitDepth) * 1.25) / 1e6;
  const totalBw = bwPerFlow * flows;
  const withRedundancy = redundancy === 'yes' ? totalBw * 2 : totalBw;
  const gigabitUtil = (withRedundancy / 1000) * 100;

  return (
    <CalcPageWrapper title="Dante Bandwidth" desc="Per-flow Dante / AES67 bandwidth calculator">
      <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>

        {/* ── Left half: Inputs ── */}
        <div style={{ flex: 1, minWidth: 0, paddingRight: 32 }}>
          <CalcSection title="Inputs">
            <InputField label="Audio Channels" value={channels} onChange={setChannels} unit="ch" min={1} max={512} />
            <SelectField label="Sample Rate" value={sampleRate} onChange={setSampleRate} options={[
              { value: '44100', label: '44.1 kHz' },
              { value: '48000', label: '48 kHz' },
              { value: '96000', label: '96 kHz' },
            ]} />
            <SelectField label="Bit Depth" value={bitDepth} onChange={setBitDepth} options={[
              { value: '16', label: '16-bit' },
              { value: '24', label: '24-bit' },
              { value: '32', label: '32-bit' },
            ]} />
            <InputField label="Dante Flows" value={flows} onChange={setFlows} unit="" min={1} max={32} />
            <SelectField label="Redundant Network" value={redundancy} onChange={setRedundancy} options={[
              { value: 'yes', label: 'Yes — Primary + Secondary' },
              { value: 'no', label: 'No — Single Network' },
            ]} />
          </CalcSection>
        </div>

        {/* ── Vertical divider ── */}
        <div style={{ width: 1, background: 'rgb(var(--border))', flexShrink: 0 }} />

        {/* ── Right half: Results ── */}
        <div style={{ flex: 1, minWidth: 0, paddingLeft: 32 }}>
          <CalcSection title="Results">
            <div className="grid grid-cols-2 gap-2.5">
              <ResultCard label="BW Per Flow" value={bwPerFlow.toFixed(2)} unit="Mbps" accent />
              <ResultCard label="Total Bandwidth" value={withRedundancy.toFixed(2)} unit="Mbps" accent />
              <ResultCard label="Gigabit Utilization" value={gigabitUtil.toFixed(1)} unit="%" />
              <ResultCard label="Recommended Link" value={gigabitUtil > 70 ? '10G' : '1G'} unit="" />
            </div>
          </CalcSection>
        </div>

      </div>
    </CalcPageWrapper>
  );
}
