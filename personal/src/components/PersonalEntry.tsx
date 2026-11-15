"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VintflowLogo } from "@/components/VintflowLogo";

export function PersonalEntry() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
          mode === "register" ? { name, email, password } : { email, password },
        ),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Erreur");
        setLoading(false);
        return;
      }
      router.push("/app");
      router.refresh();
    } catch {
      setError("Impossible de joindre le serveur.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#07080d] text-zinc-100 flex flex-col items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[380px] bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.25),transparent_70%)]" />
      <div className="relative w-full max-w-md space-y-6 rounded-2xl border border-white/10 bg-[#0e111a] p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col items-center gap-3 text-center">
          <VintflowLogo />
          <span className="rounded-full border border-violet-500/40 bg-violet-500/15 px-3 py-1 text-[11px] font-bold text-violet-200">
            Édition perso · Pro Scale · sans abonnement
          </span>
          <h1 className="text-xl font-extrabold text-white">
            Connexion email et mot de passe
          </h1>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Plus besoin de Cursor. Crée ton compte ou connecte-toi comme sur un site
            classique.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-lg bg-white/5 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`rounded-md py-2 transition ${mode === "login" ? "bg-violet-600 text-white" : "text-zinc-400"}`}
          >
            Connexion
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`rounded-md py-2 transition ${mode === "register" ? "bg-violet-600 text-white" : "text-zinc-400"}`}
          >
            Créer un compte
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-zinc-300">
                Prénom ou pseudo
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-white/15 bg-white/5"
                required
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-zinc-300">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-white/15 bg-white/5"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-zinc-300">
              Mot de passe
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-white/15 bg-white/5"
              minLength={6}
              required
            />
          </div>
          {error && (
            <p className="text-xs text-red-300 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-gradient-to-r from-violet-600 to-indigo-600 font-bold text-white"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === "register" ? (
              "Créer mon espace Pro"
            ) : (
              "Se connecter"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}