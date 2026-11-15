import { NextResponse } from "next/server";
import { requireIdentity } from "../../../../../cursor/identity";
import {
  buildSessionCookieHeader,
  createSessionToken,
} from "@/lib/auth";
import {
  ensurePersoUserForEmail,
  viewerEmailAllowed,
} from "@/lib/auto-session";

/** Établit la session applicative après connexion Cursor (app privée). */
export async function GET(request: Request) {
  const identity = await requireIdentity(request);
  if (identity instanceof Response) return identity;

  if (identity.kind !== "person" || !identity.emailVerified || !identity.email) {
    return NextResponse.json(
      {
        error:
          "Connexion Cursor requise. Publie l'app en privé et ouvre-la depuis Cursor.",
      },
      { status: 403 },
    );
  }

  const email = identity.email.trim().toLowerCase();
  if (!viewerEmailAllowed(email)) {
    return NextResponse.json(
      {
        error:
          "Cet e-mail n'est pas autorisé pour l'édition perso (PERSO_ALLOWED_EMAILS).",
      },
      { status: 403 },
    );
  }

  const userId = await ensurePersoUserForEmail(email, identity.name || email);
  const token = await createSessionToken(userId);
  const cookie = buildSessionCookieHeader(token, request);
  const target = new URL("/app", request.url);
  const res = NextResponse.redirect(target);
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}