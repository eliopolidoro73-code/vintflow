import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { assertSameOrigin, requireAuthenticatedUser } from "@/lib/auth";
import { callCloudAi, isPersoCloudAiEnabled } from "@/lib/ai";
import {
  getAiCreditSnapshot,
  getMonthlyCloudCap,
  reserveCloudAiCredit,
} from "@/lib/ai-credits";
import {
  INVOICE_FROM_TEXT_SYSTEM,
  type InvoiceAiDraft,
} from "@/lib/invoice-ai-prompt";
import { finalizeInvoiceDraft } from "@/lib/invoice-enrich";
import { createSaleFromInvoiceDraft, draftInvoiceFromPrompt } from "@/lib/invoice-sales";
import { getEffectivePlan } from "@/lib/perso-plan";
import { checkRateLimit } from "@/lib/rate-limit";
export const maxDuration = 60;

function parseAiJson(text: string): InvoiceAiDraft | null {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const invoice_kind =
      parsed.invoice_kind === "retail_purchase" || parsed.invoice_kind === "resale"
        ? parsed.invoice_kind
        : undefined;
    return {
      invoice_kind,
      item_title: String(parsed.item_title ?? "Article seconde main"),
      brand: String(parsed.brand ?? ""),
      sku: String(parsed.sku ?? `VF-${crypto.randomUUID().slice(0, 6)}`),
      buyer_name: String(parsed.buyer_name ?? "Client"),
      buyer_city: String(parsed.buyer_city ?? "Paris"),
      gross_amount: Math.max(1, Number(parsed.gross_amount ?? 30)),
      purchase_cost: Math.max(0, Number(parsed.purchase_cost ?? 0)),
      platform: String(parsed.platform ?? "vinted"),
      account_handle: String(parsed.account_handle ?? "@dressing_vintflow"),
      carrier: String(parsed.carrier ?? "Mondial Relay"),
      platform_fees: Math.max(0, Number(parsed.platform_fees ?? 0)),
      notes: parsed.notes ? String(parsed.notes) : undefined,
      product_line: parsed.product_line ? String(parsed.product_line) : undefined,
      condition_label: parsed.condition_label
        ? String(parsed.condition_label)
        : undefined,
      payment_method: parsed.payment_method ? String(parsed.payment_method) : undefined,
      store_name: parsed.store_name ? String(parsed.store_name) : undefined,
      store_city: parsed.store_city ? String(parsed.store_city) : undefined,
      boutique_ref: parsed.boutique_ref ? String(parsed.boutique_ref) : undefined,
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await requireAuthenticatedUser();
  if ("response" in auth) return auth.response;

  const rl = await checkRateLimit({
    scope: "ai_invoice",
    key: auth.user.id,
    limit: 30,
    windowSeconds: 600,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trop de factures IA — patiente quelques minutes." },
      { status: 429 },
    );
  }

  const plan = getEffectivePlan(auth.user);
  const cloudCap = getMonthlyCloudCap(auth.user, plan);
  let aiCredits = await getAiCreditSnapshot(auth.user.id, cloudCap);

  let body: { prompt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const prompt = (body.prompt ?? "").trim();
  if (prompt.length < 8) {
    return NextResponse.json(
      { error: "Décris la vente en une phrase (min. 8 caractères)." },
      { status: 400 },
    );
  }

  const allowCloudEnhance =
    (!auth.user.is_demo || auth.user.subscription_status === "personal_free") &&
    isPersoCloudAiEnabled() &&
    aiCredits.cloudAllowed;

  const { draft, engine, cloudSkipped } = await draftInvoiceFromPrompt(
    prompt,
    allowCloudEnhance,
    async (userPrompt) => {
      const reserved = await reserveCloudAiCredit(auth.user.id, cloudCap);
      if (!reserved) {
        aiCredits = await getAiCreditSnapshot(auth.user.id, cloudCap);
        return null;
      }
      const aiOut = await callCloudAi({
        systemPrompt: INVOICE_FROM_TEXT_SYSTEM,
        userPrompt,
        jsonMode: true,
        maxTokens: 1600,
        power: true,
      });
      if (!aiOut?.text) return null;
      const parsed = parseAiJson(aiOut.text);
      return parsed ? finalizeInvoiceDraft(parsed, userPrompt) : null;
    },
  );
  aiCredits = await getAiCreditSnapshot(auth.user.id, cloudCap);

  const finalized = finalizeInvoiceDraft(draft, prompt);
  const sale = await createSaleFromInvoiceDraft(auth.user.id, finalized);

  return NextResponse.json({
    engine,
    cloudAiActive: isPersoCloudAiEnabled() && aiCredits.cloudAllowed,
    cloudQuotaExhausted: Boolean(cloudSkipped || !aiCredits.cloudAllowed),
    aiCredits: {
      used: aiCredits.used,
      limit: aiCredits.limit,
      remaining: aiCredits.remaining,
    },
    powerAi: process.env.PERSO_AI_POWER !== "false",
    draft: finalized,
    invoiceKind: finalized.invoice_kind ?? "resale",
    sale,
    pdfPath: `/api/sales/${sale.id}/invoice`,
  });
}