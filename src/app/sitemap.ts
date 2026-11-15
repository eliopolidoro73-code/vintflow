import type { MetadataRoute } from "next";
import { getPublicSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getPublicSiteUrl();
  const now = new Date();
  const routes = [
    "",
    "/guide-revente-vinted",
    "/legal/mentions-legales",
    "/legal/confidentialite",
    "/legal/cgv",
  ];
  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path.startsWith("/guide") ? 0.9 : 0.5,
  }));
}