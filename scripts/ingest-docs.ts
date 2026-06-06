/**
 * AVForge Document Ingestion Script
 *
 * Usage:
 *   npx tsx scripts/ingest-docs.ts <path-to-folder-with-pdfs>
 *
 * Example:
 *   npx tsx scripts/ingest-docs.ts C:/Users/ervik/Downloads/av-docs
 *
 * This script:
 *   1. Reads all PDFs from the given folder
 *   2. Extracts text and splits into chunks
 *   3. Generates embeddings via Voyage AI
 *   4. Stores chunks + embeddings in Supabase (document_chunks table)
 *
 * Run this whenever you add/update PDFs. The script clears old data first.
 */

import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";
import { createClient } from "@supabase/supabase-js";
import { VoyageAIClient } from "voyageai";

// ── Config ──────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY!;

const CHUNK_SIZE = 800;      // target tokens per chunk (approx chars / 4)
const CHUNK_OVERLAP = 100;   // overlap between chunks for context continuity
const EMBEDDING_MODEL = "voyage-3-lite";
const EMBEDDING_BATCH_SIZE = 8; // Voyage supports batching

// ── Helpers ─────────────────────────────────────────────────

function chunkText(text: string, docName: string): { content: string; metadata: Record<string, any> }[] {
  // Clean up text
  const cleaned = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+/g, " ")
    .trim();

  const targetChars = CHUNK_SIZE * 4; // rough token-to-char ratio
  const overlapChars = CHUNK_OVERLAP * 4;
  const chunks: { content: string; metadata: Record<string, any> }[] = [];

  // Try to split on paragraph boundaries
  const paragraphs = cleaned.split(/\n\n+/);
  let currentChunk = "";
  let chunkIndex = 0;

  for (const para of paragraphs) {
    if (currentChunk.length + para.length > targetChars && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: { source: docName, chunk_index: chunkIndex },
      });
      chunkIndex++;

      // Keep overlap from end of previous chunk
      const words = currentChunk.split(" ");
      const overlapWords = words.slice(-Math.floor(overlapChars / 5));
      currentChunk = overlapWords.join(" ") + " " + para;
    } else {
      currentChunk += (currentChunk ? " " : "") + para;
    }
  }

  // Final chunk
  if (currentChunk.trim().length > 50) {
    chunks.push({
      content: currentChunk.trim(),
      metadata: { source: docName, chunk_index: chunkIndex },
    });
  }

  return chunks;
}

// ── Main ────────────────────────────────────────────────────

async function main() {
  const folder = process.argv[2];
  if (!folder) {
    console.error("Usage: npx tsx scripts/ingest-docs.ts <folder-path>");
    process.exit(1);
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing SUPABASE env vars. Make sure .env.local is loaded.");
    process.exit(1);
  }
  if (!VOYAGE_API_KEY) {
    console.error("Missing VOYAGE_API_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const voyage = new VoyageAIClient({ apiKey: VOYAGE_API_KEY });

  // Find all PDFs
  const files = fs.readdirSync(folder).filter((f) => f.toLowerCase().endsWith(".pdf"));
  if (files.length === 0) {
    console.error("No PDF files found in:", folder);
    process.exit(1);
  }

  console.log(`Found ${files.length} PDF(s):`);
  files.forEach((f) => console.log(`  - ${f}`));

  // Clear existing chunks
  console.log("\nClearing existing chunks...");
  await supabase.from("document_chunks").delete().neq("id", 0);

  // Process each PDF
  const allChunks: { content: string; metadata: Record<string, any> }[] = [];

  for (const file of files) {
    const filePath = path.join(folder, file);
    console.log(`\nParsing: ${file}`);

    const buffer = fs.readFileSync(filePath);
    const pdf = await pdfParse(buffer);
    console.log(`  Pages: ${pdf.numpages}, Characters: ${pdf.text.length}`);

    const chunks = chunkText(pdf.text, file);
    console.log(`  Chunks: ${chunks.length}`);
    allChunks.push(...chunks);
  }

  console.log(`\nTotal chunks: ${allChunks.length}`);
  console.log("Generating embeddings and storing...\n");

  // Process in batches
  let stored = 0;
  for (let i = 0; i < allChunks.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = allChunks.slice(i, i + EMBEDDING_BATCH_SIZE);
    const texts = batch.map((c) => c.content);

    // Generate embeddings
    const embeddingResponse = await voyage.embed({
      input: texts,
      model: EMBEDDING_MODEL,
      inputType: "document",
    });

    // Store in Supabase
    const rows = batch.map((chunk, j) => ({
      content: chunk.content,
      metadata: chunk.metadata,
      embedding: JSON.stringify(embeddingResponse.data![j].embedding),
    }));

    const { error } = await supabase.from("document_chunks").insert(rows);
    if (error) {
      console.error(`Error storing batch ${i}:`, error.message);
    } else {
      stored += rows.length;
      const pct = Math.round((stored / allChunks.length) * 100);
      process.stdout.write(`  Progress: ${stored}/${allChunks.length} chunks (${pct}%)\r`);
    }

    // Small delay to avoid rate limits
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\n\nDone! Stored ${stored} chunks in Supabase.`);
  console.log("You can now delete the local PDFs — they're no longer needed.");
}

// Load .env.local
import { config } from "dotenv";
config({ path: ".env.local" });

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
