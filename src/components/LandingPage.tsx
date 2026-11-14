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
  Lock,
  MessageSquare,
  Package,
  Printer,
  RefreshCw,
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
    icon: <Camera className="h-5 w-5 text-emerald-400" />,
    title: "Studio Photo & Détourage IA",
    desc: "Détoure le fond, éclaire l'article et exporte aux formats exacts Vinted (1080×1080), Leboncoin et TikTok Shop.",
  },
  {
    icon: <Sparkles className="h-5 w-5 text-cyan-400" />,
    title: "Annonce IA 3-en-1",
    desc: "Depuis une photo ou un titre : fiche Vinted SEO avec mesures, annonce Leboncoin rassurante et script vidéo TikTok.",
  },
  {
    icon: <ShieldAlert className="h-5 w-5 text-amber-400" />,
    title: "Bouclier Anti-Shadowban",
    desc: "Reformule tes annonces stagnantes sans spam de hashtags pour éviter la vérification 24 h lors des republications.",
  },
  {
    icon: <Swords className="h-5 w-5 text-rose-400" />,
    title: "Sniper Négo & Calcul de Lot",
    desc: "Calcule ton seuil zéro-perte (URSSAF incluse) et riposte aux offres à -40 % sans brader ta marge.",
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
    q: "Comment fonctionne l'essai gratuit de 14 jours ?",
    a: "Comme sur Vinteer, tu profites de 14 jours d'essai gratuit sur le plan de ton choix, sans engagement. Tu peux changer de formule ou annuler à tout moment en 1 clic.",
  },
  {
    q: "Quelle différence entre Essentiel (9 €), Vendeur Plus (29 €) et Pro Scale (49 €) ?",
    a: "Essentiel (9 €) couvre uniquement le suivi de stock (40 SKU), marge/URSSAF et export CSV sans IA ni crosslisting. Vendeur Plus (29 €) débloque les meilleurs outils (Studio Photo, Annonces IA, Crosslisting, Factures PDF, Messagerie) avec des quotas mensuels (30 crédits IA, 100 crosslistings). Pro Scale (49 €) passe tout en illimité avec l'auto-crosslisting 8h–23h et l'Assistant IA Nova.",
  },
  {
    q: "Est-ce risqué pour mon compte Vinted ou Leboncoin ?",
    a: "Non. Vintflow n'utilise pas de bot de spam ou de republication agressive interdite. Le Bouclier Anti-Shadowban t'aide au contraire à éviter les blocages.",
  },
  {
    q: "Puis-je exporter mes chiffres pour ma micro-entreprise ?",
    a: "Oui : calcul automatique de l'URSSAF à chaque vente, jauge de seuil TVA, factures PDF (dès Vendeur Plus) et export CSV du livre des recettes.",
  },
];

export function LandingPage({ isLoggedIn }: { isLoggedIn: boolean }) {
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("plus");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [autoPublishDemo, setAutoPublishDemo] = useState(true);
  const [activeAiIdx, setActiveAiIdx] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [demoLoading, setDemoLoading] = useState(false);

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

  function openSignup(plan: PlanId = "plus") {
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
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.16),transparent_68%)]" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#090b0f]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#">
            <VintflowLogo />
          </a>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#fonctionnalites" className="hover:text-white transition">
              Fonctionnalités
            </a>
            <a href="#outils-ia" className="hover:text-white transition">
              Outils IA
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
                className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400 font-bold rounded-xl"
              >
                Ouvrir mon espace
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={openLogin}
                  className="text-zinc-300 hover:text-white hover:bg-white/5 font-medium"
                >
                  Connexion
                </Button>
                <Button
                  onClick={() => openSignup("plus")}
                  className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400 font-bold rounded-xl"
                >
                  Essai gratuit 14j
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative">
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-4 pt-16 pb-20 sm:px-6 md:pt-24 text-center">
          <Badge className="mb-6 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-300">
            Conçu pour Vinted, Leboncoin, TikTok Shop, eBay &amp; Whatnot
          </Badge>

          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl leading-[1.08]">
            Domine la revente.
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
              Maximise tes profits.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-zinc-400 leading-relaxed">
            Excel te fait perdre des heures et sous-déclarer ton CA. Vintflow centralise
            tout au même endroit : ventes, marge réelle après URSSAF, crosslisting Vinted ↔
            Leboncoin, studio photo IA, factures PDF et bordereaux 10×15.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Button
              size="lg"
              onClick={() => (isLoggedIn ? router.push("/app") : openSignup("plus"))}
              className="w-full sm:w-auto h-12 rounded-xl bg-emerald-500 px-7 text-base font-bold text-emerald-950 hover:bg-emerald-400 shadow-[0_0_28px_rgba(16,185,129,0.28)]"
            >
              Essai gratuit 14 jours
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              disabled={demoLoading}
              onClick={launchDemo}
              className="w-full sm:w-auto h-12 rounded-xl border-white/15 bg-white/[0.04] px-6 text-base font-semibold text-white hover:bg-white/[0.08]"
            >
              <Sparkles className="mr-2 h-4 w-4 text-emerald-400" />
              {demoLoading ? "Chargement..." : "Tester la démo en 1 clic"}
            </Button>
          </div>

          <div className="mt-7 flex items-center justify-center gap-3 text-xs text-zinc-400">
            <div className="flex -space-x-2">
              {["C", "Y", "L", "H", "S"].map((l, i) => (
                <span
                  key={i}
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#090b0f] bg-gradient-to-br from-emerald-500 to-teal-700 text-[11px] font-bold text-white"
                >
                  {l}
                </span>
              ))}
            </div>
            <span>
              <strong className="text-white">+4 200 vendeurs actifs</strong> · Note
              4,8/5 · Essai 14 jours sans engagement
            </span>
          </div>

          {/* Clean Dark Dashboard Preview Frame */}
          <div className="mt-14 rounded-3xl border border-white/10 bg-[#10141c] p-4 sm:p-6 shadow-2xl text-left">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
                <span className="ml-2 font-mono text-xs text-zinc-500">
                  app.vintflow.fr
                </span>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[11px]">
                Synchronisation multi-comptes active
              </Badge>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                <p className="text-xs text-zinc-400">CA du mois</p>
                <p className="mt-1.5 text-2xl font-extrabold text-white">2 480 €</p>
                <p className="mt-1 text-xs text-emerald-400">+18,4 % ce mois</p>
              </div>
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.07] p-4">
                <p className="text-xs text-emerald-300">Marge nette réelle</p>
                <p className="mt-1.5 text-2xl font-extrabold text-emerald-400">1 241 €</p>
                <p className="mt-1 text-xs text-zinc-300">URSSAF 12,3 % déduite</p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                <p className="text-xs text-zinc-400">Stock suivi (SKU)</p>
                <p className="mt-1.5 text-2xl font-extrabold text-white">411 €</p>
                <p className="mt-1 text-xs text-zinc-400">Valeur revente : 1 085 €</p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                <p className="text-xs text-zinc-400">Colis à préparer</p>
                <p className="mt-1.5 text-2xl font-extrabold text-amber-300">2</p>
                <p className="mt-1 text-xs text-zinc-400">Bordereaux 10×15 prêts</p>
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid: L'arsenal ultime */}
        <section id="fonctionnalites" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              L&apos;arsenal essentiel
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
              Tout ce dont tu as vraiment besoin pour vendre plus
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-6">
            <div className="md:col-span-3 rounded-3xl border border-white/10 bg-[#10141c] p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-2 text-base font-bold text-white">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  Marge réelle &amp; URSSAF
                </span>
                <Badge variant="outline" className="border-white/10 text-zinc-400 text-[11px]">
                  Temps réel
                </Badge>
              </div>
              <p className="text-sm text-zinc-400 mb-5">
                Prix d&apos;achat, boosts, frais plateforme et cotisations URSSAF déduits à
                chaque commande.
              </p>
              <div className="overflow-hidden py-1">
                <div className="flex w-max gap-3 animate-marquee">
                  {[...PROFIT_TICKER, ...PROFIT_TICKER].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs whitespace-nowrap"
                    >
                      <span className="font-medium text-zinc-200">{item.name}</span>
                      <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 font-bold text-emerald-400">
                        {item.profit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="md:col-span-3 rounded-3xl border border-white/10 bg-[#10141c] p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-2 text-base font-bold text-white">
                  <MessageSquare className="h-4 w-4 text-cyan-400" />
                  Messagerie multi-comptes
                </span>
                <Badge variant="outline" className="border-white/10 text-zinc-400 text-[11px]">
                  +30 h gagnées / mois
                </Badge>
              </div>
              <p className="text-sm text-zinc-400 mb-5">
                Réponds à tous tes acheteurs Vinted, Leboncoin et TikTok depuis un seul
                écran avec réponses rapides.
              </p>
              <div className="overflow-hidden py-1">
                <div className="flex w-max gap-3 animate-marquee-reverse">
                  {[...MESSAGES_TICKER, ...MESSAGES_TICKER].map((m, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs whitespace-nowrap"
                    >
                      <span className="font-bold text-emerald-400">{m.user}</span>
                      <span className="text-zinc-300">{m.msg}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="md:col-span-2 rounded-3xl border border-white/10 bg-[#10141c] p-6">
              <div className="flex items-center gap-2 text-base font-bold text-white mb-2">
                <Package className="h-4 w-4 text-amber-400" />
                Stock &amp; SKU
              </div>
              <p className="text-xs text-zinc-400 mb-4">
                Emplacements, lots et alerte sur les articles dormants (+14 jours).
              </p>
              <div className="space-y-2">
                {STOCK_TICKER.map((s) => (
                  <div
                    key={s.sku}
                    className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-xs"
                  >
                    <span className="text-zinc-200">{s.name}</span>
                    <span className="font-mono text-amber-300">{s.sku}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 rounded-3xl border border-white/10 bg-[#10141c] p-6">
              <div className="flex items-center gap-2 text-base font-bold text-white mb-2">
                <FileText className="h-4 w-4 text-emerald-400" />
                Factures PDF &amp; Compta
              </div>
              <p className="text-xs text-zinc-400 mb-4">
                Factures numérotées France/Belgique et export CSV livre des recettes.
              </p>
              <div className="space-y-2">
                {INVOICE_TICKER.map((f) => (
                  <div
                    key={f.num}
                    className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-xs"
                  >
                    <span className="font-mono text-zinc-300">{f.num}</span>
                    <span className="font-bold text-emerald-400">{f.price}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 rounded-3xl border border-white/10 bg-[#10141c] p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-base font-bold text-white mb-2">
                  <Printer className="h-4 w-4 text-purple-400" />
                  Bordereaux 10×15
                </div>
                <p className="text-xs text-zinc-400">
                  Étiquettes prêtes pour imprimante thermique avec ton SKU affiché dessus.
                </p>
              </div>
              <div className="mt-4 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-3.5 text-xs space-y-1.5">
                <div className="flex justify-between text-zinc-400">
                  <span>Transporteur</span>
                  <span className="font-bold text-white">Mondial Relay</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Format</span>
                  <span className="font-mono font-semibold text-emerald-400">10×15 cm</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Mémo SKU</span>
                  <span className="font-mono font-semibold text-white">SKU-ARC-006</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AI Tools Section + Live Simulator */}
        <section id="outils-ia" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 space-y-12">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Boîte à outils IA
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
              Moins de saisie, zéro blocage, plus de marge
            </h2>
            <p className="mt-3 text-sm sm:text-base text-zinc-400">
              4 outils concrets conçus d&apos;après les vraies galères des vendeurs
              Vinted, Leboncoin et TikTok Shop.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {ESSENTIAL_TOOLS.map((tool, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/10 bg-[#10141c] p-5 hover:border-emerald-500/35 transition"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] border border-white/10 mb-3.5">
                  {tool.icon}
                </div>
                <h3 className="text-sm font-bold text-white">{tool.title}</h3>
                <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">
                  {tool.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Live Simulator */}
          <div className="rounded-3xl border border-white/10 bg-[#10141c] p-5 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Teste le générateur d&apos;annonce &amp; calcul de marge URSSAF
                </h3>
                <p className="text-xs text-zinc-400">
                  Modifie le titre ou les prix pour voir le résultat en direct.
                </p>
              </div>
              <Button
                size="sm"
                onClick={launchDemo}
                className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400 font-bold rounded-xl"
              >
                Ouvrir le Studio complet
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-12 items-start">
              <div className="lg:col-span-5 space-y-3 text-xs">
                <div className="space-y-1">
                  <span className="font-medium text-zinc-300">Article</span>
                  <Input
                    value={simTitle}
                    onChange={(e) => setSimTitle(e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="font-medium text-zinc-300">Prix achat (€)</span>
                    <Input
                      type="number"
                      value={simBuy}
                      onChange={(e) => setSimBuy(e.target.value)}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="font-semibold text-emerald-400">Prix revente (€)</span>
                    <Input
                      type="number"
                      value={simSell}
                      onChange={(e) => setSimSell(e.target.value)}
                      className="bg-emerald-500/10 border-emerald-500/30 text-white font-bold"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="rounded-xl border border-white/10 bg-[#090b0f] p-3.5">
                    <p className="text-[11px] text-zinc-400">URSSAF (12,3 %)</p>
                    <p className="text-lg font-extrabold text-white">
                      {formatEuro(simMargin.urssafAmount)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
                    <p className="text-[11px] text-emerald-300 font-medium">Marge nette réelle</p>
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
                            ? "bg-emerald-500 text-emerald-950"
                            : "bg-white/5 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <span className="font-mono text-[11px] text-zinc-500 truncate max-w-[260px]">
                    {simCopy.seoTitle}
                  </span>
                </div>
                <div className="rounded-xl bg-white/[0.02] border border-white/10 p-3.5 text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed min-h-[135px]">
                  {simTab === "vinted"
                    ? simCopy.vinted
                    : simTab === "lbc"
                      ? simCopy.leboncoin
                      : `[0-3s HOOK] "Regarde cette ${simTitle} prête à partir — zéro défaut."\n[3-10s PREUVE] "Coupe, matière et coutures vérifiées en détail."\n[10-15s CTA] "Dispo à ${simSell} € maintenant · Envoi rapide en 24h !"`}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Crosslisting Showcase */}
        <section id="crosslisting" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#111722] to-[#0c1017] p-6 sm:p-10">
            <div className="grid gap-10 lg:grid-cols-2 items-center">
              <div>
                <Badge className="mb-3 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Crosslisting Vinted ↔ Leboncoin
                </Badge>
                <h2 className="text-3xl font-extrabold text-white sm:text-4xl leading-tight">
                  Mets en vente une fois, Vintflow publie de l&apos;autre côté
                </h2>
                <p className="mt-4 text-zinc-400 text-sm sm:text-base leading-relaxed">
                  Tes fiches passent de Vinted à Leboncoin en un clic, ou toutes seules
                  entre 8 h et 23 h (Pro Scale). Vendue d&apos;un côté, l&apos;annonce est
                  retirée de l&apos;autre automatiquement.
                </p>

                <div className="mt-6 space-y-4">
                  <div className="flex gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Fiche préremplie</h3>
                      <p className="text-xs text-zinc-400">
                        Titre, description adaptée, prix, état et format de colis repris automatiquement.
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
                        Masquée automatiquement sur l&apos;autre plateforme dès qu&apos;une vente tombe.
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
                        Inclus dans Pro Scale pour automatiser 100 % de tes nouvelles mises en ligne.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#090b0f] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <p className="text-xs text-zinc-400">Mode automatique Pro Scale (8h–23h)</p>
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
                    <span className="font-extrabold text-emerald-400">89 €</span>
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
                  className="w-full bg-white/10 hover:bg-white/15 text-white rounded-xl h-10 font-semibold"
                >
                  Tester le back-office complet (Démo Pro)
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* AI Assistant Nova */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-2 items-center">
            <div>
              <Badge className="mb-3 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                Exclusif Pro Scale · Assistant IA Nova
              </Badge>
              <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                Un assistant IA qui lit tes vrais chiffres
              </h2>
              <p className="mt-4 text-zinc-400 text-sm sm:text-base leading-relaxed">
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
                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-200 font-semibold"
                        : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20"
                    }`}
                  >
                    {preset.q}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#10141c] p-5 space-y-4">
              <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Nova · Assistant Vintflow</p>
                  <p className="text-[11px] text-zinc-400">
                    Connecté à tes ventes, stock &amp; URSSAF
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-emerald-500/20 border border-emerald-500/30 px-4 py-2.5 text-xs text-emerald-100 font-medium">
                  {AI_PRESETS[activeAiIdx].q}
                </div>
                <div className="mr-auto max-w-[92%] rounded-2xl rounded-bl-sm bg-white/[0.04] border border-white/10 px-4 py-3 text-xs text-zinc-200 leading-relaxed">
                  {AI_PRESETS[activeAiIdx].a}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Time Lost + Reviews */}
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 space-y-12">
          <div className="rounded-3xl border border-white/10 bg-[#10141c] p-8 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300 mb-3">
              <Clock className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
              Récupère 20 heures par mois sur ta gestion
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-400">
              Finies les soirées du dimanche à saisir tes ventes dans Excel.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-white/10 pt-8">
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
                <p className="mt-1 text-xs text-zinc-400">Ventes suivies</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-center text-2xl font-extrabold text-white mb-8">
              Ce que disent les revendeurs
            </h2>
            <div className="grid gap-5 md:grid-cols-3">
              {REVIEWS.map((r) => (
                <div
                  key={r.name}
                  className="rounded-2xl border border-white/10 bg-[#10141c] p-6 flex flex-col justify-between"
                >
                  <p className="text-sm text-zinc-300 leading-relaxed">&ldquo;{r.text}&rdquo;</p>
                  <div className="mt-5 border-t border-white/10 pt-3">
                    <p className="text-sm font-bold text-white">{r.name}</p>
                    <p className="text-[11px] text-zinc-400">{r.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section: 3-tier business model */}
        <section id="tarifs" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <Badge className="mb-3 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              Essai gratuit 14 jours sur tous les plans
            </Badge>
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Un plan pour chaque étape de ton business
            </h2>
            <p className="mt-3 text-sm text-zinc-400">
              Commence petit ou débloque toute la puissance de l&apos;IA et du crosslisting
              illimité. Sans engagement.
            </p>

            <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#10141c] p-1 text-xs">
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

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {(["essentiel", "plus", "pro"] as PlanId[]).map((planId) => {
              const p = PLANS[planId];
              const isPro = planId === "pro";
              const isPlus = planId === "plus";
              const displayPrice =
                billingCycle === "annual" ? p.annualMonthlyPrice : p.monthlyPrice;

              return (
                <div
                  key={planId}
                  className={`rounded-3xl border p-7 flex flex-col justify-between ${
                    isPro
                      ? "border-emerald-500/70 bg-gradient-to-b from-emerald-500/[0.12] to-[#10141c] shadow-[0_0_45px_rgba(16,185,129,0.16)]"
                      : isPlus
                        ? "border-cyan-500/40 bg-[#10141c]"
                        : "border-white/10 bg-[#0d1118]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xl font-extrabold text-white">{p.name}</h3>
                      {p.badge && (
                        <Badge
                          className={
                            isPro
                              ? "bg-emerald-500 text-emerald-950 font-bold"
                              : "bg-cyan-500/20 text-cyan-300 border-cyan-500/30 font-semibold"
                          }
                        >
                          {p.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-zinc-400 min-h-[32px]">
                      {p.tagline}
                    </p>

                    <div className="mt-5 flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold text-white">
                        {displayPrice} €
                      </span>
                      <span className="text-sm text-zinc-400">/ mois TTC</span>
                    </div>
                    {billingCycle === "annual" && (
                      <p className="mt-1 text-xs font-medium text-emerald-400">
                        Facturé {p.annualTotal} €/an (2 mois offerts)
                      </p>
                    )}

                    <ul className="mt-6 space-y-2.5">
                      {p.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-zinc-200">
                          <Check className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                      {p.lockedFeatures.map((locked, i) => (
                        <li
                          key={`l-${i}`}
                          className="flex items-start gap-2 text-xs text-zinc-500"
                        >
                          <Lock className="h-3.5 w-3.5 shrink-0 text-zinc-600 mt-0.5" />
                          <span>{locked}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    onClick={() => openSignup(planId)}
                    className={`mt-8 w-full h-11 rounded-xl font-bold ${
                      isPro
                        ? "bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                        : isPlus
                          ? "bg-white text-zinc-950 hover:bg-zinc-200"
                          : "bg-white/10 text-white hover:bg-white/15"
                    }`}
                  >
                    Essai 14 jours ({p.name})
                  </Button>
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-center text-xs text-zinc-500">
            Prix en euros TTC (TVA 20 % incluse). Facturation HT pour les sociétés UE avec TVA valide.
          </p>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <h2 className="text-center text-2xl font-extrabold text-white mb-8">
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
                    className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-bold text-white"
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

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#07090c] py-10">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 text-xs text-zinc-500">
          <div className="flex flex-wrap items-center gap-3">
            <VintflowLogo size="sm" />
            <span>· Logiciel de gestion &amp; outils IA pour revendeurs</span>
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
