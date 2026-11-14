import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { VintflowLogo } from "@/components/VintflowLogo";

export default function CgvPage() {
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
          <h1 className="text-3xl font-extrabold text-white">
            Conditions Générales de Vente (CGV)
          </h1>
          <p className="mt-1.5 text-xs text-zinc-500">Applicables à compter de Novembre 2026</p>
        </div>

        <section className="space-y-2 rounded-2xl border border-white/10 bg-[#0e111a] p-6">
          <h2 className="text-base font-bold text-white">1. Formules d&apos;abonnement</h2>
          <p>
            Vintflow propose 3 formules mensuelles ou annuelles (-2 mois offerts) :
          </p>
          <ul className="list-disc pl-5 text-xs text-zinc-400 space-y-1">
            <li>Essentiel : 9 €/mois TTC (ou 84 €/an TTC) — suivi de stock, marge commerciale &amp; export CSV.</li>
            <li>Vendeur Plus : 29 €/mois TTC (ou 290 €/an TTC) — outils IA, crosslisting &amp; factures avec quotas.</li>
            <li>Pro Scale : 49 €/mois TTC (ou 490 €/an TTC) — tout illimité, auto-crosslisting 8h–23h &amp; Nova IA.</li>
          </ul>
        </section>

        <section className="space-y-2 rounded-2xl border border-white/10 bg-[#0e111a] p-6">
          <h2 className="text-base font-bold text-white">2. Essai gratuit 14 jours</h2>
          <p>
            Tout nouvel utilisateur bénéficie d&apos;un essai gratuit de 14 jours, sans engagement.
            La résiliation est possible en 1 clic depuis l&apos;onglet Abonnement.
          </p>
        </section>

        <section className="space-y-2 rounded-2xl border border-white/10 bg-[#0e111a] p-6">
          <h2 className="text-base font-bold text-white">3. Suivi commercial et responsabilité</h2>
          <p>
            Les indicateurs de marge commerciale, seuils TVA et factures PDF générées constituent des outils
            d&apos;aide à la gestion. L&apos;utilisateur reste responsable de ses obligations comptables et déclaratives.
          </p>
        </section>
      </main>
    </div>
  );
}
