import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/* ── Per-calculator SEO copy ───────────────────────────────────
   Titles are kept to ~50 characters so "<title> — AVGenix" stays
   inside Google's ~60-character display limit. Descriptions stay
   within ~155 characters. `name` is used in structured data. */
export interface CalculatorSeo {
  name: string;
  title: string;
  description: string;
  kind: "calculator" | "reference";
}

export const CALCULATOR_SEO: Record<string, CalculatorSeo> = {
  "70v-tap": {
    name: "70V Speaker Tap Calculator",
    title: "70V Speaker Tap Calculator",
    description: "Calculate transformer taps and total wattage for 70V constant-voltage speaker distribution. Free calculator for AV designers and integrators.",
    kind: "calculator",
  },
  "camera-fov": {
    name: "Camera Field of View Calculator",
    title: "Camera Field of View (FOV) Calculator",
    description: "Calculate camera field of view and coverage at a given distance. A free field-of-view calculator for AV and video conferencing room design.",
    kind: "calculator",
  },
  "conduit-fill": {
    name: "Conduit Fill Calculator",
    title: "Conduit Fill Calculator (NEC)",
    description: "Check NEC conduit fill percentage for EMT conduit and cable bundles, with a jam ratio check. Free conduit fill calculator for AV installers.",
    kind: "calculator",
  },
  "dante-bandwidth": {
    name: "Dante and AES67 Bandwidth Calculator",
    title: "Dante & AES67 Bandwidth Calculator",
    description: "Estimate Dante (unicast and multicast) and AES67 bandwidth per flow to plan an audio-over-IP network. Free planning calculator for AV network designers.",
    kind: "calculator",
  },
  "display-sizing": {
    name: "Display Sizing Calculator",
    title: "Display Sizing Calculator",
    description: "Calculate image height and viewing distance to size displays and screens for any room. Free display sizing calculator for AV designers.",
    kind: "calculator",
  },
  "led-pitch": {
    name: "LED Pixel Pitch Calculator",
    title: "LED Pixel Pitch Calculator",
    description: "Find the best LED wall pixel pitch, resolution, total pixels and minimum viewing distance from viewing distance and wall size. Free LED video wall calculator.",
    kind: "calculator",
  },
  "pag-nag": {
    name: "PAG / NAG Acoustic Gain Calculator",
    title: "PAG / NAG Acoustic Gain Calculator",
    description: "Calculate potential acoustic gain (PAG) and needed acoustic gain (NAG) to check the stability of microphone and sound reinforcement systems.",
    kind: "calculator",
  },
  "poe-budget": {
    name: "PoE Budget Calculator",
    title: "PoE Budget Calculator",
    description: "Plan Power over Ethernet budgets for IEEE 802.3af, at and bt switches and devices. Free PoE budget calculator for AV and network integrators.",
    kind: "calculator",
  },
  "projector-lumens": {
    name: "Projector Lumens Calculator",
    title: "Projector Lumens Calculator",
    description: "Work out how many lumens a projector needs from screen size and room lighting conditions. Free projector brightness calculator for AV designers.",
    kind: "calculator",
  },
  "projector-throw": {
    name: "Projector Throw Distance Calculator",
    title: "Projector Throw Distance Calculator",
    description: "Compute projector throw ratio, throw distance, lens type and image dimensions. Free projector throw calculator for AV designers and integrators.",
    kind: "calculator",
  },
  "rack-heat": {
    name: "Rack Heat Load Calculator",
    title: "Rack Heat Load Calculator (BTU/hr)",
    description: "Calculate equipment rack heat load in BTU/hr to size cooling and ventilation. Free rack thermal calculator for AV and IT installers.",
    kind: "calculator",
  },
  "screen-size": {
    name: "Aspect Ratio to Screen Size Calculator",
    title: "Aspect Ratio to Screen Size Calculator",
    description: "Convert aspect ratio and diagonal into screen width and height in inches, centimeters and feet. Includes 16:9, 16:10, 21:9 and 4:3 presets.",
    kind: "calculator",
  },
  "speaker-coverage": {
    name: "Speaker Coverage Calculator",
    title: "Ceiling Speaker Coverage Calculator",
    description: "Calculate ceiling speaker coverage, aiming and speaker count with an EPR-based method. Free speaker coverage calculator for AV designers.",
    kind: "calculator",
  },
  "speaker-impedance": {
    name: "Speaker Impedance Calculator",
    title: "Speaker Impedance Calculator",
    description: "Calculate total speaker load impedance for series, parallel and series/parallel wiring. Free speaker impedance calculator for AV installers.",
    kind: "calculator",
  },
  "speaker-wire": {
    name: "Speaker Wire Gauge Calculator",
    title: "Speaker Wire Gauge (AWG) Calculator",
    description: "Find the minimum AWG for any speaker cable run using NEC Article 640 and AVIXA CTS-D guidance. Free speaker wire gauge calculator.",
    kind: "calculator",
  },
  "throw-ratio": {
    name: "Projector Throw Ratio and Lumens Calculator",
    title: "Projector Throw Ratio & Lumens Calculator",
    description: "Calculate projector throw distance and the brightness needed for a screen in one tool. Free throw ratio and lumens calculator for AV design.",
    kind: "calculator",
  },
  "unit-converter": {
    name: "AV Unit Converter",
    title: "AV Unit Converter",
    description: "Convert AV-specific units for length, power, temperature and more. A free unit converter built for audiovisual engineers and integrators.",
    kind: "calculator",
  },
  "poe-database": {
    name: "PoE Device Database",
    title: "PoE Device Database",
    description: "Per-device PoE class and power draw reference for AV equipment, filterable by IEEE standard. Free PoE device lookup for AV integrators.",
    kind: "reference",
  },
  standards: {
    name: "AVIXA CTS-D Formula Sheet",
    title: "AVIXA / CTS-D Formula Sheet",
    description: "AV engineering formulas from AVIXA and CTS-D study material with worked examples, including viewing distance, image height, throw ratio and lumens.",
    kind: "reference",
  },
  connectors: {
    name: "AV Connectors and Cables Reference",
    title: "AV Connectors & Cables Reference",
    description: "Pinouts, link versions, field wiring and practical notes for AV connectors including HDMI, DisplayPort, USB-C, RJ45, fiber, BNC/SDI and XLR.",
    kind: "reference",
  },
  "microphone-polar-patterns": {
    name: "Microphone Polar Patterns Guide",
    title: "Microphone Polar Patterns Guide",
    description: "Compare omnidirectional, cardioid, supercardioid, hypercardioid, bi-directional and shotgun microphone polar patterns and their typical uses.",
    kind: "reference",
  },
  "resolution-reference": {
    name: "Display Resolution Reference",
    title: "Display Resolution Reference Chart",
    description: "Common display formats with pixel dimensions and aspect ratios and megapixel counts computed from H×V. A quick AV resolution reference.",
    kind: "reference",
  },
};

interface PageMetadataInput {
  /** Page title without the site name (the root layout adds "— AVGenix"). */
  title: string;
  description: string;
  /** Path beginning with "/", used for the canonical URL and og:url. */
  path: string;
  /** Use for pages that must stay out of search results. */
  noindex?: boolean;
  /** The title already contains the site name, so skip the "— AVGenix" suffix. */
  absoluteTitle?: boolean;
}

// Default 1200x630 share image (public/og/avgenix-share.png). Pages that define their own openGraph/twitter
// objects replace the root ones, so the image has to be repeated here.
export const SHARE_IMAGE = { url: "/og/avgenix-share.png", width: 1200, height: 630, alt: "AVGenix — AV project management and design software" };

export function pageMetadata({ title, description, path, noindex, absoluteTitle }: PageMetadataInput): Metadata {
  const socialTitle = absoluteTitle ? title : `${title} — ${SITE_NAME}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: socialTitle,
      description,
      url: path,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_US",
      images: [SHARE_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [SHARE_IMAGE],
    },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

export function calculatorMetadata(slug: string): Metadata {
  const seo = CALCULATOR_SEO[slug];
  return pageMetadata({ title: seo.title, description: seo.description, path: `/calculators/${slug}` });
}

/* ── Structured data (schema.org JSON-LD) ──────────────────── */
export function calculatorJsonLd(slug: string) {
  const seo = CALCULATOR_SEO[slug];
  const url = `${SITE_URL}/calculators/${slug}`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: seo.kind === "reference" ? "References" : "Calculators", item: `${SITE_URL}/${seo.kind === "reference" ? "references" : "calculators"}` },
        { "@type": "ListItem", position: 3, name: seo.name, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: seo.name,
      url,
      description: seo.description,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any (web browser)",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    },
  ];
}
