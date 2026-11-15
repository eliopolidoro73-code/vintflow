const BANNED_VINTED_PATTERNS: RegExp[] = [
  /\bURGENT\b/i,
  /\bPROMO\b/i,
  /\bLIQUIDATION\b/i,
  /🔥|💥|‼️/,
  /stock\s*limité/i,
  /dernier\s*article/i,
  /message\s*avant\s*achat/i,
  /paypal|western union|virement\s*direct/i,
];

const SPAM_HASHTAG = /(?:^|\s)(#\w+\s*){4,}/;

function textMatchesPattern(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

const SYNONYMS: Record<string, string[]> = {
  sac: ["sac", "cabas", "besace"],
  veste: ["veste", "blouson", "parka"],
  nike: ["Nike", "swoosh"],
  bon: ["bon", "correct", "satisfaisant"],
  état: ["état", "condition", "finition"],
};

function stripHashtags(text: string, max = 3): string {
  const tags = [...text.matchAll(/#[\wÀ-ÿ]+/g)].map((m) => m[0]);
  const body = text.replace(/#[\wÀ-ÿ]+/g, "").replace(/\s+/g, " ").trim();
  const keep = tags.slice(0, max).join(" ");
  return keep ? `${body}\n\n${keep}` : body;
}

export function scoreShadowbanRisk(
  title: string,
  description: string,
): { riskLevel: "low" | "medium" | "high"; riskReasons: string[]; flags: string[] } {
  const flags: string[] = [];
  const reasons: string[] = [];
  let score = 0;

  for (const pattern of BANNED_VINTED_PATTERNS) {
    if (textMatchesPattern(title, pattern) || textMatchesPattern(description, pattern)) {
      score += 2;
      flags.push(`Motif interdit : ${pattern.source.slice(0, 24)}`);
    }
  }
  if (textMatchesPattern(description, SPAM_HASHTAG)) {
    score += 3;
    reasons.push("Trop de hashtags (spam Vinted).");
  }
  if ((description.match(/#[\wÀ-ÿ]+/g) ?? []).length > 3) {
    score += 2;
    reasons.push("Plus de 3 hashtags détectés.");
  }
  if (title === title.toUpperCase() && title.length > 8) {
    score += 2;
    reasons.push("Titre en majuscules.");
  }
  if (title.length > 75) {
    score += 1;
    reasons.push("Titre trop long (>75 car.).");
  }
  if (/(.{20,})\1/.test(description.replace(/\s/g, ""))) {
    score += 3;
    reasons.push("Répétition de texte (duplicate filter).");
  }

  const riskLevel =
    score >= 5 ? "high" : score >= 2 ? "medium" : "low";
  if (riskLevel === "high") {
    reasons.push("Republication risquée sans modifier photo + titre + description.");
  } else if (riskLevel === "medium") {
    reasons.push("Variante texte recommandée avant re-upload.");
  }

  return { riskLevel, riskReasons: [...new Set([...reasons, ...flags])], flags };
}

function applySynonymVariation(text: string): string {
  let out = text;
  for (const [word, alts] of Object.entries(SYNONYMS)) {
    const re = new RegExp(`\\b${word}\\b`, "gi");
    if (re.test(out)) {
      const pick = alts[Math.floor(Math.random() * alts.length)];
      out = out.replace(re, pick);
    }
  }
  return out;
}

function shuffleTitleWords(title: string): string {
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length < 3) return title;
  const brand = words[0];
  const rest = words.slice(1);
  return `${rest.join(" ")} · ${brand}`.slice(0, 72);
}

function titleVariants(title: string): string[] {
  const base = title.replace(/[🔥💥‼️]/g, "").trim().slice(0, 72);
  const v1 = shuffleTitleWords(base);
  const v2 = base.includes("·")
    ? base.replace("·", "—")
    : `${base} — seconde main`.slice(0, 72);
  const v3 = base
    .replace(/\b(Très bon état|Bon état)\b/gi, (m) =>
      m.toLowerCase().includes("très") ? "Excellent état" : "Très bon porté",
    )
    .slice(0, 72);
  return [...new Set([v1, v2, v3].filter((t) => t.length >= 8))].slice(0, 3);
}

export function localAntiShadowbanRewrite(
  title: string,
  description: string,
  opts?: { isRepost?: boolean; category?: string },
) {
  let cleanTitle = title
    .replace(/[🔥💥‼️]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 72);
  let cleanDesc = description.replace(SPAM_HASHTAG, " ");
  for (const pattern of BANNED_VINTED_PATTERNS) {
    cleanDesc = cleanDesc.replace(pattern, "");
    cleanTitle = cleanTitle.replace(pattern, "");
  }
  cleanDesc = stripHashtags(cleanDesc, 3);
  cleanDesc = applySynonymVariation(cleanDesc);

  const variants = titleVariants(cleanTitle || title);
  const reorderedTitle = applySynonymVariation(variants[0] ?? cleanTitle);

  const refreshedDescription = `${reorderedTitle}

Article contrôlé avant envoi (seconde main, vendeur particulier).
${cleanDesc ? `Détails : ${cleanDesc.slice(0, 600)}\n` : ""}
Envoi sous 24–48h · emballage soigné · non-fumeur.
Questions bienvenues en message privé (sans spam).

${opts?.category ? `Catégorie : ${opts.category}\n` : ""}${opts?.isRepost ? "Republication avec texte et visuels mis à jour.\n" : ""}#seconde_main #${(opts?.category ?? "mode").toLowerCase().replace(/\s+/g, "")}`.slice(
    0,
    1200,
  );

  const scored = scoreShadowbanRisk(title, description);

  const avoidWords = [
    "URGENT",
    "PROMO",
    "dernier",
    "stock limité",
    "PayPal",
    "virement",
    "message avant achat",
  ];

  return {
    reorderedTitle,
    titleAlternatives: variants,
    refreshedDescription,
    ...scored,
    avoidWords,
    waitMinutesBeforeRepost: scored.riskLevel === "high" ? 8 : 4,
    safeToPostNow: scored.riskLevel === "low",
    checklist: [
      "Modifier photo (fond, luminosité, marge 6–10 %) via Studio anti-ban.",
      "Utiliser un des titres alternatifs proposés (jamais le titre d'origine).",
      "Garder max 3 hashtags en bas.",
      `Attendre ${scored.riskLevel === "high" ? 8 : 4} min avant la prochaine publication.`,
      "Ne pas republier plus de 5 annonces d'affilée en <15 min.",
      "Supprimer liens, paiements hors plateforme, majuscules.",
    ],
    photoFingerprintTips: [
      "Exporter depuis Vintflow (PNG) — pas la photo d'origine.",
      "Changer fond studio (lin ou gris).",
      "Décaler légèrement le cadrage (+5 % marge).",
    ],
    bestSlots: [
      {
        day: "Dimanche",
        window: "18h30 – 21h00",
        score: "+42 %",
        reason: "Pic scroll post-republication",
      },
      {
        day: "Mercredi",
        window: "19h00 – 21h00",
        score: "+28 %",
        reason: "Milieu de semaine",
      },
      {
        day: "Vendredi",
        window: "18h00 – 20h30",
        score: "+31 %",
        reason: "Pré-week-end",
      },
    ],
  };
}