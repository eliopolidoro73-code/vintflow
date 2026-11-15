import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getPrimaryOwnerEmail } from "@/lib/perso-access";
import {
  createSessionTokenEdge,
  SESSION_COOKIE_NAME,
  stablePersoUserIdEdge,
  verifySessionTokenEdge,
} from "@/lib/session-token-edge";

function applySecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      // Next/Turbopack hydration nécessite les scripts inline (sinon boutons inactifs).
      "script-src 'self' 'unsafe-inline'",
      "object-src 'none'",
      "base-uri 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "connect-src 'self'",
      "font-src 'self' data:",
    ].join("; "),
  );
  return res;
}

const SESSION_PATHS = new Set(["/", "/app"]);

export async function middleware(request: NextRequest) {
  let res = NextResponse.next();

  const { pathname } = request.nextUrl;
  if (SESSION_PATHS.has(pathname)) {
    const existing = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    let uid = await verifySessionTokenEdge(existing);
    if (!uid) {
      const email = getPrimaryOwnerEmail();
      if (email) {
        uid = await stablePersoUserIdEdge(email);
        const token = await createSessionTokenEdge(uid);
        if (token) {
          const proto = request.headers.get("x-forwarded-proto") ?? "https";
          res.cookies.set(SESSION_COOKIE_NAME, token, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 30,
            secure: proto === "https",
          });
        }
      }
    }
  }

  return applySecurityHeaders(res);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};