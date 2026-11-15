import { NextResponse } from "next/server";
import {
  assertSameOrigin,
  buildSessionCookieHeader,
  createSessionToken,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { ensurePersoUserForEmail, viewerEmailAllowed } from "@/lib/auto-session";
import { sql } from "@/lib/db";
import { getPersoConfiguredPassword } from "@/lib/perso-password";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const ip = getClientIp(request);
  const limit = await checkRateLimit({
    scope: "login",
    key: ip,
    limit: 20,
    windowSeconds: 900,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessaie dans 15 minutes." },
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
      { error: "E-mail et mot de passe requis" },
      { status: 400 },
    );
  }

  if (!viewerEmailAllowed(email)) {
    return NextResponse.json(
      { error: "Identifiants incorrects" },
      { status: 401 },
    );
  }

  const configured = getPersoConfiguredPassword();
  const rows = await sql<{ id: string; password_hash: string; name: string }>(
    "select id, password_hash, name from users where email = $1",
    [email],
  );
  let userId = rows[0]?.id;

  const passwordOk = (storedHash: string) =>
    verifyPassword(password, storedHash) ||
    (configured !== null && password === configured);

  if (userId) {
    const hash = rows[0]!.password_hash;
    if (!passwordOk(hash)) {
      return NextResponse.json(
        { error: "Identifiants incorrects" },
        { status: 401 },
      );
    }
    if (configured && password === configured && !verifyPassword(password, hash)) {
      await sql("update users set password_hash = $1 where id = $2", [
        hashPassword(password),
        userId,
      ]);
    }
  } else {
    if (!configured) {
      return NextResponse.json(
        {
          error:
            "Première connexion : ajoute PERSO_PASSWORD dans les secrets Cursor, puis republie.",
        },
        { status: 503 },
      );
    }
    if (password !== configured) {
      return NextResponse.json(
        { error: "Identifiants incorrects" },
        { status: 401 },
      );
    }
    userId = await ensurePersoUserForEmail(email, email.split("@")[0] ?? "Perso");
    await sql("update users set password_hash = $1 where id = $2", [
      hashPassword(password),
      userId,
    ]);
  }

  const token = await createSessionToken(userId);
  const cookie = buildSessionCookieHeader(token, request);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}