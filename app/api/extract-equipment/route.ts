import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const MAX_IMAGES = 6;
const DATA_URL_RE = /^data:image\/(jpeg|jpg|png|webp);base64,([\s\S]+)$/;

export async function POST(req: NextRequest) {
  try {
    const { images, knownCategories } = await req.json();

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "At least one photo is required" }, { status: 400 });
    }
    if (images.length > MAX_IMAGES) {
      return NextResponse.json({ error: `Please send at most ${MAX_IMAGES} photos` }, { status: 400 });
    }

    const imageBlocks: Anthropic.ImageBlockParam[] = [];
    for (const img of images) {
      if (typeof img !== "string") continue;
      const match = img.match(DATA_URL_RE);
      if (!match) {
        return NextResponse.json({ error: "Photos must be JPEG, PNG, or WebP images" }, { status: 400 });
      }
      const mediaType = `image/${match[1] === "jpg" ? "jpeg" : match[1]}` as "image/jpeg" | "image/png" | "image/webp";
      imageBlocks.push({ type: "image", source: { type: "base64", media_type: mediaType, data: match[2] } });
    }
    if (imageBlocks.length === 0) {
      return NextResponse.json({ error: "No valid photos received" }, { status: 400 });
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 4000,
      system: `You are an AV integrator's assistant. You are given photos of a single piece of AV/IT equipment — its front panel, rear/connector panel, and/or a label showing power or model specs. Extract what you can confidently read or infer into structured JSON describing it for an equipment library.

Return ONLY valid JSON (no markdown, no explanation) with this exact shape:
{
  "manufacturer": "",
  "model": "",
  "category": "",
  "notes": "",
  "partNumber": null,
  "ports": [{ "side": "left|right|top|bottom", "dir": "in|out", "signal": "", "label": "", "connector": "" }],
  "ampDraw": null,
  "voltage": null,
  "powerWatts": null,
  "btuHr": null,
  "rackMounted": false,
  "rackUnits": null,
  "widthIn": null,
  "heightIn": null,
  "depthIn": null,
  "weightLb": null,
  "aiNotes": ""
}

Rules:
- Only fill in a field if it is clearly legible or safely inferable from the photos. Leave text fields as "" and numeric fields as null when unsure — never guess a number.
- manufacturer/model: read from the printed brand/model text on the unit or its label. Do not confuse a serial number with the model number.
- partNumber: the manufacturer's ordering/SKU part number if visibly printed (often near a barcode). Leave null if not shown or if only a serial number is visible.
- category: a short, general product category (e.g. "Display", "Video Switcher", "Amplifier", "Speaker", "Microphone", "Camera", "Control Processor", "Network Switch", "Power Amplifier", "Rack Accessory").${Array.isArray(knownCategories) && knownCategories.length ? ` Prefer reusing one of these existing categories when it fits: ${knownCategories.join(", ")}.` : ""}
- notes: a one-sentence plain description of what the device is/does.
- ports: one entry per physical connector visible on a rear/connector-panel photo. "side" is which side of a signal-flow block diagram this port should be drawn on — use "left" for inputs and "right" for outputs unless the physical layout clearly suggests otherwise. "signal" is the signal type (hdmi, usb, xlr, rj45, speaker, etc). "connector" is the physical connector type (HDMI, USB-C, RJ45, XLR-3, Phoenix, etc). "label" is the printed label next to the port if visible (e.g. "HDMI IN 1"), else a short generic label.
- Voltage/amp draw/power watts/BTU: read from a power/electrical label if one is visible in the photos.
- rackMounted/rackUnits: only set true/a number if rack ears or a rack-unit height are visible or the form factor is clearly a rack-mount chassis.
- Dimensions and weight: only fill in if printed on a label; do not estimate from the photo.
- aiNotes: a short note (or "") flagging anything ambiguous, unreadable, or that the user should double-check before saving.`,
      messages: [
        {
          role: "user",
          content: [
            ...imageBlocks,
            { type: "text", text: "Extract this equipment's specs into the JSON shape described." },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";

    let data;
    try {
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
      data = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response", raw: text }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Extract equipment error:", error);
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
