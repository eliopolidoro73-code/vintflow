import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { LandingPage } from "@/components/LandingPage";

export const dynamic = "force-dynamic";

export default async function PersonalHomePage() {
  const user = await getAuthenticatedUser();
  if (user) {
    redirect("/app");
  }
  return <LandingPage isLoggedIn={false} persoEdition />;
}