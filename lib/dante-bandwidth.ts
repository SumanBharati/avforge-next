// Dante / AES67 bandwidth & flow-planning calculations.
//
// This is a planning/design estimator, not a packet-capture-accurate model.
// The core figure — ~1.5 Mbps per audio channel at 48 kHz/24-bit — is
// Audinate's own published rule-of-thumb for native Dante audio ("Dante
// Information for Network Administrators"), scaled here for other sample
// rates/bit depths. AES67 is calculated separately from real RTP/UDP/IP/
// Ethernet framing since it is not native-Dante unicast traffic.

export type DanteTransport = "unicast" | "multicast" | "aes67";

// ─── Documented planning constants ─────────────────────────────────────────

// Audinate's published planning figure for native Dante audio at 48 kHz/
// 24-bit is ~1.5 Mbps per audio channel (~6 Mbps for a full 4-channel
// unicast flow). Treat this as a rule-of-thumb for AV network design, not
// an exact measurement — real traffic varies slightly with packet timing.
export const BASELINE_MBPS_PER_CHANNEL_48K_24BIT = 1.5;

// A native Dante unicast flow carries up to 4 audio channels to one
// receiving device (Audinate, "Dante Information for Network Administrators").
export const UNICAST_CHANNELS_PER_FLOW = 4;

// Audinate's Dante Controller documentation (RTP Config tab) lists AES67
// interoperability support for up to 8 channels per AES67 flow at 48/96 kHz,
// subject to the specific Dante device's own capability.
export const AES67_CHANNELS_PER_FLOW = 8;

// Conservative AV-network design headroom — the traffic level we plan a
// link for, not a hard protocol ceiling Audinate mandates. Keeping planned
// utilization at or under this line leaves headroom for bursts, other
// traffic sharing the link, and imprecision in a planning estimate.
export const DESIGN_UTILIZATION = 0.7;

// RTP/UDP/IPv4/Ethernet framing overhead, used to convert AES67's raw PCM
// payload into actual on-the-wire bandwidth.
export const RTP_HEADER_BYTES = 12;
export const UDP_HEADER_BYTES = 8;
export const IPV4_HEADER_BYTES = 20;
export const ETHERNET_HEADER_BYTES = 18; // 14 (dst/src MAC + EtherType) + 4 (FCS)
export const ETHERNET_L1_OVERHEAD_BYTES = 20; // 8 preamble/SFD + 12 interframe gap

export const AES67_PACKET_TIMES_MS = [0.25, 0.333, 1] as const;

// Candidate uplink/trunk capacities a busy Dante/AES67 network segment might
// need. A "10 GbE" recommendation describes what the switch uplink/trunk
// should support — not necessarily what an individual Dante endpoint's own
// NIC provides, which is determined by that specific device.
export const LINK_CAPACITIES_MBPS: { label: string; mbps: number }[] = [
  { label: "1 GbE", mbps: 1000 },
  { label: "2.5 GbE", mbps: 2500 },
  { label: "5 GbE", mbps: 5000 },
  { label: "10 GbE", mbps: 10000 },
];

// ─── Core formulas ──────────────────────────────────────────────────────────

// Scales Audinate's 48 kHz/24-bit planning figure linearly with sample rate
// and bit depth (e.g. 96 kHz/24-bit ≈ 3 Mbps/channel, 48 kHz/16-bit ≈ 1 Mbps).
export function estimateMbpsPerChannel(sampleRateHz: number, bitDepth: number): number {
  const sampleRateFactor = sampleRateHz / 48000;
  const bitDepthFactor = bitDepth / 24;
  return BASELINE_MBPS_PER_CHANNEL_48K_24BIT * sampleRateFactor * bitDepthFactor;
}

// A flow is a container for up to 4 channels — not another copy of all
// selected channels. Each unicast destination needs its own set of flows
// (Dante fanout), so N receivers subscribing to the same channels need N×
// as many transmit flows, not N× the per-receiver bandwidth folded into one.
export function calculateUnicastFlows(channels: number, receivers: number) {
  const safeReceivers = Math.max(1, Math.round(receivers) || 1);
  const flowsPerReceiver = Math.ceil(Math.max(0, channels) / UNICAST_CHANNELS_PER_FLOW);
  return { flowsPerReceiver, totalTransmitFlows: flowsPerReceiver * safeReceivers };
}

// AES67 is RTP multicast, not native-Dante unicast — it must not reuse the
// 4-channel unicast-flow rule. Splits channels across AES67_CHANNELS_PER_FLOW
// -sized flows (Audinate's documented per-flow limit at 48/96 kHz) and sums
// each flow's real RTP/UDP/IP/Ethernet framing overhead, rather than just
// scaling one flow's bandwidth by flow count.
export function calculateAes67Bandwidth(
  channels: number,
  sampleRateHz: number,
  bitDepth: number,
  packetTimeMs: number
): { flows: number; mbps: number } {
  const totalChannels = Math.max(0, channels);
  const flows = Math.max(1, Math.ceil(totalChannels / AES67_CHANNELS_PER_FLOW));
  const samplesPerPacket = sampleRateHz * (packetTimeMs / 1000);
  const bytesPerSample = bitDepth / 8;
  const packetsPerSecond = 1000 / packetTimeMs;

  let remaining = totalChannels;
  let totalBits = 0;
  for (let i = 0; i < flows; i++) {
    const channelsInFlow = Math.min(AES67_CHANNELS_PER_FLOW, remaining);
    remaining -= channelsInFlow;
    const payloadBytes = channelsInFlow * samplesPerPacket * bytesPerSample;
    const frameBytes =
      payloadBytes + RTP_HEADER_BYTES + UDP_HEADER_BYTES + IPV4_HEADER_BYTES +
      ETHERNET_HEADER_BYTES + ETHERNET_L1_OVERHEAD_BYTES;
    totalBits += frameBytes * 8 * packetsPerSecond;
  }
  return { flows, mbps: totalBits / 1e6 };
}

// Smallest link (from LINK_CAPACITIES_MBPS) that keeps the given traffic at
// or under DESIGN_UTILIZATION — falls back to the largest tier if traffic
// exceeds even that at the design margin.
export function recommendLink(mbps: number) {
  for (const link of LINK_CAPACITIES_MBPS) {
    if (mbps <= link.mbps * DESIGN_UTILIZATION) return link;
  }
  return LINK_CAPACITIES_MBPS[LINK_CAPACITIES_MBPS.length - 1];
}

// ─── Top-level calculation ──────────────────────────────────────────────────

export interface DanteBandwidthInput {
  transport: DanteTransport;
  channels: number;
  sampleRateHz: number;
  bitDepth: number;
  /** Ignored for multicast/AES67 — additional receivers don't multiply source traffic. */
  receivers: number;
  redundant: boolean;
  /** AES67 only; defaults to 1 ms. */
  aes67PacketTimeMs?: number;
}

export interface DanteBandwidthResult {
  mbpsPerChannel: number;
  /** Unicast only. */
  flowsPerReceiver: number | null;
  totalTransmitFlows: number | null;
  /** AES67 only. */
  aes67Flows: number | null;
  /** Per-destination bandwidth for unicast; equals primaryMbps for multicast/AES67. */
  bandwidthPerReceiver: number;
  /** Traffic on the Primary network/interface. */
  primaryMbps: number;
  /** Traffic on the Secondary network/interface — 0 unless redundant. */
  secondaryMbps: number;
  /** Primary + Secondary combined — NOT a single-link utilization figure. */
  aggregateMbps: number;
  primaryUtilizationPercent: number;
  secondaryUtilizationPercent: number;
  recommendedLink: { label: string; mbps: number };
  /** Unicast with >2 receivers — suggest considering multicast instead. */
  showFanoutAdvisory: boolean;
}

export function calculateDanteBandwidth(input: DanteBandwidthInput): DanteBandwidthResult {
  const { transport, redundant } = input;
  const channels = Math.max(0, input.channels || 0);
  const receivers = Math.max(1, Math.round(input.receivers) || 1);
  const mbpsPerChannel = estimateMbpsPerChannel(input.sampleRateHz, input.bitDepth);

  let flowsPerReceiver: number | null = null;
  let totalTransmitFlows: number | null = null;
  let aes67Flows: number | null = null;
  let bandwidthPerReceiver: number;
  let primaryMbps: number;

  if (transport === "unicast") {
    const flows = calculateUnicastFlows(channels, receivers);
    flowsPerReceiver = flows.flowsPerReceiver;
    totalTransmitFlows = flows.totalTransmitFlows;
    // Bandwidth follows the actual channel count, not flows rounded up to
    // the nearest multiple of 4 — a half-full flow doesn't cost as much as
    // a full one.
    bandwidthPerReceiver = channels * mbpsPerChannel;
    primaryMbps = bandwidthPerReceiver * receivers;
  } else if (transport === "aes67") {
    const packetTimeMs = input.aes67PacketTimeMs ?? 1;
    const aes = calculateAes67Bandwidth(channels, input.sampleRateHz, input.bitDepth, packetTimeMs);
    aes67Flows = aes.flows;
    bandwidthPerReceiver = aes.mbps;
    primaryMbps = aes.mbps; // multicast — receivers don't multiply source traffic
  } else {
    // multicast
    bandwidthPerReceiver = channels * mbpsPerChannel;
    primaryMbps = bandwidthPerReceiver;
  }

  const secondaryMbps = redundant ? primaryMbps : 0;
  const aggregateMbps = primaryMbps + secondaryMbps;
  // Primary and Secondary are separate networks — size the recommendation
  // to whichever one is busiest, never their sum.
  const busiestLinkMbps = Math.max(primaryMbps, secondaryMbps);
  const recommendedLink = recommendLink(busiestLinkMbps);
  const primaryUtilizationPercent = (primaryMbps / recommendedLink.mbps) * 100;
  const secondaryUtilizationPercent = redundant ? (secondaryMbps / recommendedLink.mbps) * 100 : 0;
  const showFanoutAdvisory = transport === "unicast" && receivers > 2;

  return {
    mbpsPerChannel,
    flowsPerReceiver,
    totalTransmitFlows,
    aes67Flows,
    bandwidthPerReceiver,
    primaryMbps,
    secondaryMbps,
    aggregateMbps,
    primaryUtilizationPercent,
    secondaryUtilizationPercent,
    recommendedLink,
    showFanoutAdvisory,
  };
}

// Formats a Mbps figure without implying false precision — "~96" rather
// than "96.0000". Sub-10 Mbps values keep one decimal (e.g. "~7.5") since
// that resolution is meaningful at that scale; larger values round to a
// whole number.
export function formatMbps(mbps: number): string {
  if (!Number.isFinite(mbps) || mbps <= 0) return "0";
  const rounded = mbps >= 10 ? Math.round(mbps) : Math.round(mbps * 10) / 10;
  return `~${rounded}`;
}
