import { headers } from "next/headers";
import { CURSOR_PUBLIC_APP_URL, FREE_INDEXABLE_URL } from "./live-url";

/** Hôtes indexables (pas *.apps.grok.bot sauf politique plateforme — préférer vercel.app / workers.dev). */
const INDEXABLE_HOST_SUFFIXES = [
  ".vercel.app",
  ".workers.dev",
  "vintflow.io",
  "www.vintflow.io",
];

function hostIsIndexable(hostname: string): boolean {
  if (!hostname) return false;
  if (hostname === "vintflow.io" || hostname === "www.vintflow.io") return true;
  if (hostname.endsWith(".vercel.app") && !hostname.includes("---")) return true;
  if (hostname.endsWith(".workers.dev")) return true;
  return INDEXABLE_HOST_SUFFIXES.some(
    (s) => s.startsWith(".") && hostname.endsWith(s),
  );
}

export function normalizeHost(host: string | null | undefined): string {
  if (!host) return "";
  return host.split(":")[0]?.trim().toLowerCase() ?? "";
}

export function isIndexableProductionHost(host: string | null | undefined): boolean {
  const hostname = normalizeHost(host);
  if (!hostname) return false;
  if (hostname.endsWith(".apps.grok.bot")) return false;
  if (hostIsIndexable(hostname)) return true;
  const fromEnv = getPublicSiteUrl();
  try {
    const envHost = new URL(fromEnv).hostname.toLowerCase();
    return hostname === envHost || hostname === `www.${envHost}`;
  } catch {
    return false;
  }
}

/** URL de la requête courante (sitemap/robots sur Vercel). */
export async function getRequestSiteUrl(): Promise<string> {
  try {
    const h = await headers();
    const host = normalizeHost(h.get("x-forwarded-host") ?? h.get("host"));
    const proto = h.get("x-forwarded-proto")?.trim() || "https";
    if (host && !host.endsWith(".apps.grok.bot")) {
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  } catch {
    // hors requête (build)
  }
  return getPublicSiteUrl();
}

export function getPublicSiteUrl(): string {
  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (vercelHost && !vercelHost.includes("---")) {
    const host = vercelHost.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${host}`;
  }
  const fromEnv =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv && !fromEnv.includes("vintflow.io")) {
    if (fromEnv.startsWith("http://") || fromEnv.startsWith("https://")) {
      return fromEnv.replace(/\/$/, "");
    }
    return `https://${fromEnv.replace(/\/$/, "")}`;
  }
  if (process.env.VERCEL && FREE_INDEXABLE_URL.length > 0) {
    return FREE_INDEXABLE_URL.replace(/\/$/, "");
  }
  return CURSOR_PUBLIC_APP_URL;
}