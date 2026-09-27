"use client";

import { useEffect, useState } from "react";

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// "Today" / "3 days ago" for an AV news item. Worked out in the viewer's
// browser after load: the /av-news page is saved for up to a day, so text
// rendered on the server would go stale. Until then it shows the plain date.
export default function AvNewsTimeAgo({ iso }: { iso: string }) {
  const [label, setLabel] = useState(() => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }));
  useEffect(() => setLabel(timeAgo(iso)), [iso]);
  return <time dateTime={iso} title={new Date(iso).toUTCString()}>{label}</time>;
}
