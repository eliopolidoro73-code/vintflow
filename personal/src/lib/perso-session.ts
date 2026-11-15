import { cookies, headers } from "next/headers";
import {
  createSessionToken,
  getAuthenticatedUser,
  SESSION_COOKIE_NAME,
  type AuthUser,
} from "@/lib/auth";
import { ensurePersoUserForEmail } from "@/lib/auto-session";
import { getPrimaryOwnerEmail } from "@/lib/perso-access";

/** Crée le cookie de session côté serveur si absent (évite /api/auth/bootstrap). */
export async function ensurePersoServerSession(): Promise<AuthUser | null> {
  const existing = await getAuthenticatedUser();
  if (existing) return existing;

  const email = getPrimaryOwnerEmail();
  if (!email) return null;

  const displayName = email.split("@")[0] ?? "Perso";
  const userId = await ensurePersoUserForEmail(email, displayName);
  const token = await createSessionToken(userId);
  const cookieStore = await cookies();
  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const secure = proto === "https";

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure,
  });

  return getAuthenticatedUser();
}