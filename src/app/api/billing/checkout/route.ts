import { NextResponse } from "next/server";
import { assertSameOrigin, requireAuthenticatedUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import {
  normalizePlanId,
  PLANS,
  type BillingCycle,
  type PlanId,
} from "@/lib/plans";

function resolveSafeBaseUrl(request: Request): string {
  const configured = process.env.APP_URL?.trim();
  if (configured && /^https?:\/\/[a-zA-Z0-9.-]+(:\d+)?$/.test(configured)) {
    return configured;
  }
  const rawHost =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const rawProto = request.headers.get("x-forwarded-proto") ?? "https";
  if (
    /^[a-zA-Z0-9.-]+(:\d+)?$/.test(rawHost) &&
    (rawProto === "http" || rawProto === "https")
  ) {
    return `${rawProto}://${rawHost}`;
  }
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await requireAuthenticatedUser();
  if ("response" in auth) return auth.response;

  let body: { plan?: string; billing_cycle?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const planId: PlanId = normalizePlanId(body.plan);
  const billingCycle: BillingCycle =
    body.billing_cycle === "annual" ? "annual" : "monthly";
  const plan = PLANS[planId];

  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeKey) {
    const inTrial =
      auth.user.subscription_status === "trialing" && !auth.user.is_demo;
    if (!inTrial) {
      return NextResponse.json(
        {
          error:
            "Le paiement en ligne arrive très bientôt. Ton essai gratuit est terminé : écris-nous pour activer ton abonnement.",
        },
        { status: 503 },
      );
    }
    await sql(
      "update users set plan = $1, billing_cycle = $2 where id = $3 and subscription_status = 'trialing'",
      [planId, billingCycle, auth.user.id],
    );
    return NextResponse.json({
      mode: "trial",
      message: `Essai gratuit ${plan.name} activé jusqu'au ${new Date(
        auth.user.trial_ends_at,
      ).toLocaleDateString("fr-FR")} · 0,00 € débité.`,
    });
  }

  const baseUrl = resolveSafeBaseUrl(request);
  const unitAmountCents =
    billingCycle === "annual"
      ? plan.annualTotal * 100
      : plan.monthlyPrice * 100;

  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("client_reference_id", auth.user.id);
  params.set("customer_email", auth.user.email);
  params.set(
    "success_url",
    `${baseUrl}/app?tab=billing&session_id={CHECKOUT_SESSION_ID}`,
  );
  params.set("cancel_url", `${baseUrl}/app?tab=billing&checkout=cancelled`);
  params.set("metadata[user_id]", auth.user.id);
  params.set("metadata[plan]", planId);
  params.set("metadata[billing_cycle]", billingCycle);
  params.set("subscription_data[trial_period_days]", "14");
  params.set("subscription_data[metadata][user_id]", auth.user.id);
  params.set("subscription_data[metadata][plan]", planId);
  params.set("subscription_data[metadata][billing_cycle]", billingCycle);
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", "eur");
  params.set(
    "line_items[0][price_data][product_data][name]",
    `Vintflow ${plan.name} (${billingCycle === "annual" ? "Annuel" : "Mensuel"})`,
  );
  params.set(
    "line_items[0][price_data][unit_amount]",
    String(unitAmountCents),
  );
  params.set(
    "line_items[0][price_data][recurring][interval]",
    billingCycle === "annual" ? "year" : "month",
  );

  const stripeRes = await fetch(
    "https://api.stripe.com/v1/checkout/sessions",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${stripeKey}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );

  if (!stripeRes.ok) {
    console.error("Stripe checkout error status", stripeRes.status);
    return NextResponse.json(
      { error: "Erreur lors de la création de la session Stripe" },
      { status: 502 },
    );
  }

  const session = (await stripeRes.json()) as { url?: string };
  return NextResponse.json({
    mode: "stripe",
    checkoutUrl: session.url,
  });
}
