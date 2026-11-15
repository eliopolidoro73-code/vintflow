import type { InvoiceAiDraft } from "@/lib/invoice-ai-prompt";

const LV_MODELS: Array<{ match: RegExp; label: string }> = [
  { match: /neverfull/i, label: "Neverfull MM" },
  { match: /speedy/i, label: "Speedy" },
  { match: /keepall/i, label: "Keepall" },
  { match: /alma/i, label: "Alma" },
  { match: /pochette/i, label: "Pochette accessoires" },
  { match: /noé|noe/i, label: "Noé" },
];

export function isLouisVuitton(text: string): boolean {
  if (/\bmoncler\b/i.test(text)) return false;
  return /louis\s*vuitton|\blv\b|neverfull|monogram|damier|épi|\bEpi\b/i.test(
    text,
  );
}

function detectLvModel(text: string): string {
  for (const m of LV_MODELS) {
    if (m.match.test(text)) return m.label;
  }
  if (/sac/i.test(text)) return "Sac à main";
  return "Article maroquinerie";
}

function monclerLine(prompt: string, draft: InvoiceAiDraft): string {
  if (/veste/i.test(prompt) || /veste/i.test(draft.item_title)) return "Veste";
  if (/maya/i.test(prompt)) return "Maya";
  if (/grenoble/i.test(prompt)) return "Grenoble";
  if (/doudoune/i.test(prompt)) return "Doudoune";
  return draft.product_line ?? "Pièce";
}

/** Normalise factures luxe pour PDF pro — le prompt utilisateur prime sur le JSON IA. */
export function enrichInvoiceDraft(
  draft: InvoiceAiDraft,
  prompt = "",
): InvoiceAiDraft {
  const combined = `${prompt} ${draft.brand} ${draft.item_title} ${draft.notes ?? ""}`;
  const d = { ...draft };
  const promptSaysMoncler = /\bmoncler\b/i.test(prompt);

  if (promptSaysMoncler || (/\bmoncler\b/i.test(combined) && !isLouisVuitton(prompt))) {
    const piece = monclerLine(prompt, draft);
    d.brand = "Moncler";
    d.item_title =
      piece === "Veste"
        ? `Veste Moncler — occasion authentique`
        : d.item_title.includes("Moncler")
          ? d.item_title
          : `Moncler ${piece} — seconde main authentique`;
    d.sku = /^MON-/i.test(d.sku)
      ? d.sku
      : `MON-${piece.replace(/\s+/g, "-").toUpperCase()}-${String(d.gross_amount)}`;
    d.notes =
      d.notes && !/louis\s*vuitton/i.test(d.notes)
        ? d.notes
        : `Vente Moncler ${piece} — contrôle visuel avant expédition.`;
    d.purchase_cost =
      d.purchase_cost > 0
        ? d.purchase_cost
        : Math.round(Math.min(d.gross_amount * 0.38, d.gross_amount - 60));
    d.platform_fees =
      d.platform_fees > 0
        ? d.platform_fees
        : Math.round(d.gross_amount * 0.05 * 100) / 100;
    d.product_line = piece;
    d.condition_label =
      d.condition_label ?? "Très bon état — article d'occasion authentique";
    d.luxury_brand = true;
    return d;
  }

  if (isLouisVuitton(combined)) {
    const model = detectLvModel(combined);
    const canvas = /damier/i.test(combined)
      ? "Damier"
      : /épi|epi/i.test(combined)
        ? "Épi"
        : "Monogram";
    d.brand = "Louis Vuitton";
    d.item_title = `Sac Louis Vuitton ${model} — toile ${canvas} · occasion authentique`;
    d.sku = d.sku.toUpperCase().startsWith("LV")
      ? d.sku
      : `LV-${model.replace(/\s+/g, "-").toUpperCase()}-${String(d.gross_amount)}`;
    d.notes =
      d.notes ??
      `Vente seconde main Louis Vuitton ${model} (${canvas}), contrôle visuel avant expédition.`;
    d.purchase_cost =
      d.purchase_cost > 0
        ? d.purchase_cost
        : Math.round(Math.min(d.gross_amount * 0.42, d.gross_amount - 80));
    d.platform_fees =
      d.platform_fees > 0
        ? d.platform_fees
        : Math.round(d.gross_amount * 0.05 * 100) / 100;
    d.product_line = model;
    d.condition_label = "Très bon état — article d'occasion authentique";
    d.luxury_brand = true;
  } else if (/chanel/i.test(combined)) {
    d.brand = "Chanel";
    d.item_title = d.item_title.includes("Chanel")
      ? d.item_title
      : `Article Chanel — ${d.item_title}`;
    d.sku = `CH-${d.sku.slice(-8)}`;
    d.luxury_brand = true;
  } else if (/hermès|hermes/i.test(combined)) {
    d.brand = "Hermès";
    d.item_title = d.item_title.includes("Herm")
      ? d.item_title
      : `Article Hermès — ${d.item_title}`;
    d.sku = `HER-${d.sku.slice(-8)}`;
    d.luxury_brand = true;
  } else if (/\bdior\b/i.test(combined)) {
    d.brand = "Dior";
    d.luxury_brand = true;
  } else if (/\bgucci\b/i.test(combined)) {
    d.brand = "Gucci";
    d.luxury_brand = true;
  }

  return d;
}

export type InvoiceLuxuryMeta = {
  brand?: string;
  productLine?: string;
  conditionLabel?: string;
  isLuxury?: boolean;
};

export function luxuryMetaFromTitle(
  itemTitle: string,
  sku: string,
): InvoiceLuxuryMeta {
  const blob = `${itemTitle} ${sku}`;
  if (/\bmoncler\b/i.test(blob) || /^MON-/i.test(sku)) {
    return {
      brand: "Moncler",
      productLine: /veste/i.test(blob)
        ? "Veste"
        : /maya/i.test(blob)
          ? "Maya"
          : "Doudoune",
      conditionLabel: "Occasion authentique — très bon état",
      isLuxury: true,
    };
  }
  if (isLouisVuitton(blob)) {
    return {
      brand: "Louis Vuitton",
      productLine: detectLvModel(itemTitle),
      conditionLabel: "Occasion authentique — très bon état",
      isLuxury: true,
    };
  }
  if (/chanel/i.test(blob)) {
    return {
      brand: "Chanel",
      productLine: "Maroquinerie",
      conditionLabel: "Occasion authentique — très bon état",
      isLuxury: true,
    };
  }
  if (/herm[eè]s/i.test(blob)) {
    return {
      brand: "Hermès",
      productLine: "Maroquinerie",
      conditionLabel: "Occasion authentique — très bon état",
      isLuxury: true,
    };
  }
  if (/\bdior\b/i.test(blob)) {
    return {
      brand: "Dior",
      conditionLabel: "Occasion — état conforme annonce",
      isLuxury: true,
    };
  }
  if (/\bgucci\b/i.test(blob)) {
    return {
      brand: "Gucci",
      conditionLabel: "Occasion — état conforme annonce",
      isLuxury: true,
    };
  }
  return {};
}