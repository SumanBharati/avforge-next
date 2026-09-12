import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

interface ScopeItem {
  category: string;
  manufacturer: string;
  model: string;
  description: string;
  qty: number;
}

export async function POST(req: NextRequest) {
  try {
    const {
      roomName,
      items,
      surveyData,
      existingScope,
    }: { roomName?: string; items?: ScopeItem[]; surveyData?: Record<string, string> | null; existingScope?: string } = await req.json();

    const equipmentLines = (items || [])
      .filter((i) => i.manufacturer || i.model || i.description)
      .map((i) => `- ${i.qty}x ${[i.category, i.manufacturer, i.model].filter(Boolean).join(" ")}${i.description ? ` (${i.description})` : ""}`)
      .join("\n");

    // Site Survey carries dozens of fields per room; only forward the ones
    // with real content, and only the free-text "_notes" fields plus a
    // handful of scope-relevant selects — not the whole flat blob.
    const survey = surveyData || {};
    const surveyLines = Object.entries(survey)
      .filter(([k, v]) => v && typeof v === "string" && v.trim() && !k.startsWith("photo_") && k !== "scope_of_work")
      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
      .join("\n");

    if (!equipmentLines.trim() && !surveyLines.trim() && !(existingScope || "").trim()) {
      return NextResponse.json({ error: "No room data, equipment, or notes to generate from yet" }, { status: 400 });
    }

    const prompt = `You are an AV systems integrator writing the Scope of Work section of a client-facing proposal for ${roomName ? `the "${roomName}"` : "a"} room. Write a professional, concise scope of work paragraph (4-7 sentences, plain prose, no bullet points, no headers) describing what AV systems will be installed, key functionality being delivered, and any notable technical requirements or constraints. Write it as something a client would read in a signed proposal — confident and specific, not a bulleted equipment list restated as sentences.

${equipmentLines ? `Equipment being installed in this room:\n${equipmentLines}\n` : ""}
${surveyLines ? `Site survey notes and room requirements:\n${surveyLines}\n` : ""}
${existingScope?.trim() ? `An existing draft scope of work to improve on (rewrite and expand rather than repeat verbatim):\n${existingScope}\n` : ""}

Return only the scope of work paragraph text, nothing else.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
    return NextResponse.json({ scope_of_work: text });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to generate" }, { status: 500 });
  }
}
