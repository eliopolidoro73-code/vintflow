/** Compte unique — complété par PERSO_ALLOWED_EMAILS sur Vercel si besoin. */
const PERSO_OWNER_FALLBACK = "eliopolidoro73@gmail.com";

export function getPersoAllowedEmails(): string[] {
  const raw = process.env.PERSO_ALLOWED_EMAILS?.trim();
  const fromEnv = raw
    ? raw
        .split(/[,;]/)
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    : [];
  if (fromEnv.length > 0) return fromEnv;
  return [PERSO_OWNER_FALLBACK];
}

export function getPrimaryOwnerEmail(): string | null {
  return getPersoAllowedEmails()[0] ?? null;
}