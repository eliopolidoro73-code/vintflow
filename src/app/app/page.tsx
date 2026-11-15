import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { BackOffice } from "@/components/BackOffice";
import { canUseCockpit } from "@/lib/entitlement";

export const dynamic = "force-dynamic";

export default async function AppPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    checkout?: string;
    session_id?: string;
  }>;
}) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/");
  }
  const params = await searchParams;
  const tab =
    !canUseCockpit(user) && params.tab && params.tab !== "billing"
      ? "billing"
      : params.tab;
  return (
    <BackOffice
      initialTab={tab}
      initialCheckout={params.checkout}
      initialStripeSessionId={params.session_id}
    />
  );
}
