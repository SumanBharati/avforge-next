import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { roomData } = await req.json();

    const fields = Object.entries(roomData as Record<string, string>)
      .filter(([k, v]) => v && typeof v === "string" && v.trim() && !k.startsWith("photo_") && k !== "scope_of_work")
      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
      .join("\n");

    if (!fields.trim()) {
      return NextResponse.json({ error: "No room data to generate from" }, { status: 400 });
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: `You are an AV systems integrator writing a site survey scope of work. Based on the room survey data below, write a concise scope of work paragraph (3-5 sentences). Describe what AV systems will be installed or upgraded, key technical requirements, and any notable constraints or special considerations. Write in plain prose, no bullet points.\n\nRoom data:\n${fields}`,
      }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
    return NextResponse.json({ scope_of_work: text });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to generate" }, { status: 500 });
  }
}
