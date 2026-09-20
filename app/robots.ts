import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Signed-in app areas and API routes: nothing here should be crawled.
      // (These paths also send an X-Robots-Tag: noindex header — see next.config.mjs.)
      disallow: [
        "/dashboard",
        "/projects",
        "/board",
        "/org",
        "/admin",
        "/profile",
        "/inventory",
        "/procurement",
        "/project-management",
        "/time-tracking",
        "/designEngineering",
        "/welcome",
        "/api",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
