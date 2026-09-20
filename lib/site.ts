/* Single source of truth for the public site identity used by metadata,
   sitemap, robots and structured data. Override the domain with
   NEXT_PUBLIC_SITE_URL (e.g. for a staging domain). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://avgenix.com").replace(/\/+$/, "");
export const SITE_NAME = "AVGenix";
export const SITE_DESCRIPTION =
  "All-in-one software for AV professionals: project management, AI site surveys, room design, signal flow, proposals and procurement, plus free AV calculators.";
export const SUPPORT_EMAIL = "support@avgenix.com";
export const SALES_EMAIL = "sales@avgenix.com";
