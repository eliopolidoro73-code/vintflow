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
      <DialogContent className="bg-white border-slate-200 text-slate-900 sm:max-w-md shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">
            {mode === "register"
              ? "Essai gratuit 14 jours"
              : "Connexion à Vintflow"}
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            {mode === "register"
              ? "Sans engagement. Accès immédiat à ton cockpit Vinted, Leboncoin & TikTok."
              : "Retrouve tes ventes, ton stock SKU et tes marges en temps réel."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`rounded-lg py-2 transition ${
              mode === "register"
                ? "bg-white text-slate-900 font-semibold shadow-xs"
                : "text-slate-500 hover:text-slate-900"
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
            className={`rounded-lg py-2 transition ${
              mode === "login"
                ? "bg-white text-slate-900 font-semibold shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            J&apos;ai déjà un compte
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPlan("starter")}
                  className={`rounded-xl border p-3 text-left transition ${
                    plan === "starter"
                      ? "border-teal-600 bg-teal-50/70"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Starter</span>
                    <span className="text-xs font-bold text-teal-700">
                      {cycle === "annual" ? "24 €/m" : "29 €/m"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    3 comptes Vinted + LBC
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setPlan("pro")}
                  className={`rounded-xl border p-3 text-left transition ${
                    plan === "pro"
                      ? "border-teal-600 bg-teal-50/70"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Pro</span>
                    <span className="text-xs font-bold text-teal-700">
                      {cycle === "annual" ? "41 €/m" : "49 €/m"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    10 comptes + Comptable
                  </p>
                </button>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                <span className="text-slate-600 font-medium">Facturation</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setCycle("monthly")}
                    className={`rounded-md px-2.5 py-1 ${
                      cycle === "monthly"
                        ? "bg-white text-slate-900 font-semibold shadow-xs"
                        : "text-slate-500"
                    }`}
                  >
                    Mensuel
                  </button>
                  <button
                    type="button"
                    onClick={() => setCycle("annual")}
                    className={`rounded-md px-2.5 py-1 ${
                      cycle === "annual"
                        ? "bg-teal-600 text-white font-semibold"
                        : "text-slate-500"
                    }`}
                  >
                    Annuel (-2 mois)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="auth-name" className="text-xs text-slate-700">
                  Prénom ou nom du dressing
                </Label>
                <Input
                  id="auth-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Charles"
                  className="bg-white border-slate-200 text-slate-900"
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="auth-email" className="text-xs text-slate-700">
              Email
            </Label>
            <Input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="charles@exemple.fr"
              className="bg-white border-slate-200 text-slate-900"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="auth-password" className="text-xs text-slate-700">
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
              className="bg-white border-slate-200 text-slate-900"
            />
          </div>

          {mode === "register" && (
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={withSampleData}
                onChange={(e) => setWithSampleData(e.target.checked)}
                className="rounded border-slate-300 accent-teal-600"
              />
              Pré-remplir avec des articles &amp; ventes d&apos;exemple
            </label>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 text-white hover:bg-teal-700 font-semibold h-10"
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
            <span className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase">
            <span className="bg-white px-2 text-slate-400">ou</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={demoLoading}
          onClick={handleDemo}
          className="w-full border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100"
        >
          {demoLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2 text-teal-600" />
          )}
          Tester le back-office en 1 clic (Démo)
        </Button>

        <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
            Sans engagement
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
            14 jours offerts
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
