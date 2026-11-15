import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Racine → écran de connexion / cockpit. */
export default function PersonalHomePage() {
  redirect("/app");
}