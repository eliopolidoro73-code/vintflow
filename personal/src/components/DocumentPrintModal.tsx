"use client";

import { Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDateFr, formatEuro } from "@/lib/format";
import type { AuthUser } from "@/lib/auth";

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
            <Button
              size="sm"
              onClick={() => window.print()}
              className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400 font-bold"
            >
              <Printer className="h-4 w-4 mr-1.5" />
              Imprimer / PDF
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div
          id="printable-document"
          className="rounded-xl bg-white text-zinc-900 p-6 shadow-inner"
        >
          {mode === "invoice" ? (
            <div className="space-y-6 text-xs">
              <div className="flex items-start justify-between border-b border-zinc-200 pb-4">
                <div>
                  <p className="text-lg font-extrabold tracking-tight text-zinc-950">
                    {user.company_name}
                  </p>
                  <p className="text-zinc-600 mt-0.5">SIRET : {user.siret}</p>
                  <p className="text-zinc-600">Email : {user.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-emerald-700">FACTURE</p>
                  <p className="font-mono font-semibold text-zinc-900">
                    {sale.invoice_number}
                  </p>
                  <p className="text-zinc-500">
                    Date : {formatDateFr(sale.sold_at)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-lg bg-zinc-50 p-3.5 border border-zinc-200">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Client / Acheteur
                  </p>
                  <p className="font-semibold text-zinc-900 mt-1">
                    {sale.buyer_name}
                  </p>
                  <p className="text-zinc-600">{sale.buyer_city}, France</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Canal &amp; Expédition
                  </p>
                  <p className="font-semibold text-zinc-900 mt-1 capitalize">
                    {sale.platform.replace("_", " ")} ({sale.account_handle})
                  </p>
                  <p className="text-zinc-600">
                    {sale.carrier} · {sale.tracking_code}
                  </p>
                </div>
              </div>

              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-zinc-300 text-left text-[11px] uppercase text-zinc-500">
                    <th className="py-2">Désignation / SKU</th>
                    <th className="py-2 text-center">Qté</th>
                    <th className="py-2 text-right">Montant TTC</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-zinc-200">
                    <td className="py-3">
                      <p className="font-semibold text-zinc-900">
                        {sale.item_title}
                      </p>
                      <p className="font-mono text-[11px] text-zinc-500">
                        Réf. SKU : {sale.sku} · Article d&apos;occasion
                      </p>
                    </td>
                    <td className="py-3 text-center">1</td>
                    <td className="py-3 text-right font-semibold">
                      {formatEuro(sale.gross_amount)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="flex justify-end">
                <div className="w-56 space-y-1.5">
                  <div className="flex justify-between text-zinc-600">
                    <span>Total HT</span>
                    <span>{formatEuro(sale.gross_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-extrabold text-zinc-950 border-t border-zinc-300 pt-1.5">
                    <span>Net à payer (TTC)</span>
                    <span>{formatEuro(sale.gross_amount)}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-zinc-200 pt-3 text-[10px] text-zinc-500 space-y-1">
                {isVatMargin ? (
                  <p>
                    Régime particulier — Biens d&apos;occasion (TVA sur la marge,
                    article 297 A du CGI).
                  </p>
                ) : (
                  <p>TVA non applicable, article 293 B du CGI.</p>
                )}
                <p>
                  Facture acquittée via {sale.platform.replace("_", " ")} ·
                  Générée par VintFlow.
                </p>
              </div>
            </div>
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
