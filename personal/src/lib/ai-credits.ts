import { sql } from "@/lib/db";
import type { PlanDefinition } from "@/lib/plans";
import { isPersoUnlimited } from "@/lib/perso-plan";

/** Plafond d'appels cloud payants / mois (0 € côté user = local gratuit + cap cloud). */
export function getPersoCloudCreditCapEnv(): number {
  const raw = process.env.PERSO_AI_MONTHLY_CLOUD_CAP?.trim();
  if (raw && /^\d+$/.test(raw)) return Math.max(0, Number(raw));
  return 120;
}

export function getMonthlyCloudCap(
  user: { subscription_status: string },
  plan: PlanDefinition,
): number {
  if (plan.aiCreditsMonthlyLimit === 0) return 0;
  if (plan.aiCreditsMonthlyLimit === -1 && isPersoUnlimited(user)) {
    return getPersoCloudCreditCapEnv();
  }
  if (plan.aiCreditsMonthlyLimit === -1) return 2_000_000;
  return plan.aiCreditsMonthlyLimit;
}

export type AiCreditSnapshot = {
  used: number;
  limit: number;
  remaining: number;
  cloudAllowed: boolean;
  exhausted: boolean;
  localEnginesAvailable: boolean;
};

export async function readAiCreditsUsed(userId: string): Promise<number> {
  const rows = await sql<{ ai_credits_used: number }>(
    "select ai_credits_used from users where id = $1",
    [userId],
  );
  return Number(rows[0]?.ai_credits_used ?? 0);
}

export async function getAiCreditSnapshot(
  userId: string,
  limit: number,
): Promise<AiCreditSnapshot> {
  const used = await readAiCreditsUsed(userId);
  const remaining = limit <= 0 ? 0 : Math.max(0, limit - used);
  return {
    used,
    limit,
    remaining,
    cloudAllowed: limit > 0 && remaining > 0,
    exhausted: limit > 0 && remaining <= 0,
    localEnginesAvailable: true,
  };
}

/** Réserve 1 crédit cloud avant un appel Gemini/OpenAI (un seul appel facturé). */
export async function reserveCloudAiCredit(
  userId: string,
  limit: number,
): Promise<boolean> {
  if (limit <= 0) return false;
  const reserved = await sql<{ ai_credits_used: number }>(
    `update users set ai_credits_used = ai_credits_used + 1
     where id = $1 and ai_credits_used < $2
     returning ai_credits_used`,
    [userId, limit],
  );
  return reserved.length > 0;
}

export function aiQuotaBlockedJson(snapshot: AiCreditSnapshot) {
  return {
    error:
      "Quota cloud IA du mois atteint — plus d'appels Gemini/OpenAI. Les moteurs locaux gratuits restent actifs (factures, anti-ban).",
    code: "ai_quota_exhausted",
    aiCredits: {
      used: snapshot.used,
      limit: snapshot.limit,
      remaining: 0,
      cloudAllowed: false,
    },
  };
}

/** Bloque tout (y compris local) si variable explicite — défaut : local autorisé. */
export function isHardAiBlockWhenExhausted(): boolean {
  return process.env.PERSO_AI_HARD_BLOCK_WHEN_EXHAUSTED === "true";
}