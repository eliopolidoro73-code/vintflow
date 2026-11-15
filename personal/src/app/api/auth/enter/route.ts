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

function deniedRedirect(request: Request, reason: string) {
  const target = new URL("/app", request.url);
  target.searchParams.set("session", "failed");
  target.searchParams.set("reason", reason);
  return NextResponse.redirect(target);
}

/** Établit la session après identité Cursor (app privée). */
export async function GET(request: Request) {
  try {
    const identity = await getIdentity(request);
    if (!identity.verified) {
      return deniedRedirect(request, "cursor");
    }

    if (identity.kind !== "person" || !identity.emailVerified || !identity.email) {
      return deniedRedirect(request, "cursor");
    }

    const email = identity.email.trim().toLowerCase();
    const allow =
      identity.simulated || viewerEmailAllowed(email);
    if (!allow) {
      return deniedRedirect(request, "email");
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
    return deniedRedirect(request, "session");
  }
}