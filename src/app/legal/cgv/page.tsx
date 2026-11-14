import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { VintflowLogo } from "@/components/VintflowLogo";

export default function CgvPage() {
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
          <h1 className="text-3xl font-extrabold text-slate-900">
            Conditions Générales de Vente (CGV)
          </h1>
          <p className="mt-1.5 text-xs text-slate-500">Applicables à compter de Novembre 2026</p>
        </div>

        <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900">1. Formules d&apos;abonnement</h2>
          <p>
            Vintflow propose un accès SaaS par abonnement mensuel ou annuel :
          </p>
          <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
            <li>Plan Starter : 29 €/mois TTC (ou 290 €/an TTC, soit 2 mois offerts).</li>
            <li>Plan Pro : 49 €/mois TTC (ou 490 €/an TTC, soit 2 mois offerts).</li>
          </ul>
        </section>

        <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900">2. Essai gratuit 14 jours</h2>
          <p>
            Tout nouvel utilisateur bénéficie d&apos;un essai gratuit de 14 jours, sans engagement.
            La résiliation est possible en 1 clic depuis l&apos;onglet Abonnement.
          </p>
        </section>

        <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900">3. Calculs fiscaux et responsabilité</h2>
          <p>
            Les estimations URSSAF, seuils TVA et factures PDF générées constituent des outils
            d&apos;aide à la gestion. L&apos;utilisateur reste responsable de ses déclarations officielles.
          </p>
        </section>
      </main>
    </div>
  );
}
