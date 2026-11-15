const CANONICAL_MARKETING_ORIGIN = "https://vintflow.io";

/** Hôtes sur lesquels Google doit indexer (domaine client, pas *.apps.grok.bot). */
const INDEXABLE_HOSTS = new Set(["vintflow.io", "www.vintflow.io"]);

export function normalizeHost(host: string | null | undefined): string {
  if (!host) return "";
  return host.split(":")[0]?.trim().toLowerCase() ?? "";
}

export function isIndexableProductionHost(host: string | null | undefined): boolean {
  const hostname = normalizeHost(host);
  if (!hostname) return false;
  if (INDEXABLE_HOSTS.has(hostname)) return true;
  const fromEnv = getPublicSiteUrl();
  try {
    const envHost = new URL(fromEnv).hostname.toLowerCase();
    return hostname === envHost || hostname === `www.${envHost}`;
  } catch {
    return false;
  }
}

export function getPublicSiteUrl(): string {
  const fromEnv =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    if (fromEnv.startsWith("http://") || fromEnv.startsWith("https://")) {
      return fromEnv.replace(/\/$/, "");
    }
    return `https://${fromEnv.replace(/\/$/, "")}`;
  }
  return CANONICAL_MARKETING_ORIGIN;
}