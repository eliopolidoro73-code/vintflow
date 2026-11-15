import { NextResponse } from "next/server";
import { assertSameOrigin, requireAuthenticatedUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getEffectivePlan } from "@/lib/perso-plan";

export async function PATCH(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await requireAuthenticatedUser();
  if ("response" in auth) return auth.response;

  if (!getEffectivePlan(auth.user).unifiedMessagesAllowed) {
    return NextResponse.json(
      {
        error:
          "La messagerie unifiée multi-comptes est incluse à partir du plan Vendeur Plus (29 €/mois).",
      },
      { status: 403 },
    );
  }

  let body: { id?: string; reply_text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const id = (body.id ?? "").trim();
  const replyText = (body.reply_text ?? "").trim().slice(0, 600);
  if (!id || !replyText) {
    return NextResponse.json(
      { error: "ID message et réponse requis" },
      { status: 400 },
    );
  }

  await sql(
    `update messages
     set reply_text = $1, unread = false, updated_at = now()
     where id = $2 and user_id = $3`,
    [replyText, id, auth.user.id],
  );

  return NextResponse.json({ ok: true });
}
