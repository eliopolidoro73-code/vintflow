import { requireAuthenticatedUser } from "@/lib/auth";
import { sql } from "@/lib/db";

function csvCell(value: string | number): string {
  const str = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if ("response" in auth) return auth.response;

  const sales = await sql<{
    sold_at: string;
    invoice_number: string;
    platform: string;
    account_handle: string;
    item_title: string;
    sku: string;
    buyer_name: string;
    gross_amount: string | number;
    purchase_cost: string | number;
    platform_fees: string | number;
    boost_cost: string | number;
    net_margin: string | number;
  }>(
    `select sold_at, invoice_number, platform, account_handle, item_title, sku,
            buyer_name, gross_amount, purchase_cost, platform_fees, boost_cost,
            net_margin
     from sales where user_id = $1 order by sold_at desc`,
    [auth.user.id],
  );

  const header = [
    "Date",
    "N° Facture",
    "Plateforme",
    "Compte",
    "Article",
    "SKU",
    "Acheteur",
    "Chiffre d'affaire (€)",
    "Coût de revient (€)",
    "Frais Plateforme (€)",
    "Boosts (€)",
    "Marge commerciale (€)",
  ]
    .map(csvCell)
    .join(";");

  const lines = sales.map((s) =>
    [
      new Date(s.sold_at).toISOString().slice(0, 10),
      s.invoice_number,
      s.platform,
      s.account_handle,
      s.item_title,
      s.sku,
      s.buyer_name,
      Number(s.gross_amount).toFixed(2),
      Number(s.purchase_cost).toFixed(2),
      Number(s.platform_fees).toFixed(2),
      Number(s.boost_cost).toFixed(2),
      Number(s.net_margin).toFixed(2),
    ]
      .map(csvCell)
      .join(";"),
  );

  const csv = "\uFEFF" + [header, ...lines].join("\r\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition":
        'attachment; filename="vintflow-livre-recettes-2026.csv"',
      "cache-control": "private, no-store",
    },
  });
}
