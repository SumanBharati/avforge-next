import type { Metadata } from "next";
import BackLink from "@/components/BackLink";
import AvNewsGrid from "@/components/AvNewsGrid";
import { fetchAllAvNews, latestUnique } from "@/lib/av-news";
import { pageMetadata } from "@/lib/seo";

// Built on the server and then rebuilt at most once a day, so search engines
// get the headlines in the HTML and everyone sees the same saved page. The
// dashboard card's /api/av-news route keeps its own daily copy, so the feeds
// are fetched about twice a day in total. force-static keeps the feeds'
// no-store fetches from turning this into a per-request page.
export const dynamic = "force-static";
export const revalidate = 86400;

export const metadata: Metadata = pageMetadata({
  title: "AV Industry News & Podcasts",
  description: "The latest pro AV industry news and podcast episodes from leading AV publications and shows, updated daily.",
  path: "/av-news",
});

const PAGE_SIZE = 20;

export default async function AvNewsPage() {
  // Strictly the newest 20, whatever their kind (unlike the dashboard card's
  // 3 news + 2 podcasts).
  const items = latestUnique(await fetchAllAvNews()).slice(0, PAGE_SIZE);

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8">
      <BackLink href="/dashboard" label="Back to Dashboard" />
      <h1 style={{ fontSize: 22, marginBottom: 4, fontWeight: 600 }} className="text-heading">AV News & Podcasts</h1>
      <p style={{ fontSize: 14, marginBottom: 28, maxWidth: 720 }} className="text-subtle">
        Headlines and podcast episodes from across the pro AV industry: new products, projects, standards and
        business news. Select any story to read or listen to it on the original site.
      </p>
      <AvNewsGrid items={items} />
    </div>
  );
}
