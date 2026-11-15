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

type CloudAiStatusBarProps = {
  creditsUsed?: number;
  creditsLimit?: number;
  creditsRemaining?: number;
  cloudAllowed?: boolean;
  usagePercent?: number;
  thresholdPercent?: number;
  studioTasksBlocked?: boolean;
};

export function CloudAiStatusBar({
  creditsUsed,
  creditsLimit,
  creditsRemaining,
  cloudAllowed,
  usagePercent,
  thresholdPercent = 90,
  studioTasksBlocked,
}: CloudAiStatusBarProps) {
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
        Vérification IA…
      </div>
    );
  }

  const geminiOk =
    health?.gemini?.status === "ok" || health?.gemini?.status === "configured";
  const openaiOk = health?.openai?.status === "ok";
  const cloudUp = geminiOk || openaiOk;
  const quotaBlocked =
    studioTasksBlocked ||
    (typeof cloudAllowed === "boolean"
      ? !cloudAllowed
      : typeof creditsRemaining === "number" && creditsRemaining <= 0);

  return (
    <div
      className={`rounded-xl border px-3 py-2 flex flex-col gap-1.5 text-[11px] ${
        quotaBlocked
          ? "border-rose-500/35 bg-rose-500/10 text-rose-100"
          : cloudUp
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
            : "border-amber-500/30 bg-amber-500/10 text-amber-100"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {quotaBlocked ? (
          <CloudOff className="h-3.5 w-3.5 shrink-0" />
        ) : cloudUp ? (
          <Cloud className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <CloudOff className="h-3.5 w-3.5 shrink-0" />
        )}
        <span className="font-semibold">
          {quotaBlocked
            ? studioTasksBlocked
              ? `Seuil ${thresholdPercent} % atteint — Studio IA bloqué (${usagePercent ?? "—"} % utilisé)`
              : "Quota cloud épuisé — plus d'appels Gemini/OpenAI ce mois"
            : cloudUp
              ? `IA cloud : ${geminiOk ? "Gemini" : ""}${geminiOk && openaiOk ? " + " : ""}${openaiOk ? "OpenAI" : ""}`
              : "Mode local (0 €) — moteurs intégrés actifs"}
        </span>
      </div>
      {typeof creditsLimit === "number" && creditsLimit > 0 && (
        <p className={quotaBlocked ? "text-rose-200/90" : "text-emerald-200/90"}>
          Crédits cloud ce mois : {creditsUsed ?? "—"} / {creditsLimit} utilisés
          {typeof creditsRemaining === "number"
            ? ` · ${creditsRemaining} restant(s)`
            : ""}
          . Factures & anti-ban locaux restent gratuits.
        </p>
      )}
      {!quotaBlocked && !cloudUp && health?.gemini?.status === "quota_or_rate_limit" && (
        <span className="text-amber-200/80">
          Quota API Gemini — local utilisé automatiquement (pas de coût supplémentaire).
        </span>
      )}
    </div>
  );
}