import { getAuthenticatedUser, hasOwnerAccount } from "@/lib/auth";
import { BackOffice } from "@/components/BackOffice";
import { PersonalLockScreen } from "@/components/PersonalLockScreen";

export const dynamic = "force-dynamic";

export default async function PersonalAppPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getAuthenticatedUser();
  if (!user) {
    const ownerExists = await hasOwnerAccount();
    return <PersonalLockScreen needsSetup={!ownerExists} />;
  }
  const params = await searchParams;
  return <BackOffice initialTab={params.tab} />;
}
