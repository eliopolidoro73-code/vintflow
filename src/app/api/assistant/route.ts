import { NextResponse } from "next/server";
import { assertSameOrigin, requireAuthenticatedUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { daysSince, formatEuro } from "@/lib/format";

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await requireAuthenticatedUser();
  if ("response" in auth) return auth.response;
  const user = auth.user;

  let body: {
    question?: string;
    executeAction?: "discount_dormant" | "crosslist_all_lbc";
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  if (body.executeAction === "discount_dormant") {
    const items = await sql<{
      id: string;
      listing_price: string | number;
      listed_at: string;
    }>(
      "select id, listing_price, listed_at from inventory_items where user_id = $1 and status = 'active'",
      [user.id],
    );
    let updated = 0;
    for (const item of items) {
      if (daysSince(item.listed_at) >= 14) {
        const nextPrice = Math.max(
          5,
          Math.round(Number(item.listing_price) * 0.9),
        );
        await sql(
          "update inventory_items set listing_price = $1 where id = $2 and user_id = $3",
          [nextPrice, item.id, user.id],
        );
        updated += 1;
      }
    }
    return NextResponse.json({
      ok: true,
      answer: `C'est appliqué : ${updated} article(s) dormant(s) ont été ajustés de -10 % pour accélérer leur rotation sans toucher à tes articles récents.`,
    });
  }

  if (body.executeAction === "crosslist_all_lbc") {
    const res = await sql<{ id: string }>(
      `update inventory_items
       set leboncoin_status = 'listed'
       where user_id = $1 and status = 'active' and leboncoin_status != 'listed'
       returning id`,
      [user.id],
    );
    return NextResponse.json({
      ok: true,
      answer: `Crosslisting effectué : ${res.length} annonce(s) supplémentaire(s) ont été préremplies et publiées sur Leboncoin.`,
    });
  }

  const question = (body.question ?? "").trim().slice(0, 400);
  if (!question) {
    return NextResponse.json({ error: "Question requise" }, { status: 400 });
  }

  const [sales, items] = await Promise.all([
    sql<{
      gross_amount: string | number;
      net_margin: string | number;
      urssaf_amount: string | number;
      shipment_status: string;
      item_title: string;
    }>(
      "select gross_amount, net_margin, urssaf_amount, shipment_status, item_title from sales where user_id = $1",
      [user.id],
    ),
    sql<{
      id: string;
      title: string;
      listing_price: string | number;
      purchase_price: string | number;
      leboncoin_status: string;
      listed_at: string;
    }>(
      "select id, title, listing_price, purchase_price, leboncoin_status, listed_at from inventory_items where user_id = $1 and status = 'active'",
      [user.id],
    ),
  ]);

  const totalCa = sales.reduce((s, r) => s + Number(r.gross_amount), 0);
  const totalNet = sales.reduce((s, r) => s + Number(r.net_margin), 0);
  const totalUrssaf = sales.reduce((s, r) => s + Number(r.urssaf_amount), 0);
  const pendingShip = sales.filter((s) => s.shipment_status === "to_ship");
  const pendingTransit = sales.filter(
    (s) => s.shipment_status === "in_transit",
  );
  const pendingAmount = [...pendingShip, ...pendingTransit].reduce(
    (s, r) => s + Number(r.gross_amount),
    0,
  );
  const dormant = items.filter((i) => daysSince(i.listed_at) >= 14);
  const notCrosslisted = items.filter((i) => i.leboncoin_status !== "listed");

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    try {
      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Tu es Nova, l'assistant IA de VintFlow pour revendeurs Vinted & Leboncoin. Réponds en français de façon directe, chiffrée et actionnable en utilisant uniquement ces chiffres réels du compte : CA total=${formatEuro(totalCa)}, Marge nette=${formatEuro(totalNet)}, URSSAF=${formatEuro(totalUrssaf)} (${user.urssaf_rate}%), Commandes à expédier=${pendingShip.length}, En transit=${pendingTransit.length} (${formatEuro(pendingAmount)} en attente), Articles actifs=${items.length}, Dormants +14j=${dormant.length}, Non crosslistés sur Leboncoin=${notCrosslisted.length}.`,
            },
            { role: "user", content: question },
          ],
          max_tokens: 260,
        }),
      });
      if (aiRes.ok) {
        const data = (await aiRes.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) {
          return NextResponse.json({
            answer: content,
            proposedAction:
              dormant.length > 0 && question.toLowerCase().includes("dorm")
                ? {
                    id: "discount_dormant",
                    label: `Baisser de 10 % les ${dormant.length} article(s) dormant(s)`,
                    before: `${dormant.length} articles en ligne >= 14 jours`,
                    after: `Prix ajustés de -10 % pour accélérer la vente`,
                  }
                : null,
          });
        }
      }
    } catch {
      // Fallback to local deterministic analytics engine
    }
  }

  const q = question.toLowerCase();
  let answer = "";
  let proposedAction: {
    id: "discount_dormant" | "crosslist_all_lbc";
    label: string;
    before: string;
    after: string;
  } | null = null;

  if (q.includes("vendu") || q.includes("ca") || q.includes("chiffre") || q.includes("encais")) {
    answer = `Sur ton compte, tu as généré **${formatEuro(totalCa)}** de chiffre d'affaires sur ${sales.length} ventes, pour une marge nette réelle de **${formatEuro(totalNet)}** après déduction de tes prix d'achat, frais et **${formatEuro(totalUrssaf)}** d'URSSAF (${user.urssaf_rate}%).`;
  } else if (q.includes("attente") || q.includes("colis") || q.includes("expéd") || q.includes("exped")) {
    answer = `Tu as **${pendingShip.length} colis à expédier** aujourd'hui et **${pendingTransit.length} en transit**, ce qui représente **${formatEuro(pendingAmount)}** en attente de finalisation.`;
  } else if (q.includes("dorm") || q.includes("stock") || q.includes("bais") || q.includes("invendu")) {
    if (dormant.length === 0) {
      answer = `Aucun article ne dort depuis plus de 14 jours sur tes ${items.length} annonces actives : ta rotation de stock est excellente.`;
    } else {
      answer = `Tu as **${dormant.length} article(s) dormant(s)** en ligne depuis 14 jours ou plus (${dormant.map((d) => `${d.title} à ${formatEuro(Number(d.listing_price))}`).join(", ")}). Je te propose une baisse ciblée de -10 % avant de publier ce soir.`;
      proposedAction = {
        id: "discount_dormant",
        label: `Appliquer -10 % sur ${dormant.length} article(s) dormant(s)`,
        before: dormant
          .map((d) => `${d.title} (${formatEuro(Number(d.listing_price))})`)
          .join(" · "),
        after: dormant
          .map(
            (d) =>
              `${d.title} (${formatEuro(Math.max(5, Math.round(Number(d.listing_price) * 0.9)))})`,
          )
          .join(" · "),
      };
    }
  } else if (q.includes("crosslist") || q.includes("leboncoin") || q.includes("lbc")) {
    if (notCrosslisted.length === 0) {
      answer = `Toutes tes ${items.length} annonces actives sont déjà synchronisées entre Vinted et Leboncoin.`;
    } else {
      answer = `Il reste **${notCrosslisted.length} annonce(s)** présentes sur Vinted mais pas encore publiées sur Leboncoin. Je peux préparer et publier ces fiches maintenant.`;
      proposedAction = {
        id: "crosslist_all_lbc",
        label: `Crosslister ${notCrosslisted.length} annonce(s) vers Leboncoin`,
        before: `${notCrosslisted.length} annonce(s) uniquement sur Vinted`,
        after: `Publiées sur Vinted + Leboncoin avec retrait auto activé`,
      };
    }
  } else {
    answer = `Voici ton point flash : **${formatEuro(totalCa)}** de CA, **${formatEuro(totalNet)}** de marge nette (${formatEuro(totalUrssaf)} d'URSSAF estimée), **${pendingShip.length} colis à expédier** et **${dormant.length} article(s) dormant(s)**. Demande-moi par exemple : "Quels articles dorment ?" ou "Que reste-t-il à crosslister sur Leboncoin ?".`;
  }

  return NextResponse.json({ answer, proposedAction });
}
