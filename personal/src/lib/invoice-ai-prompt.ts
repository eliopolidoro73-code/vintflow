export const INVOICE_FROM_TEXT_SYSTEM = `Tu es expert facturation micro-entreprise / revente (Vinted, Leboncoin, France).

À partir d'une phrase en français (ex: "fait une facture de ce sac Louis Vuitton Neverfull vendu 420€ à Sophie Lyon sur Vinted"), extrais les données facture.

Retourne UNIQUEMENT un JSON valide :
- item_title (désignation complète FR, marque incluse)
- brand (string)
- sku (réf. courte inventée, ex LV-NF-MONO-01)
- buyer_name
- buyer_city
- gross_amount (number TTC EUR)
- purchase_cost (number, estime réaliste si non mentionné)
- platform (vinted | leboncoin | tiktok_shop | ebay)
- account_handle (ex @mon_dressing si inconnu)
- carrier (Mondial Relay par défaut)
- platform_fees (number, ~5% Vinted si non précisé)
- notes (une ligne FR résumant la vente)`;

export type InvoiceAiDraft = {
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
};

export const INVOICE_EXAMPLE_PROMPTS = [
  "Fais une facture de ce sac Louis Vuitton Neverfull MM vendu 420€ à Sophie Martin à Lyon, Vinted",
  "Facture Nike Air Jordan 1 taille 42 vendue 95€ à Lucas Paris Leboncoin",
  "Génère une facture Carhartt veste beige 85€ acheteur Marie Bordeaux Mondial Relay",
];