import type { MetadataRoute } from "next";

// Web app manifest — makes Lumi installable to the home screen / desktop
// on Android, iOS, Windows, macOS and Linux from this single codebase.
// Next.js serves this at /manifest.webmanifest and links it automatically.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Lumi — lecture notes for CUST",
    short_name: "Lumi",
    description:
      "Record your lectures and get clean study notes with diagrams, formulas and summaries. Free for every CUST student.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbf5e9",
    theme_color: "#5b4df6",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
