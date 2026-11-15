import { NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/auth";

/** Connexion propriétaire supprimée : session automatique via /api/auth/enter. */
export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  return NextResponse.json(
    {
      error:
        "Connexion par mot de passe désactivée sur l'édition perso. Ouvre simplement /app.",
    },
    { status: 410 },
  );
}