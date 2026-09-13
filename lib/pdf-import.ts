// Renders the first page of an uploaded PDF to a flat PNG data URL, so it
// can be dropped into Room Designer's floor-plan background pipeline the
// same way a photo or a rasterized DXF import is — one image, then the
// existing two-point "Set Scale" calibration (in inches) establishes its
// real-world scale, since a PDF page's own point size says nothing about
// what scale a printed/exported drawing was actually plotted at.
//
// Dynamically imported (only inside the upload handler, never at module
// scope) — pdfjs-dist touches browser-only APIs (DOMMatrix, etc.) that don't
// exist during Next.js's server-side render of this page.
export async function pdfToBackgroundImage(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  // The worker is loaded from a CDN pinned to the exact installed version,
  // rather than bundled — avoids wiring up Next.js's webpack config to
  // handle pdfjs-dist's own worker/wasm asset resolution for a single,
  // occasional-use feature.
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const page = await pdf.getPage(1);
  // 2x scale for a crisper background at typical zoom levels than the PDF's
  // native 72dpi point size would give.
  const viewport = page.getViewport({ scale: 2 });

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  if (!canvas.getContext("2d")) throw new Error("Canvas 2D context unavailable");

  await page.render({ canvas, viewport }).promise;
  return canvas.toDataURL("image/png");
}
