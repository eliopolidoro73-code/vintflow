import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { VintflowLogo } from "@/components/VintflowLogo";

export default function MentionsLegalesPage() {
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
          <h1 className="text-3xl font-extrabold text-slate-900">Mentions légales</h1>
          <p className="mt-1.5 text-xs text-slate-500">Dernière mise à jour : Novembre 2026</p>
        </div>

        <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900">1. Éditeur du service</h2>
          <p>
            La plateforme <strong>Vintflow</strong> est éditée par Vintflow Studio (logiciel
            SaaS de gestion et d&apos;outils IA pour revendeurs).
          </p>
          <p className="text-xs text-slate-500">
            Contact support : support@vintflow.fr · Infrastructure cloud européenne sécurisée.
          </p>
        </section>

        <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900">2. Indépendance vis-à-vis des plateformes</h2>
          <p>
            Vintflow est un logiciel indépendant d&apos;aide à la gestion, à la création
            d&apos;annonces par IA et au suivi comptable. Vintflow n&apos;est ni affilié, ni
            sponsorisé, ni approuvé par Vinted, Leboncoin, TikTok Shop, eBay ou Whatnot.
          </p>
        </section>

        <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900">3. Propriété intellectuelle</h2>
          <p>
            L&apos;interface, le logo Vintflow, les textes et les outils de la plateforme sont
            protégés par le droit de la propriété intellectuelle.
          </p>
        </section>
      </main>
    </div>
  );
}
