import { getAuthenticatedUser } from "@/lib/auth";
import { BackOffice } from "@/components/BackOffice";
import { AutoSignIn } from "@/components/AutoSignIn";

export const dynamic = "force-dynamic";

export default async function PersonalAppPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return <AutoSignIn />;
  }
  const params = await searchParams;
  return <BackOffice initialTab={params.tab} />;
}