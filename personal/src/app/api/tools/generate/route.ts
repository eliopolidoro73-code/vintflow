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
  DESCRIPTION_SAFETY_JSON_SYSTEM,
  LISTING_SAFETY_JSON_SYSTEM,
  VISION_JSON_SYSTEM,
  VISIBILITY_JSON_SYSTEM,
} from "@/lib/vinted-ai-prompts";
import { localAntiShadowbanRewrite } from "@/lib/antishadowban-engine";
import { localDescriptionSafety } from "@/lib/description-safety";
import { localPhotoSafetyFromImageSeed } from "@/lib/local-photo-safety";
import { LUXURY_BRAND_CATALOG } from "@/lib/luxury-brands";

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
  ...LUXURY_BRAND_CATALOG.map((b) => ({
    key: b.key,
    brand: b.brand,
    cat: b.cat,
    avgPrice: b.avgPrice,
  })),
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
      maxTokens: 3600,
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

  if (engine === "local_listing") {
    const safe = localAntiShadowbanRewrite(antiBanTitle, vintedFull, {
      category,
      isRepost: false,
    });
    antiBanTitle = safe.reorderedTitle;
    vintedFull = safe.refreshedDescription;
    avoidWords = [...new Set([...avoidWords, ...safe.avoidWords])];
    publishSlots = safe.bestSlots.slice(0, 3) as typeof publishSlots;
  }

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

  let body: {
    mode?:
      | "listing"
      | "antishadowban"
      | "negotiation"
      | "vision_analyze"
      | "visibility"
      | "photo_safety"
      | "description_safety"
      | "listing_safety";
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
    isRepost?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const mode = body.mode ?? "listing";
  const allowCloudAi = !auth.user.is_demo;

  if (monthlyCap === 0) {
    return NextResponse.json(
      { error: "Outils IA non disponibles sur ce forfait." },
      { status: 403 },
    );
  }

  const skipAiCredits = mode === "negotiation";

  if (!skipAiCredits) {
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
  }

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
    const isLuxeBrand = LUXURY_BRAND_CATALOG.some((b) => b.brand === guessedBrand);
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
      condition: isLuxeBrand ? "Excellent état" : "Très bon état",
      defects: "",
      estimatedPrice: matchedBrand?.avgPrice ?? 48,
      seoKeywords: [
        guessedBrand.toLowerCase(),
        dominantColor.toLowerCase(),
        guessedCategory.toLowerCase(),
        isLuxeBrand ? "luxe" : "secondemain",
      ],
      photoAntiBanTips: isLuxeBrand
        ? [
            "Fond neutre type lin ou dark luxe — photos coutures et quincaillerie.",
            "Marge 8–10 % + rotation < 1° pour éviter l'empreinte.",
            "Pas de filtre Instagram — luminosité +5 % max.",
          ]
        : [
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

    const localPhoto = localPhotoSafetyFromImageSeed(imageDataUrl);
    const fallback = {
      engine: "local_photo_rules",
      cloudAiActive: isPersoCloudAiEnabled(),
      usedLocalFallback: true,
      ...localPhoto,
    };

    if (allowCloudAi) {
      const aiOut = await callCloudAi({
        systemPrompt: PHOTO_SAFETY_JSON_SYSTEM,
        userPrompt:
          "Évalue l'empreinte de cette photo Vinted et donne les réglages studio exacts.",
        imageDataUrl,
        jsonMode: true,
        maxTokens: 1200,
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

  if (mode === "description_safety") {
    const title = (body.title ?? "").trim().slice(0, 100);
    const description = (body.originalText ?? body.title ?? "").trim().slice(0, 2000);
    const baseTitle =
      title || description.split("\n")[0]?.slice(0, 65) || "Pièce seconde main";
    const bodyText =
      title && description !== title
        ? description
        : description.split("\n").slice(1).join("\n") || description;

    const local = localDescriptionSafety(baseTitle, bodyText, {
      isRepost: Boolean(body.isRepost),
      category: (body.category ?? "").trim() || undefined,
    });

    let out = {
      engine: "local_description_rules",
      cloudAiActive: isPersoCloudAiEnabled(),
      ...local,
    };

    if (allowCloudAi) {
      const aiOut = await callCloudAi({
        systemPrompt: DESCRIPTION_SAFETY_JSON_SYSTEM,
        userPrompt: `Titre: ${baseTitle}
Description actuelle:
${bodyText || "(vide)"}
Republication: ${body.isRepost ? "oui" : "non"}
Catégorie: ${body.category ?? "—"}
Analyse locale: risque ${local.descriptionRisk}, score dup ${local.duplicateScore}`,
        jsonMode: true,
        maxTokens: 3200,
        power: true,
      });
      if (aiOut) {
        const parsed = parseAiJson<Record<string, unknown>>(aiOut.text);
        if (parsed) {
          out = {
            ...out,
            engine: cloudEngineTag(aiOut.provider),
            cloudAiActive: true,
            descriptionRisk:
              parsed.descriptionRisk === "low" ||
              parsed.descriptionRisk === "medium" ||
              parsed.descriptionRisk === "high"
                ? parsed.descriptionRisk
                : local.descriptionRisk,
            duplicateScore: Math.min(
              100,
              Number(parsed.duplicateScore ?? local.duplicateScore),
            ),
            spamFlags: Array.isArray(parsed.spamFlags)
              ? (parsed.spamFlags.slice(0, 8) as string[])
              : local.spamFlags,
            reorderedTitle: String(
              parsed.reorderedTitle ?? local.reorderedTitle,
            ).slice(0, 72),
            titleAlternatives: Array.isArray(parsed.titleAlternatives)
              ? (parsed.titleAlternatives.slice(0, 3) as string[])
              : local.titleAlternatives,
            refreshedDescription: String(
              parsed.refreshedDescription ?? local.refreshedDescription,
            ),
            checklist: Array.isArray(parsed.checklist)
              ? (parsed.checklist.slice(0, 8) as string[])
              : local.checklist,
            safeToPostDescription: Boolean(
              parsed.safeToPostDescription ?? local.safeToPostDescription,
            ),
            summary: String(parsed.summary ?? local.summary),
          };
        }
      }
    }

    return NextResponse.json(out);
  }

  if (mode === "listing_safety") {
    const imageDataUrl = (body.imageDataUrl ?? "").trim();
    const title = (body.title ?? "").trim().slice(0, 100);
    const description = (body.originalText ?? "").trim().slice(0, 2000);
    const baseTitle =
      title || description.split("\n")[0]?.slice(0, 65) || "Pièce seconde main";

    const descLocal = localDescriptionSafety(baseTitle, description, {
      isRepost: Boolean(body.isRepost),
      category: (body.category ?? "").trim() || undefined,
    });

    const photoLocal =
      imageDataUrl.startsWith("data:image/") ?
        localPhotoSafetyFromImageSeed(imageDataUrl)
      : {
          fingerprintRisk: "medium" as const,
          recommendedBrightness: 108,
          recommendedContrast: 112,
          recommendedPaddingPct: 8,
          shouldRemoveBackground: true,
          shouldRotateSlight: false,
          checklist: [] as string[],
        };

    const globalRisk =
      descLocal.descriptionRisk === "high" || photoLocal.fingerprintRisk === "high"
        ? "high"
        : descLocal.descriptionRisk === "medium" ||
            photoLocal.fingerprintRisk === "medium"
          ? "medium"
          : "low";

    const fallback = {
      engine: "local_listing_safety",
      cloudAiActive: isPersoCloudAiEnabled(),
      usedLocalFallback: true,
      fingerprintRisk: photoLocal.fingerprintRisk,
      descriptionRisk: descLocal.descriptionRisk,
      globalRisk,
      recommendedBrightness: photoLocal.recommendedBrightness,
      recommendedContrast: photoLocal.recommendedContrast,
      recommendedPaddingPct: photoLocal.recommendedPaddingPct,
      shouldRemoveBackground: photoLocal.shouldRemoveBackground,
      shouldRotateSlight: photoLocal.shouldRotateSlight,
      reorderedTitle: descLocal.reorderedTitle,
      titleAlternatives: descLocal.titleAlternatives,
      refreshedDescription: descLocal.refreshedDescription,
      photoChecklist:
        photoLocal.checklist.length > 0
          ? photoLocal.checklist
          : [
              "Détourer ou fond studio différent.",
              "Luminosité +5 %, contraste léger.",
              "Marge blanche 6–10 % autour de l'article.",
              "Exporter depuis Vintflow (pas la photo brute).",
            ],
      descriptionChecklist: descLocal.checklist,
      safeToPublishAfterEdits: true,
      safeToPostDescription: descLocal.safeToPostDescription,
      summary:
        "Photo : risque moyen sans retouche. Description : voir variante IA proposée.",
    };

    if (
      allowCloudAi &&
      imageDataUrl.startsWith("data:image/") &&
      (description.length > 10 || title.length > 3)
    ) {
      const aiOut = await callCloudAi({
        systemPrompt: LISTING_SAFETY_JSON_SYSTEM,
        userPrompt: `Titre: ${baseTitle}
Description:
${description || "(vide)"}
Republication: ${body.isRepost ? "oui" : "non"}`,
        imageDataUrl,
        jsonMode: true,
        maxTokens: 3800,
        power: true,
      });
      if (aiOut) {
        const parsed = parseAiJson<Record<string, unknown>>(aiOut.text);
        if (parsed) {
          return NextResponse.json({
            engine: cloudEngineTag(aiOut.provider),
            cloudAiActive: true,
            fingerprintRisk: String(parsed.fingerprintRisk ?? "medium"),
            descriptionRisk: String(
              parsed.descriptionRisk ?? descLocal.descriptionRisk,
            ),
            globalRisk: String(parsed.globalRisk ?? "medium"),
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
            reorderedTitle: String(
              parsed.reorderedTitle ?? descLocal.reorderedTitle,
            ).slice(0, 72),
            titleAlternatives: Array.isArray(parsed.titleAlternatives)
              ? (parsed.titleAlternatives.slice(0, 3) as string[])
              : descLocal.titleAlternatives,
            refreshedDescription: String(
              parsed.refreshedDescription ?? descLocal.refreshedDescription,
            ),
            photoChecklist: Array.isArray(parsed.photoChecklist)
              ? (parsed.photoChecklist.slice(0, 6) as string[])
              : fallback.photoChecklist,
            descriptionChecklist: Array.isArray(parsed.descriptionChecklist)
              ? (parsed.descriptionChecklist.slice(0, 6) as string[])
              : descLocal.checklist,
            safeToPublishAfterEdits: Boolean(
              parsed.safeToPublishAfterEdits ?? true,
            ),
            safeToPostDescription: Boolean(
              parsed.safeToPostDescription ?? descLocal.safeToPostDescription,
            ),
            summary: String(parsed.summary ?? fallback.summary),
          });
        }
      }
    }

    if (allowCloudAi && imageDataUrl.startsWith("data:image/")) {
      const photoOnly = await callCloudAi({
        systemPrompt: PHOTO_SAFETY_JSON_SYSTEM,
        userPrompt: "Analyse empreinte photo pour republication Vinted.",
        imageDataUrl,
        jsonMode: true,
        maxTokens: 800,
        power: true,
      });
      if (photoOnly) {
        const parsed = parseAiJson<Record<string, unknown>>(photoOnly.text);
        if (parsed) {
          return NextResponse.json({
            ...fallback,
            engine: cloudEngineTag(photoOnly.provider),
            fingerprintRisk: String(parsed.fingerprintRisk ?? "medium"),
            recommendedBrightness: Number(parsed.recommendedBrightness ?? 108),
            recommendedContrast: Number(parsed.recommendedContrast ?? 112),
            recommendedPaddingPct: Number(parsed.recommendedPaddingPct ?? 8),
            shouldRemoveBackground: Boolean(parsed.shouldRemoveBackground ?? true),
            photoChecklist: Array.isArray(parsed.checklist)
              ? (parsed.checklist.slice(0, 6) as string[])
              : fallback.photoChecklist,
            summary: `Photo : ${String(parsed.summary ?? "retouche conseillée")} Description : ${descLocal.summary}`,
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
    const cleanedBody = raw
      .replace(/#[a-zA-Z0-9_]+/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const local = localAntiShadowbanRewrite(baseTitle, cleanedBody || raw, {
      isRepost: Boolean(body.isRepost),
      category: (body.category ?? "").trim() || undefined,
    });
    const descSafety = localDescriptionSafety(
      baseTitle,
      cleanedBody || raw,
      {
        isRepost: Boolean(body.isRepost),
        category: (body.category ?? "").trim() || undefined,
      },
    );

    let reorderedTitle = local.reorderedTitle;
    let refreshedDescription = local.refreshedDescription;
    let bestSlots = local.bestSlots;
    let checklist = local.checklist;
    let riskLevel = local.riskLevel;
    let riskReasons = local.riskReasons;
    let photoFingerprintTips = local.photoFingerprintTips;
    let titleAlternatives = local.titleAlternatives;
    let avoidWords = local.avoidWords;
    let waitMinutesBeforeRepost = local.waitMinutesBeforeRepost;
    let safeToPostNow = local.safeToPostNow;
    let descriptionRisk = descSafety.descriptionRisk;
    let duplicateScore = descSafety.duplicateScore;
    let descriptionSpamFlags = descSafety.spamFlags;
    let safeToPostDescription = descSafety.safeToPostDescription;
    let engine = "local_antishadowban_expert";

    if (allowCloudAi) {
      const aiOut = await callCloudAi({
        systemPrompt: ANTISHADOWBAN_JSON_SYSTEM,
        userPrompt: `Titre actuel: ${baseTitle}
Description: ${cleanedBody || raw}
Republication: ${body.isRepost ? "oui" : "non"}
Catégorie: ${body.category ?? "non précisée"}
Analyse locale risque: ${riskLevel} — ${riskReasons.join("; ")}`,
        jsonMode: true,
        maxTokens: 3800,
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
          if (parsed.riskLevel === "low" || parsed.riskLevel === "medium" || parsed.riskLevel === "high")
            riskLevel = parsed.riskLevel;
          if (Array.isArray(parsed.riskReasons))
            riskReasons = parsed.riskReasons.slice(0, 8) as string[];
          if (Array.isArray(parsed.photoFingerprintTips))
            photoFingerprintTips = parsed.photoFingerprintTips.slice(0, 6) as string[];
          if (Array.isArray(parsed.titleAlternatives))
            titleAlternatives = parsed.titleAlternatives.slice(0, 3) as string[];
          if (Array.isArray(parsed.avoidWords))
            avoidWords = parsed.avoidWords.slice(0, 12) as string[];
          if (parsed.waitMinutesBeforeRepost)
            waitMinutesBeforeRepost = Number(parsed.waitMinutesBeforeRepost);
          if (typeof parsed.safeToPostNow === "boolean")
            safeToPostNow = parsed.safeToPostNow;
          if (parsed.descriptionRisk === "low" || parsed.descriptionRisk === "medium" || parsed.descriptionRisk === "high")
            descriptionRisk = parsed.descriptionRisk;
          if (typeof parsed.duplicateScore === "number")
            duplicateScore = Math.min(100, parsed.duplicateScore);
          if (Array.isArray(parsed.spamFlags))
            descriptionSpamFlags = parsed.spamFlags.slice(0, 8) as string[];
          if (typeof parsed.safeToPostDescription === "boolean")
            safeToPostDescription = parsed.safeToPostDescription;
        }
      }
    }

    return NextResponse.json({
      engine,
      cloudAiActive: isPersoCloudAiEnabled(),
      reorderedTitle,
      titleAlternatives,
      refreshedDescription,
      bestSlots,
      checklist,
      riskLevel,
      riskReasons,
      avoidWords,
      photoFingerprintTips,
      waitMinutesBeforeRepost,
      safeToPostNow,
      descriptionRisk,
      duplicateScore,
      descriptionSpamFlags,
      safeToPostDescription,
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
