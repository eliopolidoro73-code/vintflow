import type { jsPDF } from "jspdf";
import { formatEuro } from "@/lib/format";
import type { BrandStyle } from "@/lib/invoice-brand-styles";
import { drawBrandMark } from "@/lib/invoice-brand-styles";

/** Code-barres visuel (bordereau / ticket). */
export function drawRetailBarcode(
  doc: jsPDF,
  code: string,
  x: number,
  y: number,
  w: number,
): void {
  const clean = code.replace(/\D/g, "").padEnd(12, "0").slice(0, 16);
  let cx = x;
  let barHeight = 12;
  for (let i = 0; i < clean.length * 2; i++) {
    const digit = Number(clean[i % clean.length] ?? "1");
    const barW = digit % 2 === 0 ? 0.45 : 0.9;
    barHeight = 10 + (digit % 4);
    doc.setFillColor(25, 25, 25);
    doc.rect(cx, y, barW, barHeight, "F");
    cx += barW + 0.35;
    if (cx > x + w) break;
  }
  doc.setFont("courier", "normal");
  doc.setFontSize(7);
  doc.setTextColor(40, 40, 40);
  doc.text(clean, x + w / 2, y + barHeight + 3.5, { align: "center" });
  doc.setTextColor(0, 0, 0);
}

export function ttcToHtLines(ttc: number): {
  ht: number;
  tva: number;
  rateLabel: string;
} {
  const ht = Math.round((ttc / 1.2) * 100) / 100;
  const tva = Math.round((ttc - ht) * 100) / 100;
  return { ht, tva, rateLabel: "TVA 20 %" };
}

export function drawTotalsBlock(
  doc: jsPDF,
  ttc: number,
  xLabel: number,
  xAmount: number,
  yStart: number,
  accent: readonly [number, number, number],
): number {
  const { ht, tva, rateLabel } = ttcToHtLines(ttc);
  let y = yStart;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Sous-total HT", xLabel, y);
  doc.text(formatEuro(ht), xAmount, y, { align: "right" });
  y += 5;
  doc.text(rateLabel, xLabel, y);
  doc.text(formatEuro(tva), xAmount, y, { align: "right" });
  y += 7;
  doc.setDrawColor(accent[0], accent[1], accent[2]);
  doc.setLineWidth(0.35);
  doc.line(xLabel, y - 2, xAmount, y - 2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(accent[0], accent[1], accent[2]);
  doc.text("TOTAL TTC", xLabel, y + 3);
  doc.text(formatEuro(ttc), xAmount, y + 3, { align: "right" });
  doc.setTextColor(0, 0, 0);
  return y + 14;
}

/** En-tête ticket boutique haute fidélité (typographie serif — pas de logo déposé). */
export function drawBoutiqueTicketHeader(
  doc: jsPDF,
  style: BrandStyle,
  opts: {
    margin: number;
    invoiceNumber: string;
    dateLabel: string;
    storeCity: string;
    retailLabel: string;
  },
): number {
  const headerH = 52;
  doc.setFillColor(style.headerBg[0], style.headerBg[1], style.headerBg[2]);
  doc.rect(0, 0, 210, headerH, "F");
  drawBrandMark(doc, style, opts.margin, 10);

  if (style.template === "louis_vuitton") {
    doc.setFont("times", "normal");
    doc.setFontSize(7);
    doc.setTextColor(style.muted[0], style.muted[1], style.muted[2]);
    const sub =
      "MAISON · MAROQUINERIE · PARFUMS · PRÊT-À-PORTER";
    doc.text(sub, opts.margin + 42, 16);
    doc.text(
      `Boutique ${opts.storeCity} · France`,
      opts.margin + 42,
      21,
    );
  }

  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(style.accent[0], style.accent[1], style.accent[2]);
  doc.text(opts.retailLabel, 195, 14, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  doc.text(opts.invoiceNumber, 195, 20, { align: "right" });
  doc.text(opts.dateLabel, 195, 25, { align: "right" });

  doc.setDrawColor(style.accent[0], style.accent[1], style.accent[2]);
  doc.setLineWidth(0.6);
  doc.line(opts.margin, headerH - 3, 210 - opts.margin, headerH - 3);
  return headerH + 6;
}

export function drawLegalFooter(
  doc: jsPDF,
  margin: number,
  y: number,
  lines: string[],
): void {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(110, 110, 110);
  for (const line of lines) {
    doc.text(line, margin, y, { maxWidth: 210 - margin * 2 });
    y += 3.5;
  }
}