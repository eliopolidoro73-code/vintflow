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

/** Normalise factures luxe (LV, Chanel, Hermès) pour PDF pro. */
export function enrichInvoiceDraft(draft: InvoiceAiDraft): InvoiceAiDraft {
  const combined = `${draft.brand} ${draft.item_title} ${draft.notes ?? ""}`;
  const d = { ...draft };

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
    (d as InvoiceAiDraft & { product_line: string }).product_line = model;
    (d as InvoiceAiDraft & { condition_label: string }).condition_label =
      "Très bon état — article d'occasion authentique";
    (d as InvoiceAiDraft & { luxury_brand: boolean }).luxury_brand = true;
  } else if (/chanel/i.test(combined)) {
    d.brand = "Chanel";
    d.item_title = d.item_title.includes("Chanel")
      ? d.item_title
      : `Article Chanel — ${d.item_title}`;
    d.sku = `CH-${d.sku.slice(-8)}`;
    (d as InvoiceAiDraft & { luxury_brand: boolean }).luxury_brand = true;
  } else if (/hermès|hermes/i.test(combined)) {
    d.brand = "Hermès";
    d.item_title = d.item_title.includes("Herm")
      ? d.item_title
      : `Article Hermès — ${d.item_title}`;
    d.sku = `HER-${d.sku.slice(-8)}`;
    (d as InvoiceAiDraft & { luxury_brand: boolean }).luxury_brand = true;
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
  if (isLouisVuitton(`${itemTitle} ${sku}`)) {
    return {
      brand: "Louis Vuitton",
      productLine: detectLvModel(itemTitle),
      conditionLabel: "Occasion authentique — très bon état",
      isLuxury: true,
    };
  }
  return {};
}