import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Édition perso : accès direct au cockpit, sans connexion propriétaire. */
export default function PersonalHomePage() {
  redirect("/app");
}