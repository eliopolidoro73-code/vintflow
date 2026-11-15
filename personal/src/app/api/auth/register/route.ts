import { NextResponse } from "next/server";

/** Inscription publique désactivée : le compte est créé uniquement via secrets serveur au login. */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "L'inscription en ligne est désactivée. Connecte-toi avec l'e-mail et le mot de passe définis dans les secrets de l'app.",
    },
    { status: 403 },
  );
}