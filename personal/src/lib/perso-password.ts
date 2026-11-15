/** Mot de passe maître défini dans les secrets (PERSO_PASSWORD ou PERSO_OWNER_PASSWORD). */
export function getPersoConfiguredPassword(): string | null {
  const raw =
    process.env.PERSO_PASSWORD?.trim() ||
    process.env.PERSO_OWNER_PASSWORD?.trim();
  return raw && raw.length >= 8 ? raw : null;
}