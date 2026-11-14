export function formatEuro(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDateFr(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function daysSince(input: string | Date): number {
  const date = typeof input === "string" ? new Date(input) : input;
  const diff = Date.now() - date.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function generateListingCopy(params: {
  title: string;
  brand: string;
  category: string;
  size: string;
  condition: string;
  listingPrice: number;
}) {
  const cleanBrand = params.brand.trim() || "Sans marque";
  const cleanTitle = params.title.trim();

  const seoTitle = [cleanTitle, cleanBrand !== "Sans marque" ? cleanBrand : "", `Taille ${params.size}`, params.condition]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 75);

  const stripAccents = (val: string) =>
    val
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const vinted = `${cleanTitle} — ${cleanBrand}
Taille : ${params.size} | État : ${params.condition}

Article contrôlé et prêt à être expédié sous 24h (Mondial Relay, Vinted Go ou Chronopost).
Emballage soigné, maison non-fumeur.
N'hésite pas si tu veux les mesures exactes ou faire un lot pour réduire les frais de port !

#${stripAccents(cleanBrand)} #${stripAccents(params.category)} #secondemain #vintage`;

  const leboncoin = `${cleanTitle} (${cleanBrand}) en ${params.condition.toLowerCase()}.
Taille : ${params.size} | Catégorie : ${params.category}.

Remise en main propre possible ou envoi rapide et sécurisé via le paiement Leboncoin (Mondial Relay / Colissimo).
Prix affiché : ${params.listingPrice} €. Premier arrivé, premier servi.`;

  return { seoTitle, vinted, leboncoin };
}

export function computeNetMargin(params: {
  grossAmount: number;
  purchaseCost: number;
  platformFees: number;
  boostCost: number;
  shippingCost: number;
  urssafRate: number;
}) {
  const urssafAmount = Number(
    ((params.grossAmount * params.urssafRate) / 100).toFixed(2),
  );
  const netMargin = Number(
    (
      params.grossAmount -
      params.purchaseCost -
      params.platformFees -
      params.boostCost -
      params.shippingCost -
      urssafAmount
    ).toFixed(2),
  );
  return { urssafAmount, netMargin };
}
