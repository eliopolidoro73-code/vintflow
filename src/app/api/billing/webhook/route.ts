import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { normalizePlanId } from "@/lib/plans";

/** Synchronise annulation / impayé Stripe (corps signé Stripe). */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook Stripe non configuré" },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  const rawBody = await request.text();
  const parts = signature.split(",").reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.split("=");
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});
  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  const crypto = await import("node:crypto");
  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
  const expectedBuf = Buffer.from(expected);
  const v1Buf = Buffer.from(v1);
  if (
    expectedBuf.length !== v1Buf.length ||
    !crypto.timingSafeEqual(expectedBuf, v1Buf)
  ) {
    return NextResponse.json({ error: "Signature rejetée" }, { status: 400 });
  }

  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const type = event.type ?? "";
  const obj = event.data?.object ?? {};

  if (
    type === "customer.subscription.deleted" ||
    type === "invoice.payment_failed"
  ) {
    const subId =
      (obj.subscription as string) ||
      (type.startsWith("customer.subscription") ? (obj.id as string) : "");
    if (subId) {
      await sql(
        `update users
         set subscription_status = 'past_due', plan = 'essentiel'
         where stripe_subscription_id = $1`,
        [subId],
      );
    }
  }

  if (type === "customer.subscription.updated") {
    const status = String(obj.status ?? "");
    const subId = String(obj.id ?? "");
    const planMeta = (obj.metadata as { plan?: string } | undefined)?.plan;
    if (subId && status === "active") {
      await sql(
        `update users
         set subscription_status = 'active', plan = $1
         where stripe_subscription_id = $2`,
        [normalizePlanId(planMeta), subId],
      );
    }
    if (subId && (status === "canceled" || status === "unpaid")) {
      await sql(
        `update users
         set subscription_status = 'past_due', plan = 'essentiel'
         where stripe_subscription_id = $1`,
        [subId],
      );
    }
  }

  return NextResponse.json({ received: true });
}