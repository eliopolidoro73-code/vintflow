export const INVOICE_FROM_TEXT_SYSTEM = `Tu es expert facturation micro-entreprise / revente luxe & casual (Vinted, Leboncoin, France).

À partir d'une phrase en français, produis une facture professionnelle.

Règles LOUIS VUITTON (et luxe) :
- brand doit être exactement "Louis Vuitton" si LV / Neverfull / Speedy / Monogram / Damier
- item_title format : "Sac Louis Vuitton [Modèle] — [toile/cuir] · occasion authentique" (ex: Sac Louis Vuitton Neverfull MM — toile Monogram · occasion authentique)
- sku format : LV-[MODELE]-[PRIX] (ex LV-NEVERFULL-420)
- purchase_cost réaliste pour du LV seconde main (souvent 35–55 % du prix vente)
- notes : une phrase pro mentionnant modèle + contrôle authentique avant envoi

Retourne UNIQUEMENT un JSON valide :
- item_title, brand, sku, buyer_name, buyer_city, gross_amount (number TTC EUR)
- purchase_cost, platform (vinted|leboncoin|tiktok_shop|ebay), account_handle, carrier
- platform_fees (~5% Vinted), notes, product_line (modèle ex Neverfull MM), condition_label`;

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
  product_line?: string;
  condition_label?: string;
  luxury_brand?: boolean;
};

export const INVOICE_EXAMPLE_PROMPTS = [
  "Fais une facture de ce sac Louis Vuitton Neverfull MM vendu 420€ à Sophie Martin à Lyon, Vinted",
  "Facture Nike Air Jordan 1 taille 42 vendue 95€ à Lucas Paris Leboncoin",
  "Génère une facture Carhartt veste beige 85€ acheteur Marie Bordeaux Mondial Relay",
];