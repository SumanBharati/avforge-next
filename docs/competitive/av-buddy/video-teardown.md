# AV Buddy Competitive Teardown — Video Reference Section

**Purpose:** Competitive analysis of the AV Buddy mobile app (KOEN Digital) Video reference
section, for the AVForge web toolkit. Documents their information architecture, UX patterns,
content coverage, and confirmed content errors, plus build recommendations for AVForge.

**Scope of this document:** Video section only (connector reference + resolutions).
Audio, Calculators, Tools, and Glossary sections are documented separately.

**Source material:** 52 screenshots captured 2026-07, stored in
`docs/competitive/av-buddy/screenshots/`. See the Screenshot Index below for the
file-to-screen mapping. All app copy referenced here is paraphrased; do not copy
AV Buddy's prose, diagrams, or UI layouts into AVForge — build original implementations
of the underlying (public, factual) technical data.

---

## 1. Screenshot Index

| File | Screen |
|---|---|
| FullSizeRender.jpeg | Video section index (10 entries) |
| IMG_2113 | BNC overview |
| IMG_2114 | BNC crimp termination (exploded view + strip table) |
| IMG_2115 | BNC compression termination |
| IMG_2116 | BNC info (strain relief boots, impedance) |
| IMG_2117 | RCA overview (Composite tab) |
| IMG_2118 | RCA termination (solder-type, strip guidance) |
| IMG_2119 | RCA configurations (YPbPr / RGBHV color mapping) |
| IMG_2120 | DVI overview (A/D/I, single vs dual link) |
| IMG_2121–2123 | DVI-A pinout (3 scroll states) |
| IMG_2124–2127 | DVI-D single-link pinout (4 scroll states) |
| IMG_2128–2132 | DVI-I single-link pinout (5 scroll states) |
| IMG_2133 | F-Connector overview |
| IMG_2134 | F-Connector termination (strip guidance) |
| IMG_2135 | HDMI overview (CEC note, Versions button) |
| IMG_2136–2138 | HDMI Type-A pinout (3 scroll states) |
| IMG_2139–2141 | HDMI Type-C (Mini) pinout (3 scroll states) |
| IMG_2142–2144 | HDMI Type-D (Micro) pinout (3 scroll states) |
| IMG_2145 | Mini-DIN overview |
| IMG_2146 | S-Video 4-pin pinout |
| IMG_2147 | VGA overview |
| IMG_2148–2150 | VGA 15-pin pinout (3 scroll states) |
| IMG_2151 | DisplayPort overview |
| IMG_2152 | DisplayPort versions table (resolution × data rate × DP 1.0–1.4) |
| IMG_2153–2155 | DisplayPort 20-pin pinout (3 scroll states) |
| IMG_2156–2158 | Mini DisplayPort 20-pin pinout (3 scroll states) |
| IMG_2159 | Analog connectors summary grid (8 entries incl. SCART) |
| IMG_2160 | Digital connectors summary grid (6 entries) |
| IMG_2161–2163 | Video resolutions table (QQVGA – 8K UHD, 3 scroll states) |

---

## 2. Information Architecture

Video section index lists 10 entries: BNC, RCA, DVI, F-Connector, HDMI, Mini-DIN,
VGA, DisplayPort, an analog-vs-digital connector summary, and a resolutions chart.

Every connector detail page follows one template:

1. **Hero:** large 3D-rendered connector image (their strongest asset — instant recognition).
2. **Prose overview:** 2–4 short paragraphs.
3. **Bottom tab bar** switching between variants/views. Examples:
   - BNC: Overview / Crimp / Compression / Info
   - RCA: Composite / RCA (termination) / Info (configurations)
   - DVI: Overview / DVI-A / DVI-D / DVI-I
   - HDMI: Overview / HDMI-A / HDMI-C / HDMI-D
   - DisplayPort: Overview / DP pinout / Mini DP pinout
4. **Termination pages:** exploded 3D view with labeled parts (e.g., centre pin / body /
   crimp barrel), a strip-length diagram with an a/b/c dimension table in dual units
   (mm + inches), and a "Termination Guide" button (video).
5. **Pinout pages:** labeled 3D render + flat pin-grid diagram + scrollable pin/function list.
6. DVI-D and DVI-I pages have a single↔dual link toggle (small "D" button, top-right) —
   good information-density management.

### Navigation weaknesses
- No search anywhere. Everything is category → connector → tab drilling.
- Long pinout lists scroll under a fixed header render that consumes ~45% of the screen;
  the pin-grid diagram scrolls away just when you need it against the list.
- No deep-linking or sharing (inherent app limitation — web advantage for AVForge).
- Tab labels sometimes duplicate ("F-Connector / F-Connector", "Display Port / Display Port"),
  relying only on the icon to distinguish overview from pinout.

---

## 3. Content Coverage Snapshot

| Connector | Overview | Termination | Pinout | Extras |
|---|---|---|---|---|
| BNC | Yes | Crimp + Compression, strip tables | No pinout (2-conductor) | Boots, impedance info |
| RCA | Yes | Solder-type, strip guidance | Signal/ground callouts | YPbPr + RGBHV color maps |
| DVI | Yes | No | A, D (SL/DL), I (SL/DL) | TMDS explanation |
| F-Connector | Yes | Strip guidance | No | — |
| HDMI | Yes | No | Type A, C, D | Versions table (1.x–2.1), CEC note |
| Mini-DIN | Yes | No | S-Video 4-pin | — |
| VGA | Yes | Guide button | 15-pin full | — |
| DisplayPort | Yes | No | DP + Mini DP 20-pin | Versions table (1.0–1.4 only) |
| Summary lists | Analog (8) / Digital (6) grids | — | — | SCART appears with no detail page |
| Resolutions | Table QQVGA–8K, H/V/aspect/Mpx | — | — | Contains data errors (see §4) |

### Missing for 2026 (gap = AVForge opportunity)
- **USB-C / DP Alt Mode** — the most-asked connector topic in current AV; absent entirely.
- **HDBaseT / Cat6A termination**, shielded RJ45 practice for AV-over-IP.
- **Fiber:** LC/SC, SFP/SFP+, single-mode vs multimode, AOC.
- **12G-SDI context** on BNC; HD-BNC / micro-BNC variants.
- **DP 2.0/2.1** (UHBR10/13.5/20) — their table stops at DP 1.4.
- **HDMI 2.1 FRL vs TMDS** distinction and cable certification tiers
  (Premium / Ultra High Speed) — the actual field questions.
- Modern context on legacy pages (e.g., RCA's real 2026 role: unbalanced audio,
  sub lines, S/PDIF — their framing is composite/component video).

---

## 4. Confirmed Content Errors (QC log)

Verified against public standards; cite screenshots for evidence.

1. **BNC impedance "70-ohm"** on overview (IMG_2113); correct is 75Ω. Their own Info tab
   (IMG_2116) correctly says 50Ω/75Ω — internal inconsistency.
2. **F-Connector history** (IMG_2133): claims it cabled the first computer networks.
   Early Ethernet coax used N-type/BNC/vampire taps (10BASE5/10BASE2), not F.
   F is RF/CATV/satellite.
3. **DP overview claims 16K support** (IMG_2151) while their versions table (IMG_2152)
   tops out at DP 1.4, which cannot carry 16K. Internal inconsistency.
4. **DP versions table outdated** (IMG_2152): no DP 2.0/2.1; 8K@120 shown as
   unsupported across the board (true only because 2.x is missing).
5. **Resolutions table — qHD megapixels = "10.518"** (IMG_2161, repeated IMG_2162).
   960×540 = 0.518 Mpx. Off by ~20×.
6. **Resolutions table — XGA aspect "4:4"** (IMG_2162). 1024×768 is 4:3.
7. **Resolutions table — 4K UHD aspect "169"** (missing colon) and
   **4K Cinema aspect "1:9"** (IMG_2163). 4096×2160 ≈ 17:9 (exact 256:135).
8. **S-Video pin labels** (IMG_2146): "Y (Intesity)(Luma)" typo; both Y and C
   labeled "Intensity". Y = luma, C = chroma.
9. **RCA copy** (IMG_2117): "it's component parts" (typo); framing dated to
   composite/component video era.
10. **DP pinout** (IMG_2154): pin 14 "connected to Ground1)" stray parenthesis;
    DP_PWR spec (3.3V/500mA) shown on full-size DP but omitted on Mini DP.
11. **Content freshness smoking gun** (IMG_2160): digital summary says DP 2.0 is
    "hitting the market in late 2020" — content is ~6 years stale.

**Verified-accurate content worth noting:** HDMI A/C/D pin remapping correctly
differentiated; Mini DP vs full DP pin reordering correct; DVI variant pin
assignments consistent with the spec; strip-length tables plausible and dual-unit.

---

## 5. UX Patterns to Adopt / Beat

### Adopt (they do it well)
- 3D connector thumbnails in the index — instant visual recognition before reading.
- Consistent detail-page template; users learn it once.
- Exploded assembly views for termination (parts labeled).
- Dual-unit strip-length tables (mm + inches).
- Per-variant tabs keep each screen focused.
- Single↔dual link toggle pattern (state toggle instead of more pages).

### Beat (their weaknesses)
- **Pinned pin-grid:** keep the diagram fixed while the pin list scrolls; tapping a pin in
  the diagram highlights its row (and vice versa). Kills their #1 usability problem.
- **Search + deep links:** `/pinouts/dvi-d`, `/pinouts/hdmi-a` — shareable with field techs.
- **Computed, not hand-typed tables:** derive aspect ratio and megapixels from H×V.
  Their qHD/XGA/4K errors (see §4) are exactly the class of mistake computation eliminates.
- **Modern-first ordering:** USB-C, HDMI 2.1, DP 2.1, fiber, Cat6A/HDBaseT first;
  legacy (VGA, DVI, S-Video, SCART) in a collapsed "Legacy" group.
- **Contextual why-it-matters:** e.g., impedance mismatch consequences at 12G-SDI rates,
  not just the 50/75Ω fact.

---

## 6. AVForge Build Spec — Signal Bandwidth Calculator (replaces their static version tables)

Their best idea (DP versions matrix, IMG_2152) executed as a static, outdated table.
Build it as a calculator:

**Inputs:** resolution (preset list + custom H×V), refresh rate, bit depth (8/10/12),
chroma (4:4:4 / 4:2:2 / 4:2:0), DSC toggle.

**Compute:**
- Pixel clock and data rate with standard blanking (CVT-R2) — show both raw video
  payload and link-rate requirement.
- Compare against link capacities: HDMI TMDS (1.4: 10.2 Gbps, 2.0: 18 Gbps),
  HDMI FRL tiers (2.1: up to 48 Gbps), DP HBR2/HBR3, DP 2.1 UHBR10/13.5/20;
  optionally HDBaseT class limits.

**Output:** pass/fail per transport with headroom %, DSC-required flags, and the
formula shown (AVForge differentiator: always show the math).

**Data-integrity rule:** every derived column (aspect, Mpx, bandwidth) computed from
base values at render time. No hand-typed derived data anywhere in AVForge.

---

## 7. Resolution Reference — corrected seed data

Use as the seed list for AVForge's resolutions module (aspect and Mpx to be
computed at render; values below are for validation only).

| Name | H | V | Aspect | Mpx |
|---|---|---|---|---|
| VGA | 640 | 480 | 4:3 | 0.31 |
| SVGA | 800 | 600 | 4:3 | 0.48 |
| qHD | 960 | 540 | 16:9 | 0.52 |
| XGA | 1024 | 768 | 4:3 | 0.79 |
| HD | 1280 | 720 | 16:9 | 0.92 |
| WXGA | 1280 | 800 | 16:10 | 1.02 |
| SXGA | 1280 | 1024 | 5:4 | 1.31 |
| WXGA+ | 1440 | 900 | 16:10 | 1.30 |
| HD+ | 1600 | 900 | 16:9 | 1.44 |
| UXGA | 1600 | 1200 | 4:3 | 1.92 |
| WSXGA+ | 1680 | 1050 | 16:10 | 1.76 |
| FHD | 1920 | 1080 | 16:9 | 2.07 |
| WUXGA | 1920 | 1200 | 16:10 | 2.30 |
| WQHD | 2560 | 1440 | 16:9 | 3.69 |
| WQXGA | 2560 | 1600 | 16:10 | 4.10 |
| 4K UHD | 3840 | 2160 | 16:9 | 8.29 |
| DCI 4K | 4096 | 2160 | ≈17:9 (256:135) | 8.85 |
| 5K | 5120 | 2880 | 16:9 | 14.75 |
| 8K UHD | 7680 | 4320 | 16:9 | 33.18 |

(Add 16:10 laptop-panel and 21:9/32:9 ultrawide entries — absent in AV Buddy.)

---

## 8. Open Items

- Audio, Calculators, Tools, Glossary sections: capture + teardown pending
  (separate docs: `audio-teardown.md`, `calculators-teardown.md`, ...).
- HDMI Versions table screen not yet captured (Versions button on IMG_2135).
- SCART appears in the analog summary grid with no detail page — confirm no page exists.
- Feature matrix (AV Buddy vs AVForge roadmap) to be compiled after all sections captured.
