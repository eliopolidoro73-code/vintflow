export type PlanId = "essentiel" | "plus" | "pro";
export type BillingCycle = "monthly" | "annual";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  badge?: string;
  tagline: string;
  monthlyPrice: number;
  annualMonthlyPrice: number;
  annualTotal: number;
  vintedAccountsLimit: number;
  leboncoinAccountsLimit: number;
  tiktokAccountsLimit: number;
  ebayAccountsLimit: number;
  whatnotAccountsLimit: number;
  activeItemsLimit: number;
  crosslistMonthlyLimit: number;
  aiCreditsMonthlyLimit: number;
  autoCrosslistAllowed: boolean;
  pdfInvoicesAllowed: boolean;
  unifiedMessagesAllowed: boolean;
  novaAssistantAllowed: boolean;
  companiesLimit: number;
  collaboratorsLimit: number;
  accountantAccess: boolean;
  supportSla: string;
  features: string[];
  lockedFeatures: string[];
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  essentiel: {
    id: "essentiel",
    name: "Essentiel",
    tagline: "Pour démarrer proprement sans fichier Excel.",
    monthlyPrice: 9,
    annualMonthlyPrice: 7,
    annualTotal: 84,
    vintedAccountsLimit: 1,
    leboncoinAccountsLimit: 1,
    tiktokAccountsLimit: 0,
    ebayAccountsLimit: 0,
    whatnotAccountsLimit: 0,
    activeItemsLimit: 40,
    crosslistMonthlyLimit: 0,
    aiCreditsMonthlyLimit: 0,
    autoCrosslistAllowed: false,
    pdfInvoicesAllowed: false,
    unifiedMessagesAllowed: false,
    novaAssistantAllowed: false,
    companiesLimit: 1,
    collaboratorsLimit: 0,
    accountantAccess: false,
    supportSla: "Sous 48 h",
    features: [
      "1 compte Vinted + 1 compte Leboncoin",
      "Stock SKU jusqu'à 40 articles actifs",
      "Calcul automatique marge nette & URSSAF",
      "Export CSV du livre des recettes",
    ],
    lockedFeatures: [
      "Sans Studio Photo & Outils IA",
      "Sans Crosslisting Vinted ↔ Leboncoin",
      "Sans Factures PDF, Bordereaux 10×15 ni Nova IA",
    ],
  },
  plus: {
    id: "plus",
    name: "Vendeur Plus",
    badge: "Populaire",
    tagline: "Les meilleurs outils avec quotas mensuels pour accélérer.",
    monthlyPrice: 29,
    annualMonthlyPrice: 24,
    annualTotal: 290,
    vintedAccountsLimit: 3,
    leboncoinAccountsLimit: 1,
    tiktokAccountsLimit: 1,
    ebayAccountsLimit: 1,
    whatnotAccountsLimit: 1,
    activeItemsLimit: 300,
    crosslistMonthlyLimit: 100,
    aiCreditsMonthlyLimit: 30,
    autoCrosslistAllowed: false,
    pdfInvoicesAllowed: true,
    unifiedMessagesAllowed: true,
    novaAssistantAllowed: false,
    companiesLimit: 1,
    collaboratorsLimit: 0,
    accountantAccess: false,
    supportSla: "Sous 24 h",
    features: [
      "3 comptes Vinted, 1 Leboncoin, 1 TikTok Shop, 1 eBay, 1 Whatnot",
      "300 articles actifs + Crosslisting Vinted ↔ Leboncoin (100/mois)",
      "30 crédits IA/mois : Studio Photo, Annonce IA, Anti-Shadowban & Sniper Négo",
      "Factures PDF conformes + Bordereaux thermiques 10×15 SKU",
      "Messagerie unifiée multi-comptes avec réponses rapides",
    ],
    lockedFeatures: [
      "Crosslisting limité à 100/mois (sans publication auto 8h–23h)",
      "Sans Assistant IA Nova connecté aux données",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro Scale",
    badge: "Haute Capacité",
    tagline: "La puissance maximale pour les gros vendeurs et pros.",
    monthlyPrice: 49,
    annualMonthlyPrice: 41,
    annualTotal: 490,
    vintedAccountsLimit: 10,
    leboncoinAccountsLimit: 3,
    tiktokAccountsLimit: 3,
    ebayAccountsLimit: 3,
    whatnotAccountsLimit: 3,
    activeItemsLimit: 1500,
    crosslistMonthlyLimit: 2000,
    aiCreditsMonthlyLimit: 300,
    autoCrosslistAllowed: true,
    pdfInvoicesAllowed: true,
    unifiedMessagesAllowed: true,
    novaAssistantAllowed: true,
    companiesLimit: 3,
    collaboratorsLimit: 3,
    accountantAccess: true,
    supportSla: "Prioritaire sous 2 h",
    features: [
      "10 comptes Vinted, 3 Leboncoin, 3 TikTok Shop, 3 eBay, 3 Whatnot",
      "1 500 articles + 2 000 crosslistings/mois + Publication auto 8h–23h",
      "Suite IA Haute Capacité (300 crédits/mois) : Vision IA, 3-en-1, Anti-Shadowban & Sniper",
      "Assistant IA Nova connecté à tes vrais chiffres (actions 1 clic)",
      "Factures PDF + Bordereaux 10×15 + jusqu'à 3 sociétés & accès comptable",
      "3 collaborateurs + Support prioritaire sous 2 h",
    ],
    lockedFeatures: [],
  },
};

export function normalizePlanId(raw: string | undefined | null): PlanId {
  if (raw === "pro") return "pro";
  if (raw === "plus") return "plus";
  return "essentiel";
}
