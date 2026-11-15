import { NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/auth";

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  return NextResponse.json(
    {
      error:
        "Inscription désactivée sur l'édition perso. Ouvre l'app : tu es connecté automatiquement.",
    },
    { status: 403 },
  );
}