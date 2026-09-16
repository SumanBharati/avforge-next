// Verifies the Dante Bandwidth calculator rewrite (lib/dante-bandwidth.ts).
//
// The previous calculator computed "bandwidth per flow" as the raw PCM
// bitrate of ALL entered channels, multiplied that by a user-typed "Dante
// Flows" count, then doubled it again for redundancy — treating a flow as
// another full copy of every channel, and Primary+Secondary as if they
// shared one link. For 64ch/48kHz/24-bit/4 flows/redundant that produced
// 92.16 Mbps/flow, 737.28 Mbps total, 73.7% utilization, 10G recommended —
// all conceptually wrong. This runs the six validation cases from the spec
// against the new calculateDanteBandwidth().
//
// Usage: npx tsx scripts/testing/verify-dante-bandwidth.mjs

import { calculateDanteBandwidth } from "../../lib/dante-bandwidth.ts";

let failures = 0;
function check(label, actual, expected, tolerance = 0.05) {
  const ok = typeof expected === "number"
    ? Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected))
    : actual === expected;
  console.log(`${ok ? "PASS" : "FAIL"} — ${label}: got ${actual}, expected ${expected}`);
  if (!ok) failures++;
}

console.log("\n=== Test 1: basic 64-channel Dante unicast ===");
{
  const r = calculateDanteBandwidth({
    transport: "unicast", channels: 64, sampleRateHz: 48000, bitDepth: 24,
    receivers: 1, redundant: false,
  });
  check("flows per receiver", r.flowsPerReceiver, 16);
  check("total TX flows", r.totalTransmitFlows, 16);
  check("bandwidth per receiver (Mbps)", r.bandwidthPerReceiver, 96);
  check("primary (Mbps)", r.primaryMbps, 96);
  check("primary utilization (%)", r.primaryUtilizationPercent, 9.6);
  check("recommended link", r.recommendedLink.label, "1 GbE");
}

console.log("\n=== Test 2: redundant 64-channel Dante ===");
{
  const r = calculateDanteBandwidth({
    transport: "unicast", channels: 64, sampleRateHz: 48000, bitDepth: 24,
    receivers: 1, redundant: true,
  });
  check("primary (Mbps)", r.primaryMbps, 96);
  check("secondary (Mbps)", r.secondaryMbps, 96);
  check("primary utilization (%) — NOT 19.2", r.primaryUtilizationPercent, 9.6);
  check("secondary utilization (%)", r.secondaryUtilizationPercent, 9.6);
  check("aggregate across both networks (Mbps)", r.aggregateMbps, 192);
  check("recommended link", r.recommendedLink.label, "1 GbE");
}

console.log("\n=== Test 3: unicast fanout (4 receivers) ===");
{
  const r = calculateDanteBandwidth({
    transport: "unicast", channels: 64, sampleRateHz: 48000, bitDepth: 24,
    receivers: 4, redundant: false,
  });
  check("flows per receiver", r.flowsPerReceiver, 16);
  check("total TX flows", r.totalTransmitFlows, 64);
  check("bandwidth per receiver (Mbps)", r.bandwidthPerReceiver, 96);
  check("primary TX (Mbps)", r.primaryMbps, 384);
  check("primary utilization (%)", r.primaryUtilizationPercent, 38.4);

  const rr = calculateDanteBandwidth({
    transport: "unicast", channels: 64, sampleRateHz: 48000, bitDepth: 24,
    receivers: 4, redundant: true,
  });
  check("redundant primary (Mbps) — not 768 on one link", rr.primaryMbps, 384);
  check("redundant secondary (Mbps) — not 768 on one link", rr.secondaryMbps, 384);
}

console.log("\n=== Test 4: partial flow (5 channels) ===");
{
  const r = calculateDanteBandwidth({
    transport: "unicast", channels: 5, sampleRateHz: 48000, bitDepth: 24,
    receivers: 1, redundant: false,
  });
  check("flows", r.flowsPerReceiver, 2);
  check("bandwidth (Mbps) — NOT 12 (2 flows x 6)", r.bandwidthPerReceiver, 7.5);
}

console.log("\n=== Test 5: sample-rate scaling (96 kHz) ===");
{
  const r48 = calculateDanteBandwidth({
    transport: "unicast", channels: 4, sampleRateHz: 48000, bitDepth: 24,
    receivers: 1, redundant: false,
  });
  const r96 = calculateDanteBandwidth({
    transport: "unicast", channels: 4, sampleRateHz: 96000, bitDepth: 24,
    receivers: 1, redundant: false,
  });
  check("48 kHz bandwidth (Mbps)", r48.bandwidthPerReceiver, 6);
  check("96 kHz bandwidth (Mbps)", r96.bandwidthPerReceiver, 12);
}

console.log("\n=== Test 6: multicast fanout (10 receivers) ===");
{
  const r = calculateDanteBandwidth({
    transport: "multicast", channels: 8, sampleRateHz: 48000, bitDepth: 24,
    receivers: 10, redundant: false,
  });
  check("primary (Mbps) — NOT multiplied by 10 receivers", r.primaryMbps, 12);
}

console.log("\n=== Bonus: AES67 uses its own model, not the 4ch-unicast rule ===");
{
  const r = calculateDanteBandwidth({
    transport: "aes67", channels: 8, sampleRateHz: 48000, bitDepth: 24,
    receivers: 5, redundant: false, aes67PacketTimeMs: 1,
  });
  check("AES67 flows (8 ch / 8 per flow)", r.aes67Flows, 1);
  check("AES67 receivers don't multiply source traffic", r.primaryMbps, r.bandwidthPerReceiver);
  console.log(`  (AES67 8ch @1ms packet time computed bandwidth: ${r.primaryMbps.toFixed(2)} Mbps, via real RTP/UDP/IP/Ethernet framing, not the 6 Mbps/4ch Dante unicast rule)`);
}

console.log(`\n${failures === 0 ? "ALL TESTS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
