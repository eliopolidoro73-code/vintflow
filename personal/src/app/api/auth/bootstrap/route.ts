import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { ensurePersoUserForEmail } from "@/lib/auto-session";
import { getPrimaryOwnerEmail } from "@/lib/perso-access";

/** Connexion automatique → cockpit (sans formulaire). */
export async function GET(request: Request) {
  const email = getPrimaryOwnerEmail();
  if (!email) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  const userId = await ensurePersoUserForEmail(
    email,
    email.split("@")[0] ?? "Perso",
  );
  const token = await createSessionToken(userId);
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const secure = proto === "https";

  const res = NextResponse.redirect(new URL("/app", request.url));
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    secure,
  });
  return res;
}