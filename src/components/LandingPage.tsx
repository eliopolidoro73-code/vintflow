"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bot,
  Camera,
  Check,
  ChevronDown,
  Clock,
  FileText,
  Layers,
  MessageSquare,
  Package,
  Printer,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Swords,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { AuthModal } from "@/components/AuthModal";
import { VintflowLogo } from "@/components/VintflowLogo";
import { computeNetMargin, formatEuro, generateListingCopy } from "@/lib/format";
import { PLANS, type BillingCycle, type PlanId } from "@/lib/plans";

const PROFIT_TICKER = [
  { name: "T-shirt Nike", profit: "+8 €" },
  { name: "Jean Levi's 501", profit: "+18 €" },
  { name: "Veste Carhartt", profit: "+32 €" },
  { name: "Sneakers Vans", profit: "+12 €" },
  { name: "Pull Ralph Lauren", profit: "+25 €" },
  { name: "Doudoune TNF 700", profit: "+48 €" },
];

const MESSAGES_TICKER = [
  { user: "Camille", msg: "Elle taille comment ?" },
  { user: "Yanis", msg: "Tu ferais 25 € ?" },
  { user: "Léa", msg: "Toujours dispo ?" },
  { user: "Hugo", msg: "Envoi demain ?" },
  { user: "Sarah", msg: "Tu as la référence ?" },
  { user: "Malik", msg: "Lot possible ?" },
];

const STOCK_TICKER = [
  { name: "Veste Levi's", sku: "SKU-A12" },
  { name: "Sac Eastpak", sku: "SKU-B05" },
  { name: "Nike Air Max", sku: "SKU-C23" },
  { name: "Chemise Uniqlo", sku: "SKU-D08" },
];

const INVOICE_TICKER = [
  { num: "FAC-2026-041", price: "225 €" },
  { num: "FAC-2026-040", price: "42 €" },
  { num: "FAC-2026-039", price: "58 €" },
  { num: "FAC-2026-038", price: "34 €" },
];

const ESSENTIAL_TOOLS = [
  {
    icon: <Camera className="h-5 w-5 text-teal-600" />,
    title: "Studio Photo & Détourage IA",
    desc: "Isoler ton article sur fond propre et exporter aux formats Vinted, Leboncoin et TikTok Shop en 5 secondes.",
  },
  {
    icon: <Sparkles className="h-5 w-5 text-cyan-600" />,
    title: "Annonce IA 3-en-1",
    desc: "À partir d'une photo ou d'un titre : fiche Vinted SEO, annonce Leboncoin rassurante et script vidéo TikTok.",
  },
  {
    icon: <ShieldAlert className="h-5 w-5 text-amber-600" />,
    title: "Bouclier Anti-Shadowban",
    desc: "Reformule tes annonces stagnantes sans spam de hashtags pour éviter les blocages de vérification 24 h.",
  },
  {
    icon: <Swords className="h-5 w-5 text-rose-600" />,
    title: "Sniper Négo & Calcul de Lot",
    desc: "Calcule ton seuil zéro-perte (URSSAF incluse) et réponds aux offres -40 % sans brader ta marge.",
  },
];

const AI_PRESETS = [
  {
    q: "Combien j'ai vendu ce mois-ci ?",
    a: "Tu as encaissé 2 480 € sur 44 ventes ce mois-ci. Après déduction de tes achats (920 €), boosts (14 €) et URSSAF estimée (305 €), ta marge nette réelle est de 1 241 €.",
  },
  {
    q: "Quels articles dorment depuis +14 jours ?",
    a: "Tu as 2 articles dormants (Nike Air Max 90 et Jean Levi's 501). Je peux appliquer -10 % et préparer une variante anti-shadowban avant le pic de dimanche soir.",
  },
  {
    q: "Comment fonctionne le retrait auto Leboncoin ?",
    a: "Dès qu'un article est vendu sur Vinted, Vintflow masque l'annonce correspondante sur Leboncoin automatiquement pour éviter les doubles ventes.",
  },
];

const REVIEWS = [
  {
    name: "Théo M.",
    role: "Revendeur Vinted & Leboncoin · 140 ventes/mois",
    text: "Avant je passais mon dimanche soir sur Excel à calculer mon URSSAF et mes prix d'achat. Maintenant tout est calculé à la vente, avec mes factures PDF prêtes.",
  },
  {
    name: "Inès B.",
    role: "Boutique fripe & TikTok Shop",
    text: "Le studio photo + le bouclier anti-shadowban m'ont redonné des vues sur des pièces qui dormaient depuis 3 semaines. Et le crosslisting LBC fait +25 % de CA.",
  },
  {
    name: "Kévin R.",
    role: "Micro-entrepreneur seconde main",
    text: "Simple, rapide, lisible. Les bordereaux 10×15 avec le SKU imprimé dessus m'ont évité plein d'erreurs quand je prépare 15 colis d'un coup.",
  },
];

const FAQS = [
  {
    q: "Est-ce que Vintflow est simple à prendre en main ?",
    a: "Oui. Tout est regroupé dans un tableau de bord clair : ton stock, tes ventes avec marge après URSSAF, tes factures/bordereaux et tes outils IA accessibles en 1 clic.",
  },
  {
    q: "Est-ce risqué pour mon compte Vinted ou Leboncoin ?",
    a: "Non. Vintflow n'utilise pas de bot de spam ou de republication agressive interdite. Tu gardes le contrôle et le Bouclier Anti-Shadowban t'aide au contraire à éviter les blocages.",
  },
  {
    q: "Comment fonctionne l'essai gratuit de 14 jours ?",
    a: "Tu crées ton compte en 30 secondes ou tu ouvres la démo en 1 clic. Tu testes Starter ou Pro pendant 14 jours sans engagement.",
  },
  {
    q: "Puis-je exporter mes chiffres pour ma micro-entreprise ?",
    a: "Oui : calcul automatique de l'URSSAF à chaque vente, jauge de seuil TVA, factures PDF conformes et export CSV/Excel du livre des recettes.",
  },
];

export function LandingPage({ isLoggedIn }: { isLoggedIn: boolean }) {
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("starter");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [autoPublishDemo, setAutoPublishDemo] = useState(true);
  const [activeAiIdx, setActiveAiIdx] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [demoLoading, setDemoLoading] = useState(false);

  // Simple live simulator
  const [simTitle, setSimTitle] = useState("Veste Carhartt Detroit Canvas");
  const [simBuy, setSimBuy] = useState("28");
  const [simSell, setSimSell] = useState("89");
  const [simTab, setSimTab] = useState<"vinted" | "lbc" | "tiktok">("vinted");

  const simCopy = generateListingCopy({
    title: simTitle || "Veste Vintage",
    brand: "Carhartt",
    category: "Vestes",
    size: "L",
    condition: "Très bon état",
    listingPrice: Number(simSell) || 50,
  });
  const simMargin = computeNetMargin({
    grossAmount: Number(simSell) || 0,
    purchaseCost: Number(simBuy) || 0,
    platformFees: 0,
    boostCost: 0,
    shippingCost: 0,
    urssafRate: 12.3,
  });

  function openSignup(plan: PlanId = "starter") {
    setSelectedPlan(plan);
    setAuthMode("register");
    setAuthOpen(true);
  }

  function openLogin() {
    setAuthMode("login");
    setAuthOpen(true);
  }

  async function launchDemo() {
    setDemoLoading(true);
    try {
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: "pro" }),
      });
      if (res.ok) {
        router.push("/app");
        router.refresh();
      }
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-teal-100 selection:text-teal-900">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#">
            <VintflowLogo />
          </a>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#fonctionnalites" className="hover:text-slate-950 transition">
              Fonctionnalités
            </a>
            <a href="#outils-ia" className="hover:text-slate-950 transition">
              Outils IA
            </a>
            <a href="#crosslisting" className="hover:text-slate-950 transition">
              Crosslisting
            </a>
            <a href="#tarifs" className="hover:text-slate-950 transition">
              Tarifs
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            {isLoggedIn ? (
              <Button
                onClick={() => router.push("/app")}
                className="bg-teal-600 text-white hover:bg-teal-700 font-semibold rounded-xl"
              >
                Ouvrir mon espace
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={openLogin}
                  className="text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-medium"
                >
                  Connexion
                </Button>
                <Button
                  onClick={() => openSignup("starter")}
                  className="bg-teal-600 text-white hover:bg-teal-700 font-semibold rounded-xl shadow-sm"
                >
                  Essai gratuit
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section (Light, Crisp, Vinteer clarity) */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#f0fdfa] via-white to-white pt-16 pb-20 sm:pt-24 sm:pb-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center">
            <Badge className="mb-6 rounded-full border border-teal-200 bg-teal-50 px-4 py-1.5 text-xs font-semibold text-teal-800">
              Conçu pour Vinted, Leboncoin, TikTok Shop, eBay &amp; Whatnot
            </Badge>

            <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 sm:text-6xl leading-[1.08]">
              Domine la revente.
              <br />
              <span className="text-teal-600">Maximise tes profits.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-slate-600 leading-relaxed">
              Excel te fait perdre des heures et sous-déclarer ton chiffre d&apos;affaires.
              Vintflow centralise tout au même endroit : ventes, marges après URSSAF,
              crosslisting, studio photo IA, factures PDF et bordereaux 10×15.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Button
                size="lg"
                onClick={() => (isLoggedIn ? router.push("/app") : openSignup("starter"))}
                className="w-full sm:w-auto h-12 rounded-xl bg-teal-600 px-7 text-base font-bold text-white hover:bg-teal-700 shadow-md shadow-teal-600/15"
              >
                Essaie gratuitement (14 jours)
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                disabled={demoLoading}
                onClick={launchDemo}
                className="w-full sm:w-auto h-12 rounded-xl border-slate-300 bg-white px-6 text-base font-semibold text-slate-800 hover:bg-slate-50"
              >
                <Sparkles className="mr-2 h-4 w-4 text-teal-600" />
                {demoLoading ? "Chargement..." : "Voir la démo en 1 clic"}
              </Button>
            </div>

            <div className="mt-7 flex items-center justify-center gap-3 text-xs text-slate-500">
              <div className="flex -space-x-2">
                {["C", "Y", "L", "H", "S"].map((l, i) => (
                  <span
                    key={i}
                    className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-teal-600 text-[11px] font-bold text-white"
                  >
                    {l}
                  </span>
                ))}
              </div>
              <span>
                <strong className="text-slate-900">+4 200 vendeurs actifs</strong> ·
                Note 4,8/5 · Sans engagement
              </span>
            </div>

            {/* Clean App Preview Card */}
            <div className="mt-14 rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xl shadow-slate-200/60 text-left">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="ml-2 font-mono text-xs text-slate-400">
                    app.vintflow.fr
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Synchronisation multi-comptes active
                </span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                  <p className="text-xs font-medium text-slate-500">CA du mois</p>
                  <p className="mt-1.5 text-2xl font-extrabold text-slate-950">2 480 €</p>
                  <p className="mt-1 text-xs font-medium text-emerald-600">+18,4 % ce mois</p>
                </div>
                <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4">
                  <p className="text-xs font-medium text-teal-800">Marge nette réelle</p>
                  <p className="mt-1.5 text-2xl font-extrabold text-teal-700">1 241 €</p>
                  <p className="mt-1 text-xs text-teal-700/80">URSSAF 12,3 % déduite</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                  <p className="text-xs font-medium text-slate-500">Stock suivi (SKU)</p>
                  <p className="mt-1.5 text-2xl font-extrabold text-slate-950">411 €</p>
                  <p className="mt-1 text-xs text-slate-500">Valeur revente : 1 085 €</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                  <p className="text-xs font-medium text-slate-500">Colis à préparer</p>
                  <p className="mt-1.5 text-2xl font-extrabold text-amber-600">2</p>
                  <p className="mt-1 text-xs text-slate-500">Bordereaux 10×15 prêts</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid: L'arsenal ultime (Clean White Cards on Soft Slate) */}
        <section id="fonctionnalites" className="bg-[#f8fafc] py-20 border-y border-slate-200/70">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center mb-12">
              <p className="text-xs font-bold uppercase tracking-widest text-teal-600">
                L&apos;arsenal essentiel
              </p>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-950 sm:text-4xl">
                Tout ce dont tu as vraiment besoin pour vendre plus
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600">
                Zéro gadget inutile : uniquement les outils qui te font gagner du temps
                et protègent ta marge chaque jour.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-6">
              {/* Card 1 */}
              <div className="md:col-span-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-2 text-base font-bold text-slate-900">
                    <TrendingUp className="h-4 w-4 text-teal-600" />
                    Marge réelle &amp; URSSAF
                  </span>
                  <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full">
                    Automatique
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-5">
                  Prix d&apos;achat, boosts, frais plateforme et cotisations URSSAF déduits à
                  chaque vente.
                </p>
                <div className="overflow-hidden py-1">
                  <div className="flex w-max gap-3 animate-marquee">
                    {[...PROFIT_TICKER, ...PROFIT_TICKER].map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs whitespace-nowrap"
                      >
                        <span className="font-semibold text-slate-800">{item.name}</span>
                        <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700">
                          {item.profit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 2 */}
              <div className="md:col-span-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-2 text-base font-bold text-slate-900">
                    <MessageSquare className="h-4 w-4 text-cyan-600" />
                    Messagerie multi-comptes
                  </span>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    +30 h gagnées / mois
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-5">
                  Réponds à tous tes acheteurs Vinted, Leboncoin et TikTok depuis un seul
                  écran avec réponses rapides.
                </p>
                <div className="overflow-hidden py-1">
                  <div className="flex w-max gap-3 animate-marquee-reverse">
                    {[...MESSAGES_TICKER, ...MESSAGES_TICKER].map((m, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs whitespace-nowrap"
                      >
                        <span className="font-bold text-teal-700">{m.user}</span>
                        <span className="text-slate-600">{m.msg}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 3 */}
              <div className="md:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex items-center gap-2 text-base font-bold text-slate-900 mb-2">
                  <Package className="h-4 w-4 text-amber-600" />
                  Stock &amp; SKU
                </div>
                <p className="text-xs text-slate-600 mb-4">
                  Emplacements, lots et alerte sur les articles dormants (+14 jours).
                </p>
                <div className="space-y-2">
                  {STOCK_TICKER.map((s) => (
                    <div
                      key={s.sku}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                    >
                      <span className="font-medium text-slate-800">{s.name}</span>
                      <span className="font-mono font-semibold text-amber-700">{s.sku}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 4 */}
              <div className="md:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex items-center gap-2 text-base font-bold text-slate-900 mb-2">
                  <FileText className="h-4 w-4 text-teal-600" />
                  Factures PDF &amp; Compta
                </div>
                <p className="text-xs text-slate-600 mb-4">
                  Factures numérotées France/Belgique et export CSV livre des recettes.
                </p>
                <div className="space-y-2">
                  {INVOICE_TICKER.map((f) => (
                    <div
                      key={f.num}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                    >
                      <span className="font-mono text-slate-700">{f.num}</span>
                      <span className="font-bold text-teal-700">{f.price}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 5 */}
              <div className="md:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-base font-bold text-slate-900 mb-2">
                    <Printer className="h-4 w-4 text-indigo-600" />
                    Bordereaux 10×15
                  </div>
                  <p className="text-xs text-slate-600">
                    Étiquettes prêtes pour imprimante thermique avec ton SKU affiché dessus.
                  </p>
                </div>
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3.5 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-500">
                    <span>Transporteur</span>
                    <span className="font-bold text-slate-900">Mondial Relay</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Format</span>
                    <span className="font-mono font-semibold text-teal-700">10×15 cm</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Mémo SKU</span>
                    <span className="font-mono font-semibold text-slate-900">SKU-ARC-006</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Simple, high-value AI Tools Section + Interactive Try-It Box */}
        <section id="outils-ia" className="py-20 bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-12">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-teal-600">
                Boîte à outils IA
              </p>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-950 sm:text-4xl">
                Moins de saisie, zéro blocage, plus de marge
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600">
                4 outils simples pensés contre les vraies pertes de temps sur Vinted,
                Leboncoin et TikTok Shop.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {ESSENTIAL_TOOLS.map((tool, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-teal-300 transition"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 mb-3.5">
                    {tool.icon}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{tool.title}</h3>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                    {tool.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Clean Live Simulator */}
            <div className="rounded-3xl border border-slate-200 bg-[#f8fafc] p-5 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-950">
                    Essaie le générateur d&apos;annonce &amp; calcul de marge
                  </h3>
                  <p className="text-xs text-slate-600">
                    Modifie le titre ou le prix pour voir le résultat instantanément.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={launchDemo}
                  className="bg-teal-600 text-white hover:bg-teal-700 font-semibold rounded-xl"
                >
                  Ouvrir le Studio complet
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="grid gap-6 lg:grid-cols-12 items-start">
                <div className="lg:col-span-5 space-y-3 text-xs">
                  <div className="space-y-1">
                    <span className="font-medium text-slate-700">Article</span>
                    <Input
                      value={simTitle}
                      onChange={(e) => setSimTitle(e.target.value)}
                      className="bg-white border-slate-200 text-slate-900"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="font-medium text-slate-700">Prix achat (€)</span>
                      <Input
                        type="number"
                        value={simBuy}
                        onChange={(e) => setSimBuy(e.target.value)}
                        className="bg-white border-slate-200 text-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="font-semibold text-teal-700">Prix revente (€)</span>
                      <Input
                        type="number"
                        value={simSell}
                        onChange={(e) => setSimSell(e.target.value)}
                        className="bg-white border-teal-500 text-slate-900 font-bold"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                      <p className="text-[11px] text-slate-500">URSSAF (12,3 %)</p>
                      <p className="text-lg font-extrabold text-slate-900">
                        {formatEuro(simMargin.urssafAmount)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-teal-200 bg-teal-50 p-3.5">
                      <p className="text-[11px] text-teal-800 font-medium">Marge nette réelle</p>
                      <p className="text-lg font-extrabold text-teal-700">
                        {formatEuro(simMargin.netMargin)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex gap-1.5">
                      {[
                        { id: "vinted", label: "Vinted" },
                        { id: "lbc", label: "Leboncoin" },
                        { id: "tiktok", label: "Script TikTok" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSimTab(t.id as typeof simTab)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            simTab === t.id
                              ? "bg-teal-600 text-white"
                              : "bg-slate-100 text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <span className="font-mono text-[11px] text-slate-500 truncate max-w-[260px]">
                      {simCopy.seoTitle}
                    </span>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3.5 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed min-h-[135px]">
                    {simTab === "vinted"
                      ? simCopy.vinted
                      : simTab === "lbc"
                        ? simCopy.leboncoin
                        : `[0-3s HOOK] "Regarde cette ${simTitle} prête à partir — zéro défaut."\n[3-10s PREUVE] "Coupe, matière et coutures vérifiées en détail."\n[10-15s CTA] "Dispo à ${simSell} € maintenant · Envoi rapide en 24h !"`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Crosslisting Showcase */}
        <section id="crosslisting" className="py-20 bg-[#f8fafc] border-y border-slate-200/70">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-10 lg:grid-cols-2 items-center">
              <div>
                <Badge className="mb-3 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                  Crosslisting Vinted ↔ Leboncoin
                </Badge>
                <h2 className="text-3xl font-extrabold text-slate-950 sm:text-4xl leading-tight">
                  Mets en vente une fois, Vintflow publie de l&apos;autre côté
                </h2>
                <p className="mt-4 text-slate-600 text-sm sm:text-base leading-relaxed">
                  Tes fiches passent de Vinted à Leboncoin en un clic, ou toutes seules
                  entre 8 h et 23 h. Vendue d&apos;un côté, l&apos;annonce est retirée de
                  l&apos;autre automatiquement.
                </p>

                <div className="mt-6 space-y-4">
                  <div className="flex gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Fiche préremplie</h3>
                      <p className="text-xs text-slate-600">
                        Titre, photos, prix, état et format de colis repris automatiquement.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Retirée quand ça se vend</h3>
                      <p className="text-xs text-slate-600">
                        Masquée automatiquement sur l&apos;autre plateforme dès qu&apos;une vente tombe.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Publier tout seul (8h–23h)</h3>
                      <p className="text-xs text-slate-600">
                        Active le mode auto pour publier tes nouveaux articles sans effort.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-xs text-slate-500">Mode automatique (8h–23h)</p>
                    <p className="text-sm font-bold text-slate-900">Publier tout seul sur Leboncoin</p>
                  </div>
                  <Switch
                    checked={autoPublishDemo}
                    onCheckedChange={setAutoPublishDemo}
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">
                      Veste Carhartt Detroit Canvas Noir
                    </span>
                    <span className="font-extrabold text-teal-700">89 €</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    SKU-CRH-001 · Taille L · Très bon état · Marge est. +47,55 €
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="rounded-full bg-teal-100 text-teal-800 px-2.5 py-0.5 font-semibold">
                      Vinted : En ligne
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-semibold ${
                        autoPublishDemo
                          ? "bg-orange-100 text-orange-800"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      Leboncoin : {autoPublishDemo ? "Synchronisée" : "En attente"}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={launchDemo}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-10 font-semibold"
                >
                  Tester le crosslisting dans le back-office
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* AI Assistant Section */}
        <section className="py-20 bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 grid gap-10 lg:grid-cols-2 items-center">
            <div>
              <Badge className="mb-3 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200">
                Assistant IA Nova
              </Badge>
              <h2 className="text-3xl font-extrabold text-slate-950 sm:text-4xl">
                Un assistant IA qui lit tes vrais chiffres
              </h2>
              <p className="mt-4 text-slate-600 text-sm sm:text-base leading-relaxed">
                Pose une question sur ton CA, ton URSSAF ou tes invendus. Nova prépare
                une carte Avant / Après et n&apos;applique rien sans ton clic.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {AI_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveAiIdx(idx)}
                    className={`rounded-xl border px-3.5 py-2 text-xs text-left transition ${
                      activeAiIdx === idx
                        ? "border-teal-600 bg-teal-50 text-teal-900 font-semibold"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {preset.q}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Nova · Assistant Vintflow</p>
                  <p className="text-[11px] text-slate-500">
                    Connecté à tes ventes, stock &amp; URSSAF
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-teal-600 px-4 py-2.5 text-xs text-white font-medium">
                  {AI_PRESETS[activeAiIdx].q}
                </div>
                <div className="mr-auto max-w-[92%] rounded-2xl rounded-bl-sm bg-white border border-slate-200 px-4 py-3 text-xs text-slate-700 leading-relaxed shadow-xs">
                  {AI_PRESETS[activeAiIdx].a}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats + Reviews */}
        <section className="py-16 bg-[#f8fafc] border-y border-slate-200/70">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-14">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xs">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200 mb-3">
                <Clock className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-950 sm:text-3xl">
                Récupère 20 heures par mois sur ta gestion
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
                Finies les soirées du dimanche à saisir tes ventes dans Excel.
              </p>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-slate-100 pt-8">
                <div>
                  <p className="text-3xl font-extrabold text-teal-600">42,5k</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">Ventes synchronisées</p>
                </div>
                <div>
                  <p className="text-3xl font-extrabold text-slate-950">2,4 M€</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">Flux financiers gérés</p>
                </div>
                <div>
                  <p className="text-3xl font-extrabold text-slate-950">1,6 M€</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">Ventes suivies</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-center text-2xl font-extrabold text-slate-950 mb-8">
                Ce que disent les revendeurs
              </h2>
              <div className="grid gap-5 md:grid-cols-3">
                {REVIEWS.map((r) => (
                  <div
                    key={r.name}
                    className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-between shadow-xs"
                  >
                    <p className="text-sm text-slate-700 leading-relaxed">&ldquo;{r.text}&rdquo;</p>
                    <div className="mt-5 border-t border-slate-100 pt-3">
                      <p className="text-sm font-bold text-slate-900">{r.name}</p>
                      <p className="text-[11px] text-slate-500">{r.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section (Exact Starter 29€ / Pro 49€) */}
        <section id="tarifs" className="py-20 bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto">
              <p className="text-xs font-bold uppercase tracking-widest text-teal-600">
                Tarifs simples
              </p>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-950 sm:text-4xl">
                Choisis le plan adapté à ton activité
              </h2>
              <p className="mt-3 text-sm text-slate-600">
                Essai gratuit 14 jours sur l&apos;offre de ton choix, sans engagement.
              </p>

              <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setBillingCycle("monthly")}
                  className={`rounded-full px-4 py-2 font-semibold transition ${
                    billingCycle === "monthly"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600"
                  }`}
                >
                  Mensuel
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("annual")}
                  className={`rounded-full px-4 py-2 font-semibold transition flex items-center gap-1.5 ${
                    billingCycle === "annual"
                      ? "bg-teal-600 text-white"
                      : "text-slate-600"
                  }`}
                >
                  Annuel
                  <span className="rounded bg-black/15 px-1.5 py-0.5 text-[10px]">
                    2 mois offerts
                  </span>
                </button>
              </div>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
              {(["starter", "pro"] as PlanId[]).map((planId) => {
                const p = PLANS[planId];
                const isPro = planId === "pro";
                const displayPrice =
                  billingCycle === "annual" ? p.annualMonthlyPrice : p.monthlyPrice;

                return (
                  <div
                    key={planId}
                    className={`rounded-3xl border p-7 flex flex-col justify-between ${
                      isPro
                        ? "border-teal-500 bg-teal-50/30 shadow-lg shadow-teal-600/5"
                        : "border-slate-200 bg-white shadow-xs"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-extrabold text-slate-950">{p.name}</h3>
                        {isPro && (
                          <Badge className="bg-teal-600 text-white font-bold">
                            Populaire
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm text-slate-600">{p.tagline}</p>

                      <div className="mt-6 flex items-baseline gap-2">
                        <span className="text-4xl font-extrabold text-slate-950">
                          {displayPrice} €
                        </span>
                        <span className="text-sm text-slate-500">/ mois TTC</span>
                      </div>
                      {billingCycle === "annual" && (
                        <p className="mt-1 text-xs font-medium text-teal-700">
                          Facturé {p.annualTotal} €/an (2 mois offerts)
                        </p>
                      )}

                      <ul className="mt-6 space-y-3">
                        {p.features.map((feat, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700">
                            <Check className="h-4 w-4 shrink-0 text-teal-600 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button
                      onClick={() => openSignup(planId)}
                      className={`mt-8 w-full h-11 rounded-xl font-bold ${
                        isPro
                          ? "bg-teal-600 text-white hover:bg-teal-700"
                          : "bg-slate-900 text-white hover:bg-slate-800"
                      }`}
                    >
                      Démarrer l&apos;essai 14 jours ({p.name})
                    </Button>
                  </div>
                );
              })}
            </div>

            <p className="mt-6 text-center text-xs text-slate-500">
              Prix en euros TTC (TVA 20 % incluse). Facturation HT pour les sociétés UE avec TVA valide.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-16 bg-[#f8fafc] border-t border-slate-200/70">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-center text-2xl font-extrabold text-slate-950 mb-8">
              Questions fréquentes
            </h2>
            <div className="space-y-3">
              {FAQS.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-bold text-slate-900"
                    >
                      <span>{item.q}</span>
                      <ChevronDown
                        className={`h-4 w-4 text-slate-400 transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 text-xs text-slate-600 leading-relaxed">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-3">
            <VintflowLogo size="sm" />
            <span>· Logiciel de gestion &amp; outils IA pour revendeurs</span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/legal/mentions-legales" className="hover:text-slate-900 transition">
              Mentions légales
            </Link>
            <Link href="/legal/cgv" className="hover:text-slate-900 transition">
              CGV
            </Link>
            <Link href="/legal/confidentialite" className="hover:text-slate-900 transition">
              Confidentialité
            </Link>
          </div>
        </div>
      </footer>

      <AuthModal
        key={`${authMode}-${selectedPlan}-${billingCycle}-${authOpen ? "1" : "0"}`}
        open={authOpen}
        onOpenChange={setAuthOpen}
        defaultMode={authMode}
        defaultPlan={selectedPlan}
        defaultCycle={billingCycle}
      />
    </div>
  );
}
