/** Valeur meta Search Console (secret ou extrait du nom de fichier). */
export function getGoogleSiteVerificationMeta(): string | undefined {
  const raw = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  if (!raw) return undefined;
  if (raw.includes("google69a22bc60fd55e06")) {
    return raw.startsWith("google-site-verification:")
      ? "google69a22bc60fd55e06"
      : raw;
  }
  return raw;
}

export const GOOGLE_HTML_VERIFICATION_BODY =
  "google-site-verification: google69a22bc60fd55e06.html";