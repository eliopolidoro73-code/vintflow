import { NextResponse } from "next/server";
import { assertSameOrigin, requireAuthenticatedUser } from "@/lib/auth";
import { callCloudAi } from "@/lib/ai";
import { sql } from "@/lib/db";
import { daysSince, formatEuro } from "@/lib/format";
import { getEffectivePlan, isPersoUnlimited } from "@/lib/perso-plan";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await requireAuthenticatedUser();
  if ("response" in auth) return auth.response;
  const user = auth.user;

  const plan = getEffectivePlan(user);
  const persoUnlimited = isPersoUnlimited(user);
  if (!persoUnlimited && !plan.novaAssistantAllowed) {
    return NextResponse.json(
      {
        error:
          "L'Assistant IA Nova connecté à tes données en temps réel est exclusif au plan Pro Scale (49 €/mois).",
      },
      { status: 403 },
    );
  }

  const rl = await checkRateLimit({
    scope: "ai_assistant",
    key: user.id,
    limit: 20,
    windowSeconds: 600,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trop de requêtes vers Nova. Patiente quelques minutes." },
      { status: 429 },
    );
  }

  const reserved = await sql<{ ai_credits_used: number }>(
    `update users
     set ai_credits_used = ai_credits_used + 1
     where id = $1 and ai_credits_used < $2
     returning ai_credits_used`,
    [
      user.id,
      plan.aiCreditsMonthlyLimit === -1 ? 2_000_000 : plan.aiCreditsMonthlyLimit,
    ],
  );
  if (reserved.length === 0) {
    return NextResponse.json(
      {
        error: `Quota de crédits IA/mois atteint.`,
      },
      { status: 403 },
    );
  }

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
    if (plan.crosslistMonthlyLimit === 0) {
      return NextResponse.json(
        {
          error:
            "Le crosslisting Vinted ↔ Leboncoin nécessite un plan Vendeur Plus ou Pro Scale.",
        },
        { status: 403 },
      );
    }
    const remaining = Math.max(0, plan.crosslistMonthlyLimit - user.crosslist_used);
    if (remaining <= 0) {
      return NextResponse.json(
        {
          error: `Quota mensuel de ${plan.crosslistMonthlyLimit} crosslistings atteint sur ton plan ${plan.name}.`,
        },
        { status: 403 },
      );
    }

    const candidates = await sql<{ id: string }>(
      `select id from inventory_items
       where user_id = $1 and status = 'active' and leboncoin_status != 'listed'
       order by created_at desc
       limit $2`,
      [user.id, remaining],
    );

    if (candidates.length === 0) {
      return NextResponse.json({
        ok: true,
        answer:
          "Toutes tes annonces actives sont déjà synchronisées sur Leboncoin.",
      });
    }

    for (const row of candidates) {
      await sql(
        `update inventory_items
         set leboncoin_status = 'listed'
         where id = $1 and user_id = $2`,
        [row.id, user.id],
      );
    }
    await sql(
      "update users set crosslist_used = crosslist_used + $1 where id = $2",
      [candidates.length, user.id],
    );

    return NextResponse.json({
      ok: true,
      answer: `Crosslisting effectué : ${candidates.length} annonce(s) supplémentaire(s) ont été préremplies et publiées sur Leboncoin (${user.crosslist_used + candidates.length} / ${plan.crosslistMonthlyLimit} ce mois-ci).`,
    });
  }

  const question = (body.question ?? "").trim().slice(0, 400);
  if (!question) {
    return NextResponse.json({ error: "Question requise" }, { status: 400 });
  }

  const [sales, items, messages] = await Promise.all([
    sql<{
      platform: string;
      gross_amount: string | number;
      purchase_cost: string | number;
      net_margin: string | number;
      shipment_status: string;
      item_title: string;
    }>(
      "select platform, gross_amount, purchase_cost, net_margin, shipment_status, item_title from sales where user_id = $1",
      [user.id],
    ),
    sql<{
      id: string;
      title: string;
      brand: string;
      listing_price: string | number;
      purchase_price: string | number;
      leboncoin_status: string;
      listed_at: string;
    }>(
      "select id, title, brand, listing_price, purchase_price, leboncoin_status, listed_at from inventory_items where user_id = $1 and status = 'active'",
      [user.id],
    ),
    sql<{ id: string; unread: boolean }>(
      "select id, unread from messages where user_id = $1",
      [user.id],
    ),
  ]);

  const totalCa = sales.reduce((s, r) => s + Number(r.gross_amount), 0);
  const totalPurchase = sales.reduce((s, r) => s + Number(r.purchase_cost), 0);
  const totalNet = sales.reduce((s, r) => s + Number(r.net_margin), 0);
  const roiPct =
    totalPurchase > 0 ? Math.round((totalNet / totalPurchase) * 100) : 0;
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
  const unreadCount = messages.filter((m) => m.unread).length;
  const bestSale = sales.reduce<(typeof sales)[0] | null>(
    (best, cur) =>
      !best || Number(cur.net_margin) > Number(best.net_margin) ? cur : best,
    null,
  );

  if (!user.is_demo) {
    const aiOut = await callCloudAi({
      systemPrompt: `Tu es Nova, l'assistant IA stratégique de Vintflow pour revendeurs Vinted, Leboncoin, TikTok Shop et eBay. Réponds en français de façon directe, chiffrée et actionnable avec ces vraies données : Chiffre d'affaires total=${formatEuro(totalCa)}, Marge commerciale=${formatEuro(totalNet)}, ROI sur coût de revient=${roiPct}%, Seuil TVA=${formatEuro(user.vat_threshold)}, Meilleure vente=${bestSale ? `${bestSale.item_title} (+${formatEuro(Number(bestSale.net_margin))})` : "Aucune"}, Colis à expédier=${pendingShip.length}, En transit=${pendingTransit.length} (${formatEuro(pendingAmount)} en attente), Messages non lus=${unreadCount}, Articles actifs=${items.length}, Dormants +14j=${dormant.length}, Non crosslistés Leboncoin=${notCrosslisted.length}.`,
      userPrompt: question,
      maxTokens: 300,
    });
    if (aiOut?.text) {
      return NextResponse.json({
        answer: aiOut.text,
        proposedAction:
          dormant.length > 0 && question.toLowerCase().includes("dorm")
            ? {
                id: "discount_dormant",
                label: `Baisser de 10 % les ${dormant.length} article(s) dormant(s)`,
                before: `${dormant.length} articles en ligne >= 14 jours`,
                after: `Prix ajustés de -10 % pour accélérer la vente`,
              }
            : notCrosslisted.length > 0 &&
                question.toLowerCase().includes("cross")
              ? {
                  id: "crosslist_all_lbc",
                  label: `Crosslister ${notCrosslisted.length} annonce(s) vers Leboncoin`,
                  before: `${notCrosslisted.length} annonce(s) uniquement sur Vinted`,
                  after: `Publiées sur Vinted + Leboncoin avec retrait auto`,
                }
              : null,
      });
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

  if (
    q.includes("vendu") ||
    q.includes("ca") ||
    q.includes("chiffre") ||
    q.includes("encais") ||
    q.includes("marge") ||
    q.includes("roi")
  ) {
    answer = `Sur ton compte, tu as généré **${formatEuro(totalCa)}** de chiffre d'affaires sur ${sales.length} ventes, pour une marge commerciale de **${formatEuro(totalNet)}** (ROI de **${roiPct}%** sur ton coût de revient).${bestSale ? ` Ta meilleure pièce : ${bestSale.item_title} (+${formatEuro(Number(bestSale.net_margin))}).` : ""}`;
  } else if (
    q.includes("attente") ||
    q.includes("colis") ||
    q.includes("expéd") ||
    q.includes("exped")
  ) {
    answer = `Tu as **${pendingShip.length} colis à expédier** aujourd'hui et **${pendingTransit.length} en transit**, soit **${formatEuro(pendingAmount)}** en attente de finalisation. Il te reste aussi **${unreadCount} message(s) non lu(s)** dans la messagerie unifiée.`;
  } else if (q.includes("tva") || q.includes("seuil") || q.includes("regime")) {
    const pctTva = Math.round((totalCa / Math.max(1, user.vat_threshold)) * 100);
    answer = `Tu es actuellement à **${pctTva}%** de ton seuil TVA configuré (${formatEuro(totalCa)} / ${formatEuro(user.vat_threshold)}).`;
  } else if (
    q.includes("dorm") ||
    q.includes("stock") ||
    q.includes("bais") ||
    q.includes("invendu")
  ) {
    if (dormant.length === 0) {
      answer = `Aucun article ne dort depuis plus de 14 jours sur tes ${items.length} annonces actives : ta rotation de stock est excellente.`;
    } else {
      answer = `Tu as **${dormant.length} article(s) dormant(s)** en ligne depuis 14 jours ou plus (${dormant.map((d) => `${d.title} à ${formatEuro(Number(d.listing_price))}`).join(", ")}). Je te propose une baisse ciblée de -10 % avant le pic de trafic de ce soir.`;
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
  } else if (
    q.includes("crosslist") ||
    q.includes("leboncoin") ||
    q.includes("lbc")
  ) {
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
    answer = `Point complet de ton cockpit : **${formatEuro(totalCa)}** de chiffre d'affaires, **${formatEuro(totalNet)}** de marge commerciale (ROI ${roiPct}%), **${pendingShip.length} colis à expédier**, **${unreadCount} message(s) non lu(s)** et **${dormant.length} article(s) dormant(s)**. Demande-moi par exemple : "Quels articles dorment ?" ou "Quel est mon ROI et mon seuil TVA ?".`;
  }

  return NextResponse.json({ answer, proposedAction });
}
