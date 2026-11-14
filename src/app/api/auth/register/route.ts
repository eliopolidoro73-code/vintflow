import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  assertSameOrigin,
  buildSessionCookieHeader,
  createSessionToken,
  hashPassword,
} from "@/lib/auth";
import { sql } from "@/lib/db";
import { normalizePlanId } from "@/lib/plans";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { seedUserWorkspace } from "@/lib/seed";

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const ip = getClientIp(request);
  const limit = await checkRateLimit({
    scope: "register",
    key: ip,
    limit: 5,
    windowSeconds: 3600,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Trop de créations de comptes depuis cette adresse. Réessaie plus tard." },
      { status: 429 },
    );
  }

  let body: {
    email?: string;
    password?: string;
    name?: string;
    plan?: string;
    billing_cycle?: string;
    referral_code?: string;
    withSampleData?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const name = (body.name ?? "").trim();
  const requestedPlan = normalizePlanId(body.plan);
  const billingCycle = body.billing_cycle === "annual" ? "annual" : "monthly";
  const withSampleData = body.withSampleData !== false;

  if (!email || !email.includes("@") || email.length > 160) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }
  if (password.length < 6 || password.length > 128) {
    return NextResponse.json(
      { error: "Le mot de passe doit contenir au moins 6 caractères" },
      { status: 400 },
    );
  }
  if (!name || name.length > 80) {
    return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  }

  const existing = await sql<{ id: string }>(
    "select id from users where email = $1",
    [email],
  );
  const passwordHash = hashPassword(password);
  if (existing.length > 0) {
    return NextResponse.json(
      {
        error:
          "Impossible de finaliser l'inscription avec ces informations. Essaie de te connecter ou utilise une autre adresse.",
      },
      { status: 400 },
    );
  }

  const userId = crypto.randomUUID();
  const referralCode = `VF-${userId.slice(0, 6).toUpperCase()}`;
  const rawRef = (body.referral_code ?? "").trim().toUpperCase().slice(0, 20);
  let validReferredBy: string | null = null;
  if (rawRef && /^VF-[A-Z0-9]{4,10}$/.test(rawRef)) {
    const refRows = await sql<{ referral_code: string }>(
      "select referral_code from users where referral_code = $1 and is_demo = false",
      [rawRef],
    );
    if (refRows[0]?.referral_code) {
      validReferredBy = refRows[0].referral_code;
    }
  }

  // Paid tiers (plus / pro) are only granted after verified Stripe Checkout payment.
  const initialPlan = "essentiel";

  await sql(
    `insert into users (id, email, name, password_hash, plan, billing_cycle, subscription_status, company_name, siret, referral_code, referred_by, is_demo)
     values ($1, $2, $3, $4, $5, $6, 'trialing', $7, '000 000 000 00000', $8, $9, false)`,
    [
      userId,
      email,
      name,
      passwordHash,
      initialPlan,
      billingCycle,
      `${name} Studio`,
      referralCode,
      validReferredBy,
    ],
  );

  if (withSampleData) {
    await seedUserWorkspace(userId, 12.3);
  }

  const token = await createSessionToken(userId);
  const cookie = buildSessionCookieHeader(token, request);
  const res = NextResponse.json({
    ok: true,
    plan: initialPlan,
    requestedPlan,
    billing_cycle: billingCycle,
  });
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
