import { NextResponse } from "next/server";
import { getIdentity } from "../../../../../cursor/identity";
import {
  buildSessionCookieHeader,
  createSessionToken,
} from "@/lib/auth";
import {
  ensurePersoUserForEmail,
  viewerEmailAllowed,
} from "@/lib/auto-session";

/** Établit la session après identité Cursor (optionnel) ; sinon → login e-mail. */
export async function GET(request: Request) {
  try {
    const identity = await getIdentity(request);
    if (
      !identity.verified ||
      identity.kind !== "person" ||
      !identity.emailVerified ||
      !identity.email
    ) {
      return NextResponse.redirect(new URL("/app", request.url));
    }

    const email = identity.email.trim().toLowerCase();
    const allow =
      identity.simulated || viewerEmailAllowed(email);
    if (!allow) {
      return NextResponse.redirect(new URL("/app", request.url));
    }

    const userId = await ensurePersoUserForEmail(
      email,
      identity.name || email,
    );
    const token = await createSessionToken(userId);
    const cookie = buildSessionCookieHeader(token, request);
    const target = new URL("/app", request.url);
    const res = NextResponse.redirect(target);
    res.cookies.set(cookie.name, cookie.value, cookie.options);
    return res;
  } catch {
    return NextResponse.redirect(new URL("/app", request.url));
  }
}