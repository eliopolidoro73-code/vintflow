import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  assertSameOrigin,
  buildSessionCookieHeader,
  createSessionToken,
  findUnclaimedOwnerId,
  hashPassword,
  hasOwnerAccount,
} from "@/lib/auth";
import { sql } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { seedUserWorkspace } from "@/lib/seed";

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const ip = getClientIp(request);
  const rl = await checkRateLimit({
    scope: "perso_setup",
    key: ip,
    limit: 5,
    windowSeconds: 3600,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessaie plus tard." },
      { status: 429 },
    );
  }

  const alreadyExists = await hasOwnerAccount();
  if (alreadyExists) {
    return NextResponse.json(
      { error: "Le compte propriétaire est déjà configuré. Connecte-toi." },
      { status: 403 },
    );
  }

  let body: { name?: string; email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const name = (body.name ?? "Mon Dressing").trim().slice(0, 80);
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !email.includes("@") || email.length > 160) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }
  if (password.length < 4 || password.length > 128) {
    return NextResponse.json(
      { error: "Code d'accès / mot de passe requis (min. 4 caractères)" },
      { status: 400 },
    );
  }

  const passwordHash = hashPassword(password);
  const unclaimedId = await findUnclaimedOwnerId();
  let userId: string;

  try {
    if (unclaimedId) {
      userId = unclaimedId;
      await sql(
        `update users set email = $1, name = $2, password_hash = $3,
           plan = 'pro', subscription_status = 'personal_free'
         where id = $4 and not (position(':' in password_hash) > 0)`,
        [email, name, passwordHash, userId],
      );
    } else {
      userId = crypto.randomUUID();
      const referralCode = `VF-${userId.slice(0, 6).toUpperCase()}`;
      await sql(
        `insert into users (
          id, email, name, password_hash, plan, billing_cycle, subscription_status,
          company_name, siret, referral_code, is_demo
        ) values ($1, $2, $3, $4, 'pro', 'monthly', 'personal_free', $5, '000 000 000 00000', $6, false)`,
        [userId, email, name, passwordHash, `${name} · Perso`, referralCode],
      );
      await seedUserWorkspace(userId);
    }
  } catch {
    return NextResponse.json(
      { error: "Impossible de créer l'accès avec cet email. Essaie une autre adresse." },
      { status: 400 },
    );
  }

  const token = await createSessionToken(userId);
  const cookie = buildSessionCookieHeader(token, request);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
