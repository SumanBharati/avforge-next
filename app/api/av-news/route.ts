import { NextResponse } from "next/server";
import { AV_NEWS_FEEDS, parseFeed, pickLatest, type AvNewsItem } from "@/lib/av-news";

// Built once and then regenerated at most once a day: everyone sees the same
// saved list, and the publishers' feeds are fetched about once a day in total.
// The first request after 24 hours still gets the saved list while a fresh
// one is built in the background.
const ONE_DAY = 60 * 60 * 24;
export const revalidate = 86400;

async function fetchFeed(feed: (typeof AV_NEWS_FEEDS)[number]): Promise<AvNewsItem[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "AVGenix/1.0 (+https://avgenix.com)" },
      next: { revalidate: ONE_DAY },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return parseFeed(await res.text(), feed);
  } catch (err) {
    // One broken feed shouldn't empty the card; the other sources fill in.
    console.error(`AV news feed failed: ${feed.source} (${feed.url})`, err);
    return [];
  }
}

export async function GET() {
  const results = await Promise.all(AV_NEWS_FEEDS.map(fetchFeed));
  const items = pickLatest(results.flat());
  // Throwing during the daily refresh makes Next keep serving the previous
  // day's list instead of saving an empty one for 24 hours.
  if (items.length === 0 && process.env.NEXT_PHASE !== "phase-production-build") {
    throw new Error("AV news: every feed failed");
  }
  return NextResponse.json({ items, updatedAt: new Date().toISOString() });
}
