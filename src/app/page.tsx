import { getAuthenticatedUser } from "@/lib/auth";
import { LandingPage } from "@/components/LandingPage";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getAuthenticatedUser();
  return <LandingPage isLoggedIn={Boolean(user)} />;
}
