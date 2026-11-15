import { NextResponse } from "next/server";

export const maxDuration = 60;
import { assertSameOrigin, requireAuthenticatedUser } from "@/lib/auth";
import { callCloudAi, isPersoCloudAiEnabled } from "@/lib/ai";
import { sql } from "@/lib/db";
import { computeNetMargin, generateListingCopy } from "@/lib/format";
import { getEffectivePlan } from "@/lib/perso-plan";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  ANTISHADOWBAN_JSON_SYSTEM,
  defaultVintedSlots,
  LISTING_JSON_SYSTEM,
  PHOTO_SAFETY_JSON_SYSTEM,
  VISION_JSON_SYSTEM,
  VISIBILITY_JSON_SYSTEM,
} from "@/lib/vinted-ai-prompts";

function parseAiJson<T extends Record<string, unknown>>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function cloudEngineTag(provider?: "gemini" | "openai") {
  if (provider === "gemini") return "gemini_cloud";
  if (provider === "openai") return "openai_cloud";
  return "local_smart";
}

const BRAND_CATALOG = [
  { key: "carhartt", brand: "Carhartt", cat: "Vestes & Manteaux", avgPrice: 85 },
  { key: "ralph", brand: "Ralph Lauren", cat: "Pulls & Sweats", avgPrice: 52 },
  { key: "nike", brand: "Nike", cat: "Sneakers & Sport", avgPrice: 65 },
  { key: "adidas", brand: "Adidas", cat: "Chaussures & Streetwear", avgPrice: 58 },
  { key: "north face", brand: "The North Face", cat: "Vestes & Manteaux", avgPrice: 135 },
  { key: "tnf", brand: "The North Face", cat: "Vestes & Manteaux", avgPrice: 135 },
  { key: "levis", brand: "Levi's", cat: "Pantalons", avgPrice: 44 },
  { key: "levi's", brand: "Levi's", cat: "Pantalons", avgPrice: 44 },
  { key: "lacoste", brand: "Lacoste", cat: "Polos & Chemises", avgPrice: 48 },
  { key: "arcteryx", brand: "Arc'teryx", cat: "Vestes Techniques", avgPrice: 210 },
  { key: "stone island", brand: "Stone Island", cat: "Streetwear Luxe", avgPrice: 195 },
  { key: "stussy", brand: "Stüssy", cat: "Streetwear", avgPrice: 75 },
];

async function buildListingPayload(
  input: {
    title: string;
    brand: string;
    category: string;
    size: string;
    condition: string;
    defects: string;
    purchasePrice: number;
    targetPrice: number;
  },
  allowCloudAi: boolean,
) {
  const { title, brand, category, size, condition, defects, purchasePrice, targetPrice } =
    input;

  const baseCopy = generateListingCopy({
    title,
    brand,
    category,
    size,
    condition,
    listingPrice: targetPrice,
  });

  const defectLine = defects
    ? `\nÉtat transparent : ${defects} (visible sur les dernières photos).\n`
    : "\nAucun défaut constaté (ni trou, ni tâche).\n";

  let vintedFull = `${baseCopy.seoTitle}
${defectLine}
Mesures à plat (cm) :
• Largeur aisselle à aisselle : __ cm
• Longueur totale : __ cm

${baseCopy.vinted}`;

  let leboncoinFull = `${baseCopy.leboncoin}
${defects ? `\nÀ noter : ${defects}.` : ""}
Disponible tant que l'annonce est en ligne.`;

  let tiktokScript = `[0–3s HOOK] "Regarde cette ${title} (${brand || "pépite seconde main"}) que je viens de sourcer — et voici son état réel."
[3–10s PREUVE] "Taille ${size}, ${condition.toLowerCase()}${defects ? ` (${defects})` : ", zéro défaut"}. Je montre les coutures et l'étiquette de près."
[10–15s CTA] "Dispo maintenant à ${targetPrice} € dans ma boutique TikTok Shop / lien Vinted en bio. Envoi en 24h !"`;

  let engine = "local_listing";
  let publishAdvice = defaultVintedSlots().headline;
  let publishNow = defaultVintedSlots().publishNow;
  let publishSlots = defaultVintedSlots().bestSlots.slice(0, 3);
  let avoidWords: string[] = [];
  let hashtags: string[] = [];
  let antiBanTitle = baseCopy.seoTitle;

  if (allowCloudAi) {
    const aiOut = await callCloudAi({
      systemPrompt: LISTING_JSON_SYSTEM,
      userPrompt: `Article: ${title}, Marque: ${brand}, Catégorie: ${category}, Taille: ${size}, État: ${condition}, Défauts: ${defects || "Aucun"}, Prix achat: ${purchasePrice} €, Prix vente: ${targetPrice} €.`,
      jsonMode: true,
      maxTokens: 2400,
      power: true,
    });
    if (aiOut) {
      const parsed = parseAiJson<Record<string, unknown>>(aiOut.text);
      if (parsed) {
        engine = cloudEngineTag(aiOut.provider);
        if (parsed.seoTitle) antiBanTitle = String(parsed.seoTitle).slice(0, 80);
        if (parsed.vinted) vintedFull = String(parsed.vinted);
        if (parsed.leboncoin) leboncoinFull = String(parsed.leboncoin);
        if (parsed.tiktokScript) tiktokScript = String(parsed.tiktokScript);
        if (parsed.publishAdvice) publishAdvice = String(parsed.publishAdvice);
        if (typeof parsed.publishNow === "boolean") publishNow = parsed.publishNow;
        if (Array.isArray(parsed.publishSlots))
          publishSlots = parsed.publishSlots.slice(0, 5) as typeof publishSlots;
        if (Array.isArray(parsed.avoidWords))
          avoidWords = parsed.avoidWords.slice(0, 12) as string[];
        if (Array.isArray(parsed.hashtags))
          hashtags = parsed.hashtags.slice(0, 3) as string[];
      }
    }
  }

  const fastPrice = Math.max(5, Math.round(targetPrice * 0.85));
  const idealPrice = Math.round(targetPrice);
  const premiumPrice = Math.round(targetPrice * 1.18);

  const pricingTiers = [
    {
      label: "Vente rapide",
      price: fastPrice,
      ...computeNetMargin({
        grossAmount: fastPrice,
        purchaseCost: purchasePrice,
        platformFees: 0,
        boostCost: 0,
        shippingCost: 0,
      }),
    },
    {
      label: "Prix idéal",
      price: idealPrice,
      ...computeNetMargin({
        grossAmount: idealPrice,
        purchaseCost: purchasePrice,
        platformFees: 0,
        boostCost: 0,
        shippingCost: 0,
      }),
    },
    {
      label: "Premium",
      price: premiumPrice,
      ...computeNetMargin({
        grossAmount: premiumPrice,
        purchaseCost: purchasePrice,
        platformFees: 0,
        boostCost: 0,
        shippingCost: 0,
      }),
    },
  ];

  return {
    engine,
    cloudAiActive: isPersoCloudAiEnabled(),
    seoTitle: antiBanTitle,
    vinted: vintedFull,
    leboncoin: leboncoinFull,
    tiktokScript,
    pricingTiers,
    publishAdvice,
    publishNow,
    publishSlots,
    avoidWords,
    hashtags,
  };
}

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await requireAuthenticatedUser();
  if ("response" in auth) return auth.response;

  const rl = await checkRateLimit({
    scope: "ai_tools",
    key: auth.user.id,
    limit: 40,
    windowSeconds: 600,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trop de requêtes IA en peu de temps. Patiente quelques minutes." },
      { status: 429 },
    );
  }

  const plan = getEffectivePlan(auth.user);
  const monthlyCap =
    plan.aiCreditsMonthlyLimit === -1 ? 2_000_000 : plan.aiCreditsMonthlyLimit;

  if (monthlyCap === 0) {
    return NextResponse.json(
      { error: "Outils IA non disponibles sur ce forfait." },
      { status: 403 },
    );
  }
  const reserved = await sql<{ ai_credits_used: number }>(
    `update users
     set ai_credits_used = ai_credits_used + 1
     where id = $1 and ai_credits_used < $2
     returning ai_credits_used`,
    [auth.user.id, monthlyCap],
  );
  if (reserved.length === 0) {
    return NextResponse.json(
      {
        error: `Quota de ${monthlyCap} crédits IA/mois atteint.`,
      },
      { status: 403 },
    );
  }

  let body: {
    mode?:
      | "listing"
      | "antishadowban"
      | "negotiation"
      | "vision_analyze"
      | "visibility"
      | "photo_safety";
    title?: string;
    brand?: string;
    category?: string;
    size?: string;
    condition?: string;
    defects?: string;
    purchasePrice?: number;
    targetPrice?: number;
    offerPrice?: number;
    originalText?: string;
    imageDataUrl?: string;
    fileName?: string;
    dominantColor?: string;
    withListing?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const mode = body.mode ?? "listing";
  const allowCloudAi = !auth.user.is_demo;

  // MODE 0: AI VISION PHOTO -> STRUCTURED LISTING EXTRACTION
  if (mode === "vision_analyze") {
    const imageDataUrl = (body.imageDataUrl ?? "").trim();
    const fileName = (body.fileName ?? "").trim().slice(0, 120);
    const dominantColor = (body.dominantColor ?? "Noir").trim().slice(0, 40);
    const purchasePrice = Math.max(0, Number(body.purchasePrice ?? 15));

    const attachListing = async (vision: Record<string, unknown>) => {
      if (!body.withListing) return vision;
      const listing = await buildListingPayload(
        {
          title: String(vision.title ?? "Pièce seconde main"),
          brand: String(vision.brand ?? ""),
          category: String(vision.category ?? "Vêtements"),
          size: String(vision.size ?? "M"),
          condition: String(vision.condition ?? "Très bon état"),
          defects: String(vision.defects ?? ""),
          purchasePrice,
          targetPrice: Math.max(2, Number(vision.estimatedPrice ?? 45)),
        },
        allowCloudAi,
      );
      return { ...vision, listing };
    };

    if (allowCloudAi && imageDataUrl.startsWith("data:image/")) {
      const aiOut = await callCloudAi({
        systemPrompt: VISION_JSON_SYSTEM,
        userPrompt: `Analyse cet article pour préparer la fiche de vente (couleur détectée: ${dominantColor}).`,
        imageDataUrl,
        jsonMode: true,
        maxTokens: 900,
        power: true,
      });
      if (aiOut) {
        const parsed = parseAiJson<Record<string, unknown>>(aiOut.text);
        if (parsed) {
          const vision = {
            engine: cloudEngineTag(aiOut.provider),
            cloudAiActive: isPersoCloudAiEnabled(),
            title: String(parsed.title ?? "Pièce Seconde Main"),
            brand: String(parsed.brand ?? "Vintage"),
            category: String(parsed.category ?? "Vêtements"),
            size: String(parsed.size ?? "M"),
            condition: String(parsed.condition ?? "Très bon état"),
            defects: String(parsed.defects ?? ""),
            estimatedPrice: Number(parsed.estimatedPrice ?? 45),
            seoKeywords: Array.isArray(parsed.seoKeywords)
              ? parsed.seoKeywords.slice(0, 6)
              : [],
            photoAntiBanTips: Array.isArray(parsed.photoAntiBanTips)
              ? parsed.photoAntiBanTips.slice(0, 5)
              : [],
          };
          return NextResponse.json(await attachListing(vision));
        }
      }
    }

    // Smart local analyzer from filename + dominant image color
    const cleanName = fileName
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\b(img|photo|dsc|pxl|whatsapp|image|\d{4,})\b/gi, "")
      .trim();
    const lower = cleanName.toLowerCase();
    const matchedBrand = BRAND_CATALOG.find((b) => lower.includes(b.key));

    const guessedCategory = lower.includes("shoe") || lower.includes("sneaker") || lower.includes("air")
      ? "Chaussures"
      : lower.includes("jean") || lower.includes("pant")
        ? "Pantalons"
        : lower.includes("pull") || lower.includes("sweat") || lower.includes("hoodie")
          ? "Pulls & Sweats"
          : matchedBrand?.cat ?? "Vestes & Manteaux";

    const guessedBrand = matchedBrand?.brand ?? "Sélection Vintage";
    const formattedName = cleanName
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
    const hasColor = formattedName
      .toLowerCase()
      .includes(dominantColor.toLowerCase());
    const guessedTitle =
      cleanName.length >= 5
        ? `${formattedName}${hasColor ? "" : ` ${dominantColor}`}`
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 80)
        : `${guessedCategory === "Chaussures" ? "Sneakers" : "Pièce"} ${guessedBrand} ${dominantColor}`;

    const vision = {
      engine: "local_smart_vision",
      cloudAiActive: isPersoCloudAiEnabled(),
      title: guessedTitle,
      brand: guessedBrand,
      category: guessedCategory,
      size: guessedCategory === "Chaussures" ? "42" : "M",
      condition: "Très bon état",
      defects: "",
      estimatedPrice: matchedBrand?.avgPrice ?? 48,
      seoKeywords: [
        guessedBrand.toLowerCase(),
        dominantColor.toLowerCase(),
        guessedCategory.toLowerCase(),
        "secondemain",
      ],
      photoAntiBanTips: [
        "Ajoute 5–8 % de marge blanche autour de l'article.",
        "Change légèrement luminosité (+5 %) avant re-upload.",
        "Utilise un fond studio différent (lin ou gris).",
      ],
    };
    return NextResponse.json(await attachListing(vision));
  }

  if (mode === "photo_safety") {
    const imageDataUrl = (body.imageDataUrl ?? "").trim();
    if (!imageDataUrl.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "Importe une photo depuis le Studio pour l'analyse anti-ban." },
        { status: 400 },
      );
    }

    const fallback = {
      engine: "local_photo_rules",
      cloudAiActive: isPersoCloudAiEnabled(),
      fingerprintRisk: "medium",
      recommendedBrightness: 108,
      recommendedContrast: 112,
      recommendedPaddingPct: 8,
      shouldRemoveBackground: true,
      shouldRotateSlight: false,
      checklist: [
        "Détourer ou changer le fond (empreinte unique).",
        "Régler luminosité entre 100 et 115 %.",
        "Exporter en PNG depuis Vintflow (pas la photo brute du téléphone).",
        "Ne pas re-uploader la même image pixel à pixel.",
        "Attendre 3 min entre deux publications.",
      ],
      safeToPublishAfterEdits: true,
      summary:
        "Risque moyen — applique détourage + marge + luminosité avant Vinted.",
    };

    if (allowCloudAi) {
      const aiOut = await callCloudAi({
        systemPrompt: PHOTO_SAFETY_JSON_SYSTEM,
        userPrompt:
          "Évalue l'empreinte de cette photo Vinted et donne les réglages studio exacts.",
        imageDataUrl,
        jsonMode: true,
        maxTokens: 800,
        power: true,
      });
      if (aiOut) {
        const parsed = parseAiJson<Record<string, unknown>>(aiOut.text);
        if (parsed) {
          return NextResponse.json({
            engine: cloudEngineTag(aiOut.provider),
            cloudAiActive: true,
            fingerprintRisk: String(parsed.fingerprintRisk ?? "medium"),
            recommendedBrightness: Math.min(
              135,
              Math.max(80, Number(parsed.recommendedBrightness ?? 108)),
            ),
            recommendedContrast: Math.min(
              135,
              Math.max(80, Number(parsed.recommendedContrast ?? 112)),
            ),
            recommendedPaddingPct: Math.min(
              16,
              Math.max(3, Number(parsed.recommendedPaddingPct ?? 8)),
            ),
            shouldRemoveBackground: Boolean(parsed.shouldRemoveBackground ?? true),
            shouldRotateSlight: Boolean(parsed.shouldRotateSlight ?? false),
            checklist: Array.isArray(parsed.checklist)
              ? parsed.checklist.slice(0, 8)
              : fallback.checklist,
            safeToPublishAfterEdits: Boolean(
              parsed.safeToPublishAfterEdits ?? true,
            ),
            summary: String(
              parsed.summary ?? "Photo prête après les réglages suggérés.",
            ),
          });
        }
      }
    }

    return NextResponse.json(fallback);
  }

  if (mode === "visibility") {
    const category = (body.category ?? "Vêtements").trim().slice(0, 60);
    const slots = defaultVintedSlots();

    if (allowCloudAi) {
      const aiOut = await callCloudAi({
        systemPrompt: VISIBILITY_JSON_SYSTEM,
        userPrompt: `Catégorie principale du vendeur : ${category}. Donne le plan pour maximiser les vues Vinted cette semaine (heure Europe/Paris).`,
        jsonMode: true,
        maxTokens: 1400,
        power: true,
      });
      if (aiOut) {
        const parsed = parseAiJson<Record<string, unknown>>(aiOut.text);
        if (parsed) {
          return NextResponse.json({
            engine: cloudEngineTag(aiOut.provider),
            cloudAiActive: true,
            publishNow: Boolean(parsed.publishNow ?? slots.publishNow),
            headline: String(parsed.headline ?? slots.headline),
            bestSlots: Array.isArray(parsed.bestSlots)
              ? parsed.bestSlots.slice(0, 6)
              : slots.bestSlots,
            weeklyPlan:
              parsed.weeklyPlan && typeof parsed.weeklyPlan === "object"
                ? parsed.weeklyPlan
                : slots.weeklyPlan,
            categoryTip: String(parsed.categoryTip ?? slots.categoryTip),
            avoidTimes: Array.isArray(parsed.avoidTimes)
              ? parsed.avoidTimes
              : slots.avoidTimes,
          });
        }
      }
    }

    return NextResponse.json({
      engine: "local_visibility",
      cloudAiActive: isPersoCloudAiEnabled(),
      ...slots,
    });
  }

  // MODE 1: ANTI-SHADOWBAN
  if (mode === "antishadowban") {
    const raw = (body.originalText ?? "").trim().slice(0, 1200);
    const title = (body.title ?? "").trim().slice(0, 100);
    if (!raw && !title) {
      return NextResponse.json(
        { error: "Colle un titre ou une description existante" },
        { status: 400 },
      );
    }

    const baseTitle =
      title || raw.split("\n")[0]?.slice(0, 65) || "Pièce seconde main";
    const words = baseTitle.split(/\s+/).filter(Boolean);
    let reorderedTitle =
      words.length >= 3
        ? `${words[words.length - 1]} · ${words.slice(0, -1).join(" ")}`.slice(
            0,
            72,
          )
        : `Sélection ${baseTitle}`.slice(0, 72);

    const cleanedBody = raw
      .replace(/#[a-zA-Z0-9_]+/g, "")
      .replace(/\s+/g, " ")
      .trim();

    let refreshedDescription = `${reorderedTitle}

Pièce vérifiée en détail avant mise en ligne.
${cleanedBody ? `\nDétails : ${cleanedBody}\n` : ""}
• Expédition rapide sous 24h (Mondial Relay, Vinted Go ou Chronopost)
• Emballage soigné, environnement non-fumeur
• Remise possible sur création de lot dans mon dressing

Tu peux demander les mesures exactes en message avant achat.`;

    let bestSlots = [
      {
        day: "Dimanche",
        window: "18h00 – 21h30",
        score: "+42 %",
        reason: "Pic trafic soirée",
      },
      {
        day: "Mercredi",
        window: "19h00 – 21h00",
        score: "+28 %",
        reason: "Milieu de semaine",
      },
      {
        day: "Vendredi",
        window: "17h30 – 20h30",
        score: "+31 %",
        reason: "Pré-week-end",
      },
    ];
    let checklist = [
      "Passe la photo dans le Studio Photo Vintflow (détourage + luminosité) avant republication.",
      "Supprime les blocs de hashtags copiés-collés.",
      "Espace les republications de 3–5 minutes.",
      "Varie le titre (synonymes, ordre des mots).",
      "Max 3 hashtags en fin de description.",
    ];
    let riskLevel = "medium";
    let riskReasons = ["Texte potentiellement dupliqué — variante locale appliquée."];
    let photoFingerprintTips = [
      "Change le fond ou le cadrage avant re-upload.",
      "Ajoute 6–10 % de marge autour du produit.",
      "Exporte depuis Vintflow, pas la photo d'origine.",
    ];
    let engine = "local_antishadowban";

    if (allowCloudAi) {
      const aiOut = await callCloudAi({
        systemPrompt: ANTISHADOWBAN_JSON_SYSTEM,
        userPrompt: `Titre actuel: ${baseTitle}\nDescription: ${cleanedBody || raw}`,
        jsonMode: true,
        maxTokens: 1800,
        power: true,
      });
      if (aiOut) {
        const parsed = parseAiJson<Record<string, unknown>>(aiOut.text);
        if (parsed) {
          engine = cloudEngineTag(aiOut.provider);
          if (parsed.reorderedTitle)
            reorderedTitle = String(parsed.reorderedTitle).slice(0, 72);
          if (parsed.refreshedDescription)
            refreshedDescription = String(parsed.refreshedDescription);
          if (Array.isArray(parsed.bestSlots))
            bestSlots = parsed.bestSlots.slice(0, 5) as typeof bestSlots;
          if (Array.isArray(parsed.checklist))
            checklist = parsed.checklist.slice(0, 8) as string[];
          if (parsed.riskLevel) riskLevel = String(parsed.riskLevel);
          if (Array.isArray(parsed.riskReasons))
            riskReasons = parsed.riskReasons.slice(0, 6) as string[];
          if (Array.isArray(parsed.photoFingerprintTips))
            photoFingerprintTips = parsed.photoFingerprintTips.slice(0, 5) as string[];
        }
      }
    }

    return NextResponse.json({
      engine,
      cloudAiActive: isPersoCloudAiEnabled(),
      reorderedTitle,
      refreshedDescription,
      bestSlots,
      checklist,
      riskLevel,
      riskReasons,
      photoFingerprintTips,
    });
  }

  // MODE 2: NEGOTIATION SNIPER
  if (mode === "negotiation") {
    const targetPrice = Math.max(1, Number(body.targetPrice ?? 50));
    const purchasePrice = Math.max(0, Number(body.purchasePrice ?? 15));
    const offerPrice = Math.max(1, Number(body.offerPrice ?? 30));

    const atOffer = computeNetMargin({
      grossAmount: offerPrice,
      purchaseCost: purchasePrice,
      platformFees: 0,
      boostCost: 0,
      shippingCost: 0,
    });

    const minAcceptable = Math.ceil(purchasePrice + 5);
    const counterPrice = Math.max(
      minAcceptable,
      Math.round((targetPrice + offerPrice) / 2),
    );

    const discountPct = Math.round(
      ((targetPrice - offerPrice) / targetPrice) * 100,
    );

    return NextResponse.json({
      offerNetMargin: atOffer.netMargin,
      minAcceptable,
      counterPrice,
      discountPct,
      verdict:
        atOffer.netMargin <= 0
          ? "Offre à perte — refuse ou contre-offre impérativement."
          : discountPct >= 30
            ? `Offre agressive (-${discountPct}%) — envoie une contre-offre ferme.`
            : `Offre acceptable — négociation possible autour de ${counterPrice} €.`,
      replies: [
        {
          tone: "Contre-offre psychologique",
          text: `Bonjour ! Merci pour ta proposition. À ${offerPrice} € je suis en dessous de mon prix plancher, mais je peux faire un effort et te le laisser à ${counterPrice} € si tu valides aujourd'hui (envoi dès demain matin).`,
        },
        {
          tone: "Ferme & pro (anti-relous)",
          text: `Bonjour, le prix est déjà ajusté au plus juste par rapport à l'état et aux ventes récentes. Je peux descendre au maximum à ${minAcceptable} €, pas en dessous. Dis-moi si ça te convient !`,
        },
        {
          tone: "Pivot Lot (augmente ton panier)",
          text: `Bonjour ! Je ne peux pas descendre à ${offerPrice} € sur cet article seul, par contre si tu fais un lot avec un autre article de mon dressing je t'applique -15 % sur le total et tu économises sur les frais de port.`,
        },
      ],
    });
  }

  // MODE 3: AI LISTING + TIKTOK SCRIPT GENERATOR
  const title = (body.title ?? "").trim().slice(0, 120);
  if (!title) {
    return NextResponse.json(
      { error: "Titre de l'article requis" },
      { status: 400 },
    );
  }
  const brand = (body.brand ?? "").trim().slice(0, 60);
  const category = (body.category ?? "Vêtements").trim().slice(0, 50);
  const size = (body.size ?? "M").trim().slice(0, 30);
  const condition = (body.condition ?? "Très bon état").trim().slice(0, 40);
  const defects = (body.defects ?? "").trim().slice(0, 200);
  const purchasePrice = Math.max(0, Number(body.purchasePrice ?? 15));
  const targetPrice = Math.max(2, Number(body.targetPrice ?? 45));

  const listing = await buildListingPayload(
    {
      title,
      brand,
      category,
      size,
      condition,
      defects,
      purchasePrice,
      targetPrice,
    },
    allowCloudAi,
  );

  return NextResponse.json(listing);
}
