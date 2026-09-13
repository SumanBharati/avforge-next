// Minimal DXF reader for the "import a CAD drawing as a background" feature —
// the counterpart to lib/dxf-export.ts's writer. Only the entity types real
// AutoCAD exports commonly use for a floor plan outline are supported: LINE,
// LWPOLYLINE, CIRCLE, and ARC (POLYLINE/VERTEX chains, TEXT, INSERT blocks,
// HATCH, and SPLINE are skipped). The result is rasterized to a flat PNG data
// URL — same as a photo or PDF import — rather than kept as live vector
// geometry, since the drawing is only ever used as a traced-over background,
// not an editable layer. The DXF's own units are deliberately never trusted
// (many files carry missing or wrong $INSUNITS headers) — the app's existing
// two-point "Set Scale" calibration is what actually establishes real-world
// scale, in inches, to match the equipment library's own dimensions.

interface Segment { x1: number; y1: number; x2: number; y2: number }

function parseDxfSegments(text: string): Segment[] {
  const rawLines = text.split(/\r\n|\r|\n/);
  const pairs: { code: number; value: string }[] = [];
  for (let i = 0; i + 1 < rawLines.length; i += 2) {
    const code = parseInt(rawLines[i].trim(), 10);
    if (Number.isNaN(code)) continue;
    pairs.push({ code, value: rawLines[i + 1].trim() });
  }

  let start = -1, end = -1;
  for (let i = 0; i < pairs.length; i++) {
    if (start < 0 && pairs[i].code === 2 && pairs[i].value === "ENTITIES") start = i;
    else if (start >= 0 && pairs[i].code === 0 && pairs[i].value === "ENDSEC") { end = i; break; }
  }
  if (start < 0) return [];

  const segs: Segment[] = [];
  const addArc = (cx: number, cy: number, r: number, startDeg: number, endDeg: number) => {
    let a1 = startDeg, a2 = endDeg;
    if (a2 < a1) a2 += 360;
    const steps = 32;
    let prev: { x: number; y: number } | null = null;
    for (let k = 0; k <= steps; k++) {
      const t = (a1 + (a2 - a1) * (k / steps)) * Math.PI / 180;
      const p = { x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) };
      if (prev) segs.push({ x1: prev.x, y1: prev.y, x2: p.x, y2: p.y });
      prev = p;
    }
  };

  let i = start + 1;
  while (i < end) {
    if (pairs[i].code !== 0) { i++; continue; }
    const type = pairs[i].value;
    i++;
    const entity: Record<number, string[]> = {};
    while (i < end && pairs[i].code !== 0) {
      (entity[pairs[i].code] ||= []).push(pairs[i].value);
      i++;
    }
    if (type === "LINE") {
      const x1 = parseFloat(entity[10]?.[0]), y1 = parseFloat(entity[20]?.[0]);
      const x2 = parseFloat(entity[11]?.[0]), y2 = parseFloat(entity[21]?.[0]);
      if ([x1, y1, x2, y2].every(Number.isFinite)) segs.push({ x1, y1, x2, y2 });
    } else if (type === "LWPOLYLINE") {
      const xs = (entity[10] || []).map(parseFloat);
      const ys = (entity[20] || []).map(parseFloat);
      const closed = (parseInt(entity[70]?.[0] || "0", 10) & 1) === 1;
      const n = Math.min(xs.length, ys.length);
      for (let k = 0; k < n - 1; k++) segs.push({ x1: xs[k], y1: ys[k], x2: xs[k + 1], y2: ys[k + 1] });
      if (closed && n > 2) segs.push({ x1: xs[n - 1], y1: ys[n - 1], x2: xs[0], y2: ys[0] });
    } else if (type === "CIRCLE") {
      const cx = parseFloat(entity[10]?.[0]), cy = parseFloat(entity[20]?.[0]), r = parseFloat(entity[40]?.[0]);
      if ([cx, cy, r].every(Number.isFinite)) addArc(cx, cy, r, 0, 360);
    } else if (type === "ARC") {
      const cx = parseFloat(entity[10]?.[0]), cy = parseFloat(entity[20]?.[0]), r = parseFloat(entity[40]?.[0]);
      const a1 = parseFloat(entity[50]?.[0]), a2 = parseFloat(entity[51]?.[0]);
      if ([cx, cy, r, a1, a2].every(Number.isFinite)) addArc(cx, cy, r, a1, a2);
    }
  }
  return segs;
}

// Draws the parsed geometry onto an offscreen canvas at a fixed target
// resolution (preserving aspect ratio) and returns it as a PNG data URL, or
// null if the file had none of the supported entity types.
export function dxfToBackgroundImage(text: string): string | null {
  const segs = parseDxfSegments(text);
  if (!segs.length) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  segs.forEach(s => {
    minX = Math.min(minX, s.x1, s.x2); maxX = Math.max(maxX, s.x1, s.x2);
    minY = Math.min(minY, s.y1, s.y2); maxY = Math.max(maxY, s.y1, s.y2);
  });
  const w = maxX - minX || 1, h = maxY - minY || 1;
  const TARGET_LONG_EDGE = 1600, PAD = 20;
  const scale = TARGET_LONG_EDGE / Math.max(w, h);

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale) + PAD * 2;
  canvas.height = Math.round(h * scale) + PAD * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#1f2937";
  ctx.lineWidth = 1;
  ctx.beginPath();
  // DXF's Y axis increases upward; canvas Y increases downward — flip.
  segs.forEach(s => {
    const x1 = (s.x1 - minX) * scale + PAD, y1 = canvas.height - ((s.y1 - minY) * scale + PAD);
    const x2 = (s.x2 - minX) * scale + PAD, y2 = canvas.height - ((s.y2 - minY) * scale + PAD);
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  });
  ctx.stroke();
  return canvas.toDataURL("image/png");
}
