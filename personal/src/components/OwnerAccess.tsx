"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Camera,
  Check,
  FileText,
  Layers,
  Loader2,
  Lock,
  Repeat2,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VintflowLogo } from "@/components/VintflowLogo";

const FEATURES = [
  {
    icon: TrendingUp,
    title: "Marge commerciale en temps réel",
    text: "Chiffre d'affaire, coût de revient et frais par plateforme.",
  },
  {
    icon: Layers,
    title: "Stock SKU, lots & ballots",
    text: "Articles dormants, ROI des lots et dépenses d'activité.",
  },
  {
    icon: Repeat2,
    title: "Crosslisting Vinted, Leboncoin, TikTok, eBay",
    text: "Annonce prête à copier et lien direct vers chaque formulaire.",
  },
  {
    icon: Camera,
    title: "Studio photo & annonces IA",
    text: "Détourage, formats par plateforme, titres SEO, script TikTok.",
  },
  {
    icon: FileText,
    title: "Étiquettes 10×15 & factures PDF",
    text: "Bordereaux thermiques et factures conformes en un clic.",
  },
  {
    icon: Bot,
    title: "Nova, ton assistant IA",
    text: "Pose une question sur tes chiffres, Nova agit sur ton stock.",
  },
];

export function OwnerAccess({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const out = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(out.error ?? "Erreur de connexion");
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Impossible de joindre le serveur");
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-[#07080d] text-zinc-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.22),transparent_68%)]" />

      <header className="relative border-b border-white/[0.06]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <VintflowLogo />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/35 bg-violet-500/15 px-3 py-1 text-[11px] font-bold text-violet-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Pro Scale · tout débloqué
          </span>
        </div>
      </header>

      <main className="relative mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:py-16">
        <section className="vf-fade-up space-y-6 order-2 lg:order-1">
          <div className="space-y-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Ton cockpit de revente{" "}
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                complet et sans limite
              </span>
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-zinc-400">
              Toutes les fonctionnalités de Vintflow, sans abonnement. Ouvre-le
              depuis n&apos;importe quel navigateur, sur ordinateur, tablette ou
              téléphone : tes données te suivent partout.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="vf-card-interactive rounded-2xl border border-white/[0.08] bg-[#0e111a] p-4"
              >
                <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="vf-fade-up order-1 lg:order-2">
          <div className="w-full rounded-3xl border border-white/10 bg-[#0e111a] p-6 shadow-[0_25px_70px_-10px_rgba(0,0,0,0.85)] sm:p-8 space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-white">
                Connexion à ton espace
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                {configured
                  ? "Entre ton mot de passe pour ouvrir ton cockpit."
                  : "Le mot de passe du site n'est pas encore configuré. Ajoute le secret PERSO_PASSWORD (8 caractères minimum) à l'app dans Cursor, puis recharge cette page."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="owner-pass" className="text-zinc-300">
                  Mot de passe
                </Label>
                <Input
                  id="owner-pass"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 bg-white/5 border-white/10 text-white"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"
                >
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !configured}
                className="vf-shimmer-btn h-11 w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 font-bold text-white shadow-[0_0_25px_rgba(139,92,246,0.35)]"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="mr-2 h-4 w-4" />
                )}
                Se connecter
              </Button>
            </form>

            <ul className="space-y-1.5 border-t border-white/10 pt-4 text-[11px] text-zinc-400">
              {[
                "Toutes les fonctionnalités Pro Scale, gratuites",
                "Session mémorisée 30 jours sur chaque appareil",
                "Fonctionne sur Chrome, Safari, Firefox et Edge",
              ].map((line) => (
                <li key={line} className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-violet-400" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
