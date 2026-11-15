import { NextResponse } from "next/server";
import { assertSameOrigin, requireAuthenticatedUser } from "@/lib/auth";
import { callCloudAi } from "@/lib/ai";
import { sql } from "@/lib/db";
import { computeNetMargin, generateListingCopy } from "@/lib/format";
import { PLANS } from "@/lib/plans";
import { checkRateLimit } from "@/lib/rate-limit";

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

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await requireAuthenticatedUser();
  if ("response" in auth) return auth.response;

  const rl = await checkRateLimit({
    scope: "ai_tools",
    key: auth.user.id,
    limit: 20,
    windowSeconds: 600,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trop de requêtes IA en peu de temps. Patiente quelques minutes." },
      { status: 429 },
    );
  }

  const plan = PLANS[auth.user.plan];
  if (plan.aiCreditsMonthlyLimit === 0) {
    return NextResponse.json(
      {
        error:
          "Les outils IA (Vision, Annonces 3-en-1, Anti-Shadowban, Sniper Négo) ne sont pas inclus dans le plan Essentiel (9 €). Passe à Vendeur Plus (29 €) ou Pro Scale (49 €).",
      },
      { status: 403 },
    );
  }
  const reserved = await sql<{ ai_credits_used: number }>(
    `update users
     set ai_credits_used = ai_credits_used + 1
     where id = $1 and ai_credits_used < $2
     returning ai_credits_used`,
    [auth.user.id, plan.aiCreditsMonthlyLimit],
  );
  if (reserved.length === 0) {
    return NextResponse.json(
      {
        error: `Quota de ${plan.aiCreditsMonthlyLimit} crédits IA/mois atteint sur ${plan.name}.`,
      },
      { status: 403 },
    );
  }

  let body: {
    mode?: "listing" | "antishadowban" | "negotiation" | "vision_analyze";
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

    if (allowCloudAi && imageDataUrl.startsWith("data:image/")) {
      const aiOut = await callCloudAi({
        systemPrompt:
          "Tu es un expert revente seconde main (Vinted, Leboncoin, TikTok Shop). Analyse l'image et retourne uniquement un JSON valide avec les clés: title (string, titre vendeur FR), brand (string), category (string), size (string), condition (string: 'Neuf avec étiquette' | 'Neuf sans étiquette' | 'Très bon état' | 'Bon état'), defects (string, vide si aucun visible), estimatedPrice (number, prix de revente réaliste en EUR), seoKeywords (string[]).",
        userPrompt: `Analyse cet article pour préparer la fiche de vente (couleur détectée: ${dominantColor}).`,
        imageDataUrl,
        jsonMode: true,
        maxTokens: 320,
      });
      if (aiOut) {
        try {
          const parsed = JSON.parse(aiOut.text) as Record<string, unknown>;
          return NextResponse.json({
            engine:
              aiOut.provider === "gemini" ? "gemini_vision" : "openai_vision",
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
          });
        } catch {
          // Fall back to deterministic analyzer
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

    return NextResponse.json({
      engine: "local_smart_vision",
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
    const reorderedTitle =
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

    if (allowCloudAi) {
      const aiOut = await callCloudAi({
        systemPrompt:
          "Réécris cette annonce Vinted/Leboncoin en français pour éviter les filtres anti-duplication (sans spam de hashtags, ton humain, clair et rassurant). Retourne uniquement le nouveau texte.",
        userPrompt: `Titre: ${baseTitle}\nDescription: ${cleanedBody}`,
        maxTokens: 240,
      });
      if (aiOut?.text) {
        refreshedDescription = aiOut.text;
      }
    }

    return NextResponse.json({
      reorderedTitle,
      refreshedDescription,
      bestSlots: [
        { day: "Dimanche", window: "18h00 – 21h30", score: "Pic trafic +42 %" },
        { day: "Mercredi", window: "18h30 – 21h00", score: "Pic trafic +28 %" },
        { day: "Vendredi", window: "17h00 – 20h00", score: "Pic weekend +31 %" },
      ],
      checklist: [
        "Passe la photo dans le Studio Photo Vintflow (Détourage IA ou légère retouche) pour changer son empreinte numérique avant republication.",
        "Supprime les séries de hashtags copiés-collés en bas d'annonce qui déclenchent la vérification 24h.",
        "Espace les republications d'au moins 3–5 minutes entre chaque article.",
        "Évite les mots-clés de marques non liées (spam de marques) qui provoquent un shadowban immédiat.",
      ],
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

  if (allowCloudAi) {
    const aiOut = await callCloudAi({
      systemPrompt:
        "Tu es copywriter e-commerce seconde main. Retourne uniquement un JSON avec les clés: vinted (annonce Vinted structurée avec mesures et hashtags pertinents), leboncoin (annonce Leboncoin claire et rassurante), tiktokScript (script vidéo court 15s Hook/Preuve/CTA).",
      userPrompt: `Article: ${title}, Marque: ${brand}, Catégorie: ${category}, Taille: ${size}, État: ${condition}, Défauts: ${defects || "Aucun"}, Prix: ${targetPrice} €.`,
      jsonMode: true,
      maxTokens: 450,
    });
    if (aiOut?.text) {
      try {
        const parsed = JSON.parse(aiOut.text) as Record<string, string>;
        if (parsed.vinted) vintedFull = parsed.vinted;
        if (parsed.leboncoin) leboncoinFull = parsed.leboncoin;
        if (parsed.tiktokScript) tiktokScript = parsed.tiktokScript;
      } catch {
        // Keep deterministic templates
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

  return NextResponse.json({
    seoTitle: baseCopy.seoTitle,
    vinted: vintedFull,
    leboncoin: leboncoinFull,
    tiktokScript,
    pricingTiers,
  });
}
