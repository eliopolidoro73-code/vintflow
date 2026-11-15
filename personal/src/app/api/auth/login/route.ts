import { NextResponse } from "next/server";
import {
  assertSameOrigin,
  buildSessionCookieHeader,
  createSessionToken,
  verifyPassword,
} from "@/lib/auth";
import { sql } from "@/lib/db";
import { isPersoOwnerEmail } from "@/lib/perso-access";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const LOGIN_FAIL_LIMIT = 20;
const LOGIN_FAIL_WINDOW_SECONDS = 900;

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const ip = getClientIp(request);
  const limit = await checkRateLimit({
    scope: "login",
    key: ip,
    limit: 15,
    windowSeconds: 900,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives de connexion. Réessaie dans 15 minutes." },
      { status: 429 },
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email et mot de passe requis" },
      { status: 400 },
    );
  }

  if (!isPersoOwnerEmail(email)) {
    return NextResponse.json(
      { error: "Accès réservé à l'édition personnelle autorisée." },
      { status: 403 },
    );
  }

  const failBucket = { scope: "login_fail", key: `${ip}:${email}` };

  const rows = await sql<{ id: string; password_hash: string }>(
    "select id, password_hash from users where email = $1",
    [email],
  );
  const user = rows[0];
  if (!user || !verifyPassword(password, user.password_hash)) {
    await checkRateLimit({
      ...failBucket,
      limit: LOGIN_FAIL_LIMIT,
      windowSeconds: LOGIN_FAIL_WINDOW_SECONDS,
    });
    return NextResponse.json(
      { error: "Identifiants incorrects" },
      { status: 401 },
    );
  }

  const token = await createSessionToken(user.id);
  const cookie = buildSessionCookieHeader(token, request);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}