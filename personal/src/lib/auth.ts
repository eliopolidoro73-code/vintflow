import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { getIdentity } from "../../cursor/identity";
import { sql } from "./db";
import { seedUserWorkspace } from "./seed";
import type { BillingCycle, PlanId } from "./plans";

export const SESSION_COOKIE_NAME = "vintflow_perso_session";

const globalForSecret = globalThis as unknown as {
  __vintflowPersoSecret?: string;
};

async function getSessionSecret(): Promise<string> {
  const envSecret = process.env.SESSION_SECRET?.trim();
  if (envSecret && envSecret.length >= 16) {
    return envSecret;
  }
  if (globalForSecret.__vintflowPersoSecret) {
    return globalForSecret.__vintflowPersoSecret;
  }

  const rows = await sql<{ value: string }>(
    "select value from app_config where key = $1",
    ["perso_session_secret"],
  );
  if (rows[0]?.value) {
    globalForSecret.__vintflowPersoSecret = rows[0].value;
    return rows[0].value;
  }

  const generated = crypto.randomBytes(32).toString("hex");
  await sql(
    "insert into app_config (key, value) values ($1, $2) on conflict (key) do nothing",
    ["perso_session_secret", generated],
  );
  const stored = await sql<{ value: string }>(
    "select value from app_config where key = $1",
    ["perso_session_secret"],
  );
  const resolved = stored[0]?.value ?? generated;
  globalForSecret.__vintflowPersoSecret = resolved;
  return resolved;
}

interface SessionPayload {
  uid: string;
  jti: string;
  exp: number;
}

export async function createSessionToken(userId: string): Promise<string> {
  const secret = await getSessionSecret();
  const payload: SessionPayload = {
    uid: userId,
    jti: crypto.randomUUID(),
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", secret)
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${sig}`;
}

async function decodeAndCheckSignature(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;

  const secret = await getSessionSecret();
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(encoded)
    .digest("base64url");

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (!parsed.uid || !parsed.jti || typeof parsed.exp !== "number") {
      return null;
    }
    if (Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function verifySessionToken(
  token: string | undefined,
): Promise<string | null> {
  const parsed = await decodeAndCheckSignature(token);
  if (!parsed) return null;

  const revoked = await sql<{ jti: string }>(
    "select jti from revoked_tokens where jti = $1",
    [parsed.jti],
  );
  if (revoked.length > 0) return null;

  return parsed.uid;
}

export async function revokeSessionToken(
  token: string | undefined,
): Promise<void> {
  const parsed = await decodeAndCheckSignature(token);
  if (!parsed) return;

  await sql("delete from revoked_tokens where expires_at < now()", []);
  await sql(
    `insert into revoked_tokens (jti, expires_at)
     values ($1, $2)
     on conflict (jti) do nothing`,
    [parsed.jti, new Date(parsed.exp).toISOString()],
  );
}

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

/** Ensures the signed-in Cursor viewer has a Pro Scale owner row; returns its id. */
export async function ensureOwnerFromVerifiedIdentity(): Promise<string | null> {
  const hdrs = await headers();
  const identity = await getIdentity(hdrs);
  if (!identity.verified || identity.kind !== "person") {
    return null;
  }

  const userId = identity.sub;
  const displayName = identity.name.trim() || "Mon Dressing";
  const displayEmail =
    identity.email.trim() ||
    `owner-${crypto.createHash("sha256").update(userId).digest("hex").slice(0, 10)}@vintflow.local`;

  const rows = await sql<{ id: string }>(
    "select id from users where id = $1",
    [userId],
  );
  if (rows.length === 0) {
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
  } else {
    await sql(
      "update users set email = $1, name = $2 where id = $3 and is_demo = false",
      [displayEmail, displayName, userId],
    );
  }

  return userId;
}

export async function getAuthenticatedUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const userId = await verifySessionToken(token);
  if (!userId) return null;

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

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    plan: "pro",
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
        { error: "Authentification requise" },
        { status: 401 },
      ),
    };
  }
  return { user };
}

export function assertSameOrigin(request: Request): Response | null {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite) {
    if (fetchSite === "same-origin" || fetchSite === "none") return null;
    return Response.json({ error: "Origine invalide" }, { status: 403 });
  }
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const candidates = [
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim(),
    request.headers.get("host")?.trim(),
  ].filter((h): h is string => Boolean(h));
  if (candidates.length === 0) return null;
  try {
    const parsedOrigin = new URL(origin);
    if (!candidates.includes(parsedOrigin.host)) {
      return Response.json({ error: "Origine invalide" }, { status: 403 });
    }
  } catch {
    return Response.json({ error: "Origine invalide" }, { status: 403 });
  }
  return null;
}

export function buildSessionCookieHeader(token: string, request: Request): {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    sameSite: "lax";
    path: string;
    maxAge: number;
    secure: boolean;
  };
} {
  const proto = request.headers.get("x-forwarded-proto") ?? "";
  const isHttps = proto === "https" || request.url.startsWith("https://");
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      secure: isHttps,
    },
  };
}