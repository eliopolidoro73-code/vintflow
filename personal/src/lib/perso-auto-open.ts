import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSessionToken,
  getAuthenticatedUser,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";
import { ensurePersoUserForEmail } from "@/lib/auto-session";
import { getPrimaryOwnerEmail } from "@/lib/perso-access";

/** Ouvre le cockpit sans écran de connexion (édition perso mono-utilisateur). */
export async function ensurePersoAutoSession(): Promise<void> {
  const user = await getAuthenticatedUser();
  if (user) return;

  const email = getPrimaryOwnerEmail();
  if (!email) return;

  const userId = await ensurePersoUserForEmail(
    email,
    email.split("@")[0] ?? "Perso",
  );
  const token = await createSessionToken(userId);
  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  const secure = proto === "https";

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    secure,
  });

  redirect("/app");
}