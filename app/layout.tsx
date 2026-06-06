import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";
import ThemeProvider from "@/components/ThemeProvider";
import OrgProvider from "@/components/OrgProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: false,
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
  preload: false,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "AVForge — AV Engineer Toolkit",
  description:
    "The all-in-one engineering toolkit for AV professionals. Calculators, design tools, reference library, and AI-powered assistance.",
};

const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('avforge-theme');
    document.documentElement.setAttribute('data-theme', (t === 'light' || t === 'dark') ? t : 'light');
  } catch(e) {
    document.documentElement.setAttribute('data-theme', 'light');
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
      </body>
    </html>
  );
}
