"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Lock, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PLANS, type BillingCycle, type PlanId } from "@/lib/plans";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode?: "register" | "login";
  defaultPlan?: PlanId;
  defaultCycle?: BillingCycle;
}

export function AuthModal({
  open,
  onOpenChange,
  defaultMode = "register",
  defaultPlan = "plus",
  defaultCycle = "monthly",
}: AuthModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"register" | "login">(defaultMode);
  const [plan, setPlan] = useState<PlanId>(defaultPlan);
  const [cycle, setCycle] = useState<BillingCycle>(defaultCycle);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [withSampleData, setWithSampleData] = useState(true);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint =
        mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          mode === "register"
            ? {
                name,
                email,
                password,
                plan,
                billing_cycle: cycle,
                referral_code: referralCode || undefined,
                withSampleData,
              }
            : { email, password },
        ),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Une erreur est survenue");
        setLoading(false);
        return;
      }
      if (mode === "register" && (plan === "plus" || plan === "pro")) {
        const checkoutRes = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ plan, billing_cycle: cycle }),
        });
        if (checkoutRes.ok) {
          const out = (await checkoutRes.json()) as { checkoutUrl?: string };
          if (out.checkoutUrl) {
            onOpenChange(false);
            window.location.assign(out.checkoutUrl);
            return;
          }
        }
      }
      onOpenChange(false);
      router.push("/app");
      router.refresh();
    } catch {
      setError("Impossible de joindre le serveur");
      setLoading(false);
    }
  }

  async function handleDemo() {
    setError(null);
    setDemoLoading(true);
    try {
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: "pro" }),
      });
      if (!res.ok) {
        setError("Erreur lors du lancement de la démo");
        setDemoLoading(false);
        return;
      }
      onOpenChange(false);
      router.push("/app");
      router.refresh();
    } catch {
      setError("Impossible de lancer la démo");
      setDemoLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="vf-tab-enter bg-[#0e111a] border-white/15 text-zinc-100 sm:max-w-md shadow-[0_25px_70px_-10px_rgba(0,0,0,0.85)]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight text-white">
            {mode === "register"
              ? "Active ton essai gratuit 14 jours"
              : "Connexion à Vintflow"}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {mode === "register"
              ? "Accès immédiat à ton cockpit. Annulation en 1 clic à tout moment."
              : "Retrouve tes ventes, ton stock SKU et tes marges en temps réel."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-1 rounded-lg bg-white/5 p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`vf-click-press rounded-md py-2 transition-all ${
              mode === "register"
                ? "bg-violet-600 text-white font-semibold shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Créer un compte
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`vf-click-press rounded-md py-2 transition-all ${
              mode === "login"
                ? "bg-violet-600 text-white font-semibold shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            J&apos;ai déjà un compte
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <>
              <div className="grid grid-cols-3 gap-2">
                {(["essentiel", "plus", "pro"] as PlanId[]).map((pid) => {
                  const p = PLANS[pid];
                  const price =
                    cycle === "annual" ? p.annualMonthlyPrice : p.monthlyPrice;
                  return (
                    <button
                      key={pid}
                      type="button"
                      onClick={() => setPlan(pid)}
                      className={`vf-click-press rounded-lg border p-2.5 text-left transition-all ${
                        plan === pid
                          ? "border-violet-500 bg-violet-500/15 shadow-[0_0_20px_rgba(139,92,246,0.2)]"
                          : "border-white/10 bg-white/[0.02] hover:border-white/25"
                      }`}
                    >
                      <p className="text-[11px] font-bold text-white truncate">
                        {p.name}
                      </p>
                      <p className="mt-0.5 text-xs font-extrabold text-violet-400">
                        {price} €/m
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs">
                <span className="text-zinc-300">Facturation</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setCycle("monthly")}
                    className={`rounded px-2 py-1 ${
                      cycle === "monthly"
                        ? "bg-white/15 text-white font-medium"
                        : "text-zinc-400"
                    }`}
                  >
                    Mensuel
                  </button>
                  <button
                    type="button"
                    onClick={() => setCycle("annual")}
                    className={`rounded px-2 py-1 ${
                      cycle === "annual"
                        ? "bg-emerald-500/20 text-emerald-300 font-medium"
                        : "text-zinc-400"
                    }`}
                  >
                    Annuel (-2 mois)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="auth-name" className="text-xs text-zinc-300">
                  Prénom ou nom du dressing
                </Label>
                <Input
                  id="auth-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Atelier Fripe"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="auth-email" className="text-xs text-zinc-300">
              Email
            </Label>
            <Input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@exemple.fr"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="auth-password" className="text-xs text-zinc-300">
              Mot de passe (min. 6 caractères)
            </Label>
            <Input
              id="auth-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          {mode === "register" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="auth-ref" className="text-xs text-zinc-400">
                  Code parrain / créateur (optionnel)
                </Label>
                <Input
                  id="auth-ref"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="Ex: VF-8A2C1B"
                  className="bg-white/5 border-white/10 text-white font-mono text-xs"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={withSampleData}
                  onChange={(e) => setWithSampleData(e.target.checked)}
                  className="rounded border-white/20 bg-white/5 accent-emerald-500"
                />
                Pré-remplir avec des articles &amp; ventes d&apos;exemple
              </label>
            </>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="vf-shimmer-btn w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 font-bold h-11 shadow-[0_0_25px_rgba(139,92,246,0.35)]"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Lock className="h-4 w-4 mr-2" />
            )}
            {mode === "register"
              ? "Démarrer l'essai gratuit (14 jours)"
              : "Se connecter"}
          </Button>
        </form>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase">
            <span className="bg-[#10141c] px-2 text-zinc-500">ou</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={demoLoading}
          onClick={handleDemo}
          className="w-full border-white/15 bg-white/5 text-zinc-100 hover:bg-white/10"
        >
          {demoLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2 text-violet-400" />
          )}
          Tester le back-office en 1 clic (Démo)
        </Button>

        <div className="flex items-center justify-center gap-4 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-violet-400" />
            Sans engagement
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-violet-400" />
            Essai 14 jours offert
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
