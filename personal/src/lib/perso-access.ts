import crypto from "node:crypto";
import { sql } from "./db";

/** Emails autorisés sur l'édition perso (variable d'environnement obligatoire en production). */
export function getPersoAllowedEmails(): string[] {
  const raw = process.env.PERSO_ALLOWED_EMAILS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isPersoOwnerEmail(email: string): boolean {
  const allowed = getPersoAllowedEmails();
  if (allowed.length === 0) return false;
  return allowed.includes(email.trim().toLowerCase());
}

export function persoRegistrationConfigured(): boolean {
  return getPersoAllowedEmails().length > 0;
}

/** Une seule inscription par adresse autorisée. */
/** Code d'invitation défini côté serveur (secret Cursor) — requis pour créer un compte. */
export function verifyRegistrationInvite(
  supplied: string | undefined,
): boolean {
  const expected = process.env.PERSO_REGISTRATION_INVITE?.trim();
  if (!expected || !supplied) return false;
  const a = Buffer.from(supplied.trim());
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function registrationInviteConfigured(): boolean {
  return Boolean(process.env.PERSO_REGISTRATION_INVITE?.trim());
}

export async function persoOwnerSlotsAvailable(): Promise<boolean> {
  const allowed = getPersoAllowedEmails();
  if (allowed.length === 0) return false;
  const rows = await sql<{ cnt: number }>(
    `select count(*)::int as cnt from users where lower(email) = any($1::text[])`,
    [allowed],
  );
  return Number(rows[0]?.cnt ?? 0) < allowed.length;
}