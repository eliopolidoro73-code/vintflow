import type { Metadata } from "next";
import Link from "next/link";
import { getPublicSiteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Guide revendeur Vinted 2026 — stock, marge et crosslisting",
  description:
    "Comment structurer son activité de revente Vinted et Leboncoin : SKU, calcul de marge, crosslisting, facturation micro-BIC et outils pour passer pro.",
  alternates: {
    canonical: `${getPublicSiteUrl()}/guide-revente-vinted`,
  },
};

export default function GuideReventeVintedPage() {
  return (
    <main className="min-h-screen bg-[#07080d] text-slate-100">
      <article className="mx-auto max-w-3xl px-4 py-16 sm:py-24 prose prose-invert prose-headings:font-bold prose-a:text-violet-300">
        <p className="text-sm text-violet-300 font-semibold tracking-wide uppercase not-prose">
          Guide Vintflow
        </p>
        <h1 className="text-3xl sm:text-4xl text-white not-prose">
          Guide du revendeur Vinted : passer du dressing au vrai business
        </h1>
        <p className="text-lg text-zinc-300 not-prose leading-relaxed">
          Que vous revendiez 20 ou 2 000 pièces par mois, la différence entre un
          hobby rentable et une activité durable se joue sur trois piliers : un
          stock suivi au SKU, une marge commerciale calculée après frais réels, et
          une présence multi-plateformes sans doublon de travail.
        </p>

        <h2>1. Nommer et localiser chaque article (SKU)</h2>
        <p>
          Un code SKU unique (marque + taille + numéro) évite les erreurs
          d&apos;expédition et accélère la préparation des colis. Dans un bac à
          sable physique, notez l&apos;emplacement (Rack A1, Tiroir B3) : vous
          gagnez des minutes sur chaque vente Vinted ou Leboncoin.
        </p>

        <h2>2. Marge commerciale, pas seulement le « bénéfice affiché »</h2>
        <p>
          Prix de vente − prix d&apos;achat − emballage − frais plateforme −
          boosts = marge nette. Sans ce suivi, une vente à 25 € peut masquer une
          perte. Vintflow agrège ventes, lots et dépenses pour afficher la
          trésorerie réelle et la jauge de seuil TVA.
        </p>

        <h2>3. Crosslisting Vinted ↔ Leboncoin sans shadowban</h2>
        <p>
          Republier manuellement la même annonce fatigue et multiplie les
          oublis. Un crosslisting contrôlé (descriptions adaptées, retrait auto
          quand l&apos;article est vendu) augmente la visibilité tout en limitant
          les doubles ventes.
        </p>

        <h2>4. Factures, bordereaux 10×15 et conformité France</h2>
        <p>
          Dès que vous basculez en activité régulière, conservez un livre des
          recettes exportable et des factures numérotées. Les bordereaux thermiques
          10×15 avec SKU raccourcissent la préparation des commandes multi-comptes.
        </p>

        <h2>5. Passer à l&apos;échelle avec l&apos;IA (sans perdre le contrôle)</h2>
        <p>
          Studio photo, annonces SEO et assistant connecté à vos chiffres
          accélèrent la production — à condition de garder la validation humaine
          sur les prix et les descriptions sensibles (luxury, vintage rare).
        </p>

        <div className="not-prose mt-12 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-6">
          <p className="text-white font-semibold text-lg">
            Tester Vintflow sur 14 jours (Essentiel)
          </p>
          <p className="mt-2 text-sm text-zinc-300">
            Compte gratuit limité au forfait Essentiel pendant l&apos;essai. Les
            formules Plus et Pro Scale s&apos;activent uniquement après paiement
            Stripe.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-500"
          >
            Découvrir Vintflow
          </Link>
        </div>
      </article>
    </main>
  );
}