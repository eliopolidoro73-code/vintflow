import type { PlanDefinition } from "./plans";
import { PLANS } from "./plans";
import { getPersoCloudCreditCapEnv } from "./ai-credits";

/** Capacités édition perso : tout Pro Scale, quotas très larges. */
export function getEffectivePlan(user: {
  plan: keyof typeof PLANS;
  subscription_status: string;
}): PlanDefinition {
  if (user.subscription_status !== "personal_free") {
    return PLANS[user.plan];
  }
  return {
    ...PLANS.pro,
    activeItemsLimit: 100_000,
    crosslistMonthlyLimit: -1,
    aiCreditsMonthlyLimit: getPersoCloudCreditCapEnv(),
  };
}

export function isPersoUnlimited(user: { subscription_status: string }): boolean {
  return user.subscription_status === "personal_free";
}