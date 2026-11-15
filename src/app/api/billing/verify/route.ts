import { NextResponse } from "next/server";
import { assertSameOrigin, requireAuthenticatedUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { normalizePlanId } from "@/lib/plans";
import {
  checkoutSessionTooOld,
  fetchStripeSubscription,
  stripeSubscriptionGrantsAccess,
} from "@/lib/stripe-subscription";

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await requireAuthenticatedUser();
  if ("response" in auth) return auth.response;

  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeKey) {
    return NextResponse.json(
      { error: "Paiement Stripe non configuré" },
      { status: 503 },
    );
  }

  let body: { session_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const sessionId = (body.session_id ?? "").trim();
  if (!/^cs_(test|live)_[a-zA-Z0-9]+$/.test(sessionId)) {
    return NextResponse.json(
      { error: "Identifiant de session Stripe invalide" },
      { status: 400 },
    );
  }

  const stripeRes = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: "GET",
      headers: {
        authorization: `Bearer ${stripeKey}`,
      },
    },
  );

  if (!stripeRes.ok) {
    return NextResponse.json(
      { error: "Impossible de vérifier la session Stripe" },
      { status: 502 },
    );
  }

  const session = (await stripeRes.json()) as {
    status?: string;
    payment_status?: string;
    mode?: string;
    created?: number;
    client_reference_id?: string;
    customer?: string;
    subscription?: string;
    metadata?: {
      user_id?: string;
      plan?: string;
      billing_cycle?: string;
    };
  };

  if (checkoutSessionTooOld(session.created)) {
    return NextResponse.json(
      {
        error:
          "Cette session de paiement a expiré. Relance un nouveau paiement depuis l'onglet Abonnement.",
      },
      { status: 402 },
    );
  }

  if (
    session.status !== "complete" ||
    (session.payment_status !== "paid" &&
      session.payment_status !== "no_payment_required") ||
    session.mode !== "subscription" ||
    !session.subscription
  ) {
    return NextResponse.json(
      { error: "Le paiement Stripe n'est pas encore finalisé" },
      { status: 402 },
    );
  }

  if (
    session.metadata?.user_id !== auth.user.id &&
    session.client_reference_id !== auth.user.id
  ) {
    return NextResponse.json(
      { error: "Cette session Stripe appartient à un autre utilisateur" },
      { status: 403 },
    );
  }

  const subscriptionId = String(session.subscription);
  const liveSub = await fetchStripeSubscription(subscriptionId, stripeKey);
  if (!liveSub || !stripeSubscriptionGrantsAccess(liveSub)) {
    return NextResponse.json(
      {
        error:
          "Cet abonnement Stripe n'est plus actif. Souscrivez à nouveau via l'onglet Abonnement.",
      },
      { status: 402 },
    );
  }

  if (
    session.customer &&
    liveSub.customer &&
    session.customer !== liveSub.customer
  ) {
    return NextResponse.json(
      { error: "La session ne correspond pas à cet abonnement." },
      { status: 403 },
    );
  }

  const subUserId = liveSub.metadata?.user_id?.trim();
  if (subUserId && subUserId !== auth.user.id) {
    return NextResponse.json(
      { error: "Cet abonnement est rattaché à un autre compte." },
      { status: 403 },
    );
  }

  const verifiedPlan = normalizePlanId(
    liveSub.metadata?.plan ?? session.metadata?.plan,
  );
  const verifiedCycle =
    session.metadata?.billing_cycle === "annual" ? "annual" : "monthly";

  await sql(
    `update users
     set plan = $1,
         billing_cycle = $2,
         subscription_status = 'active',
         stripe_customer_id = $3,
         stripe_subscription_id = $4
     where id = $5`,
    [
      verifiedPlan,
      verifiedCycle,
      session.customer ?? null,
      session.subscription,
      auth.user.id,
    ],
  );

  return NextResponse.json({
    ok: true,
    plan: verifiedPlan,
    billing_cycle: verifiedCycle,
  });
}
