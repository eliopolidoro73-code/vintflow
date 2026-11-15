import { jsPDF } from "jspdf";
import type { AuthUser } from "@/lib/auth";
import { formatDateFr, formatEuro } from "@/lib/format";
import { luxuryMetaFromTitle } from "@/lib/invoice-luxury";
import {
  brandStyleFor,
  detectInvoiceBrandTemplate,
  drawLuxuryInvoiceHeader,
} from "@/lib/invoice-brand-styles";
import { isRetailPurchasePlatform } from "@/lib/invoice-kind";
import {
  drawBoutiqueTicketHeader,
  drawLegalFooter,
  drawRetailBarcode,
  drawTotalsBlock,
} from "@/lib/invoice-pdf-render";

export interface InvoicePdfSale {
  invoice_number: string;
  platform: string;
  account_handle: string;
  item_title: string;
  sku: string;
  buyer_name: string;
  buyer_city: string;
  carrier: string;
  tracking_code: string;
  gross_amount: number;
  sold_at: string;
}

function safeFileName(invoiceNumber: string): string {
  return invoiceNumber.replace(/[^\w.-]+/g, "_");
}

function isRetailSale(sale: InvoicePdfSale): boolean {
  return (
    isRetailPurchasePlatform(sale.platform) ||
    sale.invoice_number.startsWith("ACHAT-") ||
    sale.sku.startsWith("LV-ACHAT")
  );
}

function buildRetailBoutiquePdf(sale: InvoicePdfSale, user: AuthUser): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 16;
  const luxury = luxuryMetaFromTitle(sale.item_title, sale.sku);
  const template = detectInvoiceBrandTemplate(
    sale.item_title,
    sale.sku,
    luxury.brand ?? "Louis Vuitton",
  );
  const style = brandStyleFor(template);
  const accent = style.accent;
  const label = style.retailLabel ?? "FACTURE D'ACHAT · BOUTIQUE";
  const ref = sale.sku.replace(/^LV-ACHAT-/, "") || "M41113";

  let y = drawBoutiqueTicketHeader(doc, style, {
    margin,
    invoiceNumber: sale.invoice_number,
    dateLabel: `Date : ${formatDateFr(sale.sold_at)}`,
    storeCity: sale.buyer_city || "Paris",
    retailLabel: label,
  });

  doc.setFont("times", "normal");
  doc.setFontSize(8);
  doc.setTextColor(70, 70, 70);
  doc.text(
    "101 Avenue des Champs-Élysées · 75008 Paris · FR",
    margin,
    y,
  );
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text("CLIENT", margin, y);
  doc.text("MODE DE RÈGLEMENT", 108, y);
  doc.text("CAISSE", 165, y);
  y += 4;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(sale.buyer_name, margin, y);
  doc.text("Carte bancaire (chip)", 108, y);
  doc.text("N° 03", 165, y);

  y += 12;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(accent[0], accent[1], accent[2]);
  doc.setLineWidth(0.3);
  doc.rect(margin, y - 2, 178, 44, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("DÉSIGNATION", margin + 3, y + 3);
  doc.text("QTÉ", 132, y + 3);
  doc.text("PRIX TTC", 192, y + 3, { align: "right" });
  y += 8;
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(accent[0], accent[1], accent[2]);
  const titleLines = doc.splitTextToSize(sale.item_title, 118);
  doc.text(titleLines, margin + 3, y);
  y += titleLines.length * 5 + 1;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(55, 55, 55);
  doc.text(`Réf. article : ${ref}`, margin + 3, y);
  doc.text("Couleur : Monogram", margin + 3, y + 4);
  doc.text("État : Neuf — emballage d'origine", margin + 3, y + 8);
  doc.text("1", 135, y + 4);
  doc.setFont("helvetica", "bold");
  doc.text(formatEuro(sale.gross_amount), 192, y + 4, { align: "right" });

  y += 22;
  y = drawTotalsBlock(doc, sale.gross_amount, 118, 193, y, accent);

  drawRetailBarcode(doc, sale.tracking_code, margin, y, 70);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Ticket : ${sale.tracking_code}`, 95, y + 6);

  y += 22;
  drawLegalFooter(doc, margin, y, [
    style.retailFooter ?? "Conservez ce document pour toute demande SAV.",
    "Document de traçabilité VintFlow — mise en page inspirée ticket boutique, identité typographique maison.",
    `Archivé pour : ${user.company_name || user.name}${user.siret ? ` · SIRET ${user.siret}` : ""}`,
  ]);

  return doc;
}

function buildInvoicePdf(sale: InvoicePdfSale, user: AuthUser): jsPDF {
  if (isRetailSale(sale)) {
    return buildRetailBoutiquePdf(sale, user);
  }
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 18;
  const luxury = luxuryMetaFromTitle(sale.item_title, sale.sku);
  const template = detectInvoiceBrandTemplate(
    sale.item_title,
    sale.sku,
    luxury.brand,
  );
  const style = brandStyleFor(template);
  const isLuxe = style.template !== "default";
  const accent = style.accent;

  let y = drawLuxuryInvoiceHeader(doc, style, margin);
  if (!isLuxe) y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(isLuxe ? 15 : 16);
  doc.setTextColor(30, 30, 30);
  doc.text(user.company_name || user.name, margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  y += 7;
  if (user.siret) doc.text(`SIRET : ${user.siret}`, margin, y);
  y += 5;
  doc.text(`Email : ${user.email}`, margin, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(isLuxe ? 12 : 14);
  doc.setTextColor(accent[0], accent[1], accent[2]);
  doc.text(style.invoiceLabel, 195, isLuxe ? 14 : margin, { align: "right" });
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  const invY = isLuxe ? 21 : margin + 7;
  doc.text(sale.invoice_number, 195, invY, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Date : ${formatDateFr(sale.sold_at)}`, 195, invY + 5, {
    align: "right",
  });
  if (isLuxe && luxury.brand) {
    doc.setFontSize(8);
    doc.setTextColor(style.muted[0], style.muted[1], style.muted[2]);
    doc.text(`Réf. maison : ${luxury.brand}`, 195, invY + 10, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }

  y = Math.max(y + 14, isLuxe ? 52 : 42);
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, 195, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("CLIENT / ACHETEUR", margin, y);
  doc.text("CANAL & EXPÉDITION", 110, y);
  doc.setTextColor(0, 0, 0);
  y += 5;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(sale.buyer_name, margin, y);
  doc.text(
    `${sale.platform.replace("_", " ")} (${sale.account_handle})`,
    110,
    y,
  );
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`${sale.buyer_city}, France`, margin, y);
  doc.text(`${sale.carrier} · ${sale.tracking_code}`, 110, y);

  y += 14;
  if (isLuxe) {
    doc.setFillColor(style.headerBg[0], style.headerBg[1], style.headerBg[2]);
  } else {
    doc.setFillColor(248, 250, 252);
  }
  const boxH = isLuxe ? 38 : 28;
  doc.rect(margin, y - 4, 177, boxH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Désignation / SKU", margin + 2, y + 2);
  doc.text("Qté", 130, y + 2);
  doc.text("Montant TTC", 175, y + 2, { align: "right" });
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(isLuxe ? 11 : 10);
  const titleLines = doc.splitTextToSize(sale.item_title, 105);
  doc.text(titleLines, margin + 2, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  if (luxury.brand) {
    doc.setTextColor(accent[0], accent[1], accent[2]);
    doc.text(`Marque : ${luxury.brand}`, margin + 2, y + 6);
    doc.setTextColor(60, 60, 60);
    if (luxury.productLine) {
      doc.text(`Modèle : ${luxury.productLine}`, margin + 2, y + 11);
    }
    if (luxury.conditionLabel) {
      doc.text(luxury.conditionLabel, margin + 2, y + 16);
    }
    doc.text(`Réf. SKU : ${sale.sku}`, margin + 2, y + 21);
  } else {
    doc.text(`Réf. SKU : ${sale.sku} · Article d'occasion`, margin + 2, y + 6);
  }
  doc.text("1", 132, y + (isLuxe ? 10 : 0));
  doc.setFont("helvetica", "bold");
  doc.text(formatEuro(sale.gross_amount), 193, y + (isLuxe ? 5 : 0), {
    align: "right",
  });

  y += isLuxe ? 36 : 22;
  y = drawTotalsBlock(doc, sale.gross_amount, 118, 193, y, accent);
  if (isLuxe) {
    drawRetailBarcode(doc, sale.invoice_number, margin, y, 55);
    y += 18;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  const legal =
    user.fiscal_regime === "societe_tva_marge"
      ? "Régime particulier — Biens d'occasion (TVA sur la marge, art. 297 A du CGI)."
      : "TVA non applicable, article 293 B du CGI.";
  doc.text(legal, margin, y, { maxWidth: 177 });
  y += 5;
  if (style.footerTagline) {
    doc.setTextColor(style.muted[0], style.muted[1], style.muted[2]);
    doc.text(style.footerTagline, margin, y, { maxWidth: 177 });
    y += 5;
    doc.setTextColor(90, 90, 90);
  }
  doc.text(
    `Facture acquittée via ${sale.platform.replace("_", " ")} · Générée par VintFlow.`,
    margin,
    y,
    { maxWidth: 177 },
  );

  return doc;
}

export function downloadInvoicePdf(sale: InvoicePdfSale, user: AuthUser): void {
  buildInvoicePdf(sale, user).save(`${safeFileName(sale.invoice_number)}.pdf`);
}

export function invoicePdfBuffer(sale: InvoicePdfSale, user: AuthUser): Buffer {
  const raw = buildInvoicePdf(sale, user).output("arraybuffer");
  return Buffer.from(raw);
}

/** Bordereau expédition format ~10×15 cm (fichier PDF). */
export function downloadShippingLabelPdf(sale: InvoicePdfSale, user: AuthUser): void {
  const doc = buildShippingLabelPdf(sale, user);
  doc.save(`bordereau-${safeFileName(sale.invoice_number)}.pdf`);
}

function buildShippingLabelPdf(sale: InvoicePdfSale, user: AuthUser): jsPDF {
  const w = 100;
  const h = 150;
  const doc = new jsPDF({ unit: "mm", format: [w, h] });
  const m = 6;
  let y = m;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(sale.carrier.toUpperCase(), m, y);
  doc.setFontSize(8);
  doc.text("10×15", w - m, y, { align: "right" });
  y += 8;
  doc.setDrawColor(0, 0, 0);
  doc.line(m, y, w - m, y);
  y += 6;

  doc.setFontSize(7);
  doc.text("EXPÉDITEUR", m, y);
  doc.text("DESTINATAIRE", w / 2 + 2, y);
  y += 4;
  doc.setFontSize(9);
  doc.text(user.company_name || user.name, m, y);
  doc.text(sale.buyer_name, w / 2 + 2, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.text(sale.account_handle, m, y);
  doc.text(`${sale.buyer_city}, FR`, w / 2 + 2, y);

  y += 10;
  doc.setFont("courier", "bold");
  doc.setFontSize(10);
  doc.text(sale.tracking_code, w / 2, y, { align: "center" });
  y += 6;
  for (let i = 0; i < 38; i++) {
    const barW = i % 3 === 0 ? 1.2 : 0.6;
    doc.rect(m + 2 + i * 2.2, y, barW, 14, "F");
  }
  y += 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Mémo colis", m, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const lines = doc.splitTextToSize(sale.item_title, w - m * 2);
  doc.text(lines, m, y);
  y += lines.length * 4 + 2;
  doc.text(`SKU ${sale.sku} · ${sale.invoice_number}`, m, y);

  return doc;
}

/** Style de facture pour l’aperçu UI (sans jsPDF côté client lourd). */
export function invoicePreviewTheme(itemTitle: string, sku: string) {
  const luxury = luxuryMetaFromTitle(itemTitle, sku);
  const template = detectInvoiceBrandTemplate(itemTitle, sku, luxury.brand);
  const style = brandStyleFor(template);
  return { luxury, style, template };
}