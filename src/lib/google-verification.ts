/** Code meta Search Console (toujours présent pour validation Google). */
export function getGoogleSiteVerificationMeta(): string {
  const raw = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  if (raw) {
    if (raw.startsWith("google-site-verification:")) {
      const token = raw.split(":").pop()?.trim() ?? raw;
      return token.replace(/\.html$/i, "");
    }
    return raw.replace(/\.html$/i, "");
  }
  return "google69a22bc60fd55e06";
}

export const GOOGLE_HTML_VERIFICATION_BODY =
  "google-site-verification: google69a22bc60fd55e06.html";