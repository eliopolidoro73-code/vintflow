import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { BackOffice } from "@/components/BackOffice";
import { PersoAccessGate } from "@/components/PersoAccessGate";

export const dynamic = "force-dynamic";

export default async function PersonalAppPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; session?: string; reason?: string }>;
}) {
  const params = await searchParams;
  const user = await getAuthenticatedUser();

  if (!user) {
    if (params.session === "failed") {
      return <PersoAccessGate reason={params.reason} />;
    }
    redirect("/api/auth/enter");
  }

  return <BackOffice initialTab={params.tab} />;
}