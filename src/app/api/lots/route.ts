import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { assertSameOrigin, requireActiveSubscription } from "@/lib/auth";

import { sql } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await requireActiveSubscription();
  if ("response" in auth) return auth.response;

  const rl = await checkRateLimit({
    scope: "lots_write",
    key: auth.user.id,
    limit: 30,
    windowSeconds: 3600,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trop de modifications de lots cette heure-ci." },
      { status: 429 },
    );
  }

  let body: {
    action?: "create" | "record_sale" | "delete";
    id?: string;
    title?: string;
    supplier?: string;
    items_count?: number;
    total_cost?: number;
    shipping_cost?: number;
    sale_amount?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  if (body.action === "delete" && body.id) {
    await sql("delete from sourcing_lots where id = $1 and user_id = $2", [
      body.id,
      auth.user.id,
    ]);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "record_sale" && body.id) {
    const amount = Math.max(1, Number(body.sale_amount ?? 0));
    await sql(
      `update sourcing_lots
       set items_sold = least(items_count, items_sold + 1),
           revenue_generated = revenue_generated + $1
       where id = $2 and user_id = $3`,
      [amount, body.id, auth.user.id],
    );
    return NextResponse.json({ ok: true });
  }

  const title = (body.title ?? "").trim().slice(0, 120);
  if (!title) {
    return NextResponse.json({ error: "Nom du lot requis" }, { status: 400 });
  }

  const supplier = (body.supplier ?? "Brocante / Grossiste")
    .trim()
    .slice(0, 80);
  const itemsCount = Math.max(1, Math.min(500, Math.round(Number(body.items_count ?? 1))));
  const totalCost = Math.max(0, Number(body.total_cost ?? 0));
  const shippingCost = Math.max(0, Number(body.shipping_cost ?? 0));

  await sql(
    `insert into sourcing_lots (id, user_id, title, supplier, items_count, total_cost, shipping_cost)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [
      crypto.randomUUID(),
      auth.user.id,
      title,
      supplier,
      itemsCount,
      totalCost,
      shippingCost,
    ],
  );

  return NextResponse.json({ ok: true });
}
