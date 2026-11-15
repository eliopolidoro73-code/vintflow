"use client";

import type { AuthUser } from "@/lib/auth";
import type { SaleRecord } from "@/components/DocumentPrintModal";
import { isRetailPurchasePlatform } from "@/lib/invoice-kind";
import { invoicePreviewTheme } from "@/lib/invoice-pdf";
import { INVOICE_BRAND_WORDMARK } from "@/lib/invoice-brand-styles";
import { formatDateFr, formatEuro } from "@/lib/format";

export function InvoiceBrandedPreview({
  sale,
  user,
  variant = "dark",
}: {
  sale: SaleRecord;
  user: AuthUser;
  variant?: "dark" | "print";
}) {
  const { style, luxury } = invoicePreviewTheme(sale.item_title, sale.sku);
  const accent = style.accent;
  const bg = style.headerBg;
  const isLuxe = style.template !== "default";
  const isRetail = isRetailPurchasePlatform(sale.platform);
  const label = isRetail
    ? (style.retailLabel ?? "FACTURE D'ACHAT · BOUTIQUE")
    : style.invoiceLabel;
  const print = variant === "print";
  const wordmark = INVOICE_BRAND_WORDMARK[style.template];

  const headerBand = print
    ? "bg-zinc-50 border-b border-zinc-200"
    : "border-b border-black/10";
  const bodyBand = print ? "bg-white text-zinc-800" : "bg-[#0e111a]/90 text-zinc-300";
  const companyClass = print ? "text-zinc-950" : "text-zinc-900 dark:text-white";
  const metaClass = print ? "text-zinc-600" : "text-zinc-600 dark:text-zinc-300";

  return (
    <div
      className={`rounded-2xl overflow-hidden shadow-xl ${
        print ? "border border-zinc-200" : "border border-white/10"
      }`}
      style={
        print
          ? undefined
          : {
              background: `linear-gradient(180deg, rgb(${bg.join(",")}) 0%, #0e111a 38%)`,
            }
      }
    >
      <div
        className={`px-5 py-4 flex flex-wrap items-center justify-between gap-3 ${headerBand}`}
        style={print ? { backgroundColor: `rgb(${bg.join(",")})` } : undefined}
      >
        <div
          className={
            wordmark || (isLuxe && style.displayName)
              ? "flex flex-col justify-center gap-1"
              : undefined
          }
        >
          {wordmark ? (
            <img
              src={wordmark}
              alt={style.displayName || luxury.brand || "Marque"}
              className={`h-8 w-auto max-w-[220px] object-contain ${
                isRetail && style.template === "moncler" ? "mx-auto" : ""
              }`}
            />
          ) : isLuxe && (style.displayName || luxury.brand) ? (
            <p
              className="text-sm font-bold tracking-[0.18em] uppercase"
              style={{ color: `rgb(${accent.join(",")})` }}
            >
              {style.displayName || luxury.brand}
            </p>
          ) : null}
          <p className={`text-sm font-extrabold mt-0.5 ${companyClass}`}>
            {user.company_name || user.name}
          </p>
          {print && user.siret && (
            <p className="text-[10px] text-zinc-600 mt-0.5">SIRET : {user.siret}</p>
          )}
        </div>
        <div className="text-right">
          <p
            className="text-xs font-bold"
            style={{ color: `rgb(${accent.join(",")})` }}
          >
            {label}
          </p>
          <p className={`text-[11px] mt-0.5 font-mono font-semibold ${metaClass}`}>
            {sale.invoice_number}
          </p>
          <p className="text-[10px] text-zinc-500">{formatDateFr(sale.sold_at)}</p>
        </div>
      </div>
      <div className={`px-5 py-4 text-xs space-y-2 ${bodyBand}`}>
        <div className="grid sm:grid-cols-2 gap-3">
          <PreviewField
            label={isRetail ? "Client" : "Acheteur"}
            value={`${sale.buyer_name} · ${sale.buyer_city}`}
            print={print}
          />
          <PreviewField
            label={isRetail ? "Règlement" : "Canal & expédition"}
            value={
              isRetail
                ? `${sale.carrier} · carte bancaire`
                : `${sale.platform.replace(/_/g, " ")} (${sale.account_handle}) · ${sale.carrier} · ${sale.tracking_code}`
            }
            print={print}
          />
        </div>
        <PreviewField label="Article" value={sale.item_title} emphasize print={print} />
        <p className="text-[10px] font-mono text-zinc-500">Réf. SKU : {sale.sku}</p>
        {luxury.productLine && (
          <PreviewField label="Modèle" value={luxury.productLine} print={print} />
        )}
        {luxury.conditionLabel && (
          <PreviewField label="État" value={luxury.conditionLabel} print={print} />
        )}
        <p
          className={`text-lg font-bold pt-1 ${print ? "text-zinc-950" : "text-white"}`}
        >
          {formatEuro(sale.gross_amount)}{" "}
          <span className="text-[10px] font-normal text-zinc-500">TTC</span>
        </p>
        {(sale.purchase_cost > 0 || sale.net_margin !== 0) && !isRetail && (
          <p className={print ? "text-zinc-600 text-[11px]" : "text-[11px] text-zinc-400"}>
            Coût {formatEuro(sale.purchase_cost)} · Frais plateforme{" "}
            {formatEuro(sale.platform_fees)} · Marge{" "}
            <span
              className={
                print ? "text-emerald-700 font-semibold" : "text-emerald-300 font-semibold"
              }
            >
              {formatEuro(sale.net_margin)}
            </span>
          </p>
        )}
        {style.footerTagline && (
          <p
            className={`text-[10px] border-t pt-2 ${
              print ? "text-zinc-500 border-zinc-200" : "text-zinc-500 border-white/5"
            }`}
          >
            {style.footerTagline}
          </p>
        )}
        {print && (
          <p className="text-[9px] text-zinc-500 pt-1">
            Document généré par VintFlow — mise en page inspirée format maison (wordmark
            typographique, sans logo déposé).
          </p>
        )}
      </div>
    </div>
  );
}

function PreviewField({
  label,
  value,
  emphasize,
  print,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  print?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p
        className={
          emphasize
            ? print
              ? "text-sm font-semibold text-zinc-950 leading-snug"
              : "text-sm font-semibold text-white leading-snug"
            : print
              ? "text-zinc-700"
              : "text-zinc-300"
        }
      >
        {value}
      </p>
    </div>
  );
}