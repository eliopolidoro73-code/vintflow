import crypto from "node:crypto";
import { hashPassword } from "./auth";
import {
  getPersoOwnerPasswordFromEnv,
  isPersoOwnerEmail,
} from "./perso-access";
import { sql } from "./db";

function ownerPasswordMatches(supplied: string): boolean {
  const expected = getPersoOwnerPasswordFromEnv();
  if (!expected) return false;
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Crée le compte propriétaire au premier login (e-mail dans PERSO_ALLOWED_EMAILS + mot de passe secret).
 */
export async function provisionOwnerOnLogin(
  loginEmail: string,
  password: string,
): Promise<void> {
  const email = loginEmail.trim().toLowerCase();
  if (!isPersoOwnerEmail(email)) return;
  if (!ownerPasswordMatches(password)) return;

  const existing = await sql<{ id: string }>(
    "select id from users where email = $1",
    [email],
  );
  if (existing.length > 0) return;

  const userId = crypto.randomUUID();
  const referralCode = `VF-${userId.slice(0, 6).toUpperCase()}`;
  const passwordHash = hashPassword(password);
  const displayName = email.split("@")[0] || "Propriétaire";

  await sql(
    `insert into users (
       id, email, name, password_hash, plan, billing_cycle, subscription_status,
       company_name, siret, referral_code, is_demo
     )
     values ($1, $2, $3, $4, 'essentiel', 'monthly', 'personal_free', $5, '000 000 000 00000', $6, false)`,
    [userId, email, displayName, passwordHash, `${displayName} · Perso`, referralCode],
  );
}