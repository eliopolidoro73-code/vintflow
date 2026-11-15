import type { AuthUser } from "./auth";
import { PLANS, type PlanId } from "./plans";

export type SubscriptionAccess = "active" | "trialing" | "expired";

export function getSubscriptionAccess(user: AuthUser): SubscriptionAccess {
  if (user.subscription_status === "active") return "active";

  if (
    user.subscription_status === "trial_expired" ||
    user.subscription_status === "canceled" ||
    user.subscription_status === "past_due"
  ) {
    return "expired";
  }

  if (user.is_demo) {
    return new Date(user.trial_ends_at).getTime() >= Date.now()
      ? "trialing"
      : "expired";
  }

  if (user.subscription_status === "trialing") {
    return new Date(user.trial_ends_at).getTime() >= Date.now()
      ? "trialing"
      : "expired";
  }

  return "expired";
}

/**
 * Cockpit complet : abonnement Stripe payé uniquement.
 * Exception : bac à sable démo (6 h, plan Essentiel, quotas limités).
 */
export function canUseCockpit(user: AuthUser): boolean {
  if (user.subscription_status === "active") return true;
  if (user.is_demo && getSubscriptionAccess(user) === "trialing") return true;
  return false;
}

/**
 * Palier fonctionnel : l'essai 14 jours ne couvre que Essentiel.
 * Plus / Pro Scale exigent un abonnement payé (Stripe `active`).
 */
export function canUsePlanTier(user: AuthUser, required: PlanId): boolean {
  if (!canUseCockpit(user)) return false;

  const order: PlanId[] = ["essentiel", "plus", "pro"];
  const userLevel = order.indexOf(user.plan);
  const needLevel = order.indexOf(required);
  if (userLevel < needLevel) return false;

  if (user.is_demo) {
    return required === "essentiel";
  }

  return user.subscription_status === "active";
}

export function subscriptionBlockedMessage(user: AuthUser): string {
  if (canUseCockpit(user)) return "";
  return `Choisis un forfait et paie via Stripe pour débloquer Vintflow (à partir de ${PLANS.essentiel.monthlyPrice} €/mois).`;
}