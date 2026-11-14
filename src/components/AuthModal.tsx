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
import type { BillingCycle, PlanId } from "@/lib/plans";

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
  defaultPlan = "starter",
  defaultCycle = "monthly",
}: AuthModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"register" | "login">(defaultMode);
  const [plan, setPlan] = useState<PlanId>(defaultPlan);
  const [cycle, setCycle] = useState<BillingCycle>(defaultCycle);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        body: JSON.stringify({ plan }),
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
      <DialogContent className="bg-[#10141c] border-white/10 text-zinc-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">
            {mode === "register"
              ? "Démarre ton essai gratuit 14 jours"
              : "Connexion à VintFlow"}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {mode === "register"
              ? "Sans engagement. Accès immédiat à tout le back-office Vinted & Leboncoin."
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
            className={`rounded-md py-2 transition ${
              mode === "register"
                ? "bg-emerald-500 text-emerald-950 font-semibold"
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
            className={`rounded-md py-2 transition ${
              mode === "login"
                ? "bg-emerald-500 text-emerald-950 font-semibold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            J&apos;ai déjà un compte
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPlan("starter")}
                  className={`rounded-lg border p-2.5 text-left transition ${
                    plan === "starter"
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Starter</span>
                    <span className="text-xs font-semibold text-emerald-400">
                      {cycle === "annual" ? "24 €/m" : "29 €/m"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    3 comptes Vinted + LBC
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setPlan("pro")}
                  className={`rounded-lg border p-2.5 text-left transition ${
                    plan === "pro"
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Pro</span>
                    <span className="text-xs font-semibold text-emerald-400">
                      {cycle === "annual" ? "41 €/m" : "49 €/m"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    10 comptes + Comptable
                  </p>
                </button>
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
                  placeholder="Ex: Charles"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="auth-email" className="text-xs text-zinc-300">
              Email professionnel ou personnel
            </Label>
            <Input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="charles@exemple.fr"
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
            <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={withSampleData}
                onChange={(e) => setWithSampleData(e.target.checked)}
                className="rounded border-white/20 bg-white/5 accent-emerald-500"
              />
              Pré-remplir avec des articles & ventes d&apos;exemple pour tester vite
            </label>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 text-emerald-950 hover:bg-emerald-400 font-semibold h-10"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Lock className="h-4 w-4 mr-2" />
            )}
            {mode === "register"
              ? "Lancer mon essai gratuit (14 jours)"
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
            <Sparkles className="h-4 w-4 mr-2 text-emerald-400" />
          )}
          Accès instantané au Bac à sable Démo (1 clic)
        </Button>

        <div className="flex items-center justify-center gap-4 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Sans engagement
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Essai 14j offert
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
