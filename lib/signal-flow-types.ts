// Shared types for Signal Flow's canvas and for the AI-driven scope→topology
// pipeline (lib/signal-flow-topology.ts, app/api/generate-signal-flow-topology).
//
// SIGNAL_TYPES/UNKNOWN_SIGNAL used to be declared locally inside
// app/designEngineering/signal-flow/page.tsx — moved here, unchanged, so
// server-side code (the topology API route) and client code share the same
// taxonomy instead of guessing at it independently.

export type SignalTypeId =
  | "hdmi" | "usb" | "dante" | "cat6" | "analog" | "speaker"
  | "control" | "fiber" | "sdi" | "proprietary";

export const SIGNAL_TYPES: { id: SignalTypeId; name: string; color: string }[] = [
  { id: "hdmi", name: "HDMI", color: "#8b5cf6" },
  { id: "usb", name: "USB", color: "#a855f7" },
  { id: "dante", name: "UTP", color: "#22c55e" },
  { id: "cat6", name: "STP", color: "#f59e0b" },
  { id: "analog", name: "Analog Audio", color: "#ef4444" },
  { id: "speaker", name: "Speaker", color: "#f97316" },
  { id: "control", name: "Control", color: "rgb(var(--text-subtle))" },
  { id: "fiber", name: "Fiber", color: "#06b6d4" },
  { id: "sdi", name: "Coax", color: "#ec4899" },
  { id: "proprietary", name: "Proprietary", color: "#3b82f6" },
];

export const UNKNOWN_SIGNAL = { id: null as any, name: "–", color: "rgb(var(--text-subtle))" };

/**
 * Controlled role vocabulary for AI-generated (still-generic) equipment.
 * Informational/rendering metadata today — deterministic connection
 * validation goes by port direction + signalType, not role, since those are
 * the properties an AV cable actually has to agree on.
 */
export type DeviceRole =
  | "video_source" | "av_source" | "audio_source"
  | "conferencing_processor" | "audio_processor" | "audio_amplifier"
  | "control_processor" | "signal_transport"
  | "video_destination" | "audio_destination" | "other";

/**
 * Friendlier header label than the raw role id — used for a scope-generated
 * block whose coarse scope category is "other" (DSP, amplifier, codec, etc.
 * all land there) once AI topology has assigned it a more specific role.
 */
export const ROLE_LABELS: Record<DeviceRole, string> = {
  video_source: "Video Source",
  av_source: "AV Source",
  audio_source: "Audio Source",
  conferencing_processor: "Conferencing Codec",
  audio_processor: "Audio Processor",
  audio_amplifier: "Amplifier",
  control_processor: "Control Processor",
  signal_transport: "Signal Transport",
  video_destination: "Display",
  audio_destination: "Speaker",
  other: "Equipment",
};

/**
 * A logical, design-intent port for a piece of equipment that hasn't been
 * selected yet — NOT a claim about a real product's physical ports. Only
 * "input"/"output" exist because that's all the signal-flow canvas itself
 * models today (no port on any DEVICE_LIBRARY entry is bidirectional).
 */
export interface GeneratedPort {
  /** Unique within its own device only (e.g. "p1") — not a canvas port id. */
  id: string;
  name: string;
  signalType: SignalTypeId;
  direction: "input" | "output";
}

/** AI-proposed role + ports for one ScopeUnit (keyed by its itemId). */
export interface GeneratedDevice {
  itemId: string;
  role: DeviceRole;
  ports: GeneratedPort[];
}

/** AI-proposed cable between two GeneratedDevice ports, keyed by itemId/portId. */
export interface ProposedConnection {
  sourceItemId: string;
  sourcePortId: string;
  targetItemId: string;
  targetPortId: string;
  signalType: SignalTypeId;
  confidence?: number;
  reason?: string;
}
