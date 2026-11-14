import { getAuthenticatedUser, isOwnerPasswordConfigured } from "@/lib/auth";
import { BackOffice } from "@/components/BackOffice";
import { OwnerAccess } from "@/components/OwnerAccess";

export const dynamic = "force-dynamic";

export default async function PersonalAppPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return <OwnerAccess configured={isOwnerPasswordConfigured()} />;
  }
  const params = await searchParams;
  return <BackOffice initialTab={params.tab} />;
}
