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
  FileSpreadsheet,
  FileText,
  Layers,
  MessageSquare,
  Package,
  Printer,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Swords,
  TrendingUp,
  Video,
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
  { name: "Veste Levi's", qty: "SKU-A12" },
  { name: "Sac Eastpak", qty: "SKU-B05" },
  { name: "Nike Air Max", qty: "SKU-C23" },
  { name: "Chemise Uniqlo", qty: "SKU-D08" },
];

const INVOICE_TICKER = [
  { num: "FAC-2026-041", price: "225 €" },
  { num: "FAC-2026-040", price: "42 €" },
  { num: "FAC-2026-039", price: "58 €" },
  { num: "FAC-2026-038", price: "34 €" },
];

const FORUM_PAIN_POINTS = [
  {
    icon: <Camera className="h-4 w-4 text-emerald-400" />,
    pain: "« Retoucher et recadrer les photos me prend un temps fou »",
    fix: "Studio Photo Vintflow : éclairage auto, fond studio propre et export exact Vinted (1080×1080), Leboncoin (1200×900) et TikTok (1080×1350).",
  },
  {
    icon: <ShieldAlert className="h-4 w-4 text-amber-400" />,
    pain: "« Mes republications passent en vérif 24h ou prennent 0 vue »",
    fix: "Bouclier Anti-Shadowban : change l'empreinte photo, reformule titre/texte sans spam de hashtags et publie aux pics d'audience FR.",
  },
  {
    icon: <Swords className="h-4 w-4 text-rose-400" />,
    pain: "« Les acheteurs qui envoient -40 % ou 'dernier prix ?' sans bonjour »",
    fix: "Sniper Négociation : calcule ton prix plancher après URSSAF et génère une contre-offre ferme ou un pivot vers un lot en 1 clic.",
  },
  {
    icon: <Sparkles className="h-4 w-4 text-cyan-400" />,
    pain: "« Je perds 10 min par fiche à adapter entre Vinted, LBC et TikTok »",
    fix: "Générateur IA 3-en-1 : 1 fiche produit -> titre SEO, annonce Vinted + mesures, texte Leboncoin propre et script vidéo TikTok Shop 15s.",
  },
  {
    icon: <Video className="h-4 w-4 text-pink-400" />,
    pain: "« L'app TikTok Shop n'envoie pas les notifs & la messagerie LBC bug »",
    fix: "Cockpit unifié : commandes, alertes colis à expédier et messagerie centralisée de tous tes comptes sur un seul écran.",
  },
  {
    icon: <FileSpreadsheet className="h-4 w-4 text-purple-400" />,
    pain: "« Tous les dimanches je galère sur Excel avec l'URSSAF et mes factures »",
    fix: "Compta & Factures auto : marge nette déduite à la vente, alerte seuil TVA, factures PDF et export CSV livre des recettes.",
  },
];

const AI_PRESETS = [
  {
    q: "Combien j'ai vendu ce mois-ci ?",
    a: "Tu as encaissé 2 480 € sur 44 ventes ce mois-ci. Après déduction de tes achats (920 €), boosts (14 €) et cotisations URSSAF estimées (305 €), ta marge nette réelle est de 1 241 € (50,0 %).",
  },
  {
    q: "Quels articles dorment depuis +14 jours ?",
    a: "Tu as 2 articles dormants (Nike Air Max 90 à 78 € et Jean Levi's 501 à 45 €). Je peux appliquer -10 % et régénérer une variante anti-shadowban avant le pic de dimanche 19h.",
  },
  {
    q: "Comment fonctionne le retrait auto Leboncoin ?",
    a: "Dès qu'un article est vendu sur Vinted, Vintflow masque l'annonce correspondante sur Leboncoin automatiquement (ou en 1 clic selon ton réglage), évitant les doubles ventes.",
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
    role: "Boutique fripe multi-comptes & TikTok Shop",
    text: "Le studio photo + le bouclier anti-shadowban m'ont redonné des vues sur des pièces qui dormaient depuis 3 semaines. Et le crosslisting LBC fait +25 % de CA.",
  },
  {
    name: "Kévin R.",
    role: "Micro-entrepreneur seconde main",
    text: "Le sniper de négociation m'empêche de brader sous ma marge quand je reçois 10 offres à -40 % par jour, et les bordereaux 10×15 avec SKU sont parfaits.",
  },
];

const FAQS = [
  {
    q: "Est-ce que Vintflow republie de façon risquée sur Vinted ?",
    a: "Non, par sécurité pour tes comptes : Vintflow évite les bots de spam interdits. Son Bouclier Anti-Shadowban modifie légèrement l'empreinte photo et reformule le texte pour éviter les blocages de vérification 24h quand tu remets un article en ligne.",
  },
  {
    q: "Comment fonctionne l'essai gratuit de 14 jours ?",
    a: "Tu crées ton espace en 30 secondes (ou tu testes le bac à sable démo en 1 clic). Tu profites de tous les outils IA, du studio photo, du crosslisting et des factures PDF pendant 14 jours sans engagement.",
  },
  {
    q: "Puis-je exporter ma comptabilité pour ma micro-entreprise ou mon comptable ?",
    a: "Oui. Vintflow calcule tes cotisations URSSAF estimées à chaque vente, suit tes seuils micro et TVA, génère des factures PDF conformes France/Belgique et exporte ton livre des recettes au format CSV/Excel.",
  },
  {
    q: "Quelle différence entre Starter (29 €) et Pro (49 €) ?",
    a: "Starter couvre jusqu'à 3 comptes Vinted, 1 Leboncoin/TikTok/eBay/Whatnot et 500 publications crosslisting/mois. Pro monte à 10 comptes Vinted, crosslisting illimité, 3 sociétés, accès comptable lecture seule et envoi auto des factures par e-mail.",
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

  // Live Interactive Sandbox on Landing Page
  const [simTitle, setSimTitle] = useState("Veste Carhartt Detroit Canvas");
  const [simBrand, setSimBrand] = useState("Carhartt");
  const [simBuy, setSimBuy] = useState("28");
  const [simSell, setSimSell] = useState("89");
  const [simPlatformTab, setSimPlatformTab] = useState<"vinted" | "lbc" | "tiktok">("vinted");

  const simCopy = generateListingCopy({
    title: simTitle || "Veste Vintage",
    brand: simBrand || "Carhartt",
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
    <div className="min-h-screen bg-[#090b0f] text-zinc-100 selection:bg-emerald-500/30">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[560px] bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.18),transparent_68%)]" />

      {/* Sticky Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#090b0f]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#">
            <VintflowLogo />
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm text-zinc-400">
            <a href="#outils-ia" className="hover:text-white transition">
              Outils IA
            </a>
            <a href="#fonctionnalites" className="hover:text-white transition">
              Back-office
            </a>
            <a href="#crosslisting" className="hover:text-white transition">
              Crosslisting
            </a>
            <a href="#tarifs" className="hover:text-white transition">
              Tarifs
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            {isLoggedIn ? (
              <Button
                onClick={() => router.push("/app")}
                className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400 font-semibold"
              >
                Ouvrir mon back-office
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={openLogin}
                  className="text-zinc-300 hover:text-white hover:bg-white/5"
                >
                  Connexion
                </Button>
                <Button
                  onClick={() => openSignup("starter")}
                  className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400 font-semibold"
                >
                  Essai gratuit 14j
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative">
        {/* Hero Section */}
        <section className="mx-auto max-w-6xl px-4 pt-14 pb-16 sm:px-6 md:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
              {["Vinted", "Leboncoin", "TikTok Shop", "eBay", "Whatnot"].map((plat) => (
                <span
                  key={plat}
                  className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300"
                >
                  {plat}
                </span>
              ))}
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl leading-[1.06]">
              Domine la revente.
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
                Vends 3× plus vite avec l&apos;IA.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base text-zinc-400 sm:text-lg leading-relaxed">
              Arrête de perdre 20 h par mois entre photos, descriptions, négociateurs à
              -40 % et tableaux Excel. <strong className="text-zinc-200">Vintflow</strong>{" "}
              réunit studio photo, générateur d&apos;annonces IA, bouclier anti-shadowban,
              crosslisting Vinted ↔ Leboncoin, marges URSSAF et factures PDF.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={() => (isLoggedIn ? router.push("/app") : openSignup("starter"))}
                className="w-full sm:w-auto bg-emerald-500 text-emerald-950 hover:bg-emerald-400 font-bold h-12 px-7 text-base shadow-[0_0_32px_rgba(16,185,129,0.3)]"
              >
                Démarrer gratuitement (14 jours)
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                disabled={demoLoading}
                onClick={launchDemo}
                className="w-full sm:w-auto border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-white h-12 px-6 text-base"
              >
                <Sparkles className="mr-2 h-4 w-4 text-emerald-400" />
                {demoLoading ? "Ouverture du cockpit..." : "Tester la démo complète en 1 clic"}
              </Button>
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3 text-xs text-zinc-400">
              <div className="flex -space-x-2">
                {["C", "Y", "L", "H", "S"].map((letter, idx) => (
                  <span
                    key={idx}
                    className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#090b0f] bg-gradient-to-br from-emerald-500/80 to-teal-700 text-[11px] font-bold text-white"
                  >
                    {letter}
                  </span>
                ))}
              </div>
              <span>
                <strong className="text-white">+4 200 revendeurs</strong> · Note 4,8/5 ·
                Prêt à l&apos;emploi en 30 secondes
              </span>
            </div>
          </div>

          {/* Interactive Live Preview Simulator right on the landing page */}
          <div id="outils-ia" className="mt-12 rounded-3xl border border-white/10 bg-[#10141c] p-4 sm:p-6 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4 mb-5">
              <div>
                <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px] mb-1">
                  TESTE EN DIRECT
                </Badge>
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Simulateur IA Multi-Plateformes &amp; Calcul de Marge URSSAF
                </h2>
              </div>
              <Button
                size="sm"
                onClick={launchDemo}
                className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400 font-bold text-xs"
              >
                Ouvrir Studio Photo &amp; Back-Office
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="grid gap-5 lg:grid-cols-12 items-start">
              <div className="lg:col-span-5 space-y-3 text-xs">
                <div className="space-y-1">
                  <span className="text-zinc-400">Article à vendre</span>
                  <Input
                    value={simTitle}
                    onChange={(e) => setSimTitle(e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <span className="text-zinc-400">Marque</span>
                    <Input
                      value={simBrand}
                      onChange={(e) => setSimBrand(e.target.value)}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-zinc-400">Achat (€)</span>
                    <Input
                      type="number"
                      value={simBuy}
                      onChange={(e) => setSimBuy(e.target.value)}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-emerald-400 font-semibold">Revente (€)</span>
                    <Input
                      type="number"
                      value={simSell}
                      onChange={(e) => setSimSell(e.target.value)}
                      className="bg-emerald-500/10 border-emerald-500/30 text-white font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div className="rounded-xl border border-white/10 bg-[#090b0f] p-3">
                    <p className="text-[11px] text-zinc-400">URSSAF estimée (12,3 %)</p>
                    <p className="text-lg font-extrabold text-white">
                      {formatEuro(simMargin.urssafAmount)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                    <p className="text-[11px] text-emerald-300">Marge nette réelle</p>
                    <p className="text-lg font-extrabold text-emerald-400">
                      {formatEuro(simMargin.netMargin)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-[#090b0f] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex gap-1.5">
                    {[
                      { id: "vinted", label: "Annonce Vinted" },
                      { id: "lbc", label: "Annonce Leboncoin" },
                      { id: "tiktok", label: "Script TikTok Shop" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() =>
                          setSimPlatformTab(t.id as typeof simPlatformTab)
                        }
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          simPlatformTab === t.id
                            ? "bg-emerald-500 text-emerald-950"
                            : "bg-white/5 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <span className="font-mono text-[11px] text-zinc-500">
                    Titre SEO : {simCopy.seoTitle}
                  </span>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed min-h-[135px]">
                  {simPlatformTab === "vinted"
                    ? simCopy.vinted
                    : simPlatformTab === "lbc"
                      ? simCopy.leboncoin
                      : `[0-3s HOOK] "Regarde cette ${simTitle} (${simBrand}) prête à partir — zéro défaut."\n[3-10s PREUVE] "Je te montre la coupe, la matière et les finitions en gros plan."\n[10-15s CTA] "Dispo à ${simSell} € maintenant · Envoi rapide en 24h !"`}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Forum Pain Points Solved Section */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="mb-10 text-center max-w-2xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Conçu d&apos;après les vrais retours de vendeurs
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
              Les 6 galères qui te bloquent sur Vinted, Leboncoin &amp; TikTok Shop
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FORUM_PAIN_POINTS.map((item, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-white/10 bg-[#10141c] p-5 flex flex-col justify-between gap-3 hover:border-emerald-500/30 transition"
              >
                <div className="space-y-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] border border-white/10">
                    {item.icon}
                  </div>
                  <p className="text-sm font-bold text-white leading-snug">
                    {item.pain}
                  </p>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed border-t border-white/10 pt-3">
                  <strong className="text-emerald-400">Solution Vintflow : </strong>
                  {item.fix}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Bento Grid: L'arsenal ultime */}
        <section id="fonctionnalites" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              L&apos;arsenal complet
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
              Un seul cockpit pour gérer tout ton business de revente
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-6">
            {/* Card 1 */}
            <div className="md:col-span-3 rounded-2xl border border-white/10 bg-[#10141c] p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  Marge réelle &amp; URSSAF
                </span>
                <Badge variant="outline" className="border-white/10 text-zinc-400 text-[11px]">
                  Temps réel
                </Badge>
              </div>
              <p className="text-sm text-zinc-400 mb-5">
                Prix d&apos;achat, boosts, frais plateforme, port et cotisations URSSAF
                déduits à chaque commande.
              </p>
              <div className="relative overflow-hidden py-1">
                <div className="flex w-max gap-3 animate-marquee">
                  {[...PROFIT_TICKER, ...PROFIT_TICKER].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs whitespace-nowrap"
                    >
                      <span className="text-zinc-200 font-medium">{item.name}</span>
                      <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 font-bold text-emerald-400">
                        {item.profit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="md:col-span-3 rounded-2xl border border-white/10 bg-[#10141c] p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                  <MessageSquare className="h-4 w-4 text-cyan-400" />
                  Messagerie multi-comptes + Sniper Négo
                </span>
                <Badge variant="outline" className="border-white/10 text-zinc-400 text-[11px]">
                  +30 h gagnées / mois
                </Badge>
              </div>
              <p className="text-sm text-zinc-400 mb-5">
                Centralise tes messages Vinted, Leboncoin &amp; TikTok Shop avec réponses
                stratégiques prêtes en 1 clic.
              </p>
              <div className="relative overflow-hidden py-1">
                <div className="flex w-max gap-3 animate-marquee-reverse">
                  {[...MESSAGES_TICKER, ...MESSAGES_TICKER].map((m, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs whitespace-nowrap"
                    >
                      <span className="font-bold text-emerald-400">{m.user}</span>
                      <span className="text-zinc-300">{m.msg}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="md:col-span-2 rounded-2xl border border-white/10 bg-[#10141c] p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                <Package className="h-4 w-4 text-amber-400" />
                Gestion de Stock &amp; SKU
              </div>
              <p className="text-xs text-zinc-400 mb-4">
                SKU, emplacements étagères, calculateur de lots et alertes dormants (+14j).
              </p>
              <div className="space-y-2">
                {STOCK_TICKER.map((s) => (
                  <div
                    key={s.qty}
                    className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-xs"
                  >
                    <span className="text-zinc-200">{s.name}</span>
                    <span className="font-mono text-amber-300">{s.qty}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 4 */}
            <div className="md:col-span-2 rounded-2xl border border-white/10 bg-[#10141c] p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                <FileText className="h-4 w-4 text-emerald-400" />
                Factures PDF &amp; Compta
              </div>
              <p className="text-xs text-zinc-400 mb-4">
                Numérotées, conformes France &amp; Belgique, exports CSV/Excel et seuils TVA.
              </p>
              <div className="space-y-2">
                {INVOICE_TICKER.map((f) => (
                  <div
                    key={f.num}
                    className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-xs"
                  >
                    <span className="font-mono text-zinc-300">{f.num}</span>
                    <span className="font-semibold text-emerald-400">{f.price}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 5 */}
            <div className="md:col-span-2 rounded-2xl border border-white/10 bg-[#10141c] p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                  <Printer className="h-4 w-4 text-purple-400" />
                  Bordereaux 10×15 &amp; Multi-comptes
                </div>
                <p className="text-xs text-zinc-400">
                  Étiquettes recadrées imprimante thermique avec SKU + 3 à 10 comptes Vinted.
                </p>
              </div>
              <div className="mt-4 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-3.5 text-xs space-y-1.5">
                <div className="flex justify-between text-zinc-400">
                  <span>Transporteur</span>
                  <span className="text-white font-semibold">Mondial Relay</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Format étiquette</span>
                  <span className="font-mono text-emerald-400">10×15 cm (4×6)</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>SKU Colis</span>
                  <span className="font-mono text-white">SKU-ARC-006</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Crosslisting Showcase */}
        <section id="crosslisting" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#111722] to-[#0c1017] p-6 sm:p-10">
            <div className="grid gap-10 lg:grid-cols-2 items-center">
              <div>
                <Badge className="mb-3 bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                  Crosslisting Vinted ↔ Leboncoin ↔ TikTok Shop
                </Badge>
                <h2 className="text-3xl font-extrabold text-white sm:text-4xl leading-tight">
                  Mets en vente une fois, Vintflow publie de l&apos;autre côté
                </h2>
                <p className="mt-4 text-zinc-400 text-sm sm:text-base leading-relaxed">
                  Tes annonces passent de Vinted à Leboncoin et de Leboncoin à Vinted, fiche
                  déjà remplie : d&apos;un clic, ou toutes seules entre 8 h et 23 h. Vendue
                  d&apos;un côté, celle de l&apos;autre se retire automatiquement.
                </p>

                <div className="mt-6 space-y-4">
                  <div className="flex gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Fiche préremplie SEO</h3>
                      <p className="text-xs text-zinc-400">
                        Titre optimisé, description adaptée par plateforme, prix, état et format
                        de colis repris en 1 seconde.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Retirée quand ça se vend</h3>
                      <p className="text-xs text-zinc-400">
                        L&apos;annonce restée en ligne est masquée automatiquement pour éviter
                        toute double commande.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Publier tout seul (8h–23h)</h3>
                      <p className="text-xs text-zinc-400">
                        Allume l&apos;interrupteur et tes nouvelles annonces partent sur l&apos;autre
                        plateforme sans toucher à ton stock existant.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#090b0f] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <p className="text-xs text-zinc-400">Mode automatique (8h–23h)</p>
                    <p className="text-sm font-bold text-white">Publier tout seul sur Leboncoin</p>
                  </div>
                  <Switch
                    checked={autoPublishDemo}
                    onCheckedChange={setAutoPublishDemo}
                  />
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">
                      Veste Carhartt Detroit Canvas Noir
                    </span>
                    <span className="font-bold text-emerald-400">89 €</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">
                    SKU-CRH-001 · Taille L · Très bon état · Marge est. +47,55 €
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2.5 py-0.5 font-medium">
                      Vinted : En ligne
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-zinc-500" />
                    <span
                      className={`rounded-full border px-2.5 py-0.5 font-medium ${
                        autoPublishDemo
                          ? "bg-orange-500/20 text-orange-300 border-orange-500/30"
                          : "bg-zinc-800 text-zinc-400 border-white/10"
                      }`}
                    >
                      Leboncoin : {autoPublishDemo ? "Synchronisée" : "En attente"}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={launchDemo}
                  className="w-full bg-white/10 hover:bg-white/15 text-white"
                >
                  Ouvrir le back-office &amp; tester tous les outils
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* AI Assistant Section */}
        <section id="assistant-ia" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-2 items-center">
            <div>
              <Badge className="mb-3 bg-cyan-500/15 text-cyan-300 border-cyan-500/30">
                Assistant IA Nova
              </Badge>
              <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                Un copilote IA qui lit tes vrais chiffres avant d&apos;agir
              </h2>
              <p className="mt-4 text-zinc-400 text-sm sm:text-base leading-relaxed">
                Pose-lui une question sur ton CA, ton URSSAF ou ton stock dormant. Nova
                prépare une carte Avant / Après pour baisser les prix ou crosslister, et
                rien ne bouge sans ton clic.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {AI_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveAiIdx(idx)}
                    className={`rounded-lg border px-3 py-2 text-xs text-left transition ${
                      activeAiIdx === idx
                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-200 font-medium"
                        : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20"
                    }`}
                  >
                    {preset.q}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#10141c] p-5 space-y-4">
              <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Nova · Assistant Vintflow</p>
                  <p className="text-[11px] text-zinc-400">
                    Connecté à tes ventes, achats, stock &amp; wallet
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-emerald-500/20 border border-emerald-500/30 px-4 py-2.5 text-xs text-emerald-100">
                  {AI_PRESETS[activeAiIdx].q}
                </div>
                <div className="mr-auto max-w-[92%] rounded-2xl rounded-bl-sm bg-white/[0.04] border border-white/10 px-4 py-3 text-xs text-zinc-200 leading-relaxed">
                  {AI_PRESETS[activeAiIdx].a}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Time Lost Banner */}
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="rounded-3xl border border-white/10 bg-[#10141c] p-8 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300 mb-3">
              <Clock className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
              Chaque dimanche tu vides ta liste Excel. Chaque lundi, de nouvelles ventes la remplissent.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-zinc-400">
              À 100 ventes par mois, ce cycle te coûte 20 heures de saisie, soit environ 500 € de
              ton temps chaque mois.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-white/10 pt-8">
              <div>
                <p className="text-3xl font-extrabold text-emerald-400">42,5k</p>
                <p className="mt-1 text-xs text-zinc-400">Ventes synchronisées</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-white">2,4 M€</p>
                <p className="mt-1 text-xs text-zinc-400">Flux financiers gérés</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-white">1,6 M€</p>
                <p className="mt-1 text-xs text-zinc-400">Montant des ventes suivies</p>
              </div>
            </div>
          </div>
        </section>

        {/* Reviews */}
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="text-center text-2xl font-extrabold text-white mb-8">
            Ce que disent les revendeurs
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {REVIEWS.map((r) => (
              <div
                key={r.name}
                className="rounded-2xl border border-white/10 bg-[#10141c] p-5 flex flex-col justify-between"
              >
                <p className="text-sm text-zinc-300 leading-relaxed">&ldquo;{r.text}&rdquo;</p>
                <div className="mt-5 border-t border-white/10 pt-3">
                  <p className="text-sm font-bold text-white">{r.name}</p>
                  <p className="text-[11px] text-zinc-400">{r.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing Section */}
        <section id="tarifs" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Tarifs transparents
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
              Choisis le plan adapté à ton activité
            </h2>
            <p className="mt-3 text-sm text-zinc-400">
              Essai gratuit de 14 jours sur le plan de ton choix, sans engagement.
            </p>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#10141c] p-1 text-xs">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`rounded-full px-4 py-2 font-semibold transition ${
                  billingCycle === "monthly"
                    ? "bg-white text-zinc-950"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Mensuel
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("annual")}
                className={`rounded-full px-4 py-2 font-semibold transition flex items-center gap-1.5 ${
                  billingCycle === "annual"
                    ? "bg-emerald-500 text-emerald-950"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Annuel
                <span className="rounded bg-black/20 px-1.5 py-0.5 text-[10px]">
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
                      ? "border-emerald-500/60 bg-gradient-to-b from-emerald-500/[0.08] to-[#10141c] shadow-[0_0_40px_rgba(16,185,129,0.12)]"
                      : "border-white/10 bg-[#10141c]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-extrabold text-white">{p.name}</h3>
                      {isPro && (
                        <Badge className="bg-emerald-500 text-emerald-950 font-bold">
                          Populaire
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-zinc-400">{p.tagline}</p>

                    <div className="mt-6 flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold text-white">
                        {displayPrice} €
                      </span>
                      <span className="text-sm text-zinc-400">/ mois TTC</span>
                    </div>
                    {billingCycle === "annual" && (
                      <p className="mt-1 text-xs text-emerald-400">
                        Facturé {p.annualTotal} €/an (2 mois offerts)
                      </p>
                    )}

                    <ul className="mt-6 space-y-3">
                      {p.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs text-zinc-300">
                          <Check className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    onClick={() => openSignup(planId)}
                    className={`mt-8 w-full h-11 font-bold ${
                      isPro
                        ? "bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                        : "bg-white/10 text-white hover:bg-white/15"
                    }`}
                  >
                    Démarrer l&apos;essai 14 jours ({p.name})
                  </Button>
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-center text-xs text-zinc-500">
            Prix en euros TTC (TVA 20 % incluse). Professionnels UE : facturation HT avec
            autoliquidation.
          </p>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <h2 className="text-center text-2xl font-extrabold text-white mb-6">
            Questions fréquentes
          </h2>
          <div className="space-y-3">
            {FAQS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-white/10 bg-[#10141c] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold text-white"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-zinc-400 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-xs text-zinc-400 leading-relaxed">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer with Legal Pages */}
      <footer className="border-t border-white/10 bg-[#07090c] py-10">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 text-xs text-zinc-500">
          <div className="flex flex-wrap items-center gap-3">
            <VintflowLogo size="sm" />
            <span>· La boîte à outils IA &amp; gestion des revendeurs</span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/legal/mentions-legales" className="hover:text-white transition">
              Mentions légales
            </Link>
            <Link href="/legal/cgv" className="hover:text-white transition">
              CGV
            </Link>
            <Link href="/legal/confidentialite" className="hover:text-white transition">
              Confidentialité
            </Link>
            <span className="hidden md:flex items-center gap-1 text-zinc-400">
              <RefreshCw className="h-3.5 w-3.5" /> Synchro horaire
            </span>
          </div>
        </div>
      </footer>

      <AuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        defaultMode={authMode}
        defaultPlan={selectedPlan}
        defaultCycle={billingCycle}
      />
    </div>
  );
}
