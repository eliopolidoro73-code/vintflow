"use client";

import { Loader2 } from "lucide-react";

export function StudioPanelSkeleton() {
  return (
    <div
      className="vf-panel rounded-2xl border border-white/10 bg-[#0e111a] p-8 flex flex-col items-center justify-center gap-3 min-h-[280px]"
      aria-busy
      aria-label="Chargement du studio"
    >
      <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      <p className="text-xs text-zinc-400">Chargement du studio IA…</p>
    </div>
  );
}