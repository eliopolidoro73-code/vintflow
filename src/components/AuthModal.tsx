"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Loader2,
  Lock,
} from "lucide-react";
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
import {
  comparePlans,
  PLANS,
  type BillingCycle,
  type PlanId,
} from "@/lib/plans";

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
  const [previousPlan, setPreviousPlan] = useState<PlanId | null>(null);
  const [cycle, setCycle] = useState<BillingCycle>(defaultCycle);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [withSampleData] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baselinePlan: PlanId = previousPlan ?? "essentiel";
  const comparison =
    plan !== baselinePlan ? comparePlans(baselinePlan, plan, cycle) : null;
  const activePlanObj = PLANS[plan];

  function handleSelectPlan(pid: PlanId) {
    if (pid === plan) return;
    setPreviousPlan(plan);
    setPlan(pid);
  }

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
        const checkoutOut = (await checkoutRes.json()) as {
          checkoutUrl?: string;
          error?: string;
        };
        if (checkoutRes.ok && checkoutOut.checkoutUrl) {
          onOpenChange(false);
          window.location.assign(checkoutOut.checkoutUrl);
          return;
        }
        setError(
          checkoutOut.error ??
            "Les formules Plus et Pro Scale nécessitent un paiement. Ton compte est créé sur l'essai Essentiel (14 jours).",
        );
      }
      onOpenChange(false);
      router.push("/app");
      router.refresh();
    } catch {
      setError("Impossible de joindre le serveur");
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="vf-tab-enter bg-[#0e111a] border-white/15 text-zinc-100 sm:max-w-lg max-h-[92vh] overflow-y-auto shadow-[0_25px_70px_-10px_rgba(0,0,0,0.85)]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight text-white">
            {mode === "register"
              ? "Active ton essai gratuit 14 jours"
              : "Connexion à Vintflow"}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {mode === "register"
              ? "0,00 € débité aujourd'hui. Annulation en 1 clic à tout moment."
              : "Retrouve tes ventes, ton stock SKU et ta marge commerciale."}
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
            Créer un compte (14j offerts)
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
                      onClick={() => handleSelectPlan(pid)}
                      className={`vf-click-press rounded-lg border p-2.5 text-left transition-all ${
                        plan === pid
                          ? "border-violet-500 bg-violet-500/15 shadow-[0_0_20px_rgba(139,92,246,0.25)]"
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

              {/* Live Diff Card: Ce qui change (en mieux / en moins) */}
              <div
                key={`${plan}-${baselinePlan}`}
                className="vf-tab-enter rounded-xl border border-white/10 bg-[#07080d] p-3 text-xs space-y-2"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="font-bold text-white">
                    {comparison
                      ? `Changement : ${PLANS[baselinePlan].name} → ${activePlanObj.name}`
                      : `Inclus dans ${activePlanObj.name}`}
                  </span>
                  {comparison && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        comparison.priceDiff > 0
                          ? "bg-violet-500/20 text-violet-300"
                          : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {comparison.priceDiff > 0 ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {comparison.priceDiff > 0
                        ? `+${comparison.priceDiff} €/mois`
                        : `${comparison.priceDiff} €/mois`}
                    </span>
                  )}
                </div>

                {comparison ? (
                  <div className="space-y-1.5">
                    {comparison.gains.map((g, i) => (
                      <p
                        key={`g-${i}`}
                        className="flex items-start gap-1.5 text-[11px] text-emerald-400"
                      >
                        <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>
                          <strong>En mieux :</strong> {g}
                        </span>
                      </p>
                    ))}
                    {comparison.losses.map((l, i) => (
                      <p
                        key={`l-${i}`}
                        className="flex items-start gap-1.5 text-[11px] text-amber-300"
                      >
                        <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>
                          <strong>En moins :</strong> {l}
                        </span>
                      </p>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {activePlanObj.features.slice(0, 3).map((f, i) => (
                      <p
                        key={i}
                        className="flex items-start gap-1.5 text-[11px] text-emerald-400"
                      >
                        <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </p>
                    ))}
                    {activePlanObj.lockedFeatures.map((lf, i) => (
                      <p
                        key={`lf-${i}`}
                        className="flex items-start gap-1.5 text-[11px] text-zinc-500"
                      >
                        <Lock className="h-3 w-3 shrink-0 mt-0.5" />
                        <span>{lf}</span>
                      </p>
                    ))}
                  </div>
                )}
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
                        ? "bg-violet-500/25 text-violet-300 font-medium"
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
              ? `Active ton essai gratuit 14 jours (${activePlanObj.name})`
              : "Se connecter"}
          </Button>
        </form>

        <div className="flex items-center justify-center gap-4 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-violet-400" />
            0 € aujourd&apos;hui
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-violet-400" />
            Annulable en 1 clic
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
