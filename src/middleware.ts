import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { GOOGLE_HTML_VERIFICATION_BODY } from "@/lib/google-verification";
import {
  getPublicSiteUrl,
  isIndexableProductionHost,
  normalizeHost,
} from "@/lib/site";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host");
  const hostname = normalizeHost(host);
  if (hostname === "www.vintflow.io") {
    const target = new URL(request.nextUrl.pathname + request.nextUrl.search, getPublicSiteUrl());
    return NextResponse.redirect(target, 301);
  }

  if (request.nextUrl.pathname === "/google69a22bc60fd55e06.html") {
    return new NextResponse(`${GOOGLE_HTML_VERIFICATION_BODY}\n`, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=3600",
      },
    });
  }

  const res = NextResponse.next();
  const path = request.nextUrl.pathname;
  const seoPublicPage =
    !path.startsWith("/app") &&
    !path.startsWith("/api") &&
    isIndexableProductionHost(host);
  if (seoPublicPage) {
    res.headers.set(
      "X-Robots-Tag",
      "index, follow, max-image-preview:large, max-snippet:-1",
    );
  }
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
      "script-src 'self' https://js.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://api.stripe.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "font-src 'self' data:",
    ].join("; "),
  );
  return res;
}

export const config = {
  matcher: [
    "/google69a22bc60fd55e06.html",
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|google69a22bc60fd55e06.html).*)",
  ],
};