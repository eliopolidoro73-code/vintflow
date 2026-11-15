import crypto from "node:crypto";
import { sql } from "@/lib/db";
import { computeNetMargin } from "@/lib/format";
import type { InvoicePdfSale } from "@/lib/invoice-pdf";
import type { InvoiceAiDraft } from "@/lib/invoice-ai-prompt";
import { isLouisVuitton } from "@/lib/invoice-luxury";
import { finalizeInvoiceDraft } from "@/lib/invoice-enrich";
import { detectInvoiceKind } from "@/lib/invoice-kind";
import { enrichRetailPurchaseDraft } from "@/lib/invoice-retail-lv";

export async function createSaleFromInvoiceDraft(
  userId: string,
  draft: InvoiceAiDraft,
): Promise<
  InvoicePdfSale & {
    id: string;
    purchase_cost: number;
    platform_fees: number;
    boost_cost: number;
    shipping_cost: number;
    shipment_status: string;
    net_margin: number;
  }
> {
  const gross = Math.max(1, Number(draft.gross_amount) || 1);
  const purchase = Math.max(0, Number(draft.purchase_cost) || 0);
  const fees = Math.max(0, Number(draft.platform_fees) || 0);
  const margin = computeNetMargin({
    grossAmount: gross,
    purchaseCost: purchase,
    platformFees: fees,
    boostCost: 0,
    shippingCost: 0,
  });

  const salesCountRows = await sql<{ count: string | number }>(
    "select count(*) as count from sales where user_id = $1",
    [userId],
  );
  const isRetail = draft.invoice_kind === "retail_purchase" || /^boutique_/i.test(draft.platform);
  const nextNum = Number(salesCountRows[0]?.count ?? 0) + 42;
  const invoiceNumber = isRetail
    ? `ACHAT-LV-2026-${String(nextNum).padStart(3, "0")}`
  : `FAC-2026-${String(nextNum).padStart(3, "0")}`;
  const trackingCode = isRetail
    ? `BOUTIQUE-${draft.boutique_ref ?? "LV"}-${String(Math.floor(1000 + Math.random() * 8999))}`
    : `MR-${Math.floor(10000000 + Math.random() * 89999999)}FR`;
  const saleId = crypto.randomUUID();
  const platform = [
    "vinted",
    "leboncoin",
    "tiktok_shop",
    "ebay",
    "boutique_lv",
    "boutique",
    "store_purchase",
  ].includes(draft.platform)
    ? draft.platform
    : isRetail
      ? "boutique_lv"
      : "vinted";
  const shipmentStatus = isRetail ? "delivered" : "to_ship";

  await sql(
    `insert into sales (
      id, user_id, item_id, invoice_number, platform, account_handle,
      item_title, sku, buyer_name, buyer_city, carrier, tracking_code,
      shipment_status, gross_amount, purchase_cost, platform_fees,
      boost_cost, shipping_cost, urssaf_amount, net_margin
    ) values (
      $1, $2, null, $3, $4, $5,
      $6, $7, $8, $9, $10, $11,
      $12, $13, $14, $15,
      0, 0, $16, $17
    )`,
    [
      saleId,
      userId,
      invoiceNumber,
      platform,
      (draft.account_handle || "@dressing_vintflow").slice(0, 80),
      draft.item_title.slice(0, 200),
      draft.sku.slice(0, 40),
      draft.buyer_name.slice(0, 80),
      (draft.buyer_city || "Paris").slice(0, 80),
      (draft.carrier || "Mondial Relay").slice(0, 50),
      trackingCode,
      shipmentStatus,
      gross,
      purchase,
      fees,
      0,
      margin.netMargin,
    ],
  );

  return {
    id: saleId,
    invoice_number: invoiceNumber,
    platform,
    account_handle: (draft.account_handle || "@dressing_vintflow").slice(0, 80),
    item_title: draft.item_title,
    sku: draft.sku,
    buyer_name: draft.buyer_name,
    buyer_city: draft.buyer_city || "Paris",
    carrier: draft.carrier || "Mondial Relay",
    tracking_code: trackingCode,
    gross_amount: gross,
    purchase_cost: purchase,
    platform_fees: fees,
    boost_cost: 0,
    shipping_cost: 0,
    shipment_status: shipmentStatus,
    sold_at: new Date().toISOString(),
    net_margin: margin.netMargin,
  };
}

function parseDraftLocal(prompt: string): InvoiceAiDraft {
  const kind = detectInvoiceKind(prompt);
  if (kind === "retail_purchase") {
    const base: InvoiceAiDraft = {
      invoice_kind: "retail_purchase",
      item_title: prompt.slice(0, 120),
      brand: "Louis Vuitton",
      sku: "LV-ACHAT-PENDING",
      buyer_name: "Client",
      buyer_city: "Paris",
      gross_amount: 1890,
      purchase_cost: 1890,
      platform: "boutique_lv",
      account_handle: "Boutique Louis Vuitton",
      carrier: "Retrait boutique",
      platform_fees: 0,
      notes: prompt.slice(0, 200),
    };
    return enrichRetailPurchaseDraft(base, prompt);
  }

  const euros = [...prompt.matchAll(/(\d+)[\s,]?€/gi)].map((m) => Number(m[1]));
  const price = euros[0] ?? 49;
  const lower = prompt.toLowerCase();
  let brand = "Sélection";
  if (lower.includes("louis vuitton") || lower.includes(" lv ")) brand = "Louis Vuitton";
  else if (lower.includes("nike")) brand = "Nike";
  else if (lower.includes("carhartt")) brand = "Carhartt";

  const platform = lower.includes("leboncoin")
    ? "leboncoin"
    : lower.includes("tiktok")
      ? "tiktok_shop"
      : lower.includes("ebay")
        ? "ebay"
        : "vinted";

  const buyerMatch =
    /(?:à|pour)\s+([A-Za-zÀ-ÿ\s-]+?)(?:\s+(?:à|sur|pour|,|€))/i.exec(prompt) ??
    /acheteur\s+([A-Za-zÀ-ÿ\s-]+)/i.exec(prompt);
  const buyer_name = buyerMatch?.[1]?.trim().slice(0, 80) || "Client Vinted";

  const cityMatch = /(?:à|sur)\s+([A-Za-zÀ-ÿ\s-]+?)(?:\s+vinted|\s+leboncoin|,|$)/i.exec(
    prompt,
  );
  const buyer_city = cityMatch?.[1]?.trim().slice(0, 40) || "Paris";

  let item_title = prompt
    .replace(/facture|génère|fais|fait|une|de|ce|du|la|le/gi, "")
    .replace(/\d+\s*€?/g, "")
    .trim()
    .slice(0, 120);

  let productLine: string | undefined;
  if (isLouisVuitton(prompt)) {
    brand = "Louis Vuitton";
    const model = /neverfull/i.test(prompt)
      ? "Neverfull MM"
      : /speedy/i.test(prompt)
        ? "Speedy"
        : "Sac à main";
    productLine = model;
    item_title = `Sac Louis Vuitton ${model} — toile Monogram · occasion authentique`;
  }

  const sku =
    brand === "Louis Vuitton"
      ? `LV-${modelSku(prompt)}-${price}`
      : `${brand.slice(0, 3).toUpperCase()}-${Date.now().toString(36).slice(-4)}`;

  return finalizeInvoiceDraft({
    item_title: item_title || `Article ${brand}`,
    brand,
    sku,
    buyer_name,
    buyer_city,
    gross_amount: price,
    purchase_cost: Math.round(price * 0.35),
    platform,
    account_handle: "@dressing_vintflow",
    carrier: "Mondial Relay",
    platform_fees: Math.round(price * 0.05 * 100) / 100,
    notes: isLouisVuitton(prompt)
      ? `Vente Louis Vuitton seconde main — contrôle avant expédition.`
      : prompt.slice(0, 200),
    product_line: productLine,
    condition_label: isLouisVuitton(prompt)
      ? "Très bon état — occasion authentique"
      : undefined,
    luxury_brand: isLouisVuitton(prompt),
    invoice_kind: "resale",
  }, prompt);
}

function modelSku(prompt: string): string {
  if (/neverfull/i.test(prompt)) return "NEVERFULL";
  if (/speedy/i.test(prompt)) return "SPEEDY";
  return "SAC";
}

export async function draftInvoiceFromPrompt(
  prompt: string,
  allowCloudAi: boolean,
  callAi: (p: string) => Promise<InvoiceAiDraft | null>,
): Promise<{ draft: InvoiceAiDraft; engine: string }> {
  const trimmed = prompt.trim().slice(0, 800);
  if (allowCloudAi) {
    const aiDraft = await callAi(trimmed);
    if (aiDraft) {
      return {
        draft: finalizeInvoiceDraft(aiDraft, trimmed),
        engine: "gemini_or_openai_power",
      };
    }
  }
  return {
    draft: parseDraftLocal(trimmed),
    engine: "local_invoice_parse",
  };
}