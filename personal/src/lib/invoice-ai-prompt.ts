export const INVOICE_FROM_TEXT_SYSTEM = `Tu es expert facturation luxe France 2026 : maisons LV, Chanel, Hermès, Dior, Gucci, Prada — revente Vinted/Leboncoin ET achats boutique NEUFS.

Règle invoice_kind :
- "retail_purchase" : achat NEUF boutique/magasin (jamais de mention vendu à X sur Vinted).
- "resale" : vente seconde main avec acheteur (Vinted, Leboncoin, TikTok Shop, eBay).

retail_purchase par maison (platform boutique_* , carrier "Retrait boutique", platform_fees 0, gross = purchase = prix TTC) :
- LV : platform boutique_lv, Neverfull MM ref M41113 ~1890€, Speedy 25, SKU LV-ACHAT-*
- Chanel : boutique_chanel, Classic Flap medium ~9200€, rue Cambon
- Hermès : boutique_hermes, Birkin/Kelly, SKU HER-ACHAT-*
- Dior : boutique_dior, Lady Dior / Saddle, SKU DIOR-ACHAT-*
- Gucci : boutique_gucci, Marmont, SKU GUCCI-ACHAT-*
condition_label "Neuf — emballage d'origine", payment_method "Carte bancaire"

resale luxe :
- Titres précis (modèle, toile, taille), marque explicite, notes contrôle authenticité sans promesse légale absolue.
- platform_fees ~5% Vinted, ~0 sur Leboncoin selon contexte, purchase_cost réaliste marge seconde main.

JSON strict uniquement :
invoice_kind, item_title, brand, sku, buyer_name, buyer_city, gross_amount, purchase_cost,
platform, account_handle, carrier, platform_fees, notes, product_line, condition_label,
payment_method, store_name, store_city, boutique_ref, luxury_brand (bool)`;

export type InvoiceKind = "resale" | "retail_purchase";

export type InvoiceAiDraft = {
  invoice_kind?: InvoiceKind;
  item_title: string;
  brand: string;
  sku: string;
  buyer_name: string;
  buyer_city: string;
  gross_amount: number;
  purchase_cost: number;
  platform: string;
  account_handle: string;
  carrier: string;
  platform_fees: number;
  notes?: string;
  product_line?: string;
  condition_label?: string;
  luxury_brand?: boolean;
  payment_method?: string;
  store_name?: string;
  store_city?: string;
  boutique_ref?: string;
};

export const INVOICE_EXAMPLE_PROMPTS = [
  "Facture d'achat sac Louis Vuitton Neverfull MM neuf acheté boutique Champs-Élysées Paris 1890€",
  "Facture d'achat Chanel Classic Flap medium noir neuf boutique Rue Cambon 9200€",
  "Facture achat Hermès Birkin 30 gold Togo neuve boutique Faubourg Saint-Honoré 8800€",
  "Sac Dior Saddle medium neuf acheté Avenue Montaigne 3200€",
  "Fais une facture de ce sac Louis Vuitton Neverfull MM vendu 420€ à Sophie Martin à Lyon, Vinted",
  "Facture Nike Air Jordan 1 taille 42 vendue 95€ à Lucas Paris Leboncoin",
];