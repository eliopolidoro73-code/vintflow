import crypto from "node:crypto";
import { hashPassword } from "./auth";
import { getPersoAllowedEmails } from "./perso-access";
import { sql } from "./db";

/** Même compte sur chaque instance serverless (PGlite éphémère sur Vercel). */
export function stablePersoUserId(email: string): string {
  const hex = crypto
    .createHash("sha256")
    .update(`vintflow-perso:${email.toLowerCase()}`)
    .digest("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `a${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join("-");
}

function isPersonalProdHosted(): boolean {
  return Boolean(process.env.CURSOR_APP_ID) || process.env.NODE_ENV === "production";
}

export function viewerEmailAllowed(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  const allowed = getPersoAllowedEmails();
  if (allowed.length === 0) {
    return !isPersonalProdHosted();
  }
  return allowed.includes(normalized);
}

/** Crée ou récupère le compte perso du viewer Cursor (édition privée). */
export async function ensurePersoUserForEmail(
  email: string,
  displayName: string,
): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const rows = await sql<{ id: string; subscription_status: string }>(
    "select id, subscription_status from users where email = $1",
    [normalized],
  );
  const existing = rows[0];
  if (existing) {
    if (existing.subscription_status !== "personal_free") {
      await sql(
        `update users
         set subscription_status = 'personal_free', is_demo = false
         where id = $1`,
        [existing.id],
      );
    }
    return existing.id;
  }

  const userId =
    process.env.VERCEL || process.env.NODE_ENV === "production"
      ? stablePersoUserId(normalized)
      : crypto.randomUUID();
  const referralCode = `VF-${userId.slice(0, 6).toUpperCase()}`;
  const name =
    displayName.trim().slice(0, 80) ||
    normalized.split("@")[0] ||
    "Édition perso";
  const passwordHash = hashPassword(crypto.randomBytes(24).toString("hex"));

  await sql(
    `insert into users (
       id, email, name, password_hash, plan, billing_cycle, subscription_status,
       company_name, siret, referral_code, is_demo
     )
     values ($1, $2, $3, $4, 'essentiel', 'monthly', 'personal_free', $5, '000 000 000 00000', $6, false)`,
    [userId, normalized, name, passwordHash, `${name} · Perso`, referralCode],
  );

  return userId;
}