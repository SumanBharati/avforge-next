/* Signed-in app areas. They are disallowed in robots.txt and additionally
   marked noindex so they can never appear in search results. */
const PRIVATE_PREFIXES = [
  "dashboard",
  "projects",
  "board",
  "org",
  "admin",
  "profile",
  "inventory",
  "procurement",
  "project-management",
  "time-tracking",
  "designEngineering",
  "welcome",
  "login",
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // The legacy /reference section duplicated pages that now live under /calculators and /references.
  async redirects() {
    return [
      { source: "/reference", destination: "/references", permanent: true },
      { source: "/reference/standards", destination: "/calculators/standards", permanent: true },
      { source: "/reference/poe-database", destination: "/calculators/poe-database", permanent: true },
    ];
  },

  async headers() {
    return PRIVATE_PREFIXES.map((prefix) => ({
      source: `/${prefix}/:path*`,
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
    }));
  },
};

export default nextConfig;
