export type StripeSubscriptionSnapshot = {
  id: string;
  status: string;
  cancel_at_period_end?: boolean;
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
    cancel_at_period_end?: boolean;
  };
  if (!sub.id || !sub.status) return null;
  return {
    id: sub.id,
    status: sub.status,
    cancel_at_period_end: sub.cancel_at_period_end,
  };
}

export function stripeSubscriptionGrantsAccess(
  sub: StripeSubscriptionSnapshot,
): boolean {
  if (sub.status === "active" || sub.status === "trialing") {
    return true;
  }
  return false;
}