import type { InvoiceAiDraft } from "@/lib/invoice-ai-prompt";
import { detectInvoiceKind } from "@/lib/invoice-kind";
import { enrichInvoiceDraft } from "@/lib/invoice-luxury";
import { enrichRetailPurchaseDraft } from "@/lib/invoice-retail-lv";
import {
  BOUTIQUE_PLATFORM_BY_TEMPLATE,
  brandStyleFor,
  detectBrandTemplateFromPrompt,
  type InvoiceBrandTemplate,
} from "@/lib/invoice-brand-styles";

function monclerPieceLabel(prompt: string): string {
  if (/maya/i.test(prompt)) return "Maya";
  if (/grenoble/i.test(prompt)) return "Grenoble";
  if (/veste/i.test(prompt)) return "Veste";
  if (/doudoune/i.test(prompt)) return "Doudoune";
  return "Pièce";
}

function correctTitlesForBrand(
  draft: InvoiceAiDraft,
  template: InvoiceBrandTemplate,
  prompt: string,
  kind: "resale" | "retail_purchase",
): InvoiceAiDraft {
  const d = { ...draft };
  const style = brandStyleFor(template);

  if (template === "moncler") {
    const piece = monclerPieceLabel(prompt) || d.product_line || "Pièce";
    d.product_line = piece;
    const mode =
      kind === "retail_purchase" ? "neuf boutique" : "seconde main authentique";
  if (!/\bmoncler\b/i.test(d.item_title) || /louis\s*vuitton|\blv\b/i.test(d.item_title)) {
      d.item_title =
        piece === "Veste"
          ? `Veste Moncler ${/homme|femme/i.test(prompt) ? (/(homme|men)/i.test(prompt) ? "homme" : "femme") : ""} — ${mode}`.replace(
              "  ",
              " ",
            )
          : `Moncler ${piece} — ${mode}`;
    }
    if (!/^MON(-ACHAT)?-/i.test(d.sku)) {
      d.sku =
        kind === "retail_purchase"
          ? `MON-ACHAT-${piece.toUpperCase().slice(0, 6)}`
          : `MON-${piece.toUpperCase().slice(0, 6)}-${Math.round(d.gross_amount)}`;
    }
    d.luxury_brand = true;
    d.notes =
      /louis\s*vuitton/i.test(d.notes ?? "") || !d.notes
        ? kind === "retail_purchase"
          ? `Achat boutique Moncler — ${piece}, TTC.`
          : `Vente Moncler ${piece} — contrôle avant expédition.`
        : d.notes;
  } else if (template === "louis_vuitton") {
    if (/\bmoncler\b/i.test(prompt)) return d;
  }

  d.brand = style.displayName;
  if (kind === "retail_purchase") {
    const plat = BOUTIQUE_PLATFORM_BY_TEMPLATE[template];
    if (plat) {
      d.platform = plat;
      d.account_handle = d.account_handle?.includes(style.displayName)
        ? d.account_handle
        : `Boutique ${style.displayName}`;
    }
  }

  return d;
}

/** Force la marque issue du prompt utilisateur (l’IA se trompe souvent sur LV). */
export function alignDraftBrandWithPrompt(
  draft: InvoiceAiDraft,
  prompt: string,
  kind: "resale" | "retail_purchase",
): InvoiceAiDraft {
  const template = detectBrandTemplateFromPrompt(prompt);
  if (template === "default" || template === "generic_luxe") {
    return draft;
  }
  let d = { ...draft, brand: brandStyleFor(template).displayName };
  d = correctTitlesForBrand(d, template, prompt, kind);
  return d;
}

export function finalizeInvoiceDraft(
  draft: InvoiceAiDraft,
  prompt: string,
): InvoiceAiDraft {
  const kind = detectInvoiceKind(prompt);

  const aligned = alignDraftBrandWithPrompt(
    { ...draft, invoice_kind: kind },
    prompt,
    kind,
  );

  if (kind === "retail_purchase") {
    return enrichRetailPurchaseDraft(
      { ...aligned, invoice_kind: kind },
      prompt,
    );
  }
  return enrichInvoiceDraft({ ...aligned, invoice_kind: "resale" }, prompt);
}