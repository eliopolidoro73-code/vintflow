import type { InvoiceAiDraft } from "@/lib/invoice-ai-prompt";
import { detectInvoiceKind } from "@/lib/invoice-kind";
import { enrichInvoiceDraft } from "@/lib/invoice-luxury";
import { enrichRetailPurchaseDraft } from "@/lib/invoice-retail-lv";

export function finalizeInvoiceDraft(
  draft: InvoiceAiDraft,
  prompt: string,
): InvoiceAiDraft {
  const kind =
    draft.invoice_kind === "retail_purchase" || draft.invoice_kind === "resale"
      ? draft.invoice_kind
      : detectInvoiceKind(prompt);
  if (kind === "retail_purchase") {
    return enrichRetailPurchaseDraft({ ...draft, invoice_kind: kind }, prompt);
  }
  return enrichInvoiceDraft({ ...draft, invoice_kind: "resale" });
}