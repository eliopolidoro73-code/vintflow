import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { assertSameOrigin, requireAuthenticatedUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { computeNetMargin } from "@/lib/format";
import { getEffectivePlan } from "@/lib/perso-plan";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await requireAuthenticatedUser();
  if ("response" in auth) return auth.response;

  const { id } = await context.params;

  const existingRows = await sql<{
    id: string;
    sku: string;
    title: string;
    purchase_price: string | number;
    extra_costs: string | number;
    listing_price: string | number;
    status: string;
    vinted_status: string;
    leboncoin_status: string;
    tiktok_status: string;
    ebay_status: string;
    vinted_account: string;
  }>(
    `select id, sku, title, purchase_price, extra_costs, listing_price, status,
            vinted_status, leboncoin_status, tiktok_status, ebay_status, vinted_account
     from inventory_items where id = $1 and user_id = $2`,
    [id, auth.user.id],
  );
  const item = existingRows[0];
  if (!item) {
    return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
  }

  let body: {
    listing_price?: number;
    location?: string;
    vinted_status?: string;
    leboncoin_status?: string;
    tiktok_status?: string;
    ebay_status?: string;
    action?: "crosslist_lbc" | "mark_sold" | "relist" | "sync_studio";
    description_vinted?: string;
    description_lbc?: string;
    studio_image_thumb?: string;
    sold_platform?: string;
    buyer_name?: string;
    carrier?: string;
    sold_price?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  if (body.action === "sync_studio") {
    const thumb = (body.studio_image_thumb ?? "").trim().slice(0, 100_000);
    const vinted = (body.description_vinted ?? "").trim().slice(0, 1200);
    const lbc = (body.description_lbc ?? "").trim().slice(0, 1200);
    await sql(
      `update inventory_items set
        studio_image_thumb = case when $1 <> '' then $1 else studio_image_thumb end,
        description_vinted = case when $2 <> '' then $2 else description_vinted end,
        description_lbc = case when $3 <> '' then $3 else description_lbc end,
        listed_at = now()
       where id = $4 and user_id = $5`,
      [thumb, vinted, lbc, id, auth.user.id],
    );
    return NextResponse.json({ ok: true });
  }

  if (body.action === "crosslist_lbc") {
    const plan = getEffectivePlan(auth.user);
    if (plan.crosslistMonthlyLimit === 0) {
      return NextResponse.json(
        {
          error:
            "Le crosslisting Vinted ↔ Leboncoin nécessite le plan Vendeur Plus (29 €) ou Pro Scale (49 €).",
        },
        { status: 403 },
      );
    }
    if (
      plan.crosslistMonthlyLimit > 0 &&
      auth.user.crosslist_used >= plan.crosslistMonthlyLimit
    ) {
      return NextResponse.json(
        {
          error: `Quota de ${plan.crosslistMonthlyLimit} crosslistings/mois atteint. Passe à Pro Scale pour l'illimité.`,
        },
        { status: 403 },
      );
    }
    await sql(
      `update inventory_items
       set leboncoin_status = 'listed'
       where id = $1 and user_id = $2`,
      [id, auth.user.id],
    );
    await sql(
      "update users set crosslist_used = crosslist_used + 1 where id = $1",
      [auth.user.id],
    );
    return NextResponse.json({ ok: true });
  }

  if (body.action === "mark_sold") {
    if (item.status === "sold") {
      return NextResponse.json({ ok: true, alreadySold: true });
    }
    const platform = ["vinted", "leboncoin", "tiktok_shop", "ebay"].includes(
      body.sold_platform ?? "",
    )
      ? body.sold_platform!
      : "vinted";
    const soldPrice = Math.max(
      1,
      Number(body.sold_price ?? item.listing_price),
    );
    const purchaseCost =
      Number(item.purchase_price) + Number(item.extra_costs);
    const platformFees =
      platform === "ebay"
        ? Number((soldPrice * 0.08).toFixed(2))
        : platform === "tiktok_shop"
          ? Number((soldPrice * 0.05).toFixed(2))
          : 0;
    const { netMargin } = computeNetMargin({
      grossAmount: soldPrice,
      purchaseCost,
      platformFees,
      boostCost: 0,
      shippingCost: 0,
    });

    const autoDelist = auth.user.auto_delist;
    const newVinted =
      platform === "vinted"
        ? "sold"
        : autoDelist && item.vinted_status === "listed"
          ? "removed"
          : item.vinted_status;
    const newLbc =
      platform === "leboncoin"
        ? "sold"
        : autoDelist && item.leboncoin_status === "listed"
          ? "removed"
          : item.leboncoin_status;
    const newTiktok =
      platform === "tiktok_shop"
        ? "sold"
        : autoDelist && item.tiktok_status === "listed"
          ? "removed"
          : item.tiktok_status;
    const newEbay =
      platform === "ebay"
        ? "sold"
        : autoDelist && item.ebay_status === "listed"
          ? "removed"
          : item.ebay_status;

    await sql(
      `update inventory_items
       set status = 'sold', vinted_status = $1, leboncoin_status = $2,
           tiktok_status = $3, ebay_status = $4
       where id = $5 and user_id = $6`,
      [newVinted, newLbc, newTiktok, newEbay, id, auth.user.id],
    );

    const salesCountRows = await sql<{ count: string | number }>(
      "select count(*) as count from sales where user_id = $1",
      [auth.user.id],
    );
    const nextNum = Number(salesCountRows[0]?.count ?? 0) + 42;
    const invoiceNumber = `FAC-2026-${String(nextNum).padStart(3, "0")}`;
    const trackingCode = `MR-${Math.floor(10000000 + Math.random() * 89999999)}FR`;

    await sql(
      `insert into sales (
        id, user_id, item_id, invoice_number, platform, account_handle,
        item_title, sku, buyer_name, buyer_city, carrier, tracking_code,
        shipment_status, gross_amount, purchase_cost, platform_fees,
        boost_cost, shipping_cost, urssaf_amount, net_margin
      ) values (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, 'Paris', $10, $11,
        'to_ship', $12, $13, $14,
        0, 0, $15, $16
      )`,
      [
        crypto.randomUUID(),
        auth.user.id,
        item.id,
        invoiceNumber,
        platform,
        item.vinted_account,
        item.title,
        item.sku,
        (body.buyer_name ?? "Lucas Martin").trim().slice(0, 80),
        (body.carrier ?? "Mondial Relay").trim().slice(0, 50),
        trackingCode,
        soldPrice,
        purchaseCost,
        platformFees,
        0,
        netMargin,
      ],
    );

    return NextResponse.json({
      ok: true,
      invoice_number: invoiceNumber,
      auto_delisted: autoDelist,
    });
  }

  const allowedChannel = (val: string | undefined, fallback: string) =>
    ["listed", "not_listed", "paused", "removed", "sold"].includes(val ?? "")
      ? val!
      : fallback;

  const listingPrice =
    typeof body.listing_price === "number" && body.listing_price >= 1
      ? Number(body.listing_price.toFixed(2))
      : Number(item.listing_price);

  await sql(
    `update inventory_items
     set listing_price = $1,
         vinted_status = $2,
         leboncoin_status = $3,
         tiktok_status = $4,
         ebay_status = $5
     where id = $6 and user_id = $7`,
    [
      listingPrice,
      allowedChannel(body.vinted_status, item.vinted_status),
      allowedChannel(body.leboncoin_status, item.leboncoin_status),
      allowedChannel(body.tiktok_status, item.tiktok_status),
      allowedChannel(body.ebay_status, item.ebay_status),
      id,
      auth.user.id,
    ],
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await requireAuthenticatedUser();
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  await sql("delete from inventory_items where id = $1 and user_id = $2", [
    id,
    auth.user.id,
  ]);
  return NextResponse.json({ ok: true });
}
