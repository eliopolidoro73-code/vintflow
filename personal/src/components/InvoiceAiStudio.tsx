"use client";

import { useState } from "react";
import {
  Bot,
  Download,
  FileText,
  Loader2,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import type { AuthUser } from "@/lib/auth";
import { INVOICE_EXAMPLE_PROMPTS } from "@/lib/invoice-ai-prompt";
import {
  downloadInvoicePdf,
  downloadShippingLabelPdf,
} from "@/lib/invoice-pdf";
import { formatEuro } from "@/lib/format";
import type { SaleRecord } from "@/components/DocumentPrintModal";
import { InvoiceBrandedPreview } from "@/components/InvoiceBrandedPreview";

interface InvoiceAiStudioProps {
  user: AuthUser;
  cloudAiActive?: boolean;
  onRefresh: () => void;
  onToast: (msg: string) => void;
  onPreview: (sale: SaleRecord) => void;
}

export function InvoiceAiStudio({
  user,
  cloudAiActive,
  onRefresh,
  onToast,
  onPreview,
}: InvoiceAiStudioProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastSale, setLastSale] = useState<SaleRecord | null>(null);
  const [lastEngine, setLastEngine] = useState<string | null>(null);

  async function handleGenerate() {
    const text = prompt.trim();
    if (text.length < 8) {
      onToast("Décris la vente (ex: sac Louis Vuitton 420€ à Marie Lyon).");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/invoices/ai-generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ prompt: text }),
      });
      const out = (await res.json()) as {
        error?: string;
        engine?: string;
        sale?: SaleRecord & {
          purchase_cost?: number;
          platform_fees?: number;
          net_margin?: number;
        };
      };
      if (!res.ok) {
        onToast(out.error ?? "Génération impossible.");
        return;
      }
      if (!out.sale) {
        onToast("Réponse incomplète.");
        return;
      }
      const sale: SaleRecord = {
        id: out.sale.id,
        invoice_number: out.sale.invoice_number,
        platform: out.sale.platform,
        account_handle: out.sale.account_handle,
        item_title: out.sale.item_title,
        sku: out.sale.sku,
        buyer_name: out.sale.buyer_name,
        buyer_city: out.sale.buyer_city,
        carrier: out.sale.carrier,
        tracking_code: out.sale.tracking_code,
        shipment_status: "to_ship",
        gross_amount: Number(out.sale.gross_amount),
        purchase_cost: Number(out.sale.purchase_cost ?? 0),
        platform_fees: Number(out.sale.platform_fees ?? 0),
        boost_cost: 0,
        shipping_cost: 0,
        net_margin: Number(out.sale.net_margin ?? 0),
        sold_at: out.sale.sold_at,
      };
      setLastSale(sale);
      setLastEngine(out.engine ?? "ia");
      onRefresh();
      const kind = (out as { invoiceKind?: string }).invoiceKind;
      onToast(
        kind === "retail_purchase"
          ? `Facture boutique ${sale.invoice_number} prête — vérifie l’aperçu puis télécharge le PDF.`
          : `Facture ${sale.invoice_number} enregistrée — aperçu mis à jour ci-dessous.`,
      );
    } catch {
      onToast("Connexion coupée — réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-[#0e111a] to-[#0e111a] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-violet-300" />
              Factures PDF par IA
            </h2>
            <p className="mt-1 text-sm text-zinc-300 max-w-xl leading-relaxed">
              Achat boutique (ex. « Neverfull neuf acheté chez LV Paris ») → facture
              d&apos;achat magasin. Vente Vinted avec acheteur → facture de revente.
              PDF style maison, enregistrement automatique.
            </p>
          </div>
          <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
            {cloudAiActive ? "IA cloud active" : "Mode local + cloud si clé"}
          </Badge>
        </div>

        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder="Ex : Fais une facture de ce sac Louis Vuitton Neverfull vendu 420€ à Sophie Martin à Lyon sur Vinted"
          className="mt-4 bg-black/30 border-white/10 text-sm text-white min-h-[100px] touch-manipulation"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {INVOICE_EXAMPLE_PROMPTS.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setPrompt(ex)}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-zinc-300 hover:border-violet-500/40 hover:text-white text-left"
            >
              {ex.length > 52 ? `${ex.slice(0, 52)}…` : ex}
            </button>
          ))}
        </div>

        <Button
          type="button"
          disabled={loading}
          onClick={handleGenerate}
          className="mt-4 w-full sm:w-auto h-12 bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm touch-manipulation"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
          ) : (
            <Sparkles className="h-5 w-5 mr-2" />
          )}
          Générer la facture PDF
        </Button>
      </div>

      {lastSale && (
        <>
          <InvoiceBrandedPreview sale={lastSale} user={user} />
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4 text-xs space-y-3">
          <p className="font-bold text-emerald-200">
            {lastSale.invoice_number} · {lastSale.item_title}
          </p>
          <p className="text-zinc-300">
            {lastSale.buyer_name} ({lastSale.buyer_city}) —{" "}
            <strong className="text-white">{formatEuro(lastSale.gross_amount)}</strong>{" "}
            · Marge {formatEuro(lastSale.net_margin)}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => downloadInvoicePdf(lastSale, user)}
              className="bg-violet-600 text-white h-10"
            >
              <Download className="h-4 w-4 mr-1.5" />
              PDF facture
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadShippingLabelPdf(lastSale, user)}
              className="border-white/15 h-10"
            >
              Bordereau
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPreview(lastSale)}
              className="border-white/15 h-10"
            >
              Aperçu
            </Button>
          </div>
          {lastEngine && (
            <p className="text-[10px] text-zinc-500">Moteur : {lastEngine}</p>
          )}
        </div>
        </>
      )}

      <AiPowerHelpCard />
    </div>
  );
}

function AiPowerHelpCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0e111a] p-4 text-xs text-zinc-400 space-y-2">
      <p className="font-bold text-white flex items-center gap-2">
        <Zap className="h-4 w-4 text-amber-400" />
        Où configurer <code className="text-violet-300">PERSO_AI_POWER</code> ?
      </p>
      <p>
        <strong className="text-zinc-200">Tu n&apos;as rien à faire dans la majorité des cas</strong> :
        dès que <code className="text-emerald-300">GEMINI_API_KEY</code> ou{" "}
        <code className="text-emerald-300">OPENAI_API_KEY</code> est en place, le mode
        puissance (Gemini 2.5 Pro / GPT-4o) est <strong>activé automatiquement</strong>.
      </p>
      <ul className="list-disc pl-4 space-y-1">
        <li>
          <strong className="text-zinc-300">Cursor</strong> — icône engrenage →{" "}
          <strong>Secrets</strong> (app publiée vintflow-perso) : ajoute{" "}
          <code>PERSO_AI_POWER</code> = <code>true</code> pour forcer, ou{" "}
          <code>false</code> pour économiser les tokens.
        </li>
        <li>
          <strong className="text-zinc-300">Vercel</strong> — projet{" "}
          <strong>vintflow-perso</strong> → Settings → Environment Variables →
          même nom.
        </li>
      </ul>
      <p className="flex items-center gap-2 text-[11px] text-zinc-500">
        <Bot className="h-3.5 w-3.5" />
        Clés IA : Cursor Secrets, noms exacts GEMINI_API_KEY et OPENAI_API_KEY.
      </p>
    </div>
  );
}