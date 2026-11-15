import { sql } from "@/lib/db";
import type { PlanDefinition } from "@/lib/plans";
import { isPersoUnlimited } from "@/lib/perso-plan";

/** Plafond d'appels cloud payants / mois (0 € côté user = local gratuit + cap cloud). */
export function getPersoCloudCreditCapEnv(): number {
  const raw = process.env.PERSO_AI_MONTHLY_CLOUD_CAP?.trim();
  if (raw && /^\d+$/.test(raw)) return Math.max(0, Number(raw));
  return 120;
}

/** Seuil de blocage (défaut 90 % du quota mensuel). */
export function getCloudBlockThresholdPercent(): number {
  const raw =
    process.env.PERSO_AI_CLOUD_BLOCK_AT_PERCENT?.trim() ??
    process.env.PERSO_AI_BLOCK_AT_PERCENT?.trim();
  if (raw && /^\d+$/.test(raw)) {
    return Math.min(100, Math.max(1, Number(raw)));
  }
  return 90;
}

/** Crédits cloud max réservables avant blocage (ex. 120 → 108 à 90 %). */
export function getEffectiveCloudReserveCap(limit: number): number {
  if (limit <= 0) return 0;
  const pct = getCloudBlockThresholdPercent();
  return Math.max(1, Math.floor((limit * pct) / 100));
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
  /** Plafond effectif avant blocage (souvent 90 % de limit). */
  effectiveCap: number;
  remaining: number;
  remainingBeforeBlock: number;
  usagePercent: number;
  thresholdPercent: number;
  thresholdReached: boolean;
  cloudAllowed: boolean;
  exhausted: boolean;
  /** Studio / outils IA : bloqués dès le seuil (90 % par défaut). */
  studioTasksBlocked: boolean;
  invoicesBlocked: boolean;
  localEnginesAvailable: boolean;
};

function currentCreditsPeriod(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .slice(0, 7);
}

/** Remet le compteur à 0 au début de chaque mois (heure Paris). */
export async function ensureMonthlyCreditsPeriod(userId: string): Promise<void> {
  const period = currentCreditsPeriod();
  await sql(
    `update users
     set ai_credits_used = 0, ai_credits_period = $2
     where id = $1 and (ai_credits_period is null or ai_credits_period is distinct from $2)`,
    [userId, period],
  );
}

export async function readAiCreditsUsed(userId: string): Promise<number> {
  await ensureMonthlyCreditsPeriod(userId);
  const rows = await sql<{ ai_credits_used: number }>(
    "select ai_credits_used from users where id = $1",
    [userId],
  );
  return Number(rows[0]?.ai_credits_used ?? 0);
}

export function buildAiCreditSnapshot(used: number, limit: number): AiCreditSnapshot {
  const thresholdPercent = getCloudBlockThresholdPercent();
  const effectiveCap = getEffectiveCloudReserveCap(limit);
  const remaining = limit <= 0 ? 0 : Math.max(0, limit - used);
  const remainingBeforeBlock =
    limit <= 0 ? 0 : Math.max(0, effectiveCap - used);
  const usagePercent =
    limit <= 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const thresholdReached = limit > 0 && used >= effectiveCap;
  const studioBlocked =
    thresholdReached && isStudioBlockAtThresholdEnabled();
  const invoicesBlocked =
    thresholdReached &&
    process.env.PERSO_AI_BLOCK_INVOICES_AT_THRESHOLD !== "false";

  return {
    used,
    limit,
    effectiveCap,
    remaining,
    remainingBeforeBlock,
    usagePercent,
    thresholdPercent,
    thresholdReached,
    cloudAllowed: limit > 0 && !thresholdReached && used < effectiveCap,
    exhausted: thresholdReached || (limit > 0 && remaining <= 0),
    studioTasksBlocked: studioBlocked,
    invoicesBlocked,
    localEnginesAvailable: isLocalAllowedWhenThresholdReached(),
  };
}

export async function getAiCreditSnapshot(
  userId: string,
  limit: number,
): Promise<AiCreditSnapshot> {
  const used = await readAiCreditsUsed(userId);
  return buildAiCreditSnapshot(used, limit);
}

/** Réserve 1 crédit cloud (plafond = cap × 90 % par défaut). */
export async function reserveCloudAiCredit(
  userId: string,
  limit: number,
): Promise<boolean> {
  const reserveCap = getEffectiveCloudReserveCap(limit);
  if (reserveCap <= 0) return false;
  const reserved = await sql<{ ai_credits_used: number }>(
    `update users set ai_credits_used = ai_credits_used + 1
     where id = $1 and ai_credits_used < $2
     returning ai_credits_used`,
    [userId, reserveCap],
  );
  return reserved.length > 0;
}

export function aiQuotaBlockedJson(snapshot: AiCreditSnapshot) {
  return {
    error: snapshot.thresholdReached
      ? `Quota cloud à ${snapshot.thresholdPercent} % atteint (${snapshot.used}/${snapshot.limit}) — plus d'appels Gemini/OpenAI ce mois-ci.`
      : "Quota cloud IA du mois atteint — plus d'appels Gemini/OpenAI.",
    code: snapshot.thresholdReached ? "ai_quota_threshold" : "ai_quota_exhausted",
    aiCredits: {
      used: snapshot.used,
      limit: snapshot.limit,
      effectiveCap: snapshot.effectiveCap,
      thresholdPercent: snapshot.thresholdPercent,
      usagePercent: snapshot.usagePercent,
      remaining: snapshot.remainingBeforeBlock,
      cloudAllowed: false,
    },
  };
}

export function studioTasksBlockedJson(snapshot: AiCreditSnapshot) {
  return {
    error: `Quota cloud à ${snapshot.thresholdPercent} % utilisé (${snapshot.usagePercent} % — ${snapshot.used}/${snapshot.limit}). Les tâches Studio IA sont bloquées jusqu'au mois prochain.`,
    code: "ai_studio_blocked_threshold",
    aiCredits: {
      used: snapshot.used,
      limit: snapshot.limit,
      effectiveCap: snapshot.effectiveCap,
      thresholdPercent: snapshot.thresholdPercent,
      usagePercent: snapshot.usagePercent,
    },
  };
}

/** Bloque tout le Studio à 90 % — défaut : oui. */
export function isStudioBlockAtThresholdEnabled(): boolean {
  return process.env.PERSO_AI_BLOCK_STUDIO_AT_THRESHOLD !== "false";
}

/** Factures locales autorisées à 90 % seulement si `PERSO_AI_BLOCK_INVOICES_AT_THRESHOLD=false`. */
export function isLocalAllowedWhenThresholdReached(): boolean {
  return process.env.PERSO_AI_BLOCK_INVOICES_AT_THRESHOLD === "false";
}

export function isInvoiceBlockedAtThreshold(snapshot: AiCreditSnapshot): boolean {
  if (!snapshot.thresholdReached) return false;
  return process.env.PERSO_AI_BLOCK_INVOICES_AT_THRESHOLD !== "false";
}

/** Bloque tout (y compris local) si variable explicite — défaut : local autorisé. */
export function isHardAiBlockWhenExhausted(): boolean {
  return process.env.PERSO_AI_HARD_BLOCK_WHEN_EXHAUSTED === "true";
}