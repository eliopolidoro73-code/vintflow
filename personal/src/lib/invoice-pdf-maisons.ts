import { jsPDF } from "jspdf";
import type { jsPDF as JsPdfDoc } from "jspdf";
import type { AuthUser } from "@/lib/auth";
import { formatDateFr, formatEuro } from "@/lib/format";
import type { InvoicePdfSale } from "@/lib/invoice-pdf";
import {
  brandStyleFor,
  drawBrandMark,
  type InvoiceBrandTemplate,
} from "@/lib/invoice-brand-styles";
import {
  drawLegalFooter,
  drawRetailBarcode,
  drawTotalsBlock,
} from "@/lib/invoice-pdf-render";

type RetailCtx = {
  doc: JsPdfDoc;
  sale: InvoicePdfSale;
  user: AuthUser;
  style: ReturnType<typeof brandStyleFor>;
  margin: number;
  ref: string;
};

function baseRetailHeader(ctx: RetailCtx, subtitle: string): number {
  const { doc, style, margin, sale } = ctx;
  const accent = style.accent;
  let headerH = 48;
  if (ctx.style.template === "chanel") headerH = 52;

  doc.setFillColor(style.headerBg[0], style.headerBg[1], style.headerBg[2]);
  doc.rect(0, 0, 210, headerH, "F");
  drawBrandMark(doc, style, margin, style.template === "chanel" ? 14 : 10);

  const label = style.retailLabel ?? "FACTURE D'ACHAT · BOUTIQUE";
  doc.setFont("times", "bold");
  doc.setFontSize(style.template === "chanel" ? 10 : 11);
  doc.setTextColor(
    style.template === "chanel" ? 245 : accent[0],
    style.template === "chanel" ? 245 : accent[1],
    style.template === "chanel" ? 245 : accent[2],
  );
  doc.text(label, 195, 15, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(style.template === "chanel" ? 220 : 50, 50, 50);
  doc.text(sale.invoice_number, 195, 21, { align: "right" });
  doc.text(`Date : ${formatDateFr(sale.sold_at)}`, 195, 26, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(style.template === "chanel" ? 200 : 80, 80, 80);
  doc.text(subtitle, margin, headerH - 6);

  doc.setDrawColor(accent[0], accent[1], accent[2]);
  doc.setLineWidth(style.template === "hermes" ? 0.8 : 0.45);
  doc.line(margin, headerH - 1, 210 - margin, headerH - 1);
  return headerH + 8;
}

function retailItemBlock(ctx: RetailCtx, yStart: number): number {
  const { doc, sale, style, margin } = ctx;
  const accent = style.accent;
  let y = yStart;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(110, 110, 110);
  doc.text("CLIENT", margin, y);
  doc.text("RÈGLEMENT", 108, y);
  y += 4;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(sale.buyer_name, margin, y);
  doc.text("Carte bancaire", 108, y);
  y += 10;

  doc.setDrawColor(accent[0], accent[1], accent[2]);
  doc.rect(margin, y - 2, 178, 42, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("ARTICLE NEUF", margin + 3, y + 3);
  y += 7;
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(accent[0], accent[1], accent[2]);
  const lines = doc.splitTextToSize(sale.item_title, 120);
  doc.text(lines, margin + 3, y);
  y += lines.length * 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(55, 55, 55);
  doc.text(`Réf. : ${ctx.ref}`, margin + 3, y);
  doc.text("Qté 1", 132, y - 2);
  doc.setFont("helvetica", "bold");
  doc.text(formatEuro(sale.gross_amount), 192, y - 2, { align: "right" });
  return y + 14;
}

export function renderLuxuryRetailPdf(
  template: InvoiceBrandTemplate,
  sale: InvoicePdfSale,
  user: AuthUser,
): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 15;
  const style = brandStyleFor(template);
  const ref = sale.sku.replace(/^LV-ACHAT-|^CH-ACHAT-|^HER-ACHAT-/, "") || sale.sku.slice(-8);

  const subtitles: Partial<Record<InvoiceBrandTemplate, string>> = {
    louis_vuitton: "101 Avenue des Champs-Élysées · 75008 Paris",
    chanel: "31 Rue Cambon · 75001 Paris",
    hermes: "24 Rue du Faubourg Saint-Honoré · 75008 Paris",
    dior: "30 Avenue Montaigne · 75008 Paris",
    gucci: "60 Rue de la Paix · 75002 Paris",
    generic_luxe: `Boutique ${sale.buyer_city || "Paris"}`,
  };

  const ctx: RetailCtx = { doc, sale, user, style, margin, ref };
  let y = baseRetailHeader(ctx, subtitles[template] ?? subtitles.generic_luxe!);
  y = retailItemBlock(ctx, y);
  y = drawTotalsBlock(doc, sale.gross_amount, 115, 193, y, style.accent);
  drawRetailBarcode(doc, sale.tracking_code, margin, y, 72);

  y += 20;
  drawLegalFooter(doc, margin, y, [
    style.retailFooter ?? "Document de traçabilité — conservez pour SAV.",
    "VintFlow · mise en page inspirée format maison, wordmark typographique.",
    `Titulaire : ${user.company_name || user.name}`,
  ]);
  return doc;
}