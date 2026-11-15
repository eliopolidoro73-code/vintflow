export const INVOICE_FROM_TEXT_SYSTEM = `Tu es expert facturation luxe (France) : revente Vinted ET achats en boutique.

Étape 1 — choisis invoice_kind :
- "retail_purchase" : achat article NEUF en magasin / boutique (Louis Vuitton, etc.), ticket de caisse, facture d'achat. Mots-clés : achat boutique, neuf, Louis Vuitton Neverfull sans mention de vente Vinted.
- "resale" : vente seconde main à un acheteur (Vinted, Leboncoin).

Étape 2 — retail_purchase Louis Vuitton :
- brand : "Louis Vuitton", platform : "boutique_lv", carrier : "Retrait boutique"
- account_handle : "Boutique Louis Vuitton"
- Neverfull MM : product_line "Neverfull MM", boutique_ref "M41113", prix neuf TTC réaliste (~1890 € si non précisé)
- item_title : "Sac Neverfull MM — toile Monogram · article neuf"
- sku : "LV-ACHAT-M41113"
- condition_label : "Neuf — emballage d'origine"
- gross_amount = prix d'achat TTC, purchase_cost = même montant, platform_fees : 0
- payment_method : "Carte bancaire", store_name : "Louis Vuitton France", store_city (ex Paris)
- buyer_name : le client ayant acheté en boutique

Étape 3 — resale :
- item_title occasion authentique, platform vinted|leboncoin, platform_fees ~5%, purchase_cost marge seconde main.

Retourne UNIQUEMENT un JSON :
invoice_kind, item_title, brand, sku, buyer_name, buyer_city, gross_amount, purchase_cost,
platform, account_handle, carrier, platform_fees, notes, product_line, condition_label,
payment_method, store_name, store_city, boutique_ref`;

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
  "Facture d'achat sac Louis Vuitton Neverfull MM neuf acheté en boutique Paris 1890€",
  "Fais une facture de ce sac Louis Vuitton Neverfull MM vendu 420€ à Sophie Martin à Lyon, Vinted",
  "Facture Nike Air Jordan 1 taille 42 vendue 95€ à Lucas Paris Leboncoin",
];