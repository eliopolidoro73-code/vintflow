import crypto from "node:crypto";
import { hashPassword } from "./auth";
import { getPrimaryOwnerEmail } from "./perso-access";
import { sql } from "./db";

/** Compte unique édition perso (sans écran de connexion). */
export async function ensureDefaultPersoUserId(): Promise<string> {
  const email =
    getPrimaryOwnerEmail() ?? "edition-perso@vintflow.local";

  const rows = await sql<{ id: string; subscription_status: string }>(
    "select id, subscription_status from users where email = $1",
    [email],
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

  const userId = crypto.randomUUID();
  const referralCode = `VF-${userId.slice(0, 6).toUpperCase()}`;
  const displayName = email.split("@")[0] || "Édition perso";
  const passwordHash = hashPassword(crypto.randomBytes(24).toString("hex"));

  await sql(
    `insert into users (
       id, email, name, password_hash, plan, billing_cycle, subscription_status,
       company_name, siret, referral_code, is_demo
     )
     values ($1, $2, $3, $4, 'essentiel', 'monthly', 'personal_free', $5, '000 000 000 00000', $6, false)`,
    [userId, email, displayName, passwordHash, `${displayName} · Perso`, referralCode],
  );

  return userId;
}