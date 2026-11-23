import type { MetadataRoute } from "next";

/** Makes SmogSense installable ("Add to Home screen"), so alerts can run in its own window. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SmogSense",
    short_name: "SmogSense",
    description: "Live air-quality advice for Indian cities in winter smog.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
