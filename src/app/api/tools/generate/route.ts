import { NextResponse } from "next/server";
import { assertSameOrigin, requireAuthenticatedUser } from "@/lib/auth";
import { computeNetMargin, generateListingCopy } from "@/lib/format";

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await requireAuthenticatedUser();
  if ("response" in auth) return auth.response;

  let body: {
    mode?: "listing" | "antishadowban" | "negotiation";
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
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const mode = body.mode ?? "listing";

  if (mode === "antishadowban") {
    const raw = (body.originalText ?? "").trim().slice(0, 1200);
    const title = (body.title ?? "").trim().slice(0, 100);
    if (!raw && !title) {
      return NextResponse.json(
        { error: "Colle un titre ou une description existante" },
        { status: 400 },
      );
    }

    const baseTitle = title || raw.split("\n")[0]?.slice(0, 65) || "Pièce seconde main";
    const words = baseTitle.split(/\s+/).filter(Boolean);
    const reorderedTitle =
      words.length >= 3
        ? `${words[words.length - 1]} · ${words.slice(0, -1).join(" ")}`.slice(0, 72)
        : `Sélection ${baseTitle}`.slice(0, 72);

    const cleanedBody = raw
      .replace(/#[a-zA-Z0-9_]+/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const refreshedDescription = `${reorderedTitle}

Pièce vérifiée en détail avant mise en ligne.
${cleanedBody ? `\nDétails : ${cleanedBody}\n` : ""}
• Expédition rapide sous 24h (Mondial Relay, Vinted Go ou Chronopost)
• Emballage soigné, environnement non-fumeur
• Remise possible sur création de lot dans mon dressing

Tu peux demander les mesures exactes en message avant achat.`;

    return NextResponse.json({
      reorderedTitle,
      refreshedDescription,
      bestSlots: [
        { day: "Dimanche", window: "18h00 – 21h30", score: "Pic trafic +42 %" },
        { day: "Mercredi", window: "18h30 – 21h00", score: "Pic trafic +28 %" },
        { day: "Vendredi", window: "17h00 – 20h00", score: "Pic weekend +31 %" },
      ],
      checklist: [
        "Passe la photo dans le Studio Photo Vintflow (léger recadrage/luminosité) pour changer son empreinte numérique avant republication.",
        "Supprime les séries de hashtags copiés-collés en bas d'annonce qui déclenchent la vérification 24h.",
        "Espace les republications d'au moins 3–5 minutes entre chaque article.",
        "Évite les mots-clés de marques non liées (spam de marques) qui provoquent un shadowban immédiat.",
      ],
    });
  }

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
      urssafRate: auth.user.urssaf_rate,
    });

    const minAcceptable = Math.ceil(
      (purchasePrice + 5) / Math.max(0.1, 1 - auth.user.urssaf_rate / 100),
    );
    const counterPrice = Math.max(
      minAcceptable,
      Math.round((targetPrice + offerPrice) / 2),
    );

    const discountPct = Math.round(((targetPrice - offerPrice) / targetPrice) * 100);

    return NextResponse.json({
      offerNetMargin: atOffer.netMargin,
      offerUrssaf: atOffer.urssafAmount,
      minAcceptable,
      counterPrice,
      discountPct,
      verdict:
        atOffer.netMargin <= 0
          ? "Offre à perte — refuse ou contre-offre impérativement."
          : discountPct >= 30
            ? "Offre agressive (-" + discountPct + "%) — envoie une contre-offre ferme."
            : "Offre acceptable — négociation possible autour de " + counterPrice + " €.",
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

  // Default: mode === "listing"
  const title = (body.title ?? "").trim().slice(0, 120);
  if (!title) {
    return NextResponse.json({ error: "Titre de l'article requis" }, { status: 400 });
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

  const vintedFull = `${baseCopy.seoTitle}
${defectLine}
Mesures à plat (cm) :
• Largeur aisselle à aisselle : __ cm
• Longueur totale : __ cm

${baseCopy.vinted}`;

  const leboncoinFull = `${baseCopy.leboncoin}
${defects ? `\nÀ noter : ${defects}.` : ""}
Disponible tant que l'annonce est en ligne.`;

  const tiktokScript = `[0–3s HOOK] "Regarde cette ${title} (${brand || "pépite seconde main"}) que je viens de sourcer — et voici son état réel."
[3–10s PREUVE] "Taille ${size}, ${condition.toLowerCase()}${defects ? ` (${defects})` : ", zéro défaut"}. Je montre les coutures et l'étiquette de près."
[10–15s CTA] "Dispo maintenant à ${targetPrice} € dans ma boutique TikTok Shop / lien Vinted en bio. Envoi en 24h !"`;

  const fastPrice = Math.max(5, Math.round(targetPrice * 0.85));
  const idealPrice = Math.round(targetPrice);
  const premiumPrice = Math.round(targetPrice * 1.18);

  const pricingTiers = [
    { label: "Vente rapide", price: fastPrice, ...computeNetMargin({ grossAmount: fastPrice, purchaseCost: purchasePrice, platformFees: 0, boostCost: 0, shippingCost: 0, urssafRate: auth.user.urssaf_rate }) },
    { label: "Prix idéal", price: idealPrice, ...computeNetMargin({ grossAmount: idealPrice, purchaseCost: purchasePrice, platformFees: 0, boostCost: 0, shippingCost: 0, urssafRate: auth.user.urssaf_rate }) },
    { label: "Premium", price: premiumPrice, ...computeNetMargin({ grossAmount: premiumPrice, purchaseCost: purchasePrice, platformFees: 0, boostCost: 0, shippingCost: 0, urssafRate: auth.user.urssaf_rate }) },
  ];

  return NextResponse.json({
    seoTitle: baseCopy.seoTitle,
    vinted: vintedFull,
    leboncoin: leboncoinFull,
    tiktokScript,
    pricingTiers,
  });
}
