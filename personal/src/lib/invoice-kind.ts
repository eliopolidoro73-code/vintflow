export type InvoiceKind = "resale" | "retail_purchase";

const RESALE_HINTS =
  /vinted|leboncoin|tiktok|ebay|vendu|vente\b|revendu|acheteur|à\s+[A-ZÀ-Ÿ]|sur\s+vinted/i;

const RETAIL_HINTS =
  /facture\s+d['']achat|ticket\s+(de\s+)?caisse|reçu\s+boutique|achat\s+(chez|en\s+boutique|au\s+magasin|magasin)|achet[ée]\s+neuf|article\s+neuf|boutique\s+louis|magasin\s+lv|en\s+boutique\s+lv|cours\s+des\s+champs|printemps|galeries/i;

const LV_ITEM =
  /louis\s*vuitton|\blv\b|neverfull|speedy|keepall|alma|pochette\s+accessoires/i;

/** Détecte facture d'achat boutique vs facture de revente. */
export function detectInvoiceKind(prompt: string): InvoiceKind {
  const lower = prompt.toLowerCase().trim();
  if (RETAIL_HINTS.test(prompt)) return "retail_purchase";
  if (RESALE_HINTS.test(prompt)) return "resale";
  if (LV_ITEM.test(lower)) return "retail_purchase";
  if (/facture|reçu|ticket/i.test(lower) && !RESALE_HINTS.test(prompt)) {
    return "retail_purchase";
  }
  return "resale";
}

export function isRetailPurchasePlatform(platform: string): boolean {
  return /^boutique_/i.test(platform) || platform === "store_purchase";
}