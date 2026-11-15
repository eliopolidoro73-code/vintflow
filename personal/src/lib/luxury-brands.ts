/** Marques luxe pour vision IA, factures et annonces (sans logos déposés). */
export const LUXURY_BRAND_CATALOG = [
  { key: "louis vuitton", brand: "Louis Vuitton", cat: "Sacs & Maroquinerie", avgPrice: 890 },
  { key: "neverfull", brand: "Louis Vuitton", cat: "Sacs", avgPrice: 420 },
  { key: "speedy", brand: "Louis Vuitton", cat: "Sacs", avgPrice: 380 },
  { key: "chanel", brand: "Chanel", cat: "Sacs luxe", avgPrice: 3200 },
  { key: "classic flap", brand: "Chanel", cat: "Sacs", avgPrice: 4800 },
  { key: "hermes", brand: "Hermès", cat: "Maroquinerie", avgPrice: 4500 },
  { key: "birkin", brand: "Hermès", cat: "Sacs", avgPrice: 8500 },
  { key: "kelly", brand: "Hermès", cat: "Sacs", avgPrice: 6200 },
  { key: "dior", brand: "Dior", cat: "Sacs", avgPrice: 2100 },
  { key: "saddle", brand: "Dior", cat: "Sacs", avgPrice: 1950 },
  { key: "gucci", brand: "Gucci", cat: "Sacs", avgPrice: 980 },
  { key: "marmont", brand: "Gucci", cat: "Sacs", avgPrice: 720 },
  { key: "prada", brand: "Prada", cat: "Sacs", avgPrice: 850 },
  { key: "celine", brand: "Celine", cat: "Sacs", avgPrice: 920 },
  { key: "ysl", brand: "Saint Laurent", cat: "Sacs", avgPrice: 1100 },
] as const;

export function matchLuxuryFromText(blob: string) {
  const lower = blob.toLowerCase();
  return LUXURY_BRAND_CATALOG.find((b) => lower.includes(b.key));
}