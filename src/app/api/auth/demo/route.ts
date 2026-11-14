import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  assertSameOrigin,
  buildSessionCookieHeader,
  createSessionToken,
  hashPassword,
} from "@/lib/auth";
import { sql } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { seedUserWorkspace } from "@/lib/seed";

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const ip = getClientIp(request);
  const limit = await checkRateLimit({
    scope: "demo",
    key: ip,
    limit: 5,
    windowSeconds: 3600,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Trop de sessions démo créées récemment. Crée un compte gratuit ou réessaie plus tard." },
      { status: 429 },
    );
  }

  // Prune expired demo sandboxes to prevent database storage bloat
  await sql(
    "delete from users where is_demo = true and created_at < now() - interval '6 hours'",
    [],
  );

  // Demo always starts on the non-paid Essentiel plan (never grants paid Pro/Plus privileges)
  const plan = "essentiel";
  const userId = crypto.randomUUID();
  const shortId = userId.slice(0, 8);
  const email = `demo-${shortId}@demo.vintflow.local`;
  const passwordHash = hashPassword(crypto.randomBytes(16).toString("hex"));

  await sql(
    `insert into users (id, email, name, password_hash, plan, billing_cycle, subscription_status, company_name, siret, is_demo)
     values ($1, $2, $3, $4, $5, 'monthly', 'demo', $6, '000 000 000 00000', true)`,
    [userId, email, "Atelier Démo", passwordHash, plan, "Atelier Démo"],
  );

  await seedUserWorkspace(userId);

  const token = await createSessionToken(userId);
  const cookie = buildSessionCookieHeader(token, request);
  const res = NextResponse.json({ ok: true, demo: true, plan });
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
