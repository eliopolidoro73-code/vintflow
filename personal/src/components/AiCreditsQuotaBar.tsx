"use client";

/** Jauge crédits cloud + repère seuil (ex. 90 %). */
export function AiCreditsQuotaBar({
  used,
  limit,
  thresholdPercent = 90,
  usagePercent,
}: {
  used: number;
  limit: number;
  thresholdPercent?: number;
  usagePercent?: number;
}) {
  if (limit <= 0) return null;
  const pct = usagePercent ?? Math.min(100, Math.round((used / limit) * 100));
  const warnPct = thresholdPercent;
  const barColor =
    pct >= warnPct
      ? "bg-rose-500"
      : pct >= warnPct - 15
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <div className="w-full min-w-[200px] max-w-md space-y-1">
      <div className="relative h-2 rounded-full bg-black/25 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/70"
          style={{ left: `${warnPct}%` }}
          title={`Blocage à ${warnPct} %`}
        />
      </div>
      <p className="text-[10px] opacity-90 tabular-nums">
        {used} / {limit} crédits cloud ({pct} %) · seuil {warnPct} %
      </p>
    </div>
  );
}