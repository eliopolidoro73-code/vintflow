export type PlanId = "starter" | "pro";
export type BillingCycle = "monthly" | "annual";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualMonthlyPrice: number;
  annualTotal: number;
  vintedAccountsLimit: number;
  leboncoinAccountsLimit: number;
  tiktokAccountsLimit: number;
  ebayAccountsLimit: number;
  whatnotAccountsLimit: number;
  crosslistMonthlyLimit: number | null;
  companiesLimit: number;
  collaboratorsLimit: number;
  accountantAccess: boolean;
  autoInvoiceEmails: boolean;
  skuSlipSummary: boolean;
  supportSla: string;
  features: string[];
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  starter: {
    id: "starter",
    name: "Starter",
    tagline: "Couvre tout ce qu'il faut pour vendre proprement.",
    monthlyPrice: 29,
    annualMonthlyPrice: 24,
    annualTotal: 290,
    vintedAccountsLimit: 3,
    leboncoinAccountsLimit: 1,
    tiktokAccountsLimit: 1,
    ebayAccountsLimit: 1,
    whatnotAccountsLimit: 1,
    crosslistMonthlyLimit: 500,
    companiesLimit: 1,
    collaboratorsLimit: 0,
    accountantAccess: false,
    autoInvoiceEmails: false,
    skuSlipSummary: false,
    supportSla: "Sous 24 h",
    features: [
      "3 comptes Vinted (jusqu'à 5 en option), 1 Leboncoin, 1 TikTok Shop, 1 eBay, 1 Whatnot",
      "Crosslisting Vinted ↔ Leboncoin : 500 publications/mois, retrait auto quand ça se vend",
      "Synchronisation automatique toutes les heures, historique inclus",
      "Marge réelle, URSSAF, TVA, achats et stock reliés aux ventes",
      "Factures PDF et exports comptables France & Belgique (CSV / Excel)",
      "Inventaire, SKU, lots et bordereaux 10×15 (4×6)",
      "Assistant IA Copilote connecté à tes chiffres & support 24 h",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "Ajoute les comptes, le comptable, les collaborateurs et le volume.",
    monthlyPrice: 49,
    annualMonthlyPrice: 41,
    annualTotal: 490,
    vintedAccountsLimit: 10,
    leboncoinAccountsLimit: 3,
    tiktokAccountsLimit: 3,
    ebayAccountsLimit: 3,
    whatnotAccountsLimit: 3,
    crosslistMonthlyLimit: null,
    companiesLimit: 3,
    collaboratorsLimit: 3,
    accountantAccess: true,
    autoInvoiceEmails: true,
    skuSlipSummary: true,
    supportSla: "Prioritaire sous 2 h",
    features: [
      "10 comptes Vinted (illimités en option), 3 Leboncoin, 3 TikTok Shop, 3 eBay, 3 Whatnot",
      "Crosslisting illimité Vinted ↔ Leboncoin + publication auto 8h–23h",
      "Jusqu'à 3 sociétés et comptabilité consolidée par entité",
      "Accès comptable en lecture seule + 3 collaborateurs limités par page",
      "E-mails d'expédition automatiques avec facture & formulaire de retour",
      "Récapitulatif des colis avec étiquettes SKU pour préparation rapide",
      "Assistant IA Copilote avancé & support prioritaire sous 2 h",
    ],
  },
};
