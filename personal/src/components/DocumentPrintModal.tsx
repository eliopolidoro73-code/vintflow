"use client";

import { Download, Printer } from "lucide-react";
import {
  downloadInvoicePdf,
  downloadShippingLabelPdf,
} from "@/lib/invoice-pdf";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDateFr } from "@/lib/format";
import type { AuthUser } from "@/lib/auth";
import { InvoiceBrandedPreview } from "@/components/InvoiceBrandedPreview";

export interface SaleRecord {
  id: string;
  invoice_number: string;
  platform: string;
  account_handle: string;
  item_title: string;
  sku: string;
  buyer_name: string;
  buyer_city: string;
  carrier: string;
  tracking_code: string;
  shipment_status: string;
  gross_amount: number;
  purchase_cost: number;
  platform_fees: number;
  boost_cost: number;
  shipping_cost: number;
  net_margin: number;
  sold_at: string;
}

interface DocumentPrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "invoice" | "label";
  sale: SaleRecord | null;
  user: AuthUser;
}

export function DocumentPrintModal({
  open,
  onOpenChange,
  mode,
  sale,
  user,
}: DocumentPrintModalProps) {
  if (!sale) return null;

  const isVatMargin = user.fiscal_regime === "societe_tva_marge";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0e111a] border-white/10 text-zinc-100 sm:max-w-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-6 text-white">
            <span>
              {mode === "invoice"
                ? `Facture ${sale.invoice_number}`
                : `Bordereau 10×15 · ${sale.carrier}`}
            </span>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (mode === "invoice") downloadInvoicePdf(sale, user);
                  else downloadShippingLabelPdf(sale, user);
                }}
                className="border-violet-500/40 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20 font-bold"
              >
                <Download className="h-4 w-4 mr-1.5" />
                Télécharger PDF
              </Button>
              <Button
                size="sm"
                onClick={() => window.print()}
                className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400 font-bold"
              >
                <Printer className="h-4 w-4 mr-1.5" />
                Imprimer
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div id="printable-document" className="rounded-xl p-2 sm:p-4 shadow-inner bg-zinc-100">
          {mode === "invoice" ? (
            <>
              <InvoiceBrandedPreview sale={sale} user={user} variant="print" />
              <div className="mt-3 text-[10px] text-zinc-600 space-y-1 px-2">
                {isVatMargin ? (
                  <p>
                    Régime particulier — Biens d&apos;occasion (TVA sur la marge, art.
                    297 A du CGI).
                  </p>
                ) : (
                  <p>TVA non applicable, article 293 B du CGI.</p>
                )}
                <p>Email : {user.email}</p>
              </div>
            </>
          ) : (
            <div className="mx-auto max-w-[360px] border-2 border-zinc-900 p-4 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b-2 border-zinc-900 pb-2.5">
                <div>
                  <p className="text-[10px] uppercase font-bold text-zinc-500">
                    Transporteur · Format 10×15
                  </p>
                  <p className="text-base font-black uppercase tracking-tight">
                    {sale.carrier}
                  </p>
                </div>
                <span className="border border-zinc-900 px-2 py-0.5 font-mono font-bold">
                  4×6
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 border-b border-zinc-300 pb-3">
                <div>
                  <p className="text-[10px] uppercase text-zinc-500 font-bold">
                    Expéditeur
                  </p>
                  <p className="font-bold text-zinc-900">{user.company_name}</p>
                  <p className="text-zinc-600">{sale.account_handle}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-zinc-500 font-bold">
                    Destinataire
                  </p>
                  <p className="font-bold text-zinc-900">{sale.buyer_name}</p>
                  <p className="text-zinc-600">{sale.buyer_city}, FR</p>
                </div>
              </div>

              {/* Clean SVG Barcode */}
              <div className="py-2 text-center border-b border-zinc-300">
                <svg
                  viewBox="0 0 240 52"
                  className="mx-auto h-14 w-full max-w-[260px]"
                  aria-label="Code barre suivi"
                >
                  {Array.from({ length: 42 }).map((_, i) => {
                    const width = (i * 7 + sale.tracking_code.length) % 3 === 0 ? 4 : 2;
                    const x = i * 5.6;
                    return (
                      <rect
                        key={i}
                        x={x}
                        y={2}
                        width={width}
                        height={46}
                        fill="#111827"
                      />
                    );
                  })}
                </svg>
                <p className="mt-1 font-mono text-sm font-bold tracking-widest">
                  {sale.tracking_code}
                </p>
              </div>

              <div className="rounded bg-zinc-100 p-2.5 border border-zinc-300">
                <p className="text-[10px] uppercase font-bold text-zinc-500">
                  Mémo préparation colis (SKU)
                </p>
                <p className="font-bold text-zinc-900 mt-0.5">{sale.item_title}</p>
                <p className="font-mono text-zinc-700 mt-0.5">
                  SKU : {sale.sku} · Facture : {sale.invoice_number}
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
