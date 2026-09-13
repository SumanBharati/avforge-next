// Minimal ASCII DXF writer (R12-compatible entity codes) — produces just a
// bare ENTITIES section, which AutoCAD and other CAD software accept
// without the optional HEADER/TABLES/BLOCKS sections. No external library
// or dependency: DXF is a plain text format and these are the same handful
// of group codes (0/8/10/20/30/11/21/31/40/50/51/1) that have been stable
// since DXF R12 in the early 1990s and remain valid in current AutoCAD.
//
// Coordinates are in whatever unit the caller is working in — Room Designer
// and Rack Builder pass real-world feet/inches (so the drawing opens at
// true scale), Signal Flow Builder passes its own canvas pixel units (it
// has no physical scale to begin with).
export class DxfWriter {
  private lines: string[] = [];

  private push(code: number, value: string | number) {
    this.lines.push(String(code), String(value));
  }

  line(x1: number, y1: number, x2: number, y2: number, layer = "0") {
    this.push(0, "LINE");
    this.push(8, layer);
    this.push(10, x1.toFixed(4));
    this.push(20, y1.toFixed(4));
    this.push(30, 0);
    this.push(11, x2.toFixed(4));
    this.push(21, y2.toFixed(4));
    this.push(31, 0);
  }

  rect(x: number, y: number, w: number, h: number, layer = "0") {
    this.line(x, y, x + w, y, layer);
    this.line(x + w, y, x + w, y + h, layer);
    this.line(x + w, y + h, x, y + h, layer);
    this.line(x, y + h, x, y, layer);
  }

  circle(cx: number, cy: number, r: number, layer = "0") {
    if (r <= 0) return;
    this.push(0, "CIRCLE");
    this.push(8, layer);
    this.push(10, cx.toFixed(4));
    this.push(20, cy.toFixed(4));
    this.push(30, 0);
    this.push(40, r.toFixed(4));
  }

  polyline(points: { x: number; y: number }[], layer = "0") {
    for (let i = 0; i < points.length - 1; i++) {
      this.line(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y, layer);
    }
  }

  // `align` matches the on-screen SVG textAnchor convention (start/middle/end
  // rendered as left/center/right here) — the annotation Text tool supports
  // centered and right-aligned text, and without a matching DXF horizontal
  // justification code (group 72) every exported line would silently
  // left-align at x instead, reading as a different layout than the app.
  // Per the DXF TEXT spec, a non-default justification needs a *second*
  // alignment point (group 11/21/31) equal to the same coordinate — the
  // primary 10/20/30 point stays required either way.
  text(x: number, y: number, height: number, value: string, layer = "0", align: "left" | "center" | "right" = "left") {
    if (!value) return;
    this.push(0, "TEXT");
    this.push(8, layer);
    this.push(10, x.toFixed(4));
    this.push(20, y.toFixed(4));
    this.push(30, 0);
    this.push(40, height.toFixed(4));
    this.push(1, value.replace(/[\r\n]+/g, " "));
    if (align !== "left") {
      this.push(72, align === "center" ? 1 : 2);
      this.push(11, x.toFixed(4));
      this.push(21, y.toFixed(4));
      this.push(31, 0);
    }
  }

  build(): string {
    return ["0", "SECTION", "2", "ENTITIES", ...this.lines, "0", "ENDSEC", "0", "EOF", ""].join("\n");
  }
}

export function downloadDxf(writer: DxfWriter, filename: string) {
  const blob = new Blob([writer.build()], { type: "application/dxf" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename.endsWith(".dxf") ? filename : `${filename}.dxf`;
  a.click();
  URL.revokeObjectURL(a.href);
}
