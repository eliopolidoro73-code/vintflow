import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { VintflowLogo } from "@/components/VintflowLogo";

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-[#07080d] text-zinc-200">
      <header className="border-b border-white/10 bg-[#07080d]/90">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/">
            <VintflowLogo />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à l&apos;accueil
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 space-y-6 text-sm leading-relaxed text-zinc-300">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Politique de confidentialité (RGPD)</h1>
          <p className="mt-1.5 text-xs text-zinc-500">Dernière mise à jour : Novembre 2026</p>
        </div>

        <section className="space-y-2 rounded-2xl border border-white/10 bg-[#0e111a] p-6">
          <h2 className="text-base font-bold text-white">1. Données collectées</h2>
          <p>
            Vintflow enregistre uniquement les données nécessaires à votre activité : email,
            informations de facturation, stock SKU, ventes et messagerie.
          </p>
        </section>

        <section className="space-y-2 rounded-2xl border border-white/10 bg-[#0e111a] p-6">
          <h2 className="text-base font-bold text-white">2. Sécurité &amp; Traitement des photos</h2>
          <p>
            Les fonctions Vision IA, Studio Photo et l&apos;assistant Nova peuvent transmettre
            vos photos ou textes de questions à Google Gemini ou OpenAI lorsque vous activez
            explicitement PERSO_ENABLE_CLOUD_AI et qu&apos;une clé API est configurée sur le
            serveur. Les échanges passent en HTTPS ; sans cette activation, les réponses restent
            simulées localement. Vos mots de passe sont chiffrés via scrypt et vos sessions
            protégées par cookies HttpOnly signés.
          </p>
        </section>

        <section className="space-y-2 rounded-2xl border border-white/10 bg-[#0e111a] p-6">
          <h2 className="text-base font-bold text-white">3. Vos droits</h2>
          <p>
            Vous pouvez exporter vos données au format CSV à tout moment ou demander la
            suppression de votre compte via support@vintflow.fr.
          </p>
        </section>
      </main>
    </div>
  );
}
