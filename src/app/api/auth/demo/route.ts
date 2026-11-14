import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  assertSameOrigin,
  buildSessionCookieHeader,
  createSessionToken,
  hashPassword,
} from "@/lib/auth";
import { sql } from "@/lib/db";
import { normalizePlanId } from "@/lib/plans";
import { seedUserWorkspace } from "@/lib/seed";

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  let body: { plan?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const plan = body.plan ? normalizePlanId(body.plan) : "pro";
  const userId = crypto.randomUUID();
  const shortId = userId.slice(0, 8);
  const email = `demo-${shortId}@demo.vintflow.local`;
  const passwordHash = hashPassword(crypto.randomBytes(16).toString("hex"));

  await sql(
    `insert into users (id, email, name, password_hash, plan, billing_cycle, subscription_status, company_name, is_demo)
     values ($1, $2, $3, $4, $5, 'monthly', 'trialing', $6, true)`,
    [userId, email, "Charles (Démo)", passwordHash, plan, "Charles Resell"],
  );

  await seedUserWorkspace(userId, 12.3);

  const token = await createSessionToken(userId);
  const cookie = buildSessionCookieHeader(token, request);
  const res = NextResponse.json({ ok: true, demo: true, plan });
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
