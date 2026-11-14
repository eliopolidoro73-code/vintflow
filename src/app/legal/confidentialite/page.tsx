import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { VintflowLogo } from "@/components/VintflowLogo";

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/">
            <VintflowLogo />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à l&apos;accueil
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 space-y-6 text-sm leading-relaxed text-slate-600">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Politique de confidentialité (RGPD)</h1>
          <p className="mt-1.5 text-xs text-slate-500">Dernière mise à jour : Novembre 2026</p>
        </div>

        <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900">1. Données collectées</h2>
          <p>
            Vintflow enregistre uniquement les données nécessaires à votre activité : email,
            informations de facturation, stock SKU, ventes et messagerie.
          </p>
        </section>

        <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900">2. Sécurité &amp; Traitement des photos</h2>
          <p>
            Le Studio Photo IA traite vos images localement dans le navigateur. Vos mots de passe
            sont chiffrés via scrypt et vos sessions protégées par cookies HttpOnly signés.
          </p>
        </section>

        <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900">3. Vos droits</h2>
          <p>
            Vous pouvez exporter vos données au format CSV à tout moment ou demander la
            suppression de votre compte via support@vintflow.fr.
          </p>
        </section>
      </main>
    </div>
  );
}
