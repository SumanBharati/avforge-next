import { NextResponse } from "next/server";
import { fetchAllAvNews, pickLatest } from "@/lib/av-news";

// Dashboard card data. Built once and then regenerated at most once a day, so
// everyone sees the same saved list. The first request after 24 hours still
// gets the saved list while a fresh one is built in the background.
// force-static keeps the feeds' no-store fetches from turning this into a
// per-request route. (The /av-news page keeps its own daily copy.)
export const dynamic = "force-static";
export const revalidate = 86400;

export async function GET() {
  const items = pickLatest(await fetchAllAvNews());
  return NextResponse.json({ items, updatedAt: new Date().toISOString() });
}
