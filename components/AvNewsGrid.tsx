import AvNewsTimeAgo from "@/components/AvNewsTimeAgo";
import { PodcastIcon } from "@/components/AvNewsList";
import type { AvNewsItem } from "@/lib/av-news";

// /av-news page: news items and podcast episodes in two columns, each card
// opening the original article or episode in a new tab. Rendered on the
// server so the headlines are in the page HTML search engines read.
export default function AvNewsGrid({ items }: { items: AvNewsItem[] }) {
  if (items.length === 0) {
    return <p className="text-[14px] text-subtle">News is unavailable right now. Please check back later.</p>;
  }

  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {items.map((item) => (
        <li key={item.url + item.title} className="flex">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="forge-card group flex w-full flex-col gap-2"
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-subtle">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={item.kind === "podcast"
                  ? { background: "rgba(139, 92, 246, 0.14)", color: "#8b5cf6" }
                  : { background: "rgba(26, 202, 230, 0.14)", color: "#0ea5c6" }}
              >
                {item.kind === "podcast" && <PodcastIcon />}
                {item.kind === "podcast" ? "Podcast" : "News"}
              </span>
              <span className="font-medium text-muted">{item.source}</span>
              <span aria-hidden="true">·</span>
              <AvNewsTimeAgo iso={item.publishedAt} />
            </div>
            <span className="text-[15px] font-semibold leading-snug text-body group-hover:underline">
              {item.title}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
