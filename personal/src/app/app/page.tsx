import { getAuthenticatedUser } from "@/lib/auth";
import { BackOffice } from "@/components/BackOffice";
import { ensurePersoAutoSession } from "@/lib/perso-auto-open";

export const dynamic = "force-dynamic";

export default async function PersonalAppPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await ensurePersoAutoSession();
  const params = await searchParams;
  const user = await getAuthenticatedUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-[#07080d] flex items-center justify-center text-zinc-400 text-sm">
        Chargement…
      </div>
    );
  }

  return <BackOffice initialTab={params.tab} />;
}