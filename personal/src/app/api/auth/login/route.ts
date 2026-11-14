import { NextResponse } from "next/server";
import {
  assertSameOrigin,
  buildSessionCookieHeader,
  createSessionToken,
  ensureOwnerFromVerifiedIdentity,
} from "@/lib/auth";

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const ownerId = await ensureOwnerFromVerifiedIdentity();
  if (!ownerId) {
    return NextResponse.json(
      {
        error:
          "Accès réservé. Publie l'app en « Privé — pour toi seul » et ouvre le lien depuis Cursor, ou connecte-toi à Cursor dans ce navigateur.",
      },
      { status: 401 },
    );
  }

  const token = await createSessionToken(ownerId);
  const cookie = buildSessionCookieHeader(token, request);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}