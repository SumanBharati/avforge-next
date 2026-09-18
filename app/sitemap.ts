import type { MetadataRoute } from "next";
import fs from "fs";
import path from "path";

const BASE_URL = "https://avgenix.com";

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
  const referenceRoutes = listRouteDirs("app/reference");

  const entries: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/login`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/register`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/calculators`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/reference`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/references`, changeFrequency: "weekly", priority: 0.6 },
  ];

  for (const slug of calculators) {
    entries.push({ url: `${BASE_URL}/calculators/${slug}`, changeFrequency: "monthly", priority: 0.8 });
  }
  for (const slug of referenceRoutes) {
    entries.push({ url: `${BASE_URL}/reference/${slug}`, changeFrequency: "monthly", priority: 0.6 });
  }

  return entries;
}
