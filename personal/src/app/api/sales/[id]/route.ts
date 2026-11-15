import { NextResponse } from "next/server";
import { assertSameOrigin, requireAuthenticatedUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { computeNetMargin } from "@/lib/format";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await requireAuthenticatedUser();
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  let body: {
    shipment_status?: string;
    item_title?: string;
    buyer_name?: string;
    buyer_city?: string;
    sku?: string;
    carrier?: string;
    tracking_code?: string;
    gross_amount?: number;
    purchase_cost?: number;
    platform_fees?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const rows = await sql<{
    gross_amount: string | number;
    purchase_cost: string | number;
    platform_fees: string | number;
    boost_cost: string | number;
    shipping_cost: string | number;
  }>(
    `select gross_amount, purchase_cost, platform_fees, boost_cost, shipping_cost
     from sales where id = $1 and user_id = $2`,
    [id, auth.user.id],
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: "Vente introuvable" }, { status: 404 });
  }
  const current = rows[0];

  const allowed = ["to_ship", "in_transit", "delivered", "completed"];
  if (
    body.shipment_status &&
    !allowed.includes(body.shipment_status)
  ) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  const gross =
    body.gross_amount !== undefined
      ? Math.max(0, Number(body.gross_amount))
      : Number(current.gross_amount);
  const purchase =
    body.purchase_cost !== undefined
      ? Math.max(0, Number(body.purchase_cost))
      : Number(current.purchase_cost);
  const fees =
    body.platform_fees !== undefined
      ? Math.max(0, Number(body.platform_fees))
      : Number(current.platform_fees);
  const margin = computeNetMargin({
    grossAmount: gross,
    purchaseCost: purchase,
    platformFees: fees,
    boostCost: Number(current.boost_cost),
    shippingCost: Number(current.shipping_cost),
  });

  await sql(
    `update sales set
      shipment_status = coalesce($1, shipment_status),
      item_title = coalesce($2, item_title),
      buyer_name = coalesce($3, buyer_name),
      buyer_city = coalesce($4, buyer_city),
      sku = coalesce($5, sku),
      carrier = coalesce($6, carrier),
      tracking_code = coalesce($7, tracking_code),
      gross_amount = $8,
      purchase_cost = $9,
      platform_fees = $10,
      net_margin = $11
    where id = $12 and user_id = $13`,
    [
      body.shipment_status ?? null,
      body.item_title?.trim().slice(0, 200) ?? null,
      body.buyer_name?.trim().slice(0, 80) ?? null,
      body.buyer_city?.trim().slice(0, 80) ?? null,
      body.sku?.trim().slice(0, 40) ?? null,
      body.carrier?.trim().slice(0, 50) ?? null,
      body.tracking_code?.trim().slice(0, 60) ?? null,
      gross,
      purchase,
      fees,
      margin.netMargin,
      id,
      auth.user.id,
    ],
  );

  return NextResponse.json({
    ok: true,
    net_margin: margin.netMargin,
    gross_amount: gross,
  });
}
