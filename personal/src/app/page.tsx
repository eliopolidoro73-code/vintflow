import { getAuthenticatedUser, isOwnerPasswordConfigured } from "@/lib/auth";
import { BackOffice } from "@/components/BackOffice";
import { OwnerAccess } from "@/components/OwnerAccess";

export const dynamic = "force-dynamic";

export default async function PersonalHomePage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return <OwnerAccess configured={isOwnerPasswordConfigured()} />;
  }
  return <BackOffice />;
}
