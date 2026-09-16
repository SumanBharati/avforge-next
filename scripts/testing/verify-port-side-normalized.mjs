// Verifies two related fixes for the port-side-guessing pipeline in
// lib/ai-equipment-extract.ts's normalizePortSides() (applied to every
// response from /api/extract-equipment before it reaches the client):
//
// 1. "the AI analyzed the ports pretty well, however, it guessed the side
//    of the connections wrong, for example, the label is HDMI OUT, but the
//    side it picked is Left" — side is force-corrected to agree with dir
//    (in->left, out->right) regardless of what the AI guessed.
// 2. "I noticed it picked a side 'bottom' for a power device. on equipment
//    there shouldnt be top or bottom, it can either be left or right, no
//    top or bottom" — a follow-up bug introduced while fixing #1 (a
//    power/ground carve-out that let "top"/"bottom" through). Every port,
//    power included, must land on left or right — Signal Flow Builder's
//    rendering only ever looks for those two sides, so a "top"/"bottom"
//    port doesn't just render in the wrong place, it silently disappears
//    from the diagram entirely.
//
// Usage: node scripts/testing/verify-port-side-normalized.mjs

import { normalizePortSides } from "../../lib/ai-equipment-extract.ts";

const reportedPorts = [
  { side: "left", dir: "out", signal: "usb-c", label: "DP-S OUT", connector: "USB-C" },
  { side: "left", dir: "out", signal: "hdmi", label: "HDMI OUT 1", connector: "HDMI" },
  { side: "left", dir: "out", signal: "hdmi", label: "HDMI OUT 2", connector: "HDMI" },
  { side: "left", dir: "out", signal: "hdmi", label: "HDMI OUT 3", connector: "HDMI" },
  { side: "left", dir: "out", signal: "usb", label: "USB3 TO DEVICE", connector: "USB-A" },
  { side: "left", dir: "in", signal: "rj45", label: "CONTENT IN", connector: "RJ45" },
  { side: "left", dir: "in", signal: "hdmi", label: "CONTENT IN", connector: "HDMI" },
  { side: "right", dir: "in", signal: "rj45", label: "1G Port 1", connector: "RJ45" },
  { side: "right", dir: "in", signal: "rj45", label: "PoE+", connector: "RJ45" },
  { side: "right", dir: "in", signal: "antenna", label: "ANT-A", connector: "SMA" },
  // The follow-up report: a power port that came back "side": "bottom".
  { side: "bottom", dir: "in", signal: "power", label: "AC IN", connector: "IEC C14" },
];

const fixed = normalizePortSides(reportedPorts);

let allCorrect = true;
for (const p of fixed) {
  const expected = p.dir === "out" ? "right" : "left";
  const ok = p.side === expected;
  if (!ok) allCorrect = false;
  console.log(`${p.label.padEnd(16)} dir=${p.dir.padEnd(3)} -> side=${p.side.padEnd(5)} (expect ${expected}) ${ok ? "OK" : "WRONG"}`);
}

console.log(`\nAll outputs now on the right, all inputs on the left: ${allCorrect}`);
console.log(`Sample HDMI OUT 1 fixed (was "left", should now be "right"): ${fixed[1].side === "right"}`);
