import crypto from "node:crypto";
import { cookies } from "next/headers";
import { sql } from "./db";
import { normalizePlanId, type BillingCycle, type PlanId } from "./plans";

export const SESSION_COOKIE_NAME = "vintflow_session";

const globalForSecret = globalThis as unknown as {
  __vintflowSessionSecret?: string;
};

async function getSessionSecret(): Promise<string> {
  const envSecret = process.env.SESSION_SECRET?.trim();
  if (envSecret && envSecret.length >= 16) {
    return envSecret;
  }
  if (globalForSecret.__vintflowSessionSecret) {
    return globalForSecret.__vintflowSessionSecret;
  }

  const rows = await sql<{ value: string }>(
    "select value from app_config where key = $1",
    ["session_secret"],
  );
  if (rows[0]?.value) {
    globalForSecret.__vintflowSessionSecret = rows[0].value;
    return rows[0].value;
  }

  const generated = crypto.randomBytes(32).toString("hex");
  await sql(
    "insert into app_config (key, value) values ($1, $2) on conflict (key) do nothing",
    ["session_secret", generated],
  );
  const stored = await sql<{ value: string }>(
    "select value from app_config where key = $1",
    ["session_secret"],
  );
  const resolved = stored[0]?.value ?? generated;
  globalForSecret.__vintflowSessionSecret = resolved;
  return resolved;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  const keyBuf = Buffer.from(keyHex, "hex");
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
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
    exp: Date.now() + 1000 * 60 * 60 * 24 * 14,
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

  let referralCode = row.referral_code;
  if (!referralCode) {
    referralCode = `VF-${row.id.slice(0, 6).toUpperCase()}`;
    await sql("update users set referral_code = $1 where id = $2", [
      referralCode,
      row.id,
    ]);
  }

  // A card-less trial grants the chosen plan only until trial_ends_at; after that,
  // anything other than a Stripe-verified subscription falls back to Essentiel.
  const trialExpired =
    row.subscription_status === "trialing" &&
    new Date(row.trial_ends_at).getTime() < Date.now();

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    plan: trialExpired ? "essentiel" : normalizePlanId(row.plan),
    billing_cycle: row.billing_cycle === "annual" ? "annual" : "monthly",
    subscription_status: trialExpired ? "trial_expired" : row.subscription_status,
    trial_ends_at: String(row.trial_ends_at),
    company_name: row.company_name,
    siret: row.siret,
    fiscal_regime: row.fiscal_regime,
    vat_threshold: Number(row.vat_threshold),
    auto_crosslist: Boolean(row.auto_crosslist),
    auto_delist: Boolean(row.auto_delist),
    ai_credits_used: Number(row.ai_credits_used ?? 0),
    crosslist_used: Number(row.crosslist_used ?? 0),
    referral_code: referralCode,
    is_demo: Boolean(row.is_demo),
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

export async function requireActiveSubscription(): Promise<
  { user: AuthUser } | { response: Response }
> {
  const auth = await requireAuthenticatedUser();
  if ("response" in auth) return auth;

  const { canUseCockpit, subscriptionBlockedMessage } = await import(
    "./entitlement"
  );
  if (!canUseCockpit(auth.user)) {
    return {
      response: Response.json(
        {
          error: subscriptionBlockedMessage(auth.user),
          code: "subscription_required",
        },
        { status: 402 },
      ),
    };
  }
  return auth;
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
      maxAge: 60 * 60 * 24 * 14,
      secure: isHttps,
    },
  };
}
