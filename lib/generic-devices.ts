// The generic (manufacturer = "Generic") equipment that Room Designer and Signal
// Flow ship with, as it should exist in the AVGenix library (av_products).
//
// The library rows carry two kinds of information:
//   * what the spreadsheets supply (ports, category, price ...), and
//   * what only Room Designer needs — where the thing mounts, how big its
//     footprint is on the plan, its camera FOV / speaker dispersion. No
//     spreadsheet has these, so they live here and are applied by
//     `scripts/sync-generic-devices.ts`. Re-run that script after any bulk
//     library import; the importers now leave these columns alone, but a fresh
//     database (or a re-created row) starts without them.
//
// Footprints and colours are the ones in Room Designer's own built-in catalog
// (app/designEngineering/room-designer/page.tsx `deviceCatalog`) — keep the two
// in step.

export type GenericPort = { side: "left" | "right"; signal: string; dir: "in" | "out"; label: string; connector?: string };

export interface GenericDevice {
  model_name: string;
  /** Only used when the row has to be created; an existing row keeps its own. */
  category: string;
  color: string;
  /** Only used when the row has to be created. */
  ports?: GenericPort[];
  /** Room Designer placement. Omit for equipment that has no floor-plan symbol. */
  rd?: {
    type: "display" | "camera" | "mic" | "speaker" | "control" | "projector";
    wall: "front" | "ceiling" | "floor" | "table" | "side";
    width_ft: number;
    height_ft: number;
    icon: string;
  };
  /** Cameras: horizontal field of view (degrees). */
  hfov_deg?: number;
  /** Ceiling speakers: dispersion cone (degrees). */
  coverage_angle_deg?: number;
}

/** Width and height (feet) of a 16:9 panel from its diagonal in inches — computed, never typed. */
export function panelSizeFt(diagonalIn: number): { width_ft: number; height_ft: number } {
  const diagonalFt = diagonalIn / 12;
  const hypotenuse = Math.hypot(16, 9);
  const round2 = (n: number) => Math.round(n * 100) / 100;
  return { width_ft: round2((diagonalFt * 16) / hypotenuse), height_ft: round2((diagonalFt * 9) / hypotenuse) };
}

const DISPLAY = "#8b5cf6", CAMERA = "#22c55e", MIC = "#f59e0b", SPEAKER = "#ef4444", CONTROL = "#a855f7";

export const GENERIC_DEVICES: GenericDevice[] = [
  // --- Room Designer's built-in catalog --------------------------------------
  { model_name: '43" Display',  category: "Displays", color: DISPLAY, rd: { type: "display", wall: "front", width_ft: 3.12, height_ft: 1.77, icon: "monitor" } },
  { model_name: '55" Display',  category: "Displays", color: DISPLAY, rd: { type: "display", wall: "front", width_ft: 4.00, height_ft: 2.26, icon: "monitor" } },
  { model_name: '65" Display',  category: "Displays", color: DISPLAY, rd: { type: "display", wall: "front", width_ft: 4.76, height_ft: 2.69, icon: "monitor" } },
  { model_name: '75" Display',  category: "Displays", color: DISPLAY, rd: { type: "display", wall: "front", width_ft: 5.45, height_ft: 3.08, icon: "monitor" } },
  { model_name: '86" Display',  category: "Displays", color: DISPLAY, rd: { type: "display", wall: "front", width_ft: 6.27, height_ft: 3.54, icon: "monitor" } },
  { model_name: '98" Display',  category: "Displays", color: DISPLAY, rd: { type: "display", wall: "front", width_ft: 7.12, height_ft: 4.00, icon: "monitor" } },
  { model_name: '110" Display', category: "Displays", color: DISPLAY, rd: { type: "display", wall: "front", width_ft: 7.97, height_ft: 4.49, icon: "monitor" } },
  { model_name: "Projection Screen", category: "Displays", color: DISPLAY, rd: { type: "display", wall: "front", width_ft: 7.87, height_ft: 4.92, icon: "presentation" } },
  { model_name: "LED Video Wall",    category: "Display",  color: "#06b6d4", rd: { type: "display", wall: "front", width_ft: 9.84, height_ft: 5.58, icon: "tv" } },
  // The projector UNIT (a ~20" ceiling box), not the screen it projects onto.
  { model_name: "Projector", category: "Display", color: DISPLAY, rd: { type: "projector", wall: "ceiling", width_ft: 1.67, height_ft: 1.67, icon: "projector" } },

  { model_name: "PTZ Camera",     category: "Camera", color: CAMERA, hfov_deg: 70,  rd: { type: "camera", wall: "front",   width_ft: 0.49, height_ft: 0.39, icon: "confbar" } },
  { model_name: "Conference Bar", category: "Camera", color: CAMERA, hfov_deg: 120, rd: { type: "camera", wall: "front",   width_ft: 2.30, height_ft: 0.39, icon: "soundbar" } },
  { model_name: "Ceiling Camera", category: "Camera", color: CAMERA, hfov_deg: 90,  rd: { type: "camera", wall: "ceiling", width_ft: 0.66, height_ft: 0.66, icon: "confbar" } },

  // A 2' x 2' ceiling tile. No coverage is set on purpose: the Ceiling Plan
  // estimates a mic's pickup from ceiling height unless a size is entered.
  { model_name: "Ceiling Mic Array", category: "Audio", color: MIC,     rd: { type: "mic",     wall: "ceiling", width_ft: 2.00, height_ft: 2.00, icon: "🎙" } },
  { model_name: "Table Mic",         category: "Audio", color: MIC,     rd: { type: "mic",     wall: "table",   width_ft: 0.44, height_ft: 0.44, icon: "🎙" } },
  { model_name: "Ceiling Speaker",   category: "Audio", color: SPEAKER, coverage_angle_deg: 90, rd: { type: "speaker", wall: "ceiling", width_ft: 0.67, height_ft: 0.67, icon: "🔊" } },
  { model_name: "Wall Speaker",      category: "Audio", color: SPEAKER, rd: { type: "speaker", wall: "front",   width_ft: 1.04, height_ft: 1.67, icon: "🔊" } },

  { model_name: "Touch Panel (Wall)",  category: "Control", color: CONTROL, rd: { type: "control", wall: "side",  width_ft: 0.92, height_ft: 0.59, icon: "📱" } },
  { model_name: "Touch Panel (Table)", category: "Control", color: CONTROL, rd: { type: "control", wall: "table", width_ft: 0.86, height_ft: 0.43, icon: "📱" } },
  { model_name: "Cable Cubby",         category: "Control", color: CONTROL, rd: { type: "control", wall: "table", width_ft: 0.98, height_ft: 0.49, icon: "🔌" } },

  // --- Signal Flow's generic devices that the library didn't have ------------
  // A 24" monitor; the footprint is computed from the diagonal.
  {
    model_name: "Confidence Monitor", category: "Displays", color: DISPLAY,
    ports: [{ side: "left", signal: "hdmi", dir: "in", label: "HDMI" }],
    rd: { type: "display", wall: "front", ...panelSizeFt(24), icon: "monitor" },
  },
  {
    model_name: "Microphone", category: "Audio", color: MIC,
    ports: [{ side: "right", signal: "dante", dir: "out", label: "Dante" }],
  },
];
