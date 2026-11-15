import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { BackOffice } from "@/components/BackOffice";

export const dynamic = "force-dynamic";

export default async function PersonalAppPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/");
  }
  const params = await searchParams;
  return <BackOffice initialTab={params.tab} />;
}