import { redirect } from "next/navigation";
import { ensurePersoServerSession } from "@/lib/perso-session";

export const dynamic = "force-dynamic";

export default async function PersonalHomePage() {
  await ensurePersoServerSession();
  redirect("/app");
}