import type { InvoiceAiDraft } from "@/lib/invoice-ai-prompt";
import { isLouisVuitton } from "@/lib/invoice-luxury";

const LUXE_RETAIL: Array<{
  re: RegExp;
  brand: string;
  platform: string;
  skuPrefix: string;
  store: string;
  defaultPrice: number;
  title: (model: string) => string;
}> = [
  {
    re: /\bmoncler\b|veste\s+moncler|maya|grenoble|doudoune\s+moncler/i,
    brand: "Moncler",
    platform: "boutique_moncler",
    skuPrefix: "MON-ACHAT",
    store: "Moncler",
    defaultPrice: 1490,
    title: (m) => `Doudoune Moncler ${m || "Maya"} · neuf boutique`,
  },
  {
    re: /chanel/i,
    brand: "Chanel",
    platform: "boutique_chanel",
    skuPrefix: "CH-ACHAT",
    store: "Chanel France",
    defaultPrice: 5200,
    title: (m) => `Sac Chanel ${m} · neuf boutique`,
  },
  {
    re: /herm[eè]s/i,
    brand: "Hermès",
    platform: "boutique_hermes",
    skuPrefix: "HER-ACHAT",
    store: "Hermès Sellier",
    defaultPrice: 6800,
    title: () => "Article maroquinerie Hermès · neuf",
  },
  {
    re: /\bdior\b/i,
    brand: "Dior",
    platform: "boutique_dior",
    skuPrefix: "DIOR-ACHAT",
    store: "Christian Dior",
    defaultPrice: 3200,
    title: () => "Sac Dior · neuf boutique",
  },
  {
    re: /\bgucci\b/i,
    brand: "Gucci",
    platform: "boutique_gucci",
    skuPrefix: "GUCCI-ACHAT",
    store: "Gucci Italia",
    defaultPrice: 2100,
    title: () => "Sac Gucci · neuf",
  },
];

const MONCLER_RETAIL_REFS: Array<{
  match: RegExp;
  model: string;
  ref: string;
  defaultPrice: number;
}> = [
  { match: /veste/i, model: "Veste", ref: "9B101", defaultPrice: 890 },
  { match: /maya/i, model: "Maya", ref: "1A203", defaultPrice: 1490 },
  { match: /grenoble/i, model: "Grenoble", ref: "3B109", defaultPrice: 1290 },
  { match: /genius/i, model: "Genius", ref: "4A118", defaultPrice: 1890 },
  { match: /bady/i, model: "Bady", ref: "2A120", defaultPrice: 1390 },
];

function pickMonclerRetail(prompt: string) {
  for (const row of MONCLER_RETAIL_REFS) {
    if (row.match.test(prompt)) return row;
  }
  return MONCLER_RETAIL_REFS[0];
}

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
    /(?:boutique|magasin)\s+(?:de\s+)?(?:(?:lv|louis\s*vuitton|moncler)\s+)?(?:à|sur)\s+([A-Za-zÀ-ÿ\s-]+)/i.exec(
      prompt,
    ) ?? /(?:à|sur)\s+(Paris|Lyon|Marseille|Bordeaux|Lille|Nice|Cannes|Strasbourg)/i.exec(prompt);
  return m?.[1]?.trim().slice(0, 60) || "Paris";
}

function monclerStoreLine(city: string): string {
  if (/galeries|haussmann/i.test(city) || city === "Paris")
    return "Moncler Paris Galeries Lafayette · 40, boulevard Haussmann · 75009 Paris";
  return `Moncler · boutique ${city}`;
}

/** Facture d'achat boutique (neuf) — maison détectée depuis le prompt, pas de défaut LV. */
export function enrichRetailPurchaseDraft(
  draft: InvoiceAiDraft,
  prompt: string,
): InvoiceAiDraft {
  const d = { ...draft };
  const blob = `${prompt} ${d.brand} ${d.item_title}`;

  const other = LUXE_RETAIL.find((b) => b.re.test(blob));
  if (other) {
    const price = extractPrice(prompt, other.defaultPrice);
    d.invoice_kind = "retail_purchase";
    d.brand = other.brand;
    d.platform = other.platform;
    d.account_handle = `Boutique ${other.brand}`;
    d.carrier = "Retrait boutique";
    d.platform_fees = 0;
    d.gross_amount = price;
    d.purchase_cost = price;
    d.payment_method = d.payment_method ?? "Carte bancaire — Visa/Mastercard";
    d.store_city = d.store_city ?? extractStoreCity(prompt);
    d.buyer_name = d.buyer_name?.length > 2 ? d.buyer_name : extractCustomerName(prompt);
    d.buyer_city = d.store_city;
    d.condition_label = "Neuf — emballage d'origine, facture boutique";
    d.luxury_brand = true;

    if (other.brand === "Moncler") {
      const spec = pickMonclerRetail(prompt);
      d.product_line = spec.model;
      d.boutique_ref = spec.ref;
      d.sku = `${other.skuPrefix}-${spec.ref}`;
      d.item_title = other.title(spec.model);
      d.store_name = monclerStoreLine(d.store_city);
      d.notes =
        d.notes ??
        `Achat boutique Moncler — ${spec.model} (réf. ${spec.ref}), TTC, TVA incluse. Pièce neuve.`;
      return d;
    }

    d.item_title = other.title(d.product_line ?? "classique");
    d.sku = `${other.skuPrefix}-${String(Math.round(price))}`;
    d.store_name = other.store;
    return d;
  }

  const lv = isLouisVuitton(blob);
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
    return d;
  }

  d.invoice_kind = "retail_purchase";
  d.platform = d.platform.startsWith("boutique") ? d.platform : "boutique";
  d.carrier = "Retrait magasin";
  d.condition_label = d.condition_label ?? "Neuf";
  d.purchase_cost = d.gross_amount;
  d.platform_fees = 0;
  d.payment_method = d.payment_method ?? "Carte bancaire";
  d.store_name = d.store_name ?? (d.brand || "Magasin");
  d.store_city = d.store_city ?? extractStoreCity(prompt);
  return d;
}