import { NextResponse } from "next/server";
import {
  assertSameOrigin,
  buildSessionCookieHeader,
  checkOwnerPassword,
  createSessionToken,
  getOrCreateOwnerId,
  isOwnerPasswordConfigured,
} from "@/lib/auth";
import { checkRateLimit, getClientIp, isRateLimited } from "@/lib/rate-limit";

// Failed attempts are also counted site-wide, so rotating spoofed IP headers
// cannot buy more password guesses.
const GLOBAL_FAILURES = { scope: "perso_login_fail", key: "all", limit: 20 };
const GLOBAL_FAILURE_WINDOW_SECONDS = 3600;

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  if (!isOwnerPasswordConfigured()) {
    return NextResponse.json(
      {
        error:
          "Le mot de passe du site n'est pas encore configuré (secret PERSO_PASSWORD).",
      },
      { status: 503 },
    );
  }

  const rl = await checkRateLimit({
    scope: "perso_login",
    key: getClientIp(request),
    limit: 10,
    windowSeconds: 900,
  });
  if (!rl.allowed || (await isRateLimited(GLOBAL_FAILURES))) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessaie plus tard." },
      { status: 429 },
    );
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!password || password.length > 256 || !checkOwnerPassword(password)) {
    await checkRateLimit({
      ...GLOBAL_FAILURES,
      windowSeconds: GLOBAL_FAILURE_WINDOW_SECONDS,
    });
    return NextResponse.json(
      { error: "Mot de passe incorrect" },
      { status: 401 },
    );
  }

  const ownerId = await getOrCreateOwnerId();
  const token = await createSessionToken(ownerId);
  const cookie = buildSessionCookieHeader(token, request);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
