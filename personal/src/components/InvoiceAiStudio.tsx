"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  Download,
  FileText,
  Loader2,
  Save,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type EditFields = {
  item_title: string;
  buyer_name: string;
  buyer_city: string;
  sku: string;
  carrier: string;
  gross_amount: string;
  purchase_cost: string;
  platform_fees: string;
};

function toEdit(sale: SaleRecord): EditFields {
  return {
    item_title: sale.item_title,
    buyer_name: sale.buyer_name,
    buyer_city: sale.buyer_city,
    sku: sale.sku,
    carrier: sale.carrier,
    gross_amount: String(sale.gross_amount),
    purchase_cost: String(sale.purchase_cost),
    platform_fees: String(sale.platform_fees),
  };
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
  const [saving, setSaving] = useState(false);
  const [lastSale, setLastSale] = useState<SaleRecord | null>(null);
  const [edit, setEdit] = useState<EditFields | null>(null);
  const [lastEngine, setLastEngine] = useState<string | null>(null);

  useEffect(() => {
    if (lastSale) setEdit(toEdit(lastSale));
  }, [lastSale]);

  const previewSale = useMemo((): SaleRecord | null => {
    if (!lastSale || !edit) return lastSale;
    const gross = Number(edit.gross_amount) || lastSale.gross_amount;
    const purchase = Number(edit.purchase_cost) || 0;
    const fees = Number(edit.platform_fees) || 0;
    const net =
      Math.round((gross - purchase - fees) * 100) / 100;
    return {
      ...lastSale,
      item_title: edit.item_title.slice(0, 200),
      buyer_name: edit.buyer_name.slice(0, 80),
      buyer_city: edit.buyer_city.slice(0, 80),
      sku: edit.sku.slice(0, 40),
      carrier: edit.carrier.slice(0, 50),
      gross_amount: gross,
      purchase_cost: purchase,
      platform_fees: fees,
      net_margin: net,
    };
  }, [lastSale, edit]);

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
        cloudQuotaExhausted?: boolean;
        sale?: SaleRecord & {
          purchase_cost?: number;
          platform_fees?: number;
          net_margin?: number;
        };
        invoiceKind?: string;
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
        shipment_status: out.sale.shipment_status ?? "to_ship",
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
      onToast(
        out.cloudQuotaExhausted
          ? "Quota cloud atteint — facture en mode local intelligent (0 €), PDF prêt."
          : out.invoiceKind === "retail_purchase"
            ? `Facture boutique prête — ajuste les champs puis PDF.`
            : out.engine?.startsWith("local")
              ? "Facture locale intelligente — marque détectée depuis ton texte."
              : `Facture générée — vérifie puis enregistre si besoin.`,
      );
    } catch {
      onToast("Connexion coupée — réessaie.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveEdits() {
    if (!lastSale || !edit || !previewSale) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/sales/${lastSale.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          item_title: edit.item_title,
          buyer_name: edit.buyer_name,
          buyer_city: edit.buyer_city,
          sku: edit.sku,
          carrier: edit.carrier,
          gross_amount: Number(edit.gross_amount),
          purchase_cost: Number(edit.purchase_cost),
          platform_fees: Number(edit.platform_fees),
        }),
      });
      const out = (await res.json()) as { error?: string; net_margin?: number };
      if (!res.ok) {
        onToast(out.error ?? "Enregistrement impossible.");
        return;
      }
      setLastSale({
        ...previewSale,
        net_margin: Number(out.net_margin ?? previewSale.net_margin),
      });
      onRefresh();
      onToast("Facture mise à jour en base — PDF à jour.");
    } catch {
      onToast("Connexion coupée.");
    } finally {
      setSaving(false);
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
              Maisons luxe + Vinted. Génère, <strong className="text-white">édite</strong>{" "}
              acheteur / montants / désignation, puis télécharge le PDF aligné sur
              l&apos;aperçu.
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
          Générer la facture
        </Button>
      </div>

      {previewSale && edit && (
        <>
          <InvoiceBrandedPreview sale={previewSale} user={user} />

          <div className="rounded-2xl border border-white/10 bg-[#0e111a] p-4 space-y-3 text-xs">
            <p className="font-bold text-white text-sm">Ajuster avant PDF</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Désignation"
                value={edit.item_title}
                onChange={(v) => setEdit({ ...edit, item_title: v })}
              />
              <Field
                label="SKU"
                value={edit.sku}
                onChange={(v) => setEdit({ ...edit, sku: v })}
              />
              <Field
                label="Acheteur / client"
                value={edit.buyer_name}
                onChange={(v) => setEdit({ ...edit, buyer_name: v })}
              />
              <Field
                label="Ville"
                value={edit.buyer_city}
                onChange={(v) => setEdit({ ...edit, buyer_city: v })}
              />
              <Field
                label="Transport / règlement"
                value={edit.carrier}
                onChange={(v) => setEdit({ ...edit, carrier: v })}
              />
              <Field
                label="Montant TTC (€)"
                value={edit.gross_amount}
                type="number"
                onChange={(v) => setEdit({ ...edit, gross_amount: v })}
              />
              <Field
                label="Coût d'achat (€)"
                value={edit.purchase_cost}
                type="number"
                onChange={(v) => setEdit({ ...edit, purchase_cost: v })}
              />
              <Field
                label="Frais plateforme (€)"
                value={edit.platform_fees}
                type="number"
                onChange={(v) => setEdit({ ...edit, platform_fees: v })}
              />
            </div>
            <p className="text-zinc-500">
              Marge estimée :{" "}
              <span className="text-emerald-300 font-semibold">
                {formatEuro(previewSale.net_margin)}
              </span>
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4 text-xs space-y-3">
            <p className="font-bold text-emerald-200">
              {previewSale.invoice_number}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={saving}
                onClick={handleSaveEdits}
                className="bg-emerald-600 text-white h-10"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <Save className="h-4 w-4 mr-1.5" />
                )}
                Enregistrer
              </Button>
              <Button
                size="sm"
                onClick={() => downloadInvoicePdf(previewSale, user)}
                className="bg-violet-600 text-white h-10"
              >
                <Download className="h-4 w-4 mr-1.5" />
                PDF facture
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadShippingLabelPdf(previewSale, user)}
                className="border-white/15 h-10"
              >
                Bordereau
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onPreview(previewSale)}
                className="border-white/15 h-10"
              >
                Aperçu modal
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

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-zinc-500 text-[10px] uppercase tracking-wide">
        {label}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white/5 border-white/10 text-white h-9 text-xs"
      />
    </div>
  );
}

function AiPowerHelpCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0e111a] p-4 text-xs text-zinc-400 space-y-2">
      <p className="font-bold text-white flex items-center gap-2">
        <Zap className="h-4 w-4 text-amber-400" />
        Puissance IA factures
      </p>
      <p>
        Les prompts couvrent <strong className="text-zinc-200">boutique LV, Chanel, Hermès, Dior, Gucci</strong>{" "}
        et les ventes Vinted. Sans cloud, le parseur local reste actif.
      </p>
      <p className="flex items-center gap-2 text-[11px] text-zinc-500">
        <Bot className="h-3.5 w-3.5" />
        Clés : GEMINI_API_KEY / OPENAI_API_KEY sur Vercel (projet vintflow-perso).
      </p>
    </div>
  );
}