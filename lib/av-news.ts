import { XMLParser } from "fast-xml-parser";

// Dashboard "AV News & Podcasts" card: headlines from publishers' public RSS
// feeds, each linking back to the original article or episode. Checked
// 2026-09-27 — Commercial Integrator, CE Pro and avnation.tv block automated
// requests, and rAVe's podcast feed stopped updating in 2025.
export type AvNewsKind = "news" | "podcast";

export const AV_NEWS_FEEDS: { source: string; kind: AvNewsKind; url: string }[] = [
  { source: "AV Network", kind: "news", url: "https://www.avnetwork.com/feeds/all" },
  { source: "rAVe [PUBS]", kind: "news", url: "https://www.ravepubs.com/feed/" },
  { source: "AV Interactive", kind: "news", url: "https://www.avinteractive.com/feed/" },
  { source: "AVIXA Podcasts", kind: "podcast", url: "https://anchor.fm/s/1efa715c/podcast/rss" },
  // Episodes carry no <link>, so they fall back to the show's page.
  { source: "AVWeek", kind: "podcast", url: "https://rss.art19.com/avweek" },
];

// The card shows 3 news items and 2 podcast episodes; podcasts publish weekly,
// so a plain "latest 5" would almost never include one.
export const AV_NEWS_MIX: Record<AvNewsKind, number> = { news: 3, podcast: 2 };

export type AvNewsItem = {
  title: string;
  url: string;
  source: string;
  kind: AvNewsKind;
  publishedAt: string; // ISO 8601
};

const parser = new XMLParser({
  ignoreAttributes: true,
  htmlEntities: true,
  // A title like "2026" must stay a string.
  parseTagValue: false,
  isArray: (name) => name === "item",
});

function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  // <link> sometimes appears twice (e.g. alongside an atom:link) or wraps CDATA.
  if (Array.isArray(value)) return text(value.find((v) => text(v)));
  if (value && typeof value === "object" && "#text" in value) return text((value as { "#text": unknown })["#text"]);
  return "";
}

function cleanTitle(raw: string): string {
  // Entities can arrive double-encoded ("&amp;#038;"), so decode what's left
  // after the parser, then strip any stray markup and collapse whitespace.
  return raw
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function httpsUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function parseFeed(xml: string, feed: { source: string; kind: AvNewsKind }): AvNewsItem[] {
  const channel = parser.parse(xml)?.rss?.channel;
  if (!channel) return [];
  const showUrl = httpsUrl(text(channel.link));
  const items: AvNewsItem[] = [];
  for (const item of channel.item ?? []) {
    const title = cleanTitle(text(item.title));
    const url = httpsUrl(text(item.link)) ?? showUrl;
    const date = new Date(text(item.pubDate));
    if (!title || !url || Number.isNaN(date.getTime())) continue;
    items.push({ title, url, source: feed.source, kind: feed.kind, publishedAt: date.toISOString() });
  }
  return items;
}

// Newest first, one entry per headline (the same story can appear in more
// than one feed), then the newest of each kind. Deduped by title rather than
// link because AVWeek episodes all share the show's link.
export function pickLatest(items: AvNewsItem[], mix = AV_NEWS_MIX): AvNewsItem[] {
  const seen = new Set<string>();
  const sorted = [...items]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .filter((item) => {
      const key = item.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  const picked = (Object.keys(mix) as AvNewsKind[]).flatMap((kind) => sorted.filter((i) => i.kind === kind).slice(0, mix[kind]));
  return picked.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
