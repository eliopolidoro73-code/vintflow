import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { assertSameOrigin, requireAuthenticatedUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { generateListingCopy } from "@/lib/format";
import { getEffectivePlan } from "@/lib/perso-plan";
import { checkRateLimit } from "@/lib/rate-limit";

const COLOR_PALETTE = [
  "#0f766e",
  "#1e3a8a",
  "#be123c",
  "#047857",
  "#4338ca",
  "#0f172a",
];

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await requireAuthenticatedUser();
  if ("response" in auth) return auth.response;

  const rl = await checkRateLimit({
    scope: "items_create",
    key: auth.user.id,
    limit: 40,
    windowSeconds: 3600,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trop d'articles créés cette heure-ci. Patiente un instant." },
      { status: 429 },
    );
  }

  const plan = getEffectivePlan(auth.user);

  const countRows = await sql<{ cnt: string | number }>(
    "select count(*) as cnt from inventory_items where user_id = $1 and status = 'active'",
    [auth.user.id],
  );
  const currentActive = Number(countRows[0]?.cnt ?? 0);
  if (currentActive >= plan.activeItemsLimit) {
    return NextResponse.json(
      {
        error: `Limite de ${plan.activeItemsLimit} articles actifs atteinte sur le plan ${plan.name}. Passe au palier supérieur.`,
      },
      { status: 403 },
    );
  }

  let body: {
    sku?: string;
    title?: string;
    brand?: string;
    category?: string;
    size?: string;
    condition?: string;
    location?: string;
    purchase_price?: number;
    extra_costs?: number;
    listing_price?: number;
    vinted_account?: string;
    crosslist_lbc?: boolean;
    crosslist_tiktok?: boolean;
    crosslist_ebay?: boolean;
    description_vinted?: string;
    description_lbc?: string;
    studio_image_thumb?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const title = (body.title ?? "").trim().slice(0, 120);
  if (!title) {
    return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  }

  const brand = (body.brand ?? "").trim().slice(0, 60);
  const category = (body.category ?? "Vêtements").trim().slice(0, 50);
  const size = (body.size ?? "M").trim().slice(0, 30);
  const condition = (body.condition ?? "Très bon état").trim().slice(0, 40);
  const location = (body.location ?? "Rack A1").trim().slice(0, 40);
  const purchasePrice = Math.max(0, Number(body.purchase_price ?? 0));
  const extraCosts = Math.max(0, Number(body.extra_costs ?? 0));
  const listingPrice = Math.max(1, Number(body.listing_price ?? 25));
  const vintedAccount = (body.vinted_account ?? "")
    .trim()
    .slice(0, 60);

  const generated = generateListingCopy({
    title,
    brand,
    category,
    size,
    condition,
    listingPrice,
  });

  const id = crypto.randomUUID();
  const sku =
    (body.sku ?? "").trim().slice(0, 32) ||
    `SKU-${(brand || "ART").slice(0, 3).toUpperCase()}-${Math.floor(
      100 + Math.random() * 900,
    )}`;

  const wantsCrosslistLbc =
    Boolean(body.crosslist_lbc) ||
    (auth.user.auto_crosslist && plan.autoCrosslistAllowed);

  let leboncoinStatus = "not_listed";
  if (wantsCrosslistLbc) {
    if (plan.crosslistMonthlyLimit === 0) {
      return NextResponse.json(
        {
          error:
            "Le crosslisting Vinted ↔ Leboncoin est disponible à partir du plan Vendeur Plus (29 €/mois).",
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
    leboncoinStatus = "listed";
    await sql(
      "update users set crosslist_used = crosslist_used + 1 where id = $1",
      [auth.user.id],
    );
  }

  const tiktokStatus = body.crosslist_tiktok ? "listed" : "not_listed";
  const ebayStatus = body.crosslist_ebay ? "listed" : "not_listed";
  const color =
    COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];

  const studioThumb = (body.studio_image_thumb ?? "")
    .trim()
    .slice(0, 100_000);

  await sql(
    `insert into inventory_items (
      id, user_id, sku, title, brand, category, size, condition, location,
      purchase_price, extra_costs, listing_price, status,
      vinted_status, leboncoin_status, tiktok_status, ebay_status,
      vinted_account, description_vinted, description_lbc, image_color, studio_image_thumb
    ) values (
      $1, $2, $3, $4, $5, $6, $7, $8, $9,
      $10, $11, $12, 'active',
      'listed', $13, $14, $15,
      $16, $17, $18, $19, $20
    )`,
    [
      id,
      auth.user.id,
      sku,
      title,
      brand,
      category,
      size,
      condition,
      location,
      purchasePrice,
      extraCosts,
      listingPrice,
      leboncoinStatus,
      tiktokStatus,
      ebayStatus,
      vintedAccount,
      (body.description_vinted ?? generated.vinted).slice(0, 1200),
      (body.description_lbc ?? generated.leboncoin).slice(0, 1200),
      color,
      studioThumb,
    ],
  );

  return NextResponse.json({ ok: true, id, sku, generated });
}
