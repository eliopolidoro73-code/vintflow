import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { daysSince } from "@/lib/format";

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if ("response" in auth) return auth.response;
  const user = auth.user;

  const [accounts, items, sales, messages] = await Promise.all([
    sql<{
      id: string;
      platform: string;
      handle: string;
      status: string;
      listings_count: number;
      last_synced_at: string;
    }>(
      `select id, platform, handle, status, listings_count, last_synced_at
       from connected_accounts where user_id = $1 order by created_at asc`,
      [user.id],
    ),
    sql<{
      id: string;
      sku: string;
      title: string;
      brand: string;
      category: string;
      size: string;
      condition: string;
      location: string;
      purchase_price: string | number;
      extra_costs: string | number;
      listing_price: string | number;
      status: string;
      vinted_status: string;
      leboncoin_status: string;
      tiktok_status: string;
      ebay_status: string;
      vinted_account: string;
      description_vinted: string;
      description_lbc: string;
      image_color: string;
      listed_at: string;
    }>(
      `select id, sku, title, brand, category, size, condition, location,
              purchase_price, extra_costs, listing_price, status,
              vinted_status, leboncoin_status, tiktok_status, ebay_status,
              vinted_account, description_vinted, description_lbc, image_color, listed_at
       from inventory_items where user_id = $1 order by created_at desc`,
      [user.id],
    ),
    sql<{
      id: string;
      item_id: string | null;
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
      gross_amount: string | number;
      purchase_cost: string | number;
      platform_fees: string | number;
      boost_cost: string | number;
      shipping_cost: string | number;
      urssaf_amount: string | number;
      net_margin: string | number;
      sold_at: string;
    }>(
      `select id, item_id, invoice_number, platform, account_handle, item_title, sku,
              buyer_name, buyer_city, carrier, tracking_code, shipment_status,
              gross_amount, purchase_cost, platform_fees, boost_cost, shipping_cost,
              urssaf_amount, net_margin, sold_at
       from sales where user_id = $1 order by sold_at desc`,
      [user.id],
    ),
    sql<{
      id: string;
      platform: string;
      account_handle: string;
      buyer_name: string;
      item_title: string;
      item_price: string | number;
      last_message: string;
      reply_text: string | null;
      unread: boolean;
      updated_at: string;
    }>(
      `select id, platform, account_handle, buyer_name, item_title,
              item_price, last_message, reply_text, unread, updated_at
       from messages where user_id = $1 order by updated_at desc`,
      [user.id],
    ),
  ]);

  const normalizedItems = items.map((item) => ({
    ...item,
    purchase_price: Number(item.purchase_price),
    extra_costs: Number(item.extra_costs),
    listing_price: Number(item.listing_price),
    days_listed: daysSince(item.listed_at),
  }));

  const normalizedSales = sales.map((s) => ({
    ...s,
    gross_amount: Number(s.gross_amount),
    purchase_cost: Number(s.purchase_cost),
    platform_fees: Number(s.platform_fees),
    boost_cost: Number(s.boost_cost),
    shipping_cost: Number(s.shipping_cost),
    urssaf_amount: Number(s.urssaf_amount),
    net_margin: Number(s.net_margin),
  }));

  const normalizedMessages = messages.map((m) => ({
    ...m,
    item_price: Number(m.item_price),
  }));

  const totalRevenue = normalizedSales.reduce(
    (sum, s) => sum + s.gross_amount,
    0,
  );
  const totalNetMargin = normalizedSales.reduce(
    (sum, s) => sum + s.net_margin,
    0,
  );
  const totalUrssaf = normalizedSales.reduce(
    (sum, s) => sum + s.urssaf_amount,
    0,
  );
  const activeItems = normalizedItems.filter((i) => i.status === "active");
  const stockCostValue = activeItems.reduce(
    (sum, i) => sum + i.purchase_price + i.extra_costs,
    0,
  );
  const stockListingValue = activeItems.reduce(
    (sum, i) => sum + i.listing_price,
    0,
  );
  const toShipCount = normalizedSales.filter(
    (s) => s.shipment_status === "to_ship",
  ).length;
  const unreadCount = normalizedMessages.filter((m) => m.unread).length;
  const dormantItems = activeItems.filter((i) => i.days_listed >= 14);
  const crosslistedCount = activeItems.filter(
    (i) => i.vinted_status === "listed" && i.leboncoin_status === "listed",
  ).length;

  return NextResponse.json(
    {
      user,
      accounts,
      items: normalizedItems,
      sales: normalizedSales,
      messages: normalizedMessages,
      kpis: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalNetMargin: Number(totalNetMargin.toFixed(2)),
        totalUrssaf: Number(totalUrssaf.toFixed(2)),
        marginPercent:
          totalRevenue > 0
            ? Number(((totalNetMargin / totalRevenue) * 100).toFixed(1))
            : 0,
        activeListingsCount: activeItems.length,
        stockCostValue: Number(stockCostValue.toFixed(2)),
        stockListingValue: Number(stockListingValue.toFixed(2)),
        toShipCount,
        unreadCount,
        dormantCount: dormantItems.length,
        crosslistedCount,
      },
      integrations: {
        stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
        openaiConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
      },
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}
