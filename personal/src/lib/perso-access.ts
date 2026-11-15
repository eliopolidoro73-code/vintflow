/** Emails autorisés sur l'édition perso (variable d'environnement obligatoire en production). */
export function getPersoAllowedEmails(): string[] {
  const raw = process.env.PERSO_ALLOWED_EMAILS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function getPrimaryOwnerEmail(): string | null {
  return getPersoAllowedEmails()[0] ?? null;
}

export function isPersoOwnerEmail(email: string): boolean {
  const allowed = getPersoAllowedEmails();
  if (allowed.length === 0) return false;
  return allowed.includes(email.trim().toLowerCase());
}

/** Mot de passe propriétaire : PERSO_OWNER_PASSWORD, sinon PERSO_REGISTRATION_INVITE. */
export function getPersoOwnerPasswordFromEnv(): string | null {
  const primary = process.env.PERSO_OWNER_PASSWORD?.trim();
  if (primary) return primary;
  const invite = process.env.PERSO_REGISTRATION_INVITE?.trim();
  return invite || null;
}

export function persoLoginConfigured(): boolean {
  return getPersoAllowedEmails().length > 0 && Boolean(getPersoOwnerPasswordFromEnv());
}