"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { VintflowLogo } from "@/components/VintflowLogo";

export function AutoSignIn() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        });
        const out = (await res.json().catch(() => ({}))) as { error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setError(
            out.error ??
              "Impossible de vérifier ton accès. Ouvre ce site depuis Cursor (app en mode Privé).",
          );
          return;
        }
        router.refresh();
      } catch {
        if (!cancelled) {
          setError("Impossible de joindre le serveur.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="relative min-h-screen bg-[#07080d] text-zinc-100 flex flex-col">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.22),transparent_68%)]" />
      <header className="relative border-b border-white/[0.06]">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <VintflowLogo />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/35 bg-violet-500/15 px-3 py-1 text-[11px] font-bold text-violet-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Pro Scale · tout débloqué
          </span>
        </div>
      </header>
      <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        {error ? (
          <div className="max-w-md space-y-4">
            <h1 className="text-xl font-extrabold text-white">Accès personnel</h1>
            <p className="text-sm leading-relaxed text-zinc-400">{error}</p>
            <p className="text-xs text-zinc-500">
              Dans Cursor : bouton <strong className="text-zinc-300">Publish</strong> → visibilité{" "}
              <strong className="text-zinc-300">Privé — pour toi seul</strong>, puis rouvre ce lien
              depuis l&apos;onglet de l&apos;agent ou en étant connecté à cursor.com dans ton
              navigateur.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-violet-400" />
            <p className="text-sm font-medium text-zinc-300">Ouverture de ton cockpit…</p>
          </div>
        )}
      </main>
    </div>
  );
}