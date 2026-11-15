import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { assertSameOrigin, requireActiveSubscription } from "@/lib/auth";

import { sql } from "@/lib/db";
import { PLANS } from "@/lib/plans";

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await requireActiveSubscription();
  if ("response" in auth) return auth.response;

  let body: { action?: "connect" | "sync" | "disconnect"; platform?: string; handle?: string; id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  if (body.action === "sync") {
    await sql(
      "update connected_accounts set last_synced_at = now() where user_id = $1",
      [auth.user.id],
    );
    return NextResponse.json({ ok: true, syncedAt: new Date().toISOString() });
  }

  if (body.action === "disconnect" && body.id) {
    await sql(
      "delete from connected_accounts where id = $1 and user_id = $2",
      [body.id, auth.user.id],
    );
    return NextResponse.json({ ok: true });
  }

  const platform = ["vinted", "leboncoin", "tiktok_shop", "ebay", "whatnot"].includes(
    body.platform ?? "",
  )
    ? body.platform!
    : "vinted";
  const handle = (body.handle ?? "").trim().slice(0, 60);
  if (!handle) {
    return NextResponse.json({ error: "Nom du compte requis" }, { status: 400 });
  }

  const plan = PLANS[auth.user.plan];
  const existing = await sql<{ platform: string }>(
    "select platform from connected_accounts where user_id = $1",
    [auth.user.id],
  );
  const countForPlatform = existing.filter(
    (a) => a.platform === platform,
  ).length;
  const limit =
    platform === "vinted"
      ? plan.vintedAccountsLimit
      : platform === "leboncoin"
        ? plan.leboncoinAccountsLimit
        : platform === "tiktok_shop"
          ? plan.tiktokAccountsLimit
          : platform === "ebay"
            ? plan.ebayAccountsLimit
            : plan.whatnotAccountsLimit;

  if (countForPlatform >= limit) {
    return NextResponse.json(
      {
        error: `Limite atteinte pour ${platform} sur le plan ${plan.name} (${limit} max). Passe au plan Pro pour connecter plus de comptes.`,
      },
      { status: 403 },
    );
  }

  await sql(
    `insert into connected_accounts (id, user_id, platform, handle, status, listings_count)
     values ($1, $2, $3, $4, 'connected', 0)`,
    [crypto.randomUUID(), auth.user.id, platform, handle],
  );

  return NextResponse.json({ ok: true });
}
