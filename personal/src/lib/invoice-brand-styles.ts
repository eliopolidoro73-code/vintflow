import type { jsPDF } from "jspdf";
import {
  isLouisVuitton,
  luxuryMetaFromTitle,
} from "@/lib/invoice-luxury";

export type InvoiceBrandTemplate =
  | "louis_vuitton"
  | "chanel"
  | "hermes"
  | "dior"
  | "gucci"
  | "generic_luxe"
  | "default";

export type BrandStyle = {
  template: InvoiceBrandTemplate;
  displayName: string;
  headerBg: readonly [number, number, number];
  accent: readonly [number, number, number];
  muted: readonly [number, number, number];
  invoiceLabel: string;
  retailLabel?: string;
  footerTagline?: string;
  retailFooter?: string;
};

const BRAND_MATCHERS: Array<{ template: InvoiceBrandTemplate; re: RegExp }> = [
  { template: "louis_vuitton", re: /louis\s*vuitton|\blv\b|neverfull|monogram|damier/i },
  { template: "chanel", re: /\bchanel\b|boy\s*bag|classic\s*flap|2\.55/i },
  { template: "hermes", re: /herm[eè]s|birkin|kelly|constance/i },
  { template: "dior", re: /\bdior\b|lady\s*dior|saddle|oblique/i },
  { template: "gucci", re: /\bgucci\b|gg\s*marmont|dionysus/i },
];

export function detectInvoiceBrandTemplate(
  itemTitle: string,
  sku: string,
  explicitBrand?: string,
): InvoiceBrandTemplate {
  const blob = `${explicitBrand ?? ""} ${itemTitle} ${sku}`;
  for (const { template, re } of BRAND_MATCHERS) {
    if (re.test(blob)) return template;
  }
  const luxury = luxuryMetaFromTitle(itemTitle, sku);
  if (luxury.isLuxury || isLouisVuitton(blob)) return "generic_luxe";
  return "default";
}

export function brandStyleFor(template: InvoiceBrandTemplate): BrandStyle {
  switch (template) {
    case "louis_vuitton":
      return {
        template,
        displayName: "Louis Vuitton",
        headerBg: [250, 246, 240],
        accent: [92, 64, 51],
        muted: [130, 105, 88],
        invoiceLabel: "REÇU DE VENTE · MAISON",
        retailLabel: "FACTURE D'ACHAT · BOUTIQUE",
        footerTagline: "Article d'occasion authentique — contrôle visuel avant expédition.",
        retailFooter:
          "Achat article neuf — conservez ce document pour la garantie et le SAV maison.",
      };
    case "chanel":
      return {
        template,
        displayName: "Chanel",
        headerBg: [18, 18, 20],
        accent: [245, 245, 245],
        muted: [160, 160, 165],
        invoiceLabel: "FACTURE BOUTIQUE · COUTURE",
        footerTagline: "Pièce seconde main — état décrit sur la fiche Vinted.",
      };
    case "hermes":
      return {
        template,
        displayName: "Hermès",
        headerBg: [252, 249, 244],
        accent: [37, 90, 74],
        muted: [100, 120, 108],
        invoiceLabel: "BORDEREAU · MAROQUINERIE",
        footerTagline: "Vente particulière — article d'occasion contrôlé.",
      };
    case "dior":
      return {
        template,
        displayName: "Dior",
        headerBg: [248, 245, 250],
        accent: [45, 35, 75],
        muted: [110, 100, 130],
        invoiceLabel: "FACTURE · MAISON DIOR",
        footerTagline: "Occasion authentique — photos à jour sur l'annonce.",
      };
    case "gucci":
      return {
        template,
        displayName: "Gucci",
        headerBg: [245, 242, 235],
        accent: [26, 92, 56],
        muted: [90, 115, 95],
        invoiceLabel: "REÇU · LUXE ITALIEN",
        footerTagline: "Seconde main — conforme à l'état annoncé.",
      };
    case "generic_luxe":
      return {
        template,
        displayName: "Luxe & Maroquinerie",
        headerBg: [248, 250, 252],
        accent: [71, 85, 105],
        muted: [120, 128, 140],
        invoiceLabel: "FACTURE · ARTICLE DE LUXE",
        footerTagline: "Vente occasion — contrôle qualité avant envoi.",
      };
    default:
      return {
        template: "default",
        displayName: "",
        headerBg: [248, 250, 252],
        accent: [5, 120, 85],
        muted: [100, 116, 139],
        invoiceLabel: "FACTURE",
      };
  }
}

/** Motif géométrique évoquant l'identité maison (wordmark typographique, pas de logo déposé). */
export function drawBrandMark(
  doc: jsPDF,
  style: BrandStyle,
  x: number,
  y: number,
): void {
  const t = style.template;
  doc.setDrawColor(style.accent[0], style.accent[1], style.accent[2]);
  doc.setFillColor(style.accent[0], style.accent[1], style.accent[2]);

  if (t === "louis_vuitton") {
    const cx = x + 8;
    const cy = y + 6;
    const r = 2.8;
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      doc.circle(cx + Math.cos(a) * 3.2, cy + Math.sin(a) * 3.2, r, "F");
    }
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.setTextColor(style.accent[0], style.accent[1], style.accent[2]);
    doc.text("LOUIS VUITTON", x + 18, y + 8);
  } else if (t === "chanel") {
    doc.setLineWidth(0.45);
    doc.circle(x + 6, y + 6, 5, "S");
    doc.circle(x + 11, y + 6, 5, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(style.accent[0], style.accent[1], style.accent[2]);
    doc.text("CHANEL", x + 20, y + 8);
  } else if (t === "hermes") {
    doc.setLineWidth(0.5);
    doc.rect(x, y + 1, 14, 10, "S");
    doc.setFont("times", "italic");
    doc.setFontSize(10);
    doc.setTextColor(style.accent[0], style.accent[1], style.accent[2]);
    doc.text("HERMÈS", x + 17, y + 8);
  } else if (t === "dior" || t === "gucci") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(style.accent[0], style.accent[1], style.accent[2]);
    doc.text(style.displayName.toUpperCase(), x, y + 8);
    doc.setLineWidth(0.35);
    doc.line(x, y + 10, x + 38, y + 10);
  } else if (t === "generic_luxe") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(style.accent[0], style.accent[1], style.accent[2]);
    doc.text("LUXE", x, y + 8);
  }
  doc.setTextColor(0, 0, 0);
}

export function drawLuxuryInvoiceHeader(
  doc: jsPDF,
  style: BrandStyle,
  margin: number,
): number {
  const headerH = style.template === "default" ? 0 : 44;
  if (headerH === 0) return margin;

  doc.setFillColor(style.headerBg[0], style.headerBg[1], style.headerBg[2]);
  doc.rect(0, 0, 210, headerH, "F");

  if (style.template === "chanel") {
    drawBrandMark(doc, style, margin, 10);
  } else {
    drawBrandMark(doc, style, margin, 8);
  }

  doc.setDrawColor(style.accent[0], style.accent[1], style.accent[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, headerH - 2, 210 - margin, headerH - 2);

  return headerH + 4;
}