// ─── PoE Device Library ───────────────────────────────────────────────────────

export const POE_DEVICES = [
  { name: 'Shure MXA920', type: 'Ceiling Mic', poeClass: 4, draw: 25.5, standard: '802.3at' },
  { name: 'Shure MXA910', type: 'Ceiling Mic', poeClass: 4, draw: 25.5, standard: '802.3at' },
  { name: 'Shure MXA710', type: 'Wall Mic', poeClass: 3, draw: 12.95, standard: '802.3af' },
  { name: 'Shure MXA310', type: 'Table Mic', poeClass: 3, draw: 12.95, standard: '802.3af' },
  { name: 'Shure P300', type: 'DSP', poeClass: 3, draw: 12.95, standard: '802.3af' },
  { name: 'Shure ANIUSB-MATRIX', type: 'USB Interface', poeClass: 3, draw: 12.95, standard: '802.3af' },
  { name: 'Sennheiser TCC2', type: 'Ceiling Mic', poeClass: 4, draw: 25.5, standard: '802.3at' },
  { name: 'Sennheiser TeamConnect Bar', type: 'Soundbar', poeClass: 5, draw: 40, standard: '802.3bt' },
  { name: 'Biamp Parlé TCM-XA', type: 'Ceiling Mic', poeClass: 4, draw: 25.5, standard: '802.3at' },
  { name: 'Biamp Parlé ABC 2500T', type: 'Beamtrack Mic', poeClass: 4, draw: 25.5, standard: '802.3at' },
  { name: 'QSC NV-32-H', type: 'NV Endpoint', poeClass: 4, draw: 25.5, standard: '802.3at' },
  { name: 'Crestron DM-NVX-350', type: 'NVX Endpoint', poeClass: 4, draw: 25.5, standard: '802.3at' },
  { name: 'Crestron DM-NVX-E30', type: 'NVX Encoder', poeClass: 3, draw: 12.95, standard: '802.3af' },
  { name: 'Crestron DM-NVX-D30', type: 'NVX Decoder', poeClass: 3, draw: 12.95, standard: '802.3af' },
  { name: 'Crestron TSW-1070', type: 'Touch Panel', poeClass: 4, draw: 25.5, standard: '802.3at' },
  { name: 'Crestron TSW-770', type: 'Touch Panel', poeClass: 3, draw: 12.95, standard: '802.3af' },
  { name: 'Cisco Room Navigator', type: 'Touch Panel', poeClass: 3, draw: 12.95, standard: '802.3af' },
  { name: 'Cisco Room Bar', type: 'Video Bar', poeClass: 5, draw: 40, standard: '802.3bt' },
  { name: 'Neat Bar', type: 'Video Bar', poeClass: 5, draw: 40, standard: '802.3bt' },
  { name: 'Neat Pad', type: 'Touch Controller', poeClass: 3, draw: 12.95, standard: '802.3af' },
  { name: 'Logitech Rally Bar', type: 'Video Bar', poeClass: 5, draw: 40, standard: '802.3bt' },
  { name: 'Logitech Tap', type: 'Touch Controller', poeClass: 3, draw: 12.95, standard: '802.3af' },
  { name: 'Huddly IQ', type: 'Camera', poeClass: 2, draw: 6.49, standard: '802.3af' },
  { name: 'Axis P1375', type: 'IP Camera', poeClass: 3, draw: 12.95, standard: '802.3af' },
  { name: 'Extron NAV E 501', type: 'NAV Encoder', poeClass: 4, draw: 25.5, standard: '802.3at' },
  { name: 'Extron NAV SD 501', type: 'NAV Decoder', poeClass: 4, draw: 25.5, standard: '802.3at' },
  { name: 'AtlasIED IP-HVP', type: 'IP Speaker', poeClass: 3, draw: 12.95, standard: '802.3af' },
  { name: 'QSC Q-LAN Interface', type: 'Audio Interface', poeClass: 3, draw: 12.95, standard: '802.3af' },
];

// ─── Conduit Sizes (EMT) ─────────────────────────────────────────────────────

export const CONDUIT_SIZES = [
  { size: '1/2"',   trade: 'EMT', id: 0.622, area: 0.304 },
  { size: '3/4"',   trade: 'EMT', id: 0.824, area: 0.533 },
  { size: '1"',     trade: 'EMT', id: 1.049, area: 0.864 },
  { size: '1-1/4"', trade: 'EMT', id: 1.380, area: 1.496 },
  { size: '1-1/2"', trade: 'EMT', id: 1.610, area: 2.036 },
  { size: '2"',     trade: 'EMT', id: 2.067, area: 3.356 },
  { size: '2-1/2"', trade: 'EMT', id: 2.731, area: 5.858 },
  { size: '3"',     trade: 'EMT', id: 3.356, area: 8.846 },
  { size: '4"',     trade: 'EMT', id: 4.334, area: 14.753 },
];

// ─── Cable Types ──────────────────────────────────────────────────────────────

export const CABLE_TYPES = [
  { name: 'Cat6 (Plenum)',     od: 0.25, area: 0.049 },
  { name: 'Cat6A (Plenum)',    od: 0.31, area: 0.075 },
  { name: 'Cat5e (Plenum)',    od: 0.22, area: 0.038 },
  { name: 'RG-6 Coax',        od: 0.275, area: 0.059 },
  { name: 'Fiber (2-strand)', od: 0.20, area: 0.031 },
  { name: 'Fiber (12-strand)',od: 0.35, area: 0.096 },
  { name: '14/2 Speaker',     od: 0.28, area: 0.062 },
  { name: '12/2 Speaker',     od: 0.32, area: 0.080 },
  { name: '16/2 Speaker',     od: 0.22, area: 0.038 },
  { name: '22/4 Control',     od: 0.20, area: 0.031 },
  { name: 'HDBaseT (Cat6A)',  od: 0.31, area: 0.075 },
  { name: 'USB 3.0 Active',   od: 0.30, area: 0.071 },
];
