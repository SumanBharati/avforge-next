import type { Metadata } from "next";
import HomeBannerCarousel from "@/components/home/HomeBannerCarousel";
import DemoVideoSection from "@/components/home/DemoVideoSection";
import PlanComparisonSection from "@/components/home/PlanComparisonSection";
import HomeFooter from "@/components/home/HomeFooter";
import JsonLd from "@/components/JsonLd";
import { HOME_BANNERS } from "@/lib/home-banners";
import { HOME_DEMO_VIDEOS } from "@/lib/home-demo-videos";
import { PLAN_COMPARISON_FEATURES } from "@/lib/home-plan-comparison";
import { pageMetadata } from "@/lib/seo";
import { SALES_EMAIL, SITE_DESCRIPTION, SITE_NAME, SITE_URL, SUPPORT_EMAIL } from "@/lib/site";

const HOME_TITLE = "AVGenix — AV Project Management & Design Software";

export const metadata: Metadata = pageMetadata({ title: HOME_TITLE, description: SITE_DESCRIPTION, path: "/", absoluteTitle: true });

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icons/icon-512.png`,
    description: SITE_DESCRIPTION,
    contactPoint: [
      { "@type": "ContactPoint", contactType: "customer support", email: SUPPORT_EMAIL },
      { "@type": "ContactPoint", contactType: "sales", email: SALES_EMAIL },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any (web browser)",
    // Prices mirror the plan comparison table on this page.
    offers: [
      { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
      {
        "@type": "Offer",
        name: "Pro",
        price: "20",
        priceCurrency: "USD",
        priceSpecification: { "@type": "UnitPriceSpecification", price: "20", priceCurrency: "USD", unitCode: "MON" },
      },
    ],
  },
];

export default function HomePage() {
  return (
    <>
      <JsonLd data={structuredData} />
      <HomeBannerCarousel banners={HOME_BANNERS} />
      <DemoVideoSection demos={HOME_DEMO_VIDEOS} />
      <PlanComparisonSection features={PLAN_COMPARISON_FEATURES} />
      <HomeFooter />
    </>
  );
}
