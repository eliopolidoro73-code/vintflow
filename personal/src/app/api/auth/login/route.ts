import { NextResponse } from "next/server";
import {
  assertSameOrigin,
  buildSessionCookieHeader,
  createSessionToken,
  verifyPassword,
} from "@/lib/auth";
import { sql } from "@/lib/db";
import { isPersoOwnerEmail, persoLoginConfigured } from "@/lib/perso-access";
import { provisionOwnerOnLogin } from "@/lib/provision-owner";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const LOGIN_FAIL_LIMIT = 20;
const LOGIN_FAIL_WINDOW_SECONDS = 900;

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  if (!persoLoginConfigured()) {
    return NextResponse.json(
      {
        error:
          "Connexion non configurée : secrets PERSO_ALLOWED_EMAILS et PERSO_OWNER_PASSWORD requis.",
      },
      { status: 503 },
    );
  }

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
      {
        error:
          "Cet e-mail n'est pas autorisé. Dans Cursor → Secrets de vintflow-perso, mets exactement le même e-mail dans PERSO_ALLOWED_EMAILS.",
      },
      { status: 403 },
    );
  }

  await provisionOwnerOnLogin(email, password);

  const failBucket = { scope: "login_fail", key: `${ip}:${email}` };

  const rows = await sql<{
    id: string;
    password_hash: string;
    subscription_status: string;
  }>(
    "select id, password_hash, subscription_status from users where email = $1",
    [email],
  );
  const user = rows[0];
  if (
    !user ||
    user.subscription_status !== "personal_free" ||
    !verifyPassword(password, user.password_hash)
  ) {
    await checkRateLimit({
      ...failBucket,
      limit: LOGIN_FAIL_LIMIT,
      windowSeconds: LOGIN_FAIL_WINDOW_SECONDS,
    });
    return NextResponse.json(
      {
        error:
          "Identifiants incorrects. Utilise le mot de passe défini dans PERSO_OWNER_PASSWORD.",
      },
      { status: 401 },
    );
  }

  const token = await createSessionToken(user.id);
  const cookie = buildSessionCookieHeader(token, request);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}