"use client";

import { useEffect, useState } from "react";

/* ────────────────────────────────────────────────────────────────
   Connectors & Cables — AV connector reference
   Sources: public interface specs (HDMI, VESA DP, USB-IF, TIA-568,
   SMPTE). Competitive gaps/corrections tracked in
   docs/competitive/av-buddy/video-teardown.md.
   Data-integrity rule (CLAUDE.md): derived values (aspect ratio,
   megapixels) are COMPUTED from base H×V at render — never typed.
   ──────────────────────────────────────────────────────────────── */

interface PinRow { pin: string; signal: string; note?: string }
interface Pinout { title: string; note?: string; grid?: string; pins: PinRow[] }
interface VersionTable { title: string; cols: string[]; rows: string[][]; note?: string }
interface Connector {
  id: string;
  name: string;
  era: "current" | "legacy";
  tagline: string;
  overview: string[];
  specs: { label: string; value: string }[];
  context?: string; // "why it matters" field note
  pinouts?: Pinout[];
  versions?: VersionTable;
}

const CONNECTORS: Connector[] = [
  {
    id: "hdmi",
    name: "HDMI",
    era: "current",
    tagline: "Default display interface for commercial & residential AV",
    overview: [
      "Carries video, audio, control (CEC), and Ethernet/audio-return (HEAC/eARC) on a 19-pin connector. Type A is standard; Type C (mini) and Type D (micro) carry the same signals with a different pin mapping.",
      "Through HDMI 2.0 the link is TMDS: three data channels plus a clock channel. HDMI 2.1 adds FRL (Fixed Rate Link), which re-uses all four lanes as data for up to 48 Gbps — required for uncompressed 4K120 and 8K formats.",
    ],
    specs: [
      { label: "Pins", value: "19 (Type A / C / D — different mapping per type)" },
      { label: "Link types", value: "TMDS (≤ 18 Gbps) · FRL (HDMI 2.1, ≤ 48 Gbps)" },
      { label: "Power", value: "+5 V @ 55 mA from source (pin 18)" },
      { label: "Control", value: "CEC (pin 13), DDC/EDID over SCL/SDA (15/16)" },
      { label: "Cable certs", value: "High Speed (10.2 G) · Premium (18 G) · Ultra High Speed (48 G)" },
    ],
    context:
      "4K60 4:4:4 needs the full 18 Gbps — a Premium High Speed cable. Anything above (4K120, 8K60) needs FRL and an Ultra High Speed certified cable. “HDMI 2.1” on a spec sheet doesn't guarantee 48 Gbps — check the port's max FRL rate.",
    versions: {
      title: "HDMI versions",
      cols: ["Version", "Link", "Max bandwidth", "Typical max format"],
      rows: [
        ["1.4", "TMDS", "10.2 Gbps", "4K30, 1080p120"],
        ["2.0", "TMDS", "18 Gbps", "4K60 8-bit 4:4:4"],
        ["2.1", "FRL", "48 Gbps", "4K120 / 8K60 (uncompressed or DSC)"],
      ],
      note: "FRL negotiates in steps (3–12 Gbps × 3–4 lanes); devices may implement less than 48 Gbps.",
    },
    pinouts: [
      {
        title: "HDMI Type A (19-pin)",
        grid: "hdmi-a",
        pins: [
          { pin: "1", signal: "TMDS Data2+" },
          { pin: "2", signal: "TMDS Data2 Shield" },
          { pin: "3", signal: "TMDS Data2−" },
          { pin: "4", signal: "TMDS Data1+" },
          { pin: "5", signal: "TMDS Data1 Shield" },
          { pin: "6", signal: "TMDS Data1−" },
          { pin: "7", signal: "TMDS Data0+" },
          { pin: "8", signal: "TMDS Data0 Shield" },
          { pin: "9", signal: "TMDS Data0−" },
          { pin: "10", signal: "TMDS Clock+" },
          { pin: "11", signal: "TMDS Clock Shield" },
          { pin: "12", signal: "TMDS Clock−" },
          { pin: "13", signal: "CEC", note: "Consumer Electronics Control bus" },
          { pin: "14", signal: "Utility / HEC Data−", note: "Reserved before HDMI 1.4" },
          { pin: "15", signal: "SCL", note: "DDC clock (EDID)" },
          { pin: "16", signal: "SDA", note: "DDC data (EDID)" },
          { pin: "17", signal: "DDC / CEC Ground" },
          { pin: "18", signal: "+5 V", note: "Source powers sink EDID" },
          { pin: "19", signal: "Hot Plug Detect / HEC Data+" },
        ],
      },
    ],
  },
  {
    id: "displayport",
    name: "DisplayPort",
    era: "current",
    tagline: "Packet-based display link; native to PCs and pro monitors",
    overview: [
      "Unlike HDMI's dedicated channels, DisplayPort sends video as packetized data over 1, 2, or 4 main-link lanes plus a bidirectional AUX channel — closer to a network link than classic video. Multi-Stream Transport (MST) can drive several displays from one port.",
      "Full-size DP has a locking latch; Mini DisplayPort carries the same 20 signals in a different physical arrangement (and omits nothing electrically — but most mini ports don't supply DP_PWR to accessories reliably).",
    ],
    specs: [
      { label: "Pins", value: "20 (full-size and Mini — different layout)" },
      { label: "Lanes", value: "1 / 2 / 4 main-link lanes + AUX" },
      { label: "Power", value: "DP_PWR 3.3 V @ 500 mA (pin 20)" },
      { label: "Features", value: "MST daisy-chain, Adaptive Sync, DSC 1.2" },
      { label: "Cable certs", value: "RBR–HBR3 · DP40 (UHBR10) · DP80 (UHBR13.5/20)" },
    ],
    context:
      "DP 2.1 UHBR20 (80 Gbps raw) needs a certified DP80 cable and only runs short passive lengths. Most early “DP 2.1” monitors implement UHBR10 — check the UHBR rate, not the version number.",
    versions: {
      title: "DisplayPort versions",
      cols: ["Version", "Max link rate", "Raw / payload", "Typical max format"],
      rows: [
        ["1.2", "HBR2", "21.6 / 17.28 Gbps", "4K60"],
        ["1.4", "HBR3", "32.4 / 25.92 Gbps", "8K60 w/ DSC, 4K120"],
        ["2.1", "UHBR10", "40 / 38.69 Gbps", "4K144, dual 4K60"],
        ["2.1", "UHBR13.5", "54 / 52.22 Gbps", "8K60 10-bit w/ DSC"],
        ["2.1", "UHBR20", "80 / 77.37 Gbps", "8K60 uncompressed, 4K240"],
      ],
      note: "UHBR uses 128b/132b coding, so payload ≈ 97% of raw — versus 80% (8b/10b) on 1.x.",
    },
    pinouts: [
      {
        title: "DisplayPort (20-pin, full-size)",
        note: "Mini DP carries the same signals with a different pin order.",
        grid: "dp",
        pins: [
          { pin: "1", signal: "ML_Lane0+" },
          { pin: "2", signal: "GND" },
          { pin: "3", signal: "ML_Lane0−" },
          { pin: "4", signal: "ML_Lane1+" },
          { pin: "5", signal: "GND" },
          { pin: "6", signal: "ML_Lane1−" },
          { pin: "7", signal: "ML_Lane2+" },
          { pin: "8", signal: "GND" },
          { pin: "9", signal: "ML_Lane2−" },
          { pin: "10", signal: "ML_Lane3+" },
          { pin: "11", signal: "GND" },
          { pin: "12", signal: "ML_Lane3−" },
          { pin: "13", signal: "CONFIG1", note: "Cable/adapter detect (GND)" },
          { pin: "14", signal: "CONFIG2", note: "Cable/adapter detect (GND)" },
          { pin: "15", signal: "AUX CH+" },
          { pin: "16", signal: "GND" },
          { pin: "17", signal: "AUX CH−" },
          { pin: "18", signal: "Hot Plug Detect" },
          { pin: "19", signal: "Return (GND)" },
          { pin: "20", signal: "DP_PWR", note: "3.3 V / 500 mA" },
        ],
      },
    ],
  },
  {
    id: "usb-c",
    name: "USB-C / DP Alt Mode",
    era: "current",
    tagline: "One connector for video, data, and power — the most-asked question in modern AV",
    overview: [
      "A 24-pin rotationally symmetric connector. Video arrives via DisplayPort Alt Mode, which re-purposes the SuperSpeed pairs as 2 or 4 DP lanes (4 lanes = full DP bandwidth, no USB3 data; 2 lanes = DP + USB3 simultaneously). USB4 / Thunderbolt tunnel DisplayPort inside the USB4 protocol instead.",
      "USB Power Delivery negotiates up to 240 W (EPR) over the same cable, which is why single-cable docking works.",
    ],
    specs: [
      { label: "Pins", value: "24 (12 per side, rotationally symmetric)" },
      { label: "Video", value: "DP Alt Mode (2 or 4 lanes) or USB4/TB tunneling" },
      { label: "Power", value: "USB-PD to 100 W (SPR) / 240 W (EPR)" },
      { label: "Data", value: "USB 2.0 always present; USB3 gen 1/2×2; USB4 to 80 Gbps" },
      { label: "AUX", value: "SBU1/SBU2 become DP AUX± in Alt Mode" },
    ],
    context:
      "A USB-C port only outputs video if the device implements DP Alt Mode or USB4 — the connector proves nothing. Check for the DP logo next to the port, and use full-featured (e-marked) cables: charge-only USB-C cables lack the SuperSpeed pairs entirely.",
    pinouts: [
      {
        title: "USB-C signal groups (24-pin)",
        note: "Grouped by function — both rows mirror so either plug orientation works.",
        pins: [
          { pin: "A1 A12 B1 B12", signal: "GND", note: "Return / shield" },
          { pin: "A4 A9 B4 B9", signal: "VBUS", note: "Bus power (PD-negotiated)" },
          { pin: "A2/A3 · B2/B3", signal: "TX1± · TX2±", note: "SuperSpeed / DP lanes" },
          { pin: "B10/B11 · A10/A11", signal: "RX1± · RX2±", note: "SuperSpeed / DP lanes" },
          { pin: "A5 · B5", signal: "CC1 · CC2", note: "Config channel — PD & Alt Mode negotiation" },
          { pin: "A6/A7 · B6/B7", signal: "D+ / D−", note: "USB 2.0 (always available)" },
          { pin: "A8 · B8", signal: "SBU1 · SBU2", note: "Sideband — DP AUX± in Alt Mode" },
        ],
      },
    ],
  },
  {
    id: "rj45",
    name: "RJ45 / Cat6A",
    era: "current",
    tagline: "HDBaseT, AV-over-IP, Dante, and control all ride on twisted pair",
    overview: [
      "The 8P8C modular connector terminated to TIA-568 T568A or T568B — pick one scheme per site and never mix ends (a mixed A/B cable is a crossover). Both schemes are electrically identical; B is the most common in North American commercial work.",
      "For HDBaseT at 4K and for AV-over-IP, shielded Cat6A (F/UTP or S/FTP) is the standard recommendation: it controls alien crosstalk and meets the 100 m class limit with headroom.",
    ],
    specs: [
      { label: "Pins", value: "8 (4 pairs)" },
      { label: "Schemes", value: "T568A / T568B (same electrically)" },
      { label: "Distance", value: "100 m / 328 ft channel (Ethernet & HDBaseT class A)" },
      { label: "Shielding", value: "Shielded Cat6A recommended for HDBaseT 4K; bond per manufacturer" },
      { label: "Power", value: "PoE (af/at/bt) or PoH over the same pairs" },
    ],
    context:
      "HDBaseT is not Ethernet — a link that certifies for 10GBASE-T isn't automatically a happy HDBaseT run. Follow the extender maker's cable spec, keep service loops loose (no tight coils, especially with PoH heat), and re-terminate rather than trust a marginal crimp.",
    pinouts: [
      {
        title: "T568B (with T568A in notes)",
        grid: "rj45",
        pins: [
          { pin: "1", signal: "White/Orange", note: "T568A: White/Green" },
          { pin: "2", signal: "Orange", note: "T568A: Green" },
          { pin: "3", signal: "White/Green", note: "T568A: White/Orange" },
          { pin: "4", signal: "Blue" },
          { pin: "5", signal: "White/Blue" },
          { pin: "6", signal: "Green", note: "T568A: Orange" },
          { pin: "7", signal: "White/Brown" },
          { pin: "8", signal: "Brown" },
        ],
      },
    ],
  },
  {
    id: "fiber",
    name: "Fiber (LC / SC)",
    era: "current",
    tagline: "Distance and EMI immunity for AV-over-IP backbones and long HDMI/DP runs",
    overview: [
      "LC is the small-form connector used on virtually all SFP/SFP+ transceivers; SC is the larger square push-pull connector common on patch panels and older plants. Duplex pairs carry transmit/receive.",
      "Single-mode (OS2, 9 µm core, yellow jackets) runs kilometres and is the safe default for new backbone pulls. Multimode (OM3/OM4, 50 µm, aqua/violet) is cheaper to light but tops out around 300–550 m at 10 G. Active optical cables (AOC) embed the optics in a fixed HDMI/DP/USB cable for point-to-point runs.",
    ],
    specs: [
      { label: "Connectors", value: "LC (transceivers) · SC (panels) · duplex or simplex" },
      { label: "Single-mode", value: "OS2, 9/125 µm — km-class reach" },
      { label: "Multimode", value: "OM3 ~300 m / OM4 ~400–550 m @ 10 G" },
      { label: "Modules", value: "SFP (1 G) · SFP+ (10 G) · SFP28/QSFP for higher rates" },
    ],
    context:
      "Match the transceiver to the glass: an SR (multimode) optic will not light single-mode fiber and vice versa. Keep dust caps on until the moment of mating — a fingerprint is enough loss to break a 10 G link.",
  },
  {
    id: "bnc",
    name: "BNC / SDI",
    era: "current",
    tagline: "Broadcast coax — one 75 Ω cable now carries 4K (12G-SDI)",
    overview: [
      "A bayonet-lock coaxial connector. Video BNC is 75 Ω; 50 Ω BNCs exist for RF and test equipment and look almost identical — mixing them degrades return loss badly at SDI rates. There is no pinout: signal on the centre pin, ground on the shell.",
      "12G-SDI carries 4K60 on a single coax run, and HD-BNC / micro-BNC variants exist for dense router and camera back panels. Field termination is crimp or compression; compression tooling is more repeatable at 6G/12G rates.",
    ],
    specs: [
      { label: "Impedance", value: "75 Ω for video (50 Ω variant exists — don't mix)" },
      { label: "Rates", value: "SD/HD/3G/6G/12G-SDI (12G = 4K60 single link)" },
      { label: "Variants", value: "Standard, HD-BNC, micro-BNC" },
      { label: "Termination", value: "Crimp or compression + correct strip dimensions per cable" },
    ],
    context:
      "At 12G rates impedance discipline is everything: true 75 Ω connectors, percision-matched cable, and no 50 Ω adapters in the path. A run that passed at HD can fail outright at 12G with the same sloppy terminations.",
  },
  /* ── Legacy ─────────────────────────────────────────────── */
  {
    id: "vga",
    name: "VGA (DE-15)",
    era: "legacy",
    tagline: "Analog RGBHV — still on lecterns and older codecs",
    overview: [
      "Analog component video: separate red, green, and blue signals with dedicated horizontal and vertical sync (RGBHV) on a 15-pin high-density D-sub. DDC pins carry EDID so the source can read the display's capabilities.",
    ],
    specs: [
      { label: "Pins", value: "15 (3 rows)" },
      { label: "Signal", value: "Analog RGB + H/V sync, 75 Ω video lines" },
      { label: "EDID", value: "DDC2 on pins 12 (SDA) / 15 (SCL)" },
    ],
    pinouts: [
      {
        title: "VGA (15-pin)",
        grid: "vga",
        pins: [
          { pin: "1", signal: "Red video" },
          { pin: "2", signal: "Green video" },
          { pin: "3", signal: "Blue video" },
          { pin: "4", signal: "ID2 / Reserved" },
          { pin: "5", signal: "GND (H-sync return)" },
          { pin: "6", signal: "Red return (GND)" },
          { pin: "7", signal: "Green return (GND)" },
          { pin: "8", signal: "Blue return (GND)" },
          { pin: "9", signal: "+5 V (key/DDC power)" },
          { pin: "10", signal: "GND (V-sync return)" },
          { pin: "11", signal: "ID0 / Reserved" },
          { pin: "12", signal: "SDA (DDC data)" },
          { pin: "13", signal: "H-Sync" },
          { pin: "14", signal: "V-Sync" },
          { pin: "15", signal: "SCL (DDC clock)" },
        ],
      },
    ],
  },
  {
    id: "dvi",
    name: "DVI",
    era: "legacy",
    tagline: "TMDS before HDMI — variant letters matter",
    overview: [
      "DVI carries the same TMDS signalling HDMI 1.x uses (no audio, no CEC). The suffix tells you what's inside: DVI-D is digital only, DVI-A is analog only (VGA in a DVI shell), DVI-I carries both. Dual-link adds a second TMDS trio for higher resolutions.",
      "Passive DVI-D ↔ HDMI adapters work because the digital signalling is identical; DVI-A/I analog pins need an active converter to reach a digital display.",
    ],
    specs: [
      { label: "Single link", value: "165 MHz pixel clock → 1920×1200@60" },
      { label: "Dual link", value: "2× TMDS → 2560×1600@60" },
      { label: "DVI-D", value: "18+1 pins (SL) / 24+1 (DL) — digital only" },
      { label: "DVI-I", value: "18+5 (SL) / 24+5 (DL) — digital + analog" },
      { label: "DVI-A", value: "12+5 pins — analog only" },
    ],
    context:
      "The flat blade (C5) and the four pins around it carry the analog RGBHV — if a socket has no holes for them, it's DVI-D and an analog source can't pass through, adapter or not.",
  },
  {
    id: "rca",
    name: "RCA",
    era: "legacy",
    tagline: "In 2026: unbalanced audio, sub lines, and S/PDIF — not video",
    overview: [
      "A two-conductor coaxial connector: signal on the centre pin, ground on the shell. Its composite (yellow) and component (YPbPr) video roles are dead in new work, but it remains everywhere as unbalanced line-level audio (red/white), subwoofer feeds, and 75 Ω coaxial S/PDIF digital audio (orange).",
    ],
    specs: [
      { label: "Conductors", value: "2 — no pinout" },
      { label: "Audio", value: "Unbalanced line level, ~10 ft practical limit near noise" },
      { label: "S/PDIF", value: "75 Ω coax, digital stereo / compressed 5.1" },
      { label: "Legacy video", value: "Composite (1×), Component YPbPr (3×), RGBHV (5×)" },
    ],
    context:
      "Unbalanced RCA runs pick up hum in racks and floor boxes — keep them short, or convert to balanced on a transformer/DI when crossing a room.",
  },
  {
    id: "s-video",
    name: "S-Video (Mini-DIN 4)",
    era: "legacy",
    tagline: "Separated luma/chroma analog video",
    overview: [
      "A 4-pin Mini-DIN carrying analog video as separate luminance (Y, with sync) and chrominance (C) signals — one step above composite, one below component. Found on archival decks and old codecs.",
    ],
    specs: [
      { label: "Pins", value: "4 (Mini-DIN)" },
      { label: "Signal", value: "Y = luma + sync · C = chroma" },
    ],
    pinouts: [
      {
        title: "Mini-DIN 4 (S-Video)",
        grid: "svideo",
        pins: [
          { pin: "1", signal: "GND (Y return)" },
          { pin: "2", signal: "GND (C return)" },
          { pin: "3", signal: "Y — luminance + sync" },
          { pin: "4", signal: "C — chrominance" },
        ],
      },
    ],
  },
  {
    id: "f-connector",
    name: "F-Connector",
    era: "legacy",
    tagline: "RF distribution: CATV, satellite, antenna, MoCA",
    overview: [
      "A threaded 75 Ω RF connector for coax (RG-6 in modern plants). The cable's own centre conductor is the pin — termination is stripping to the right dimensions and compressing the body onto the jacket. Used for cable TV, satellite (often powered lines — mind before shorting), off-air antenna feeds, and MoCA networking.",
    ],
    specs: [
      { label: "Impedance", value: "75 Ω" },
      { label: "Cable", value: "RG-6 standard (RG-59 legacy short runs)" },
      { label: "Termination", value: "Compression fittings; strip to fitting spec" },
    ],
    context:
      "Despite the old myth, F never cabled early computer networks — that was BNC/N-type coax (10BASE2/10BASE5). F is and always was RF distribution.",
  },
];

/* ── Resolution reference — derived columns COMPUTED, never typed ── */
const RESOLUTIONS: { name: string; w: number; h: number }[] = [
  { name: "VGA", w: 640, h: 480 },
  { name: "SVGA", w: 800, h: 600 },
  { name: "qHD", w: 960, h: 540 },
  { name: "XGA", w: 1024, h: 768 },
  { name: "HD", w: 1280, h: 720 },
  { name: "WXGA", w: 1280, h: 800 },
  { name: "SXGA", w: 1280, h: 1024 },
  { name: "WXGA+", w: 1440, h: 900 },
  { name: "HD+", w: 1600, h: 900 },
  { name: "UXGA", w: 1600, h: 1200 },
  { name: "WSXGA+", w: 1680, h: 1050 },
  { name: "FHD (1080p)", w: 1920, h: 1080 },
  { name: "WUXGA", w: 1920, h: 1200 },
  { name: "UW-FHD", w: 2560, h: 1080 },
  { name: "WQHD (1440p)", w: 2560, h: 1440 },
  { name: "WQXGA", w: 2560, h: 1600 },
  { name: "UWQHD", w: 3440, h: 1440 },
  { name: "4K UHD", w: 3840, h: 2160 },
  { name: "DCI 4K", w: 4096, h: 2160 },
  { name: "5K", w: 5120, h: 2880 },
  { name: "DQHD (32:9)", w: 5120, h: 1440 },
  { name: "8K UHD", w: 7680, h: 4320 },
];

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

// Reduce H:V and present the ratio the industry name for it when the exact
// reduction is unfamiliar (8:5 → 16:10, 43:18 ≈ 21:9, 256:135 ≈ 17:9)
function aspectLabel(w: number, h: number): string {
  const g = gcd(w, h);
  const key = `${w / g}:${h / g}`;
  const friendly: Record<string, string> = {
    "8:5": "16:10",
    "43:18": "≈21:9 (43:18)",
    "64:27": "21:9 (64:27)",
    "256:135": "≈17:9 (256:135)",
  };
  return friendly[key] ?? key;
}

const megapixels = (w: number, h: number) => ((w * h) / 1_000_000).toFixed(2);

/* ── Original connector artwork ───────────────────────────────
   Schematic mating-face views drawn from the public mechanical
   specs. Original art — no third-party imagery (see CLAUDE.md /
   teardown source-material rule). */
const ART_SHELL = "rgb(var(--forge-surface))";
const ART_STROKE = "rgb(var(--text-subtle))";
const ART_SLOT = "#1a2035";
const ART_PIN = "#8b5cf6";
const ART_PIN_LT = "#ede9fe";

function ConnectorArt({ id, size = 40 }: { id: string; size?: number }) {
  const common = { width: size, height: (size * 2) / 3, viewBox: "0 0 120 80", style: { display: "block", flexShrink: 0 } as React.CSSProperties };
  switch (id) {
    case "hdmi":
      return (
        <svg {...common}>
          <path d="M12 24 h96 v18 l-14 14 H26 L12 42 Z" fill={ART_SHELL} stroke={ART_STROKE} strokeWidth="2" strokeLinejoin="round" />
          <path d="M21 31 h78 v9 l-8 8 H29 l-8 -8 Z" fill={ART_SLOT} />
          {[30, 42, 54, 66, 78, 90].map(x => <rect key={x} x={x} y={34} width={2.5} height={7} rx={1} fill={ART_PIN_LT} />)}
        </svg>
      );
    case "displayport":
      return (
        <svg {...common}>
          <path d="M14 24 h74 l18 13 v19 H14 Z" fill={ART_SHELL} stroke={ART_STROKE} strokeWidth="2" strokeLinejoin="round" />
          <path d="M22 31 h62 l13 9 v9 H22 Z" fill={ART_SLOT} />
          {[30, 42, 54, 66, 78].map(x => <rect key={x} x={x} y={34} width={2.5} height={7} rx={1} fill={ART_PIN_LT} />)}
        </svg>
      );
    case "usb-c":
      return (
        <svg {...common}>
          <rect x={16} y={27} width={88} height={26} rx={13} fill={ART_SHELL} stroke={ART_STROKE} strokeWidth="2" />
          <rect x={23} y={33} width={74} height={14} rx={7} fill={ART_SLOT} />
          <rect x={32} y={38.5} width={56} height={3} rx={1.5} fill={ART_PIN} />
        </svg>
      );
    case "rj45":
      return (
        <svg {...common}>
          <rect x={32} y={14} width={56} height={40} rx={3} fill={ART_SHELL} stroke={ART_STROKE} strokeWidth="2" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => <rect key={i} x={37.5 + i * 6} y={18} width={3} height={11} rx={0.8} fill="#d9b44a" />)}
          <path d="M48 54 h24 v8 a2 2 0 0 1 -2 2 h-20 a2 2 0 0 1 -2 -2 Z" fill={ART_SHELL} stroke={ART_STROKE} strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case "fiber":
      return (
        <svg {...common}>
          <path d="M32 24 l6 -8 h4 l6 8 Z" fill={ART_SHELL} stroke={ART_STROKE} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M72 24 l6 -8 h4 l6 8 Z" fill={ART_SHELL} stroke={ART_STROKE} strokeWidth="1.5" strokeLinejoin="round" />
          <rect x={28} y={24} width={24} height={30} rx={2} fill={ART_SHELL} stroke={ART_STROKE} strokeWidth="2" />
          <rect x={68} y={24} width={24} height={30} rx={2} fill={ART_SHELL} stroke={ART_STROKE} strokeWidth="2" />
          <rect x={52} y={32} width={16} height={7} fill={ART_SHELL} stroke={ART_STROKE} strokeWidth="1.5" />
          <circle cx={40} cy={42} r={4.5} fill={ART_SLOT} />
          <circle cx={80} cy={42} r={4.5} fill={ART_SLOT} />
          <circle cx={40} cy={42} r={1.5} fill={ART_PIN} />
          <circle cx={80} cy={42} r={1.5} fill={ART_PIN} />
        </svg>
      );
    case "bnc":
      return (
        <svg {...common}>
          <circle cx={60} cy={40} r={26} fill={ART_SHELL} stroke={ART_STROKE} strokeWidth="2" />
          <rect x={28} y={36.5} width={7} height={7} rx={1.5} fill={ART_STROKE} />
          <rect x={85} y={36.5} width={7} height={7} rx={1.5} fill={ART_STROKE} />
          <circle cx={60} cy={40} r={15} fill={ART_SLOT} />
          <circle cx={60} cy={40} r={4} fill={ART_PIN} />
        </svg>
      );
    case "vga":
      return (
        <svg {...common}>
          <circle cx={9} cy={40} r={5} fill="none" stroke={ART_STROKE} strokeWidth="2" />
          <circle cx={111} cy={40} r={5} fill="none" stroke={ART_STROKE} strokeWidth="2" />
          <path d="M24 24 h72 q7 0 6 7 l-3 19 q-1 6 -8 6 H29 q-7 0 -8 -6 l-3 -19 q-1 -7 6 -7 Z" fill={ART_SHELL} stroke={ART_STROKE} strokeWidth="2" strokeLinejoin="round" />
          {[0, 1, 2, 3, 4].map(i => <circle key={"a" + i} cx={38 + i * 11} cy={32} r={2.2} fill={ART_PIN} />)}
          {[0, 1, 2, 3, 4].map(i => <circle key={"b" + i} cx={41 + i * 11} cy={40} r={2.2} fill={ART_PIN} />)}
          {[0, 1, 2, 3, 4].map(i => <circle key={"c" + i} cx={44 + i * 11} cy={48} r={2.2} fill={ART_PIN} />)}
        </svg>
      );
    case "dvi":
      return (
        <svg {...common}>
          <rect x={12} y={24} width={96} height={32} rx={3} fill={ART_SHELL} stroke={ART_STROKE} strokeWidth="2" />
          {[0, 1, 2].map(r =>
            [0, 1, 2, 3, 4, 5, 6, 7].map(c => (
              <rect key={r + "-" + c} x={19 + c * 7.5} y={30 + r * 8} width={3} height={3} fill={ART_PIN} />
            ))
          )}
          <rect x={85} y={38} width={14} height={4} rx={1} fill={ART_SLOT} />
          {[{ x: 84, y: 30 }, { x: 96, y: 30 }, { x: 84, y: 47 }, { x: 96, y: 47 }].map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={1.8} fill={ART_PIN} />
          ))}
        </svg>
      );
    case "rca":
      return (
        <svg {...common}>
          <circle cx={60} cy={40} r={24} fill={ART_SHELL} stroke={ART_STROKE} strokeWidth="2" />
          <circle cx={60} cy={40} r={13} fill={ART_SLOT} />
          <circle cx={60} cy={40} r={5} fill={ART_PIN} />
        </svg>
      );
    case "s-video":
      return (
        <svg {...common}>
          <circle cx={60} cy={40} r={25} fill={ART_SHELL} stroke={ART_STROKE} strokeWidth="2" />
          <circle cx={48} cy={31} r={3.5} fill={ART_SLOT} />
          <circle cx={72} cy={31} r={3.5} fill={ART_SLOT} />
          <circle cx={46} cy={47} r={3.5} fill={ART_SLOT} />
          <circle cx={74} cy={47} r={3.5} fill={ART_SLOT} />
          <rect x={56} y={57} width={8} height={6} fill={ART_SLOT} />
        </svg>
      );
    case "f-connector":
      return (
        <svg {...common}>
          <polygon points="60,12 84,26 84,54 60,68 36,54 36,26" fill={ART_SHELL} stroke={ART_STROKE} strokeWidth="2" strokeLinejoin="round" />
          <circle cx={60} cy={40} r={14} fill={ART_SLOT} />
          <circle cx={60} cy={40} r={3} fill={ART_PIN} />
        </svg>
      );
    default:
      return null;
  }
}

/* ── Interactive pin-grid diagrams ────────────────────────────
   Click a pin to highlight its row in the table (and vice versa)
   — the "pinned pin-grid" pattern from the teardown build spec. */
interface GridPin { n: string; x: number; y: number; wire?: { base: string; stripe?: string } }
const WIRE = { orange: "#f97316", green: "#16a34a", blue: "#8b5cf6", brown: "#92400e" };
const PIN_LAYOUTS: Record<string, { vb: string; outline: React.ReactNode; pins: GridPin[] }> = {
  "hdmi-a": {
    vb: "0 0 240 96",
    outline: <path d="M8 16 h224 v36 l-24 28 H32 L8 52 Z" fill="none" stroke={ART_STROKE} strokeWidth="1.5" strokeLinejoin="round" />,
    pins: [
      ...Array.from({ length: 10 }, (_, i) => ({ n: String(1 + i * 2), x: 25 + i * 21, y: 33 })),
      ...Array.from({ length: 9 }, (_, i) => ({ n: String(2 + i * 2), x: 35.5 + i * 21, y: 61 })),
    ],
  },
  dp: {
    vb: "0 0 240 96",
    outline: <path d="M8 16 h190 l34 22 v42 H8 Z" fill="none" stroke={ART_STROKE} strokeWidth="1.5" strokeLinejoin="round" />,
    pins: [
      ...Array.from({ length: 10 }, (_, i) => ({ n: String(1 + i * 2), x: 25 + i * 21, y: 39 })),
      ...Array.from({ length: 10 }, (_, i) => ({ n: String(2 + i * 2), x: 25 + i * 21, y: 65 })),
    ],
  },
  vga: {
    vb: "0 0 240 88",
    outline: <path d="M42 12 h156 q12 0 10 12 l-6 40 q-2 12 -14 12 H52 q-12 0 -14 -12 l-6 -40 q-2 -12 10 -12 Z" fill="none" stroke={ART_STROKE} strokeWidth="1.5" strokeLinejoin="round" />,
    pins: [
      ...Array.from({ length: 5 }, (_, i) => ({ n: String(i + 1), x: 68 + i * 26, y: 26 })),
      ...Array.from({ length: 5 }, (_, i) => ({ n: String(i + 6), x: 74 + i * 26, y: 44 })),
      ...Array.from({ length: 5 }, (_, i) => ({ n: String(i + 11), x: 80 + i * 26, y: 62 })),
    ],
  },
  rj45: {
    vb: "0 0 240 96",
    outline: (
      <>
        <rect x={56} y={8} width={128} height={62} rx={4} fill="none" stroke={ART_STROKE} strokeWidth="1.5" />
        <path d="M92 70 h56 v12 a3 3 0 0 1 -3 3 h-50 a3 3 0 0 1 -3 -3 Z" fill="none" stroke={ART_STROKE} strokeWidth="1.5" strokeLinejoin="round" />
      </>
    ),
    pins: [
      { n: "1", x: 71, y: 30, wire: { base: "#fff", stripe: WIRE.orange } },
      { n: "2", x: 85, y: 30, wire: { base: WIRE.orange } },
      { n: "3", x: 99, y: 30, wire: { base: "#fff", stripe: WIRE.green } },
      { n: "4", x: 113, y: 30, wire: { base: WIRE.blue } },
      { n: "5", x: 127, y: 30, wire: { base: "#fff", stripe: WIRE.blue } },
      { n: "6", x: 141, y: 30, wire: { base: WIRE.green } },
      { n: "7", x: 155, y: 30, wire: { base: "#fff", stripe: WIRE.brown } },
      { n: "8", x: 169, y: 30, wire: { base: WIRE.brown } },
    ],
  },
  svideo: {
    vb: "0 0 240 96",
    outline: <circle cx={120} cy={48} r={42} fill="none" stroke={ART_STROKE} strokeWidth="1.5" />,
    pins: [
      { n: "3", x: 98, y: 34 },
      { n: "4", x: 142, y: 34 },
      { n: "1", x: 96, y: 64 },
      { n: "2", x: 144, y: 64 },
    ],
  },
};

function PinGrid({ type, active, onPick }: { type: string; active: string | null; onPick: (pin: string) => void }) {
  const layout = PIN_LAYOUTS[type];
  if (!layout) return null;
  const isWire = type === "rj45";
  return (
    <div className="mb-2 rounded-lg border border-border bg-forge-surface/30 px-3 pb-1 pt-2">
      <svg viewBox={layout.vb} style={{ display: "block", width: "100%", maxWidth: 340, margin: "0 auto" }}>
        {layout.outline}
        {layout.pins.map(p => {
          const on = active === p.n;
          return (
            <g key={p.n} onClick={() => onPick(p.n)} style={{ cursor: "pointer" }}>
              {isWire && p.wire ? (
                <>
                  <rect x={p.x - 5} y={p.y - 14} width={10} height={28} rx={2}
                    fill={p.wire.base} stroke={on ? ART_PIN : ART_STROKE} strokeWidth={on ? 2.5 : 1} />
                  {p.wire.stripe && <rect x={p.x - 5} y={p.y - 5} width={10} height={10} fill={p.wire.stripe} pointerEvents="none" />}
                  <text x={p.x} y={p.y + 26} textAnchor="middle" fontSize={9} fontWeight={on ? 700 : 500}
                    fill={on ? ART_PIN : "rgb(var(--text-subtle))"} fontFamily="'JetBrains Mono',monospace">{p.n}</text>
                </>
              ) : (
                <>
                  <circle cx={p.x} cy={p.y} r={9.5}
                    fill={on ? "rgba(139,92,246,0.25)" : ART_SLOT}
                    stroke={on ? ART_PIN : ART_STROKE} strokeWidth={on ? 2.5 : 1} />
                  <text x={p.x} y={p.y + 3.5} textAnchor="middle" fontSize={9} fontWeight={on ? 700 : 500}
                    fill={on ? "#c4b5fd" : "rgb(var(--text-muted))"} fontFamily="'JetBrains Mono',monospace" pointerEvents="none">{p.n}</text>
                </>
              )}
            </g>
          );
        })}
      </svg>
      <p className="pb-1 pt-1 text-center text-[10px] text-faint">Mating-face schematic — click a pin to highlight it in the table</p>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────── */
export default function ConnectorsPage() {
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [showLegacy, setShowLegacy] = useState(false);
  const [activePin, setActivePin] = useState<string | null>(null);

  // Deep-linking: /calculators/connectors#hdmi opens and scrolls to that card
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const conn = CONNECTORS.find(c => c.id === hash);
    if (conn) {
      if (conn.era === "legacy") setShowLegacy(true);
      setOpenId(hash);
      setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, []);

  const q = search.trim().toLowerCase();
  const matches = (c: Connector) =>
    !q ||
    c.name.toLowerCase().includes(q) ||
    c.tagline.toLowerCase().includes(q) ||
    c.overview.some(p => p.toLowerCase().includes(q)) ||
    (c.pinouts ?? []).some(po => po.pins.some(p => p.signal.toLowerCase().includes(q)));

  const current = CONNECTORS.filter(c => c.era === "current" && matches(c));
  const legacy = CONNECTORS.filter(c => c.era === "legacy" && matches(c));
  const legacyVisible = showLegacy || q.length > 0;

  const card = (c: Connector) => {
    const open = openId === c.id;
    return (
      <div key={c.id} id={c.id} className="rounded-xl border border-border bg-forge-surface/40" style={{ scrollMarginTop: 16 }}>
        <button
          onClick={() => { setOpenId(open ? null : c.id); setActivePin(null); }}
          className="flex w-full items-center gap-3 px-4 py-3 text-left"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`shrink-0 text-subtle transition-transform ${open ? "rotate-90" : ""}`}>
            <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <ConnectorArt id={c.id} size={44} />
          <div className="min-w-0 flex-1">
            <span className="text-[14px] font-semibold text-heading">{c.name}</span>
            <span className="ml-2 text-[12px] text-subtle">{c.tagline}</span>
          </div>
          {c.era === "legacy" && (
            <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-faint">Legacy</span>
          )}
        </button>

        {open && (
          <div className="border-t border-border px-4 pb-4 pt-3.5">
            <div className="mb-1 flex gap-5">
              <div className="hidden shrink-0 self-start rounded-lg border border-border bg-forge-surface/30 p-2 sm:block">
                <ConnectorArt id={c.id} size={120} />
              </div>
              <div className="min-w-0">
                {c.overview.map((p, i) => (
                  <p key={i} className="mb-2.5 text-[13px] leading-relaxed text-muted">{p}</p>
                ))}
              </div>
            </div>

            {/* Key specs */}
            <div className="mb-3 mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {c.specs.map((s, i) => (
                <div key={i} className="flex gap-2 text-[12px]">
                  <span className="shrink-0 font-medium text-secondary">{s.label}:</span>
                  <span className="text-subtle">{s.value}</span>
                </div>
              ))}
            </div>

            {/* Why it matters */}
            {c.context && (
              <div className="mb-3 rounded-lg border border-blue-500/25 bg-blue-500/5 px-3.5 py-2.5 text-[12px] leading-relaxed text-muted">
                <span className="font-semibold text-blue-400">Field note: </span>{c.context}
              </div>
            )}

            {/* Versions table */}
            {c.versions && (
              <div className="mb-3">
                <div className="mb-1.5 text-[12px] font-semibold text-heading">{c.versions.title}</div>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="border-b border-border bg-forge-surface/60">
                        {c.versions.cols.map((col, i) => (
                          <th key={i} className="px-3 py-2 text-left font-semibold text-secondary">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {c.versions.rows.map((row, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          {row.map((cell, j) => (
                            <td key={j} className={`px-3 py-1.5 ${j === 0 ? "font-mono text-blue-400" : "text-muted"}`}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {c.versions.note && <p className="mt-1.5 text-[11px] text-faint">{c.versions.note}</p>}
              </div>
            )}

            {/* Pinouts */}
            {c.pinouts?.map((po, pi) => (
              <div key={pi} className="mb-1">
                <div className="mb-1.5 text-[12px] font-semibold text-heading">{po.title}</div>
                {po.note && <p className="mb-1.5 text-[11px] text-faint">{po.note}</p>}
                {po.grid && (
                  <PinGrid
                    type={po.grid}
                    active={activePin}
                    onPick={pin => setActivePin(prev => (prev === pin ? null : pin))}
                  />
                )}
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="border-b border-border bg-forge-surface/60">
                        <th className="w-24 px-3 py-2 text-left font-semibold text-secondary">Pin</th>
                        <th className="px-3 py-2 text-left font-semibold text-secondary">Signal</th>
                        <th className="px-3 py-2 text-left font-semibold text-secondary">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {po.pins.map((p, i) => {
                        const rowActive = po.grid !== undefined && activePin === p.pin;
                        return (
                          <tr
                            key={i}
                            onClick={po.grid ? () => setActivePin(prev => (prev === p.pin ? null : p.pin)) : undefined}
                            className={`border-b border-border/50 last:border-0 ${rowActive ? "bg-blue-500/10" : ""} ${po.grid ? "cursor-pointer hover:bg-forge-surface/50" : ""}`}
                          >
                            <td className="px-3 py-1.5 font-mono text-blue-400">{p.pin}</td>
                            <td className="px-3 py-1.5 text-muted">{p.signal}</td>
                            <td className="px-3 py-1.5 text-subtle">{p.note ?? ""}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="animate-fade-in max-w-[900px] p-6">
      <a href="/calculators" className="mb-4 inline-block text-[12px] text-subtle hover:text-secondary">← Calculators</a>
      <h2 className="mb-1 text-lg font-semibold text-heading">🔌 Connectors &amp; Cables</h2>
      <p className="mb-5 text-[13px] text-subtle">
        Pinouts, link versions, and field notes for AV connectors — plus a computed resolution reference
      </p>

      {/* Search */}
      <div className="relative mb-5">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className="forge-input pl-9"
          placeholder="Search connectors, signals, pins… (e.g. CEC, T568B, AUX)"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Current connectors */}
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-faint">Current</div>
      <div className="mb-6 flex flex-col gap-2.5">
        {current.map(card)}
        {current.length === 0 && <p className="text-[13px] text-subtle">No current connectors match &ldquo;{search}&rdquo;</p>}
      </div>

      {/* Legacy connectors (collapsed by default) */}
      <button
        onClick={() => setShowLegacy(v => !v)}
        className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-faint transition-colors hover:text-secondary"
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className={`transition-transform ${legacyVisible ? "rotate-90" : ""}`}>
          <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Legacy ({legacy.length})
      </button>
      {legacyVisible && (
        <div className="mb-6 flex flex-col gap-2.5">
          {legacy.map(card)}
          {legacy.length === 0 && <p className="text-[13px] text-subtle">No legacy connectors match &ldquo;{search}&rdquo;</p>}
        </div>
      )}

      {/* Resolution reference */}
      <div className="mb-2 mt-8 text-[11px] font-semibold uppercase tracking-widest text-faint">Resolution Reference</div>
      <p className="mb-3 text-[12px] text-subtle">
        Aspect ratio and megapixels are computed from H×V at render time — no hand-typed derived values.
      </p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border bg-forge-surface/60">
              <th className="px-3 py-2 text-left font-semibold text-secondary">Name</th>
              <th className="px-3 py-2 text-right font-semibold text-secondary">H</th>
              <th className="px-3 py-2 text-right font-semibold text-secondary">V</th>
              <th className="px-3 py-2 text-left font-semibold text-secondary">Aspect</th>
              <th className="px-3 py-2 text-right font-semibold text-secondary">Mpx</th>
            </tr>
          </thead>
          <tbody>
            {RESOLUTIONS.map((r, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0">
                <td className="px-3 py-1.5 font-medium text-muted">{r.name}</td>
                <td className="px-3 py-1.5 text-right font-mono text-blue-400">{r.w}</td>
                <td className="px-3 py-1.5 text-right font-mono text-blue-400">{r.h}</td>
                <td className="px-3 py-1.5 text-subtle">{aspectLabel(r.w, r.h)}</td>
                <td className="px-3 py-1.5 text-right font-mono text-subtle">{megapixels(r.w, r.h)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
