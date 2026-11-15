import type { MetadataRoute } from "next";
import { getRequestSiteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await getRequestSiteUrl();
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