import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { invoicePdfBuffer, type InvoicePdfSale } from "@/lib/invoice-pdf";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedUser();
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const rows = await sql<{
    invoice_number: string;
    platform: string;
    account_handle: string;
    item_title: string;
    sku: string;
    buyer_name: string;
    buyer_city: string;
    carrier: string;
    tracking_code: string;
    gross_amount: string | number;
    sold_at: string;
  }>(
    `select invoice_number, platform, account_handle, item_title, sku, buyer_name, buyer_city,
            carrier, tracking_code, gross_amount, sold_at
     from sales where id = $1 and user_id = $2 limit 1`,
    [id, auth.user.id],
  );

  const row = rows[0];
  if (!row) {
    return NextResponse.json({ error: "Vente introuvable" }, { status: 404 });
  }

  const sale: InvoicePdfSale = {
    invoice_number: row.invoice_number,
    platform: row.platform,
    account_handle: row.account_handle,
    item_title: row.item_title,
    sku: row.sku,
    buyer_name: row.buyer_name,
    buyer_city: row.buyer_city,
    carrier: row.carrier,
    tracking_code: row.tracking_code,
    gross_amount: Number(row.gross_amount),
    sold_at: row.sold_at,
  };

  const pdfBytes = new Uint8Array(invoicePdfBuffer(sale, auth.user));
  const fileName = `${sale.invoice_number.replace(/[^\w.-]+/g, "_")}.pdf`;

  return new NextResponse(pdfBytes, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${fileName}"`,
      "cache-control": "private, max-age=3600",
    },
  });
}