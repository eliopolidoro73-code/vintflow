import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { loadWorkspaceForUser } from "@/lib/workspace-data";

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if ("response" in auth) return auth.response;
  const payload = await loadWorkspaceForUser(auth.user);
  return NextResponse.json(payload, {
    headers: { "cache-control": "private, no-store" },
  });
}