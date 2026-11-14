import { getAuthenticatedUser, hasOwnerAccount } from "@/lib/auth";
import { BackOffice } from "@/components/BackOffice";
import { PersonalLockScreen } from "@/components/PersonalLockScreen";

export const dynamic = "force-dynamic";

export default async function PersonalHomePage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    const ownerExists = await hasOwnerAccount();
    return <PersonalLockScreen needsSetup={!ownerExists} />;
  }
  return <BackOffice />;
}
