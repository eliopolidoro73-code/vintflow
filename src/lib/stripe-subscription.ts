export type StripeSubscriptionSnapshot = {
  id: string;
  status: string;
  customer?: string;
  cancel_at_period_end?: boolean;
  metadata?: { user_id?: string; plan?: string };
};

export async function fetchStripeSubscription(
  subscriptionId: string,
  stripeKey: string,
): Promise<StripeSubscriptionSnapshot | null> {
  const subRes = await fetch(
    `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      method: "GET",
      headers: { authorization: `Bearer ${stripeKey}` },
    },
  );
  if (!subRes.ok) return null;
  const sub = (await subRes.json()) as {
    id?: string;
    status?: string;
    customer?: string;
    cancel_at_period_end?: boolean;
    metadata?: { user_id?: string; plan?: string };
  };
  if (!sub.id || !sub.status) return null;
  return {
    id: sub.id,
    status: sub.status,
    customer: typeof sub.customer === "string" ? sub.customer : undefined,
    cancel_at_period_end: sub.cancel_at_period_end,
    metadata: sub.metadata,
  };
}

const MAX_CHECKOUT_AGE_MS = 1000 * 60 * 60 * 48;

export function checkoutSessionTooOld(createdUnix?: number): boolean {
  if (!createdUnix || createdUnix <= 0) return true;
  return Date.now() - createdUnix * 1000 > MAX_CHECKOUT_AGE_MS;
}

export function stripeSubscriptionGrantsAccess(
  sub: StripeSubscriptionSnapshot,
): boolean {
  if (sub.status === "active" || sub.status === "trialing") {
    return true;
  }
  return false;
}