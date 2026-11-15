import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Édition perso : session automatique, aucun mot de passe. */
export default function PersonalHomePage() {
  redirect("/api/auth/enter");
}