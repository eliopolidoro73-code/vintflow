import { NextResponse } from "next/server";
import {
  buildSessionCookieHeader,
  createSessionToken,
} from "@/lib/auth";
import { ensureDefaultPersoUserId } from "@/lib/auto-session";

export async function GET(request: Request) {
  const userId = await ensureDefaultPersoUserId();
  const token = await createSessionToken(userId);
  const cookie = buildSessionCookieHeader(token, request);
  const target = new URL("/app", request.url);
  const res = NextResponse.redirect(target);
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}