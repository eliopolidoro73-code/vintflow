import { getAuthenticatedUser } from "@/lib/auth";
import { BackOffice } from "@/components/BackOffice";

export const dynamic = "force-dynamic";

export default async function PersonalHomePage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return (
      <div className="min-h-screen bg-[#07080d] text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-white/10 bg-[#0e111a] p-6 text-center space-y-2">
          <h1 className="text-lg font-bold text-white">Accès privé requis</h1>
          <p className="text-xs text-zinc-400">
            Connecte-toi avec ton compte Cursor pour ouvrir ton espace personnel Vintflow.
          </p>
        </div>
      </div>
    );
  }
  return <BackOffice />;
}
