import { NextResponse } from "next/server";
import { assertSameOrigin, requireActiveSubscription } from "@/lib/auth";

import { sql } from "@/lib/db";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await requireActiveSubscription();
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  let body: { shipment_status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const allowed = ["to_ship", "in_transit", "delivered", "completed"];
  if (!allowed.includes(body.shipment_status ?? "")) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  await sql(
    "update sales set shipment_status = $1 where id = $2 and user_id = $3",
    [body.shipment_status, id, auth.user.id],
  );

  return NextResponse.json({ ok: true });
}
