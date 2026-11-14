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

  let body: {
    email?: string;
    password?: string;
    name?: string;
    plan?: string;
    billing_cycle?: string;
    withSampleData?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const name = (body.name ?? "").trim();
  const plan = normalizePlanId(body.plan);
  const billingCycle = body.billing_cycle === "annual" ? "annual" : "monthly";
  const withSampleData = body.withSampleData !== false;

  if (!email || !email.includes("@") || email.length > 160) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }
  if (password.length < 6 || password.length > 128) {
    return NextResponse.json(
      { error: "Le mot de passe doit contenir au moins 6 caractères" },
      { status: 400 },
    );
  }
  if (!name || name.length > 80) {
    return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  }

  const existing = await sql<{ id: string }>(
    "select id from users where email = $1",
    [email],
  );
  if (existing.length > 0) {
    return NextResponse.json(
      { error: "Un compte existe déjà avec cet email" },
      { status: 409 },
    );
  }

  const userId = crypto.randomUUID();
  const passwordHash = hashPassword(password);

  await sql(
    `insert into users (id, email, name, password_hash, plan, billing_cycle, subscription_status, company_name, is_demo)
     values ($1, $2, $3, $4, $5, $6, 'trialing', $7, false)`,
    [userId, email, name, passwordHash, plan, billingCycle, `${name} Resell`],
  );

  if (withSampleData) {
    await seedUserWorkspace(userId, 12.3);
  }

  const token = await createSessionToken(userId);
  const cookie = buildSessionCookieHeader(token, request);
  const res = NextResponse.json({ ok: true, plan, billing_cycle: billingCycle });
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
