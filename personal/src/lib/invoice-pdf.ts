import { jsPDF } from "jspdf";
import type { AuthUser } from "@/lib/auth";
import { formatDateFr, formatEuro } from "@/lib/format";

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

function buildInvoicePdf(sale: InvoicePdfSale, user: AuthUser): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 18;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(user.company_name || user.name, margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  y += 7;
  if (user.siret) doc.text(`SIRET : ${user.siret}`, margin, y);
  y += 5;
  doc.text(`Email : ${user.email}`, margin, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(5, 120, 85);
  doc.text("FACTURE", 195, margin, { align: "right" });
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(sale.invoice_number, 195, margin + 7, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Date : ${formatDateFr(sale.sold_at)}`, 195, margin + 12, {
    align: "right",
  });

  y = 42;
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
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y - 4, 177, 28, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Désignation / SKU", margin + 2, y + 2);
  doc.text("Qté", 130, y + 2);
  doc.text("Montant TTC", 175, y + 2, { align: "right" });
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const titleLines = doc.splitTextToSize(sale.item_title, 105);
  doc.text(titleLines, margin + 2, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Réf. SKU : ${sale.sku} · Article d'occasion`, margin + 2, y + 6);
  doc.text("1", 132, y);
  doc.setFont("helvetica", "bold");
  doc.text(formatEuro(sale.gross_amount), 193, y, { align: "right" });

  y += 22;
  doc.setFont("helvetica", "normal");
  doc.text("Total HT", 140, y);
  doc.text(formatEuro(sale.gross_amount), 193, y, { align: "right" });
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Net à payer (TTC)", 140, y);
  doc.text(formatEuro(sale.gross_amount), 193, y, { align: "right" });

  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  const legal =
    user.fiscal_regime === "societe_tva_marge"
      ? "Régime particulier — Biens d'occasion (TVA sur la marge, art. 297 A du CGI)."
      : "TVA non applicable, article 293 B du CGI.";
  doc.text(legal, margin, y, { maxWidth: 177 });
  y += 5;
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