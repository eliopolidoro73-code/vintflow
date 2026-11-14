import { NextResponse } from "next/server";
import {
  assertSameOrigin,
  getAuthenticatedUser,
  requireAuthenticatedUser,
} from "@/lib/auth";
import { sql } from "@/lib/db";
import { PLANS } from "@/lib/plans";

export async function GET() {
  const user = await getAuthenticatedUser();
  return NextResponse.json(
    { user },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function PATCH(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await requireAuthenticatedUser();
  if ("response" in auth) return auth.response;

  let body: {
    name?: string;
    company_name?: string;
    siret?: string;
    fiscal_regime?: string;
    vat_threshold?: number;
    auto_crosslist?: boolean;
    auto_delist?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const name = (body.name ?? auth.user.name).trim().slice(0, 80);
  const companyName = (body.company_name ?? auth.user.company_name)
    .trim()
    .slice(0, 100);
  const siret = (body.siret ?? auth.user.siret).trim().slice(0, 32);
  const fiscalRegime = ["micro_bic", "micro_bnc", "societe_tva_marge"].includes(
    body.fiscal_regime ?? "",
  )
    ? body.fiscal_regime!
    : auth.user.fiscal_regime;
  const vatThreshold =
    typeof body.vat_threshold === "number" &&
    body.vat_threshold >= 10000 &&
    body.vat_threshold <= 500000
      ? Math.round(body.vat_threshold)
      : auth.user.vat_threshold;
  const plan = PLANS[auth.user.plan];
  const autoCrosslist =
    typeof body.auto_crosslist === "boolean"
      ? body.auto_crosslist && plan.autoCrosslistAllowed
      : auth.user.auto_crosslist;
  if (body.auto_crosslist === true && !plan.autoCrosslistAllowed) {
    return NextResponse.json(
      {
        error:
          "La publication automatique (8h–23h) est réservée au plan Pro Scale (49 €/mois).",
      },
      { status: 403 },
    );
  }
  const autoDelist =
    typeof body.auto_delist === "boolean"
      ? body.auto_delist
      : auth.user.auto_delist;

  await sql(
    `update users
     set name = $1, company_name = $2, siret = $3, fiscal_regime = $4,
         vat_threshold = $5, auto_crosslist = $6, auto_delist = $7
     where id = $8`,
    [
      name,
      companyName,
      siret,
      fiscalRegime,
      vatThreshold,
      autoCrosslist,
      autoDelist,
      auth.user.id,
    ],
  );

  const updated = await getAuthenticatedUser();
  return NextResponse.json({ user: updated });
}
