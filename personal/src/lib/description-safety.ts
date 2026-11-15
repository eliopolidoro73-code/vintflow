import {
  scoreShadowbanRisk,
  localAntiShadowbanRewrite,
} from "@/lib/antishadowban-engine";

export type DescriptionSafetyResult = {
  descriptionRisk: "low" | "medium" | "high";
  duplicateScore: number;
  spamFlags: string[];
  refreshedDescription: string;
  reorderedTitle: string;
  titleAlternatives: string[];
  checklist: string[];
  summary: string;
  safeToPostDescription: boolean;
};

function duplicateNgramScore(text: string): number {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (normalized.length < 40) return 0;
  const words = normalized.split(" ");
  const seen = new Map<string, number>();
  let dup = 0;
  for (let i = 0; i < words.length - 2; i++) {
    const tri = words.slice(i, i + 3).join(" ");
    const c = (seen.get(tri) ?? 0) + 1;
    seen.set(tri, c);
    if (c > 1) dup += 1;
  }
  return Math.min(10, dup);
}

export function localDescriptionSafety(
  title: string,
  description: string,
  opts?: { isRepost?: boolean; category?: string },
): DescriptionSafetyResult {
  const rewrite = localAntiShadowbanRewrite(title, description, opts);
  const scored = scoreShadowbanRisk(title, description);
  const dup = duplicateNgramScore(description);
  const spamFlags = [...scored.riskReasons, ...scored.flags];

  let descriptionRisk = scored.riskLevel;
  if (dup >= 4 && descriptionRisk !== "high") descriptionRisk = "medium";
  if (dup >= 7) descriptionRisk = "high";

  const duplicateScore = Math.min(100, scored.riskReasons.length * 12 + dup * 8);

  return {
    descriptionRisk,
    duplicateScore,
    spamFlags,
    refreshedDescription: rewrite.refreshedDescription,
    reorderedTitle: rewrite.reorderedTitle,
    titleAlternatives: rewrite.titleAlternatives,
    checklist: [
      "Réécrire la description (ne jamais republier le même texte mot pour mot).",
      "Max 3 hashtags en bas, jamais de listes de marques hors sujet.",
      "Évite majuscules, URGENT, PayPal et liens externes.",
      "Varie le 1er paragraphe (accroche différente du titre).",
      ...rewrite.checklist.slice(0, 4),
    ],
    summary:
      descriptionRisk === "high"
        ? "Description à risque élevé — réécris entièrement avant republication."
        : descriptionRisk === "medium"
          ? "Quelques signaux spam — utilise la version IA ci-dessous."
          : "Description propre — variante IA pour sécuriser la republication.",
    safeToPostDescription: descriptionRisk === "low" && dup < 2,
  };
}