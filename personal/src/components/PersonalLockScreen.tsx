"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VintflowLogo } from "@/components/VintflowLogo";

export function PersonalLockScreen({
  needsSetup,
}: {
  needsSetup: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("Mon Dressing");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = needsSetup ? "/api/auth/setup" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          needsSetup ? { name, email, password } : { email, password },
        ),
      });
      const out = (await res.json()) as { error?: string };
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
    <div className="min-h-screen bg-[#07080d] text-slate-100 flex items-center justify-center p-4">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.22),transparent_68%)]" />

      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#0e111a] p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <VintflowLogo />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/35 bg-violet-500/15 px-3 py-1 text-[11px] font-bold text-indigo-300">
            <Smartphone className="h-3.5 w-3.5" />
            Édition iPhone
          </span>
        </div>

        <div>
          <h1 className="text-xl font-extrabold text-white">
            {needsSetup
              ? "Configure ton accès privé (1ère fois)"
              : "Accès Privé Vintflow Perso"}
          </h1>
          <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
            {needsSetup
              ? "Crée ton identifiant et ton code d'accès personnel. Une fois configuré, seul toi pourras ouvrir ton cockpit (session mémorisée 30 jours sur ton iPhone)."
              : "Entre ton email et ton code d'accès pour ouvrir ton cockpit Pro Scale gratuit."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {needsSetup && (
            <div className="space-y-1.5">
              <Label htmlFor="perso-name" className="text-slate-300">
                Nom de ton espace
              </Label>
              <Input
                id="perso-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="perso-email" className="text-slate-300">
              Ton email personnel
            </Label>
            <Input
              id="perso-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="toi@exemple.fr"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="perso-pass" className="text-slate-300">
              {needsSetup
                ? "Choisis ton code d'accès / mot de passe"
                : "Code d'accès / mot de passe"}
            </Label>
            <Input
              id="perso-pass"
              type="password"
              autoComplete={needsSetup ? "new-password" : "current-password"}
              required
              minLength={4}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="vf-shimmer-btn w-full h-11 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-[0_0_25px_rgba(139,92,246,0.35)]"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Lock className="h-4 w-4 mr-2" />
            )}
            {needsSetup
              ? "Créer mon accès & Ouvrir Vintflow"
              : "Déverrouiller mon cockpit"}
          </Button>
        </form>

        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 border-t border-white/10 pt-4">
          <ShieldCheck className="h-4 w-4 text-indigo-400" />
          <span>Pro Scale 100 % gratuit · Session 30 jours</span>
        </div>
      </div>
    </div>
  );
}
