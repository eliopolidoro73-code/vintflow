import type { MetadataRoute } from "next";
import { getPublicSiteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const base = getPublicSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app", "/api/"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}