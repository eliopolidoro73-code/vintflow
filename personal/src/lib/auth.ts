import crypto from "node:crypto";
import { headers } from "next/headers";
import { getIdentity } from "../../cursor/identity";
import { sql } from "./db";
import { seedUserWorkspace } from "./seed";
import type { BillingCycle, PlanId } from "./plans";

export const SESSION_COOKIE_NAME = "vintflow_session";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  plan: PlanId;
  billing_cycle: BillingCycle;
  subscription_status: string;
  trial_ends_at: string;
  company_name: string;
  siret: string;
  fiscal_regime: string;
  vat_threshold: number;
  auto_crosslist: boolean;
  auto_delist: boolean;
  ai_credits_used: number;
  crosslist_used: number;
  referral_code: string;
  is_demo: boolean;
}

export async function getAuthenticatedUser(): Promise<AuthUser | null> {
  const hdrs = await headers();
  const identity = await getIdentity(hdrs);
  if (!identity.verified) return null;

  const userId = identity.sub;
  const displayName =
    (identity.kind === "person" ? identity.name : identity.name) ||
    "Mon Dressing";
  const displayEmail =
    (identity.kind === "person" ? identity.email : "") ||
    `${crypto.createHash("sha256").update(userId).digest("hex").slice(0, 10)}@private.vintflow.local`;

  const rows = await sql<{
    id: string;
    email: string;
    name: string;
    plan: string;
    billing_cycle: string;
    subscription_status: string;
    trial_ends_at: string;
    company_name: string;
    siret: string;
    fiscal_regime: string;
    vat_threshold: number;
    auto_crosslist: boolean;
    auto_delist: boolean;
    ai_credits_used: number;
    crosslist_used: number;
    referral_code: string | null;
    is_demo: boolean;
  }>(
    `select id, email, name, plan, billing_cycle, subscription_status, trial_ends_at,
            company_name, siret, fiscal_regime, vat_threshold,
            auto_crosslist, auto_delist, ai_credits_used, crosslist_used, referral_code, is_demo
     from users where id = $1`,
    [userId],
  );

  let row = rows[0];
  if (!row) {
    const referralCode = `VF-${crypto.createHash("sha256").update(userId).digest("hex").slice(0, 6).toUpperCase()}`;
    const placeholderHash = crypto.randomBytes(32).toString("hex");
    await sql(
      `insert into users (
        id, email, name, password_hash, plan, billing_cycle, subscription_status,
        company_name, siret, referral_code, is_demo
      ) values ($1, $2, $3, $4, 'pro', 'monthly', 'personal_free', $5, '000 000 000 00000', $6, false)
      on conflict (id) do nothing`,
      [
        userId,
        displayEmail,
        displayName,
        placeholderHash,
        `${displayName} · Perso`,
        referralCode,
      ],
    );
    await seedUserWorkspace(userId);

    const createdRows = await sql<typeof row>(
      `select id, email, name, plan, billing_cycle, subscription_status, trial_ends_at,
              company_name, siret, fiscal_regime, vat_threshold,
              auto_crosslist, auto_delist, ai_credits_used, crosslist_used, referral_code, is_demo
       from users where id = $1`,
      [userId],
    );
    row = createdRows[0];
  }

  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    plan: "pro", // Personal private edition always grants full Pro Scale access for free
    billing_cycle: "monthly",
    subscription_status: "personal_free",
    trial_ends_at: String(row.trial_ends_at),
    company_name: row.company_name,
    siret: row.siret,
    fiscal_regime: row.fiscal_regime,
    vat_threshold: Number(row.vat_threshold),
    auto_crosslist: Boolean(row.auto_crosslist),
    auto_delist: Boolean(row.auto_delist),
    ai_credits_used: Number(row.ai_credits_used ?? 0),
    crosslist_used: Number(row.crosslist_used ?? 0),
    referral_code: row.referral_code ?? "VF-PERSO",
    is_demo: false,
  };
}

export async function requireAuthenticatedUser(): Promise<
  { user: AuthUser } | { response: Response }
> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return {
      response: Response.json(
        { error: "Authentification Cursor requise" },
        { status: 401 },
      ),
    };
  }
  return { user };
}

export function assertSameOrigin(request: Request): Response | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return null;
  try {
    const parsedOrigin = new URL(origin);
    if (parsedOrigin.host !== host) {
      return Response.json({ error: "Origine invalide" }, { status: 403 });
    }
  } catch {
    return Response.json({ error: "Origine invalide" }, { status: 403 });
  }
  return null;
}
