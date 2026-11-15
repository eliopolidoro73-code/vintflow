"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudOff, Loader2 } from "lucide-react";

type AiHealth = {
  ok?: boolean;
  cloudAiEnabled?: boolean;
  gemini?: { status?: string; detail?: string };
  openai?: { status?: string };
  unifiedEngine?: { status?: string };
};

export function CloudAiStatusBar() {
  const [health, setHealth] = useState<AiHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/health/ai", { cache: "no-store" });
        const data = (await res.json()) as AiHealth;
        if (!cancelled) setHealth(data);
      } catch {
        if (!cancelled) setHealth(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-zinc-500 py-1">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Vérification IA cloud…
      </div>
    );
  }

  const geminiOk =
    health?.gemini?.status === "ok" || health?.gemini?.status === "configured";
  const openaiOk = health?.openai?.status === "ok";
  const cloudUp = geminiOk || openaiOk;

  return (
    <div
      className={`rounded-xl border px-3 py-2 flex flex-wrap items-center gap-2 text-[11px] ${
        cloudUp
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          : "border-amber-500/30 bg-amber-500/10 text-amber-100"
      }`}
    >
      {cloudUp ? (
        <Cloud className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <CloudOff className="h-3.5 w-3.5 shrink-0" />
      )}
      <span className="font-semibold">
        {cloudUp
          ? `IA cloud : ${geminiOk ? "Gemini" : ""}${geminiOk && openaiOk ? " + " : ""}${openaiOk ? "OpenAI" : ""}`
          : "Mode local actif — moteurs anti-ban & factures intégrés"}
      </span>
      {!cloudUp && health?.gemini?.status === "quota_or_rate_limit" && (
        <span className="text-amber-200/80">
          (Gemini quota — ajoute OPENAI_API_KEY sur Vercel ou attends le reset)
        </span>
      )}
    </div>
  );
}