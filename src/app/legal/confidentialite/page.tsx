import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { VintflowLogo } from "@/components/VintflowLogo";

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-[#090b0f] text-zinc-200">
      <header className="border-b border-white/10 bg-[#090b0f]/90">
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

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 space-y-8 text-sm leading-relaxed text-zinc-300">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Politique de confidentialité (RGPD)</h1>
          <p className="mt-2 text-xs text-zinc-500">Dernière mise à jour : Novembre 2026</p>
        </div>

        <section className="space-y-2 rounded-2xl border border-white/10 bg-[#10141c] p-6">
          <h2 className="text-base font-bold text-white">1. Données collectées</h2>
          <p>
            Vintflow collecte uniquement les données strictement nécessaires au fonctionnement de
            votre espace revendeur : email, nom d&apos;entreprise/SIRET saisis pour les factures,
            catalogue d&apos;articles SKU, ventes et messages enregistrés.
          </p>
        </section>

        <section className="space-y-2 rounded-2xl border border-white/10 bg-[#10141c] p-6">
          <h2 className="text-base font-bold text-white">2. Sécurité &amp; Traitement des photos</h2>
          <p>
            Les retouches effectuées dans le Studio Photo IA s&apos;exécutent directement dans votre
            navigateur sans stockage tiers permanent. Les mots de passe sont chiffrés via scrypt et
            les sessions sont protégées par cookies HttpOnly signés.
          </p>
        </section>

        <section className="space-y-2 rounded-2xl border border-white/10 bg-[#10141c] p-6">
          <h2 className="text-base font-bold text-white">3. Vos droits</h2>
          <p>
            Conformément au RGPD, vous pouvez exporter vos données (export CSV complet) ou
            demander la suppression définitive de votre compte à tout moment via support@vintflow.fr.
          </p>
        </section>
      </main>
    </div>
  );
}
