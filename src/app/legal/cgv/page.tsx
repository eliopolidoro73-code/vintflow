import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { VintflowLogo } from "@/components/VintflowLogo";

export default function CgvPage() {
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
          <h1 className="text-3xl font-extrabold text-white">
            Conditions Générales de Vente et d&apos;Utilisation (CGV)
          </h1>
          <p className="mt-2 text-xs text-zinc-500">Applicables à compter de Novembre 2026</p>
        </div>

        <section className="space-y-2 rounded-2xl border border-white/10 bg-[#10141c] p-6">
          <h2 className="text-base font-bold text-white">1. Objet et formules d&apos;abonnement</h2>
          <p>
            Vintflow propose un accès SaaS par abonnement mensuel ou annuel donnant accès aux
            outils de gestion multi-plateformes, calcul de marge/URSSAF, facturation PDF,
            studio photo/annonce IA et crosslisting :
          </p>
          <ul className="list-disc pl-5 text-xs text-zinc-400 space-y-1">
            <li>Plan Starter : 29 €/mois TTC (ou 290 €/an TTC, soit 2 mois offerts).</li>
            <li>Plan Pro : 49 €/mois TTC (ou 490 €/an TTC, soit 2 mois offerts).</li>
          </ul>
        </section>

        <section className="space-y-2 rounded-2xl border border-white/10 bg-[#10141c] p-6">
          <h2 className="text-base font-bold text-white">2. Essai gratuit 14 jours et résiliation</h2>
          <p>
            Tout nouvel utilisateur bénéficie d&apos;un essai gratuit de 14 jours. L&apos;abonnement
            est sans engagement et peut être résilié à tout moment depuis l&apos;espace Abonnement,
            avec prise d&apos;effet à la fin de la période en cours.
          </p>
        </section>

        <section className="space-y-2 rounded-2xl border border-white/10 bg-[#10141c] p-6">
          <h2 className="text-base font-bold text-white">3. Calculs fiscaux et responsabilité</h2>
          <p>
            Les estimations de cotisations URSSAF, seuils TVA et factures PDF générées sont
            fournies à titre d&apos;aide à la gestion d&apos;après les taux saisis par
            l&apos;utilisateur. L&apos;utilisateur demeure responsable de la vérification de ses
            déclarations légales auprès de l&apos;administration fiscale ou de son expert-comptable.
          </p>
        </section>
      </main>
    </div>
  );
}
