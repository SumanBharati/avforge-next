"use client";

import { useEffect, useState } from "react";
import type { AvNewsItem } from "@/lib/av-news";
import AvNewsTimeAgo from "@/components/AvNewsTimeAgo";

export const PodcastIcon = ({ size = 11 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
    <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="2" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Dashboard "AV News & Podcasts" list: 3 news headlines + 2 podcast episodes
// from /api/av-news (refreshed once a day), each opening the original page.
export default function AvNewsList() {
  const [items, setItems] = useState<AvNewsItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/av-news")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: { items: AvNewsItem[] }) => { if (!cancelled) setItems(data.items); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  if (failed || items?.length === 0) {
    return <p className="text-[13px]" style={{ color: "var(--infocard-subtle)" }}>News is unavailable right now.</p>;
  }

  if (!items) {
    return (
      <div className="flex flex-col gap-3 pr-[88px]" aria-busy="true" aria-label="Loading AV news">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div className="mt-[5px] h-[7px] w-[7px] shrink-0 rounded-full opacity-40" style={{ background: "#1ACAE6" }} />
            <div className="flex-1">
              <div className="h-3 animate-pulse rounded" style={{ width: `${85 - i * 8}%`, background: "var(--infocard-pill-bg)" }} />
              <div className="mt-1.5 h-2 w-1/3 animate-pulse rounded" style={{ background: "var(--infocard-pill-bg)" }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2.5 pr-[88px]">
      {items.map((item) => (
        <li key={item.url + item.title} className="flex items-start gap-2.5">
          <div className="mt-[5px] h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: item.kind === "podcast" ? "#8b5cf6" : "#1ACAE6" }} />
          <div className="min-w-0">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              title={item.title}
              className="line-clamp-2 text-[13px] leading-snug hover:underline"
              style={{ color: "var(--infocard-item)" }}
            >
              {item.title}
            </a>
            <div className="mt-0.5 flex items-center gap-1 text-[11px]" style={{ color: "var(--infocard-subtle)" }}>
              {item.kind === "podcast" && <PodcastIcon />}
              <span>{item.source} · <AvNewsTimeAgo iso={item.publishedAt} /></span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
