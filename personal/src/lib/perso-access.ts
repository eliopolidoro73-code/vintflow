/** E-mail affiché sur le compte perso (optionnel, secret PERSO_ALLOWED_EMAILS). */
export function getPersoAllowedEmails(): string[] {
  const raw = process.env.PERSO_ALLOWED_EMAILS?.trim();
  if (!raw) return [];
  return raw
    .split(/[,;]/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function getPrimaryOwnerEmail(): string | null {
  return getPersoAllowedEmails()[0] ?? null;
}