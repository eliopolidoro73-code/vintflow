"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { VintflowLogo } from "@/components/VintflowLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PersoLoginPage({ defaultEmail = "" }: { defaultEmail?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
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
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Connexion impossible");
        return;
      }
      router.refresh();
      router.push("/app");
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#07080d] text-zinc-100 flex flex-col items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[380px] bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.25),transparent_70%)]" />
      <div className="relative w-full max-w-md space-y-6 rounded-2xl border border-white/10 bg-[#0e111a] p-6 sm:p-8 shadow-2xl">
        <div className="space-y-4 text-center">
          <VintflowLogo />
          <span className="inline-block rounded-full border border-violet-500/40 bg-violet-500/15 px-3 py-1 text-[11px] font-bold text-violet-200">
            Édition perso · Pro Scale
          </span>
          <h1 className="text-xl font-extrabold text-white">Connexion</h1>
          <p className="text-sm text-zinc-400">
            Même lien sur mobile, tablette ou PC — ton e-mail et ton mot de passe.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-black/40 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-black/40 border-white/10"
              />
            </div>
            {error ? (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 font-bold bg-violet-600 hover:bg-violet-500"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Ouvrir mon cockpit
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}