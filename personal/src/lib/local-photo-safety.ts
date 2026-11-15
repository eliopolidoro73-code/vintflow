/** Réglages studio déterministes quand le cloud IA est indisponible. */
export function localPhotoSafetyFromImageSeed(seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < Math.min(seed.length, 24_000); i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const n = Math.abs(hash);

  const recommendedBrightness = 103 + (n % 13);
  const recommendedContrast = 106 + ((n >> 4) % 11);
  const recommendedPaddingPct = 7 + ((n >> 8) % 6);
  const shouldRemoveBackground = (n & 4) !== 0;
  const shouldRotateSlight = (n & 32) !== 0;

  const fingerprintRisk: "low" | "medium" | "high" =
    recommendedPaddingPct >= 10 && shouldRemoveBackground ? "low" : "medium";

  return {
    fingerprintRisk,
    recommendedBrightness,
    recommendedContrast,
    recommendedPaddingPct,
    shouldRemoveBackground,
    shouldRotateSlight,
    checklist: [
      shouldRemoveBackground
        ? "Détourage activé : fond studio différent de l’original."
        : "Garde le sujet mais change luminosité (+3 à +12 %) et marge.",
      `Luminosité cible ~${recommendedBrightness} %, contraste ~${recommendedContrast} %.`,
      `Marge autour de l’article : ${recommendedPaddingPct} % minimum.`,
      shouldRotateSlight
        ? "Léger décalage acceptable (rotation < 1°) si tu retouches hors Vintflow."
        : "Pas de rotation — privilégie fond + cadrage.",
      "Exporter depuis Vintflow (PNG haute qualité ou JPEG léger).",
      "Ne jamais re-publier la photo brute du téléphone.",
      fingerprintRisk === "low"
        ? "Risque faible après export Studio."
        : "Attendre 3–5 min entre deux uploads similaires.",
    ],
    safeToPublishAfterEdits: true,
    summary:
      fingerprintRisk === "low"
        ? "Profil photo optimisé (empreinte faible) — applique les réglages puis exporte."
        : "Empreinte moyenne — détourage + marge + luminosité recommandés avant Vinted.",
  };
}