import { NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/auth";

/** Aucune connexion par mot de passe — redirection côté client vers l'accès auto. */
export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  return NextResponse.json(
    { error: "Ouvre l'édition perso : connexion automatique sans mot de passe." },
    { status: 410 },
  );
}