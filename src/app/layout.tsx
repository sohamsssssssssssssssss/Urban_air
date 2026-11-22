import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmogSense — live air quality advice for Indian cities",
  description: "Personalised, live-data-grounded advice to cut smog exposure and emissions: commute timing, indoor air and greener alternatives.",
};

export const viewport: Viewport = { themeColor: "#0f172a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-3 focus:text-blue-800">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
