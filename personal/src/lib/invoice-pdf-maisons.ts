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

function formatTicketTime(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/** Ticket caisse centré type boutique Moncler (sans logo déposé — wordmark typographique). */
function renderMonclerPosTicketPdf(
  sale: InvoicePdfSale,
  user: AuthUser,
  style: ReturnType<typeof brandStyleFor>,
  ref: string,
): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 18;
  let y = 22;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(17, 17, 17);
  doc.text("MONCLER", 105, y, { align: "center" });
  y += 5;
  doc.setDrawColor(231, 52, 64);
  doc.setLineWidth(0.6);
  doc.line(88, y, 92, y);
  doc.setDrawColor(45, 74, 156);
  doc.line(118, y, 122, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(45, 45, 45);
  const store =
    sale.buyer_city === "Paris" || !sale.buyer_city
      ? [
          "Moncler Paris Galeries Lafayette",
          "40, boulevard Haussmann",
          "75009 Paris · France",
          "Tél. : +33 1 42 82 60 88",
        ]
      : [`Moncler · ${sale.buyer_city}`, "France"];
  for (const line of store) {
    doc.text(line, 105, y, { align: "center" });
    y += 4;
  }
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("VENTE", 105, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`N° document : ${sale.invoice_number}`, 105, y, { align: "center" });
  y += 8;

  const sold = new Date(sale.sold_at);
  doc.setFontSize(8);
  doc.text(`Magasin · Moncler 1407`, margin, y);
  doc.text(`Date : ${formatDateFr(sold)}`, margin, y + 4);
  doc.text(`Client : ${sale.buyer_name}`, margin, y + 8);
  doc.text(`Caisse · 42`, 195, y, { align: "right" });
  doc.text(`Heure : ${formatTicketTime(sale.sold_at)}`, 195, y + 4, { align: "right" });
  y += 16;

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, 210 - margin, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Description", margin, y);
  doc.text("Qté", 118, y);
  doc.text("TVA %", 132, y);
  doc.text("Prix TTC", 155, y);
  doc.text("Montant", 185, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const titleLines = doc.splitTextToSize(sale.item_title, 95);
  doc.text(titleLines, margin, y);
  doc.text(`Réf. ${ref}`, margin, y + titleLines.length * 4);
  doc.text("1", 120, y);
  doc.text("20%", 132, y);
  const amount = formatEuro(sale.gross_amount);
  doc.text(amount, 155, y);
  doc.text(amount, 195, y, { align: "right" });
  y += titleLines.length * 4 + 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`Total ${amount}`, 195, y, { align: "right" });
  y += 14;

  drawRetailBarcode(doc, sale.tracking_code || sale.invoice_number, margin, y, 70);
  y += 18;
  drawLegalFooter(doc, margin, y, [
    style.retailFooter ?? "Document de traçabilité — conservez pour SAV.",
    "VintFlow · mise en page inspirée ticket boutique (wordmark typographique).",
    `Titulaire déclarant : ${user.company_name || user.name}`,
  ]);
  return doc;
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
  doc.text("Carte bancaire — EUR", 108, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(90, 90, 90);
  doc.text("TVA incluse · reçu boutique", 108, y + 4);
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
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
  const ref =
    sale.sku.replace(
      /^(LV|MON|CH|HER|DIOR|GUCCI)-ACHAT-/i,
      "",
    ) || sale.sku.slice(-8);

  if (template === "moncler") {
    return renderMonclerPosTicketPdf(sale, user, style, ref);
  }

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

  if (sale.sku) {
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Code traçabilité interne : ${sale.tracking_code || sale.invoice_number}`,
      margin,
      y,
    );
    y += 4;
    doc.text(`Référence boutique : ${ctx.ref}`, margin, y);
  }

  drawRetailBarcode(doc, sale.tracking_code || sale.invoice_number, margin, y + 6, 72);

  y += 20;
  drawLegalFooter(doc, margin, y, [
    style.retailFooter ?? "Document de traçabilité — conservez pour SAV.",
    "VintFlow · mise en page inspirée format maison, wordmark typographique.",
    `Titulaire : ${user.company_name || user.name}`,
  ]);
  return doc;
}