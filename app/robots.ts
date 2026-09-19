import type { MetadataRoute } from "next";

const BASE_URL = "https://avgenix.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
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
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
