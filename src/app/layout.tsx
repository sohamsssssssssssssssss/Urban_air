import type { Metadata, Viewport } from "next";
import { Manrope, Noto_Sans_Devanagari } from "next/font/google";
import { THEME_SCRIPT } from "@/design/themeScript";
import "./globals.css";

// One variable UI font, self-hosted by next/font (no third-party request at runtime). Devanagari glyphs come from
// Noto Sans Devanagari, which the browser only downloads when Hindi text is on screen.
const sans = Manrope({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const devanagari = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--font-devanagari", display: "swap", preload: false });

export const metadata: Metadata = {
  title: "SmogSense — live air quality advice for Indian cities",
  description: "Personalised, live-data-grounded advice to cut smog exposure and emissions: commute timing, indoor air and greener alternatives.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f7fa" },
    { media: "(prefers-color-scheme: dark)", color: "#080d18" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: the inline script may set data-theme before React hydrates.
    <html lang="en" className={`${sans.variable} ${devanagari.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
