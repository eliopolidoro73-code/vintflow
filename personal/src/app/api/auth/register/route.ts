import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  assertSameOrigin,
  buildSessionCookieHeader,
  createSessionToken,
  hashPassword,
} from "@/lib/auth";
import { sql } from "@/lib/db";
import {
  isPersoOwnerEmail,
  persoOwnerSlotsAvailable,
  persoRegistrationConfigured,
  registrationInviteConfigured,
  verifyRegistrationInvite,
} from "@/lib/perso-access";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  if (!(await persoOwnerSlotsAvailable())) {
    return NextResponse.json(
      { error: "L'inscription est fermée sur cette édition." },
      { status: 403 },
    );
  }

  if (!persoRegistrationConfigured()) {
    return NextResponse.json(
      {
        error:
          "Inscription désactivée : l'administrateur doit configurer PERSO_ALLOWED_EMAILS sur l'hébergement.",
      },
      { status: 503 },
    );
  }

  if (!registrationInviteConfigured()) {
    return NextResponse.json(
      {
        error:
          "Inscription fermée : définis le secret PERSO_REGISTRATION_INVITE sur l'hébergement.",
      },
      { status: 503 },
    );
  }

  const ip = getClientIp(request);
  const ipLimit = ip === "unknown-ip" ? 2 : 5;
  const limit = await checkRateLimit({
    scope: "register",
    key: ip,
    limit: ipLimit,
    windowSeconds: 3600,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Trop de créations de comptes. Réessaie plus tard." },
      { status: 429 },
    );
  }

  const globalLimit = await checkRateLimit({
    scope: "register_global",
    key: "all",
    limit: 10,
    windowSeconds: 86400,
  });
  if (!globalLimit.allowed) {
    return NextResponse.json(
      { error: "Limite d'inscriptions atteinte pour aujourd'hui." },
      { status: 429 },
    );
  }

  let body: {
    email?: string;
    password?: string;
    name?: string;
    invite_code?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const name = (body.name ?? "").trim();

  if (!email || !email.includes("@") || email.length > 160) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }
  if (!verifyRegistrationInvite(body.invite_code)) {
    return NextResponse.json(
      { error: "Code d'activation invalide." },
      { status: 403 },
    );
  }

  if (!isPersoOwnerEmail(email)) {
    return NextResponse.json(
      {
        error:
          "Seules les adresses autorisées par l'administrateur peuvent créer un compte.",
      },
      { status: 403 },
    );
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
  if (existing.length > 0) {
    await hashPassword(password);
    return NextResponse.json(
      {
        error:
          "Impossible de créer le compte avec ces informations. Vérifie les champs saisis.",
      },
      { status: 400 },
    );
  }

  const userId = crypto.randomUUID();
  const referralCode = `VF-${userId.slice(0, 6).toUpperCase()}`;
  const passwordHash = hashPassword(password);

  await sql(
    `insert into users (
       id, email, name, password_hash, plan, billing_cycle, subscription_status,
       company_name, siret, referral_code, is_demo
     )
     values ($1, $2, $3, $4, 'essentiel', 'monthly', 'personal_free', $5, '000 000 000 00000', $6, false)`,
    [userId, email, name, passwordHash, `${name} · Perso`, referralCode],
  );

  const token = await createSessionToken(userId);
  const cookie = buildSessionCookieHeader(token, request);
  const res = NextResponse.json({ ok: true, plan: "pro" });
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}