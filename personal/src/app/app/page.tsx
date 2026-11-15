import { getAuthenticatedUser } from "@/lib/auth";
import { BackOffice } from "@/components/BackOffice";
import { PersoLoginPage } from "@/components/PersoLoginPage";
import { getPrimaryOwnerEmail } from "@/lib/perso-access";

export const dynamic = "force-dynamic";

export default async function PersonalAppPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const user = await getAuthenticatedUser();

  if (!user) {
    return <PersoLoginPage defaultEmail={getPrimaryOwnerEmail() ?? ""} />;
  }

  return <BackOffice initialTab={params.tab} />;
}