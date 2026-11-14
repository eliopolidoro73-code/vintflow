import { NextResponse } from "next/server";
import { assertSameOrigin, requireAuthenticatedUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import {
  normalizePlanId,
  PLANS,
  type BillingCycle,
  type PlanId,
} from "@/lib/plans";

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
  if (stripeKey) {
    const host =
      request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    if (!host) {
      return NextResponse.json({ error: "Hôte introuvable" }, { status: 400 });
    }
    const baseUrl = `${proto}://${host}`;
    const unitAmountCents =
      billingCycle === "annual"
        ? plan.annualTotal * 100
        : plan.monthlyPrice * 100;

    const params = new URLSearchParams();
    params.set("mode", "subscription");
    params.set("customer_email", auth.user.email);
    params.set("success_url", `${baseUrl}/app?tab=billing&checkout=success`);
    params.set("cancel_url", `${baseUrl}/app?tab=billing&checkout=cancelled`);
    params.set("subscription_data[trial_period_days]", "14");
    params.set("subscription_data[metadata][user_id]", auth.user.id);
    params.set("subscription_data[metadata][plan]", planId);
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
      const errBody = await stripeRes.text();
      console.error("Stripe checkout error", errBody);
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

  await sql(
    `update users
     set plan = $1, billing_cycle = $2, subscription_status = 'trialing'
     where id = $3`,
    [planId, billingCycle, auth.user.id],
  );

  return NextResponse.json({
    mode: "trial_local",
    plan: planId,
    billing_cycle: billingCycle,
    message: `Plan ${plan.name} activé en essai gratuit 14 jours.`,
  });
}
