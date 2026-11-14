import { getAuthenticatedUser } from "@/lib/auth";
import { BackOffice } from "@/components/BackOffice";
import { AutoSignIn } from "@/components/AutoSignIn";

export const dynamic = "force-dynamic";

export default async function PersonalHomePage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return <AutoSignIn />;
  }
  return <BackOffice />;
}