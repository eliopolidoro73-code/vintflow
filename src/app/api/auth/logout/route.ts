import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  assertSameOrigin,
  revokeSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  await revokeSessionToken(token);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
