// Compresses a photo client-side (same pattern used for site-survey photos)
// and returns it as a JPEG data URL, so uploads stay small enough to send to
// the extraction API in one request.
export function compressPhotoFile(file: File, maxDim = 1400, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = document.createElement("img");
      img.onerror = () => reject(new Error("Could not read image"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = (h / w) * maxDim; w = maxDim; } else { w = (w / h) * maxDim; h = maxDim; }
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export interface ExtractedEquipment {
  manufacturer: string;
  model: string;
  category: string;
  notes: string;
  partNumber: string | null;
  ports: Array<{ side: string; dir: string; signal: string; label: string; connector?: string }>;
  ampDraw: number | null;
  voltage: number | null;
  powerWatts: number | null;
  btuHr: number | null;
  rackMounted: boolean;
  rackUnits: number | null;
  widthIn: number | null;
  heightIn: number | null;
  depthIn: number | null;
  weightLb: number | null;
  aiNotes?: string;
}

export async function extractEquipmentFromPhotos(
  images: string[],
  knownCategories?: string[]
): Promise<{ data: ExtractedEquipment } | { error: string }> {
  try {
    const res = await fetch("/api/extract-equipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images, knownCategories }),
    });
    const json = await res.json();
    if (!res.ok) return { error: json?.error || "AI extraction failed" };
    return { data: json.data as ExtractedEquipment };
  } catch (err: any) {
    return { error: err?.message || "AI extraction failed" };
  }
}
