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
      "Calcul automatique de la marge commerciale",
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
    activeItemsLimit: 10000,
    crosslistMonthlyLimit: 10000,
    aiCreditsMonthlyLimit: 5000,
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

export interface PlanComparison {
  priceDiff: number;
  gains: string[];
  losses: string[];
}

export function comparePlans(
  fromId: PlanId,
  toId: PlanId,
  cycle: BillingCycle = "monthly",
): PlanComparison {
  const from = PLANS[fromId];
  const to = PLANS[toId];
  const fromPrice = cycle === "annual" ? from.annualMonthlyPrice : from.monthlyPrice;
  const toPrice = cycle === "annual" ? to.annualMonthlyPrice : to.monthlyPrice;
  const gains: string[] = [];
  const losses: string[] = [];

  if (to.vintedAccountsLimit > from.vintedAccountsLimit) {
    gains.push(`${to.vintedAccountsLimit} comptes Vinted (au lieu de ${from.vintedAccountsLimit})`);
  } else if (to.vintedAccountsLimit < from.vintedAccountsLimit) {
    losses.push(`Comptes Vinted réduits à ${to.vintedAccountsLimit} (au lieu de ${from.vintedAccountsLimit})`);
  }

  if (to.activeItemsLimit > from.activeItemsLimit) {
    gains.push(`Stock jusqu'à ${to.activeItemsLimit} articles (au lieu de ${from.activeItemsLimit})`);
  } else if (to.activeItemsLimit < from.activeItemsLimit) {
    losses.push(`Stock réduit à ${to.activeItemsLimit} articles (au lieu de ${from.activeItemsLimit})`);
  }

  if (to.aiCreditsMonthlyLimit > from.aiCreditsMonthlyLimit) {
    gains.push(
      from.aiCreditsMonthlyLimit === 0
        ? `Suite IA débloquée (${to.aiCreditsMonthlyLimit} crédits/mois)`
        : `${to.aiCreditsMonthlyLimit} crédits IA/mois (au lieu de ${from.aiCreditsMonthlyLimit})`,
    );
  } else if (to.aiCreditsMonthlyLimit < from.aiCreditsMonthlyLimit) {
    losses.push(
      to.aiCreditsMonthlyLimit === 0
        ? "Perte de toute la Boîte à outils IA (Studio Photo, 3-en-1, Anti-Shadowban, Sniper)"
        : `Crédits IA réduits à ${to.aiCreditsMonthlyLimit}/mois (au lieu de ${from.aiCreditsMonthlyLimit})`,
    );
  }

  if (to.crosslistMonthlyLimit > from.crosslistMonthlyLimit) {
    gains.push(
      from.crosslistMonthlyLimit === 0
        ? `Crosslisting Vinted ↔ LBC (${to.crosslistMonthlyLimit}/mois)`
        : `${to.crosslistMonthlyLimit} crosslistings/mois (au lieu de ${from.crosslistMonthlyLimit})`,
    );
  } else if (to.crosslistMonthlyLimit < from.crosslistMonthlyLimit) {
    losses.push(
      to.crosslistMonthlyLimit === 0
        ? "Perte du Crosslisting Vinted ↔ Leboncoin"
        : `Crosslisting réduit à ${to.crosslistMonthlyLimit}/mois (au lieu de ${from.crosslistMonthlyLimit})`,
    );
  }

  if (to.autoCrosslistAllowed && !from.autoCrosslistAllowed) {
    gains.push("Publication automatique 8h–23h activée");
  } else if (!to.autoCrosslistAllowed && from.autoCrosslistAllowed) {
    losses.push("Perte de la publication automatique 8h–23h");
  }

  if (to.pdfInvoicesAllowed && !from.pdfInvoicesAllowed) {
    gains.push("Factures PDF & Bordereaux thermiques 10×15 SKU");
  } else if (!to.pdfInvoicesAllowed && from.pdfInvoicesAllowed) {
    losses.push("Perte des Factures PDF & Bordereaux 10×15");
  }

  if (to.unifiedMessagesAllowed && !from.unifiedMessagesAllowed) {
    gains.push("Messagerie multi-comptes unifiée");
  } else if (!to.unifiedMessagesAllowed && from.unifiedMessagesAllowed) {
    losses.push("Perte de la messagerie unifiée");
  }

  if (to.novaAssistantAllowed && !from.novaAssistantAllowed) {
    gains.push("Assistant IA Nova connecté à tes données (actions 1 clic)");
  } else if (!to.novaAssistantAllowed && from.novaAssistantAllowed) {
    losses.push("Perte de l'Assistant IA Nova");
  }

  return {
    priceDiff: toPrice - fromPrice,
    gains,
    losses,
  };
}
