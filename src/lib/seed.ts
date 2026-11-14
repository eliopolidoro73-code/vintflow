import crypto from "node:crypto";
import { sql } from "./db";

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86400_000).toISOString();
}

export async function seedUserWorkspace(userId: string, urssafRate = 12.3) {
  const accounts = [
    {
      id: crypto.randomUUID(),
      platform: "vinted",
      handle: "@atelier_demo",
      listings_count: 42,
    },
    {
      id: crypto.randomUUID(),
      platform: "vinted",
      handle: "@fripe_archive",
      listings_count: 19,
    },
    {
      id: crypto.randomUUID(),
      platform: "leboncoin",
      handle: "Atelier Seconde Main",
      listings_count: 24,
    },
    {
      id: crypto.randomUUID(),
      platform: "tiktok_shop",
      handle: "@atelier.drops",
      listings_count: 8,
    },
    {
      id: crypto.randomUUID(),
      platform: "ebay",
      handle: "atelier_archive_fr",
      listings_count: 11,
    },
  ];

  for (const acc of accounts) {
    await sql(
      `insert into connected_accounts (id, user_id, platform, handle, status, listings_count)
       values ($1, $2, $3, $4, 'connected', $5)`,
      [acc.id, userId, acc.platform, acc.handle, acc.listings_count],
    );
  }

  const items = [
    {
      id: crypto.randomUUID(),
      sku: "SKU-CRH-001",
      title: "Veste Carhartt Detroit Canvas Noir",
      brand: "Carhartt",
      category: "Vestes & Manteaux",
      size: "L",
      condition: "Très bon état",
      location: "Rack A1",
      purchase_price: 28,
      extra_costs: 2.5,
      listing_price: 89,
      status: "active",
      vinted_status: "listed",
      leboncoin_status: "listed",
      tiktok_status: "not_listed",
      ebay_status: "listed",
      vinted_account: "@atelier_demo",
      image_color: "#0f766e",
      listed_at: daysAgoIso(4),
    },
    {
      id: crypto.randomUUID(),
      sku: "SKU-RLP-002",
      title: "Pull Ralph Lauren Maille Torsadée Marine",
      brand: "Ralph Lauren",
      category: "Pulls & Sweats",
      size: "M",
      condition: "Neuf sans étiquette",
      location: "Bac B2",
      purchase_price: 16,
      extra_costs: 1.5,
      listing_price: 54,
      status: "active",
      vinted_status: "listed",
      leboncoin_status: "listed",
      tiktok_status: "listed",
      ebay_status: "not_listed",
      vinted_account: "@atelier_demo",
      image_color: "#1e3a8a",
      listed_at: daysAgoIso(6),
    },
    {
      id: crypto.randomUUID(),
      sku: "SKU-NKE-003",
      title: "Sneakers Nike Air Max 90 Infrared",
      brand: "Nike",
      category: "Chaussures",
      size: "42",
      condition: "Bon état",
      location: "Étagère C4",
      purchase_price: 30,
      extra_costs: 4,
      listing_price: 78,
      status: "active",
      vinted_status: "listed",
      leboncoin_status: "not_listed",
      tiktok_status: "not_listed",
      ebay_status: "not_listed",
      vinted_account: "@fripe_archive",
      image_color: "#be123c",
      listed_at: daysAgoIso(19),
    },
    {
      id: crypto.randomUUID(),
      sku: "SKU-LVS-004",
      title: "Jean Levi's 501 Vintage Made in USA",
      brand: "Levi's",
      category: "Pantalons",
      size: "W32 L32",
      condition: "Très bon état",
      location: "Rack A3",
      purchase_price: 14,
      extra_costs: 0,
      listing_price: 45,
      status: "active",
      vinted_status: "listed",
      leboncoin_status: "listed",
      tiktok_status: "not_listed",
      ebay_status: "not_listed",
      vinted_account: "@fripe_archive",
      image_color: "#1d4ed8",
      listed_at: daysAgoIso(17),
    },
    {
      id: crypto.randomUUID(),
      sku: "SKU-TNF-005",
      title: "Doudoune The North Face Nuptse 700",
      brand: "The North Face",
      category: "Vestes & Manteaux",
      size: "M",
      condition: "Très bon état",
      location: "Rack A2",
      purchase_price: 58,
      extra_costs: 5,
      listing_price: 145,
      status: "active",
      vinted_status: "listed",
      leboncoin_status: "listed",
      tiktok_status: "listed",
      ebay_status: "listed",
      vinted_account: "@atelier_demo",
      image_color: "#0f172a",
      listed_at: daysAgoIso(2),
    },
    {
      id: crypto.randomUUID(),
      sku: "SKU-ARC-006",
      title: "Veste Arc'teryx Beta LT Gore-Tex",
      brand: "Arc'teryx",
      category: "Vestes & Manteaux",
      size: "L",
      condition: "Très bon état",
      location: "Housse P1",
      purchase_price: 95,
      extra_costs: 4,
      listing_price: 225,
      status: "sold",
      vinted_status: "sold",
      leboncoin_status: "removed",
      tiktok_status: "not_listed",
      ebay_status: "not_listed",
      vinted_account: "@atelier_demo",
      image_color: "#047857",
      listed_at: daysAgoIso(11),
    },
  ];

  for (const item of items) {
    await sql(
      `insert into inventory_items (
        id, user_id, sku, title, brand, category, size, condition, location,
        purchase_price, extra_costs, listing_price, status,
        vinted_status, leboncoin_status, tiktok_status, ebay_status,
        vinted_account, description_vinted, description_lbc, image_color, listed_at
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16, $17,
        $18, $19, $20, $21, $22
      )`,
      [
        item.id,
        userId,
        item.sku,
        item.title,
        item.brand,
        item.category,
        item.size,
        item.condition,
        item.location,
        item.purchase_price,
        item.extra_costs,
        item.listing_price,
        item.status,
        item.vinted_status,
        item.leboncoin_status,
        item.tiktok_status,
        item.ebay_status,
        item.vinted_account,
        `${item.title} (${item.brand}) · Taille ${item.size} · ${item.condition}. Expédition rapide sous 24h.`,
        `${item.title} de marque ${item.brand}, taille ${item.size}. Remise en main propre ou envoi sécurisé.`,
        item.image_color,
        item.listed_at,
      ],
    );
  }

  const salesSeed = [
    {
      invoice_number: "FAC-2026-041",
      platform: "vinted",
      account_handle: "@atelier_demo",
      item_title: "Veste Arc'teryx Beta LT Gore-Tex",
      sku: "SKU-ARC-006",
      buyer_name: "Camille Laurent",
      buyer_city: "Lyon",
      carrier: "Mondial Relay",
      tracking_code: "MR-88492014FR",
      shipment_status: "to_ship",
      gross_amount: 225,
      purchase_cost: 95,
      platform_fees: 0,
      boost_cost: 1.95,
      shipping_cost: 0,
      sold_at: daysAgoIso(0),
    },
    {
      invoice_number: "FAC-2026-040",
      platform: "leboncoin",
      account_handle: "Atelier Seconde Main",
      item_title: "Sweat Nike Vintage Swoosh Gris",
      sku: "SKU-NKE-009",
      buyer_name: "Yanis Benali",
      buyer_city: "Marseille",
      carrier: "Chronopost Shop2Shop",
      tracking_code: "CS-55192044FR",
      shipment_status: "to_ship",
      gross_amount: 42,
      purchase_cost: 11,
      platform_fees: 0,
      boost_cost: 0,
      shipping_cost: 0,
      sold_at: daysAgoIso(1),
    },
    {
      invoice_number: "FAC-2026-039",
      platform: "vinted",
      account_handle: "@atelier_demo",
      item_title: "Pull Ralph Lauren Col Zip Beige",
      sku: "SKU-RLP-014",
      buyer_name: "Léa Moreau",
      buyer_city: "Bordeaux",
      carrier: "Vinted Go",
      tracking_code: "VG-19203381FR",
      shipment_status: "in_transit",
      gross_amount: 58,
      purchase_cost: 18,
      platform_fees: 0,
      boost_cost: 1.15,
      shipping_cost: 0,
      sold_at: daysAgoIso(3),
    },
    {
      invoice_number: "FAC-2026-038",
      platform: "tiktok_shop",
      account_handle: "@atelier.drops",
      item_title: "Sacoche Carhartt Essentials",
      sku: "SKU-CRH-018",
      buyer_name: "Hugo Petit",
      buyer_city: "Lille",
      carrier: "Colissimo",
      tracking_code: "6A09281746281",
      shipment_status: "delivered",
      gross_amount: 34,
      purchase_cost: 12,
      platform_fees: 1.7,
      boost_cost: 0,
      shipping_cost: 0,
      sold_at: daysAgoIso(6),
    },
    {
      invoice_number: "FAC-2026-037",
      platform: "vinted",
      account_handle: "@fripe_archive",
      item_title: "Jean Levi's 501 Stone Wash",
      sku: "SKU-LVS-021",
      buyer_name: "Sarah Dubois",
      buyer_city: "Nantes",
      carrier: "Mondial Relay",
      tracking_code: "MR-77319022FR",
      shipment_status: "completed",
      gross_amount: 46,
      purchase_cost: 13,
      platform_fees: 0,
      boost_cost: 0,
      shipping_cost: 0,
      sold_at: daysAgoIso(9),
    },
    {
      invoice_number: "FAC-2026-036",
      platform: "ebay",
      account_handle: "atelier_archive_fr",
      item_title: "Adidas Samba OG White Black 43",
      sku: "SKU-ADS-025",
      buyer_name: "Malik Toumi",
      buyer_city: "Toulouse",
      carrier: "Mondial Relay",
      tracking_code: "MR-66120933FR",
      shipment_status: "completed",
      gross_amount: 72,
      purchase_cost: 28,
      platform_fees: 5.76,
      boost_cost: 0,
      shipping_cost: 0,
      sold_at: daysAgoIso(14),
    },
    {
      invoice_number: "FAC-2026-035",
      platform: "vinted",
      account_handle: "@atelier_demo",
      item_title: "Chemise Lacoste Oxford Bleu Ciel",
      sku: "SKU-LAC-030",
      buyer_name: "Chloé Mercier",
      buyer_city: "Strasbourg",
      carrier: "Vinted Go",
      tracking_code: "VG-55102938FR",
      shipment_status: "completed",
      gross_amount: 39,
      purchase_cost: 11,
      platform_fees: 0,
      boost_cost: 0,
      shipping_cost: 0,
      sold_at: daysAgoIso(22),
    },
  ];

  for (const s of salesSeed) {
    const urssaf = Number(((s.gross_amount * urssafRate) / 100).toFixed(2));
    const net = Number(
      (
        s.gross_amount -
        s.purchase_cost -
        s.platform_fees -
        s.boost_cost -
        s.shipping_cost -
        urssaf
      ).toFixed(2),
    );
    await sql(
      `insert into sales (
        id, user_id, invoice_number, platform, account_handle, item_title, sku,
        buyer_name, buyer_city, carrier, tracking_code, shipment_status,
        gross_amount, purchase_cost, platform_fees, boost_cost, shipping_cost,
        urssaf_amount, net_margin, sold_at
      ) values (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17,
        $18, $19, $20
      )`,
      [
        crypto.randomUUID(),
        userId,
        s.invoice_number,
        s.platform,
        s.account_handle,
        s.item_title,
        s.sku,
        s.buyer_name,
        s.buyer_city,
        s.carrier,
        s.tracking_code,
        s.shipment_status,
        s.gross_amount,
        s.purchase_cost,
        s.platform_fees,
        s.boost_cost,
        s.shipping_cost,
        urssaf,
        net,
        s.sold_at,
      ],
    );
  }

  const msgs = [
    {
      platform: "vinted",
      account_handle: "@atelier_demo",
      buyer_name: "Camille",
      item_title: "Veste Carhartt Detroit Canvas Noir",
      item_price: 89,
      last_message: "Elle taille comment ? Un L normal ou plutôt oversize ?",
      unread: true,
    },
    {
      platform: "leboncoin",
      account_handle: "Atelier Seconde Main",
      buyer_name: "Yanis",
      item_title: "Pull Ralph Lauren Maille Torsadée Marine",
      item_price: 54,
      last_message: "Tu ferais 45 € si je te le prends ce soir ?",
      unread: true,
    },
    {
      platform: "vinted",
      account_handle: "@fripe_archive",
      buyer_name: "Léa",
      item_title: "Jean Levi's 501 Vintage Made in USA",
      item_price: 45,
      last_message: "Toujours dispo ? Possible d'avoir la longueur totale ?",
      unread: true,
    },
    {
      platform: "vinted",
      account_handle: "@atelier_demo",
      buyer_name: "Hugo",
      item_title: "Doudoune The North Face Nuptse 700",
      item_price: 145,
      last_message: "Envoi demain possible si je valide maintenant ?",
      unread: false,
    },
    {
      platform: "tiktok_shop",
      account_handle: "@atelier.drops",
      buyer_name: "Malik",
      item_title: "Sneakers Nike Air Max 90 Infrared",
      item_price: 78,
      last_message: "Lot possible avec la veste Carhartt ?",
      unread: false,
    },
  ];

  for (const m of msgs) {
    await sql(
      `insert into messages (
        id, user_id, platform, account_handle, buyer_name,
        item_title, item_price, last_message, unread
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        crypto.randomUUID(),
        userId,
        m.platform,
        m.account_handle,
        m.buyer_name,
        m.item_title,
        m.item_price,
        m.last_message,
        m.unread,
      ],
    );
  }

  const lotsSeed = [
    {
      title: "Ballot Workwear Carhartt & Dickies (8 pièces)",
      supplier: "Grossiste Vintage EU",
      items_count: 8,
      items_sold: 5,
      total_cost: 165,
      shipping_cost: 14,
      revenue_generated: 342,
      purchased_at: daysAgoIso(24),
    },
    {
      title: "Lot Ralph Lauren & Lacoste Maille (6 pièces)",
      supplier: "Friperie Pro Lyon",
      items_count: 6,
      items_sold: 4,
      total_cost: 84,
      shipping_cost: 8,
      revenue_generated: 215,
      purchased_at: daysAgoIso(12),
    },
  ];

  for (const lot of lotsSeed) {
    await sql(
      `insert into sourcing_lots (
        id, user_id, title, supplier, items_count, items_sold,
        total_cost, shipping_cost, revenue_generated, purchased_at
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        crypto.randomUUID(),
        userId,
        lot.title,
        lot.supplier,
        lot.items_count,
        lot.items_sold,
        lot.total_cost,
        lot.shipping_cost,
        lot.revenue_generated,
        lot.purchased_at,
      ],
    );
  }

  const expensesSeed = [
    {
      label: "Rouleau 500 étiquettes thermiques 10×15",
      category: "Emballage & Envoi",
      amount: 14.9,
      incurred_at: daysAgoIso(18),
    },
    {
      label: "50 pochettes d'expédition recyclées",
      category: "Emballage & Envoi",
      amount: 12.5,
      incurred_at: daysAgoIso(9),
    },
    {
      label: "Détachant textile & pressing vestes",
      category: "Remise en état",
      amount: 9.0,
      incurred_at: daysAgoIso(5),
    },
  ];

  for (const exp of expensesSeed) {
    await sql(
      `insert into expenses (id, user_id, label, category, amount, incurred_at)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        crypto.randomUUID(),
        userId,
        exp.label,
        exp.category,
        exp.amount,
        exp.incurred_at,
      ],
    );
  }
}
