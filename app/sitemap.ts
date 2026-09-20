import type { MetadataRoute } from "next";
import fs from "fs";
import path from "path";
import { SITE_URL } from "@/lib/site";

/* Only public, indexable, canonical URLs belong here. Excluded on purpose:
   - /login (noindex, no search value)
   - /reference, /reference/standards, /reference/poe-database (301-redirect to their /calculators or /references equivalents)
   - every signed-in app route (dashboard, projects, board, ...) */
function listRouteDirs(dir: string): string[] {
  const full = path.join(process.cwd(), dir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(full, d.name, "page.tsx")))
    .map((d) => d.name)
    .sort();
}

export default function sitemap(): MetadataRoute.Sitemap {
  const calculators = listRouteDirs("app/calculators");

  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/calculators`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/references`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/reference/platforms`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/register`, changeFrequency: "monthly", priority: 0.4 },
  ];

  for (const slug of calculators) {
    entries.push({ url: `${SITE_URL}/calculators/${slug}`, changeFrequency: "monthly", priority: 0.8 });
  }

  return entries;
}
