import { NextResponse } from "next/server";
import {
  assertSameOrigin,
  getAuthenticatedUser,
  requireAuthenticatedUser,
} from "@/lib/auth";
import { sql } from "@/lib/db";

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
    urssaf_rate?: number;
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
  const urssafRate =
    typeof body.urssaf_rate === "number" &&
    body.urssaf_rate >= 0 &&
    body.urssaf_rate <= 50
      ? Number(body.urssaf_rate.toFixed(2))
      : auth.user.urssaf_rate;
  const vatThreshold =
    typeof body.vat_threshold === "number" &&
    body.vat_threshold >= 10000 &&
    body.vat_threshold <= 500000
      ? Math.round(body.vat_threshold)
      : auth.user.vat_threshold;
  const autoCrosslist =
    typeof body.auto_crosslist === "boolean"
      ? body.auto_crosslist
      : auth.user.auto_crosslist;
  const autoDelist =
    typeof body.auto_delist === "boolean"
      ? body.auto_delist
      : auth.user.auto_delist;

  await sql(
    `update users
     set name = $1, company_name = $2, siret = $3, fiscal_regime = $4,
         urssaf_rate = $5, vat_threshold = $6, auto_crosslist = $7, auto_delist = $8
     where id = $9`,
    [
      name,
      companyName,
      siret,
      fiscalRegime,
      urssafRate,
      vatThreshold,
      autoCrosslist,
      autoDelist,
      auth.user.id,
    ],
  );

  const updated = await getAuthenticatedUser();
  return NextResponse.json({ user: updated });
}
