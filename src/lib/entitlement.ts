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

/** Full cockpit (hors facturation) : abonnement Stripe actif ou essai encore valide. */
export function canUseCockpit(user: AuthUser): boolean {
  const access = getSubscriptionAccess(user);
  return access === "active" || access === "trialing";
}

/**
 * Palier fonctionnel : l'essai 14 jours ne couvre que Essentiel.
 * Plus / Pro Scale exigent un abonnement payé (Stripe `active`).
 */
export function canUsePlanTier(user: AuthUser, required: PlanId): boolean {
  const access = getSubscriptionAccess(user);
  if (access === "expired") return false;

  const order: PlanId[] = ["essentiel", "plus", "pro"];
  const userLevel = order.indexOf(user.plan);
  const needLevel = order.indexOf(required);
  if (userLevel < needLevel) return false;

  if (required === "essentiel") {
    return access === "active" || access === "trialing";
  }

  return access === "active";
}

export function subscriptionBlockedMessage(user: AuthUser): string {
  if (getSubscriptionAccess(user) !== "expired") return "";
  return `Ton essai est terminé (échéance ${new Date(
    user.trial_ends_at,
  ).toLocaleDateString("fr-FR")}). Active l'abonnement ${PLANS[user.plan].name} pour rouvrir tes outils.`;
}