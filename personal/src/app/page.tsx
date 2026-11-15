import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Racine → cockpit (session via Cursor sur app privée). */
export default function PersonalHomePage() {
  redirect("/app");
}