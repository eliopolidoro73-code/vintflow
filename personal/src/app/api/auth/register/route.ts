import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  assertSameOrigin,
  buildSessionCookieHeader,
  createSessionToken,
  hashPassword,
} from "@/lib/auth";
import { sql } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

function isEmailAllowed(email: string): boolean {
  const raw = process.env.PERSO_ALLOWED_EMAILS?.trim();
  if (!raw) return true;
  const allowed = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email);
}

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const ip = getClientIp(request);
  const limit = await checkRateLimit({
    scope: "register",
    key: ip,
    limit: 8,
    windowSeconds: 3600,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Trop de créations de comptes. Réessaie plus tard." },
      { status: 429 },
    );
  }

  let body: {
    email?: string;
    password?: string;
    name?: string;
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
  if (!isEmailAllowed(email)) {
    return NextResponse.json(
      {
        error:
          "Inscription non autorisée pour cette adresse sur l'édition personnelle.",
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
    return NextResponse.json(
      {
        error:
          "Impossible de finaliser l'inscription. Essaie de te connecter ou utilise une autre adresse.",
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
     values ($1, $2, $3, $4, 'pro', 'monthly', 'personal_free', $5, '000 000 000 00000', $6, false)`,
    [userId, email, name, passwordHash, `${name} · Perso`, referralCode],
  );

  const token = await createSessionToken(userId);
  const cookie = buildSessionCookieHeader(token, request);
  const res = NextResponse.json({ ok: true, plan: "pro" });
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}