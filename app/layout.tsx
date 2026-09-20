import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";
import ThemeProvider from "@/components/ThemeProvider";
import OrgProvider from "@/components/OrgProvider";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { SHARE_IMAGE } from "@/lib/seo";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: false,
});

const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const bingVerification = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AVGenix — AV Project Management & Design Software",
    template: "%s — AVGenix",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  openGraph: {
    title: "AVGenix — AV Project Management & Design Software",
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
    images: [SHARE_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "AVGenix — AV Project Management & Design Software",
    description: SITE_DESCRIPTION,
    images: [SHARE_IMAGE],
  },
  ...(googleVerification || bingVerification
    ? {
        verification: {
          ...(googleVerification ? { google: googleVerification } : {}),
          ...(bingVerification ? { other: { "msvalidate.01": bingVerification } } : {}),
        },
      }
    : {}),
};

const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('avgenix-theme');
    document.documentElement.setAttribute('data-theme', (t === 'light' || t === 'dark') ? t : 'dark');
  } catch(e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-screen flex-col font-sans" suppressHydrationWarning>
        <ThemeProvider>
          <OrgProvider>
            <LayoutShell>{children}</LayoutShell>
          </OrgProvider>
        </ThemeProvider>
        <GoogleAnalytics />
      </body>
    </html>
  );
}
