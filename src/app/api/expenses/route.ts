import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { assertSameOrigin, requireAuthenticatedUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await requireAuthenticatedUser();
  if ("response" in auth) return auth.response;

  const rl = await checkRateLimit({
    scope: "expenses_write",
    key: auth.user.id,
    limit: 30,
    windowSeconds: 3600,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trop de dépenses ajoutées cette heure-ci." },
      { status: 429 },
    );
  }

  let body: {
    action?: "create" | "delete";
    id?: string;
    label?: string;
    category?: string;
    amount?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  if (body.action === "delete" && body.id) {
    await sql("delete from expenses where id = $1 and user_id = $2", [
      body.id,
      auth.user.id,
    ]);
    return NextResponse.json({ ok: true });
  }

  const label = (body.label ?? "").trim().slice(0, 120);
  if (!label) {
    return NextResponse.json({ error: "Libellé requis" }, { status: 400 });
  }

  const category = (body.category ?? "Emballage & Envoi")
    .trim()
    .slice(0, 60);
  const amount = Math.max(0.5, Number(body.amount ?? 0));

  await sql(
    `insert into expenses (id, user_id, label, category, amount)
     values ($1, $2, $3, $4, $5)`,
    [crypto.randomUUID(), auth.user.id, label, category, amount],
  );

  return NextResponse.json({ ok: true });
}
