import Link from "next/link";
import { VintflowLogo } from "@/components/VintflowLogo";

const REASON_COPY: Record<string, string> = {
  cursor:
    "Ouvre cette app depuis Cursor en mode privé (connexion Cursor requise).",
  email:
    "Ton e-mail Cursor ne figure pas dans PERSO_ALLOWED_EMAILS. Mets le même e-mail dans les secrets de l'app.",
  session:
    "La session n'a pas pu être créée. Vérifie que SESSION_SECRET est bien défini dans les secrets.",
  generic: "Connexion impossible pour le moment.",
};

export function PersoAccessGate({ reason }: { reason?: string | null }) {
  const key = reason && REASON_COPY[reason] ? reason : "generic";
  const message = REASON_COPY[key] ?? REASON_COPY.generic;

  return (
    <div className="min-h-screen bg-[#07080d] text-zinc-100 flex flex-col items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[380px] bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.25),transparent_70%)]" />
      <div className="relative w-full max-w-md space-y-6 rounded-2xl border border-white/10 bg-[#0e111a] p-6 sm:p-8 shadow-2xl text-center">
        <VintflowLogo />
        <span className="inline-block rounded-full border border-violet-500/40 bg-violet-500/15 px-3 py-1 text-[11px] font-bold text-violet-200">
          Édition perso · Pro Scale
        </span>
        <h1 className="text-xl font-extrabold text-white">Accès à ton cockpit</h1>
        <p className="text-sm text-zinc-400 leading-relaxed">{message}</p>
        <p className="text-xs text-zinc-500">
          Utilise l&apos;e-mail autorisé et le mot de passe défini dans{" "}
          <strong className="text-zinc-300">PERSO_PASSWORD</strong> (secrets Cursor).
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <Link
            href="/app"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-violet-600 font-bold text-white hover:bg-violet-500 transition-colors"
          >
            Connexion e-mail / mot de passe
          </Link>
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">
            Retour
          </Link>
        </div>
      </div>
    </div>
  );
}