import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { scopeText } = await req.json();

    if (typeof scopeText !== "string" || !scopeText.trim()) {
      return NextResponse.json({ error: "scopeText is required" }, { status: 400 });
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2000,
      system: `You are an AV integrator's assistant. You are given a room's free-text "Scope of Work" description and must identify every distinct AV device or system it mentions, so they can be auto-placed as blocks on a signal-flow diagram, grouped into installation locations.

Return ONLY valid JSON (no markdown, no explanation) with this exact shape:
{
  "devices": [
    { "category": "display|camera|speaker|touch_panel|microphone|other", "label": "", "quantity": 1, "location": "" }
  ]
}

Rules:
- One entry per distinct device/system mentioned — deduplicate repeated mentions of the same thing rather than listing it twice.
- category must be exactly one of: "display", "camera", "speaker", "touch_panel", "microphone", "other". Use "other" for anything AV-related that doesn't fit those five (amplifiers, DSPs, video conferencing codecs, network switches, control processors, etc.) — never drop something just because it doesn't fit a category.
- label: a short, human-readable name that preserves the specific placement/type from the text, e.g. "Front Wall Display", "Ceiling Speaker", "Wall Mounted Touch Panel", "Table Top Touch Panel", "Front Camera", "Rear Camera", "Ceiling Microphone", "Table Microphone". Keep it concise (a few words), title case, no trailing punctuation.
- quantity: the explicit or clearly-implied count (e.g. "ceiling speakers" with no number implies more than one — use your best judgment, default 2; an explicit number like "4 ceiling speakers" uses that number). Default to 1 when the text doesn't imply multiples.
- location: a short installation location name, 1-3 words, title case (e.g. "Front Wall", "Rear Wall", "Side Wall", "Ceiling", "Table", "Lectern", "Equipment Rack"). Infer this from where the text says or implies the device sits — use ordinary AV-integrator common sense when it isn't stated outright: a "ceiling speaker"/"ceiling microphone" belongs in "Ceiling" even if the sentence doesn't repeat the word; a "front camera"/"a display at the front wall" belongs in "Front Wall"; a DSP, amplifier, network switch, or other back-of-house equipment belongs in "Equipment Rack" unless the text says otherwise. Use the EXACT SAME location string (character-for-character) for every device that belongs in the same place, so they group together. If — and only if — there is truly no reasonable way to guess where a device goes, set location to null rather than forcing a guess.
- If the scope text describes no AV devices at all, return {"devices": []}.`,
      messages: [
        {
          role: "user",
          content: `Scope of Work:\n\n${scopeText}\n\nIdentify the AV devices/systems described, in the JSON shape described.`,
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

    if (!Array.isArray(data?.devices)) data = { devices: [] };

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Generate devices from scope error:", error);
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
