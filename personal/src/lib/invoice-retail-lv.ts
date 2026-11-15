import type { InvoiceAiDraft } from "@/lib/invoice-ai-prompt";
import { isLouisVuitton } from "@/lib/invoice-luxury";

const LV_RETAIL_REFS: Array<{ match: RegExp; model: string; ref: string; canvas: string; defaultPrice: number }> = [
  {
    match: /neverfull/i,
    model: "Neverfull MM",
    ref: "M41113",
    canvas: "Monogram",
    defaultPrice: 1890,
  },
  {
    match: /speedy\s*30/i,
    model: "Speedy 30",
    ref: "M41526",
    canvas: "Monogram",
    defaultPrice: 1150,
  },
  { match: /speedy/i, model: "Speedy 25", ref: "M41524", canvas: "Monogram", defaultPrice: 1090 },
  { match: /keepall/i, model: "Keepall Bandoulière 55", ref: "M41418", canvas: "Monogram", defaultPrice: 2150 },
  { match: /alma/i, model: "Alma PM", ref: "M53152", canvas: "Monogram", defaultPrice: 1750 },
];

function pickLvRetail(prompt: string) {
  for (const row of LV_RETAIL_REFS) {
    if (row.match.test(prompt)) return row;
  }
  return LV_RETAIL_REFS[0];
}

function extractPrice(prompt: string, fallback: number): number {
  const m = [...prompt.matchAll(/(\d[\d\s]*)\s*€/gi)];
  const nums = m.map((x) => Number(x[1].replace(/\s/g, ""))).filter((n) => n > 50);
  return nums[0] ?? fallback;
}

function extractCustomerName(prompt: string): string {
  const patterns = [
    /(?:pour|au nom de|client[e]?)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'-]{2,40})/i,
    /achet[ée]\s+par\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'-]{2,40})/i,
    /(?:m\.|mme|mlle)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'-]{2,40})/i,
  ];
  for (const re of patterns) {
    const hit = re.exec(prompt);
    if (hit?.[1]) return hit[1].trim().slice(0, 80);
  }
  return "Client";
}

function extractStoreCity(prompt: string): string {
  const m =
    /(?:boutique|magasin)\s+(?:de\s+)?(?:lv|louis\s*vuitton\s+)?(?:à|sur)\s+([A-Za-zÀ-ÿ\s-]+)/i.exec(
      prompt,
    ) ?? /(?:à|sur)\s+(Paris|Lyon|Marseille|Bordeaux|Lille|Nice|Cannes|Strasbourg)/i.exec(prompt);
  return m?.[1]?.trim().slice(0, 60) || "Paris";
}

/** Facture d'achat boutique Louis Vuitton (article neuf). */
export function enrichRetailPurchaseDraft(
  draft: InvoiceAiDraft,
  prompt: string,
): InvoiceAiDraft {
  const d = { ...draft };
  const lv = isLouisVuitton(`${prompt} ${d.brand} ${d.item_title}`);
  if (lv) {
    const spec = pickLvRetail(prompt);
    const price = extractPrice(prompt, spec.defaultPrice);
    d.invoice_kind = "retail_purchase";
    d.brand = "Louis Vuitton";
    d.platform = "boutique_lv";
    d.account_handle = "Boutique Louis Vuitton";
    d.carrier = "Retrait boutique";
    d.product_line = spec.model;
    d.item_title = `Sac ${spec.model} — toile ${spec.canvas} · article neuf`;
    d.sku = `LV-ACHAT-${spec.ref}`;
    d.boutique_ref = spec.ref;
    d.condition_label = "Neuf — emballage d'origine, facture boutique";
    d.gross_amount = Math.max(price, spec.defaultPrice * 0.85);
    d.purchase_cost = d.gross_amount;
    d.platform_fees = 0;
    d.payment_method = d.payment_method ?? "Carte bancaire — Visa/Mastercard";
    d.store_name = d.store_name ?? "Louis Vuitton France";
    d.store_city = d.store_city ?? extractStoreCity(prompt);
    d.buyer_name = d.buyer_name?.length > 2 ? d.buyer_name : extractCustomerName(prompt);
    d.buyer_city = d.store_city;
    d.notes =
      d.notes ??
      `Achat en boutique Louis Vuitton — ${spec.model} (réf. ${spec.ref}), TTC, TVA incluse. Pièce neuve avec dustbag et reçu d'origine.`;
    d.luxury_brand = true;
  } else {
    d.invoice_kind = "retail_purchase";
    d.platform = d.platform.startsWith("boutique") ? d.platform : "boutique";
    d.carrier = "Retrait magasin";
    d.condition_label = d.condition_label ?? "Neuf";
    d.purchase_cost = d.gross_amount;
    d.platform_fees = 0;
    d.payment_method = d.payment_method ?? "Carte bancaire";
    d.store_name = d.store_name ?? (d.brand || "Magasin");
    d.store_city = d.store_city ?? extractStoreCity(prompt);
  }
  return d;
}