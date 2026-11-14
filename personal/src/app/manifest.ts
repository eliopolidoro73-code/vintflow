import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vintflow Perso",
    short_name: "Vintflow",
    description:
      "Ton cockpit privé Vinted, Leboncoin & TikTok Shop sur iPhone et ordinateur.",
    start_url: "/",
    display: "standalone",
    background_color: "#060b18",
    theme_color: "#3b82f6",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
