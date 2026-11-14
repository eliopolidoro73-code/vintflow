"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Check,
  CreditCard,
  Download,
  FileText,
  Layers,
  LayoutDashboard,
  Loader2,
  LogOut,
  MessageSquare,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShoppingBag,
  Sparkles,
  Trash2,
  TrendingUp,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { computeNetMargin, formatDateFr, formatEuro } from "@/lib/format";
import { PLANS, type BillingCycle, type PlanId } from "@/lib/plans";
import type { AuthUser } from "@/lib/auth";
import {
  DocumentPrintModal,
  type SaleRecord,
} from "@/components/DocumentPrintModal";
import { NewListingDialog } from "@/components/NewListingDialog";
import { ResellerToolsStudio } from "@/components/ResellerToolsStudio";
import { VintflowLogo } from "@/components/VintflowLogo";

interface ConnectedAccount {
  id: string;
  platform: string;
  handle: string;
  status: string;
  listings_count: number;
  last_synced_at: string;
}

interface InventoryItem {
  id: string;
  sku: string;
  title: string;
  brand: string;
  category: string;
  size: string;
  condition: string;
  location: string;
  purchase_price: number;
  extra_costs: number;
  listing_price: number;
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
  days_listed: number;
}

interface MessageRecord {
  id: string;
  platform: string;
  account_handle: string;
  buyer_name: string;
  item_title: string;
  item_price: number;
  last_message: string;
  reply_text: string | null;
  unread: boolean;
  updated_at: string;
}

interface WorkspacePayload {
  user: AuthUser;
  accounts: ConnectedAccount[];
  items: InventoryItem[];
  sales: SaleRecord[];
  messages: MessageRecord[];
  kpis: {
    totalRevenue: number;
    totalNetMargin: number;
    totalUrssaf: number;
    marginPercent: number;
    activeListingsCount: number;
    stockCostValue: number;
    stockListingValue: number;
    toShipCount: number;
    unreadCount: number;
    dormantCount: number;
    crosslistedCount: number;
  };
  integrations: {
    stripeConfigured: boolean;
    openaiConfigured: boolean;
  };
}

type TabId =
  | "overview"
  | "dressing"
  | "tools"
  | "sales"
  | "messages"
  | "assistant"
  | "accounts"
  | "billing";

interface ChatTurn {
  role: "user" | "assistant";
  text: string;
  proposedAction?: {
    id: "discount_dormant" | "crosslist_all_lbc";
    label: string;
    before: string;
    after: string;
  } | null;
}

const PLATFORM_BADGE: Record<string, { label: string; cls: string }> = {
  vinted: {
    label: "Vinted",
    cls: "bg-teal-50 text-teal-700 border-teal-200",
  },
  leboncoin: {
    label: "Leboncoin",
    cls: "bg-orange-50 text-orange-700 border-orange-200",
  },
  tiktok_shop: {
    label: "TikTok Shop",
    cls: "bg-pink-50 text-pink-700 border-pink-200",
  },
  ebay: {
    label: "eBay",
    cls: "bg-blue-50 text-blue-700 border-blue-200",
  },
  whatnot: {
    label: "Whatnot",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
  },
};

const VALID_TABS: TabId[] = [
  "overview",
  "dressing",
  "tools",
  "sales",
  "messages",
  "assistant",
  "accounts",
  "billing",
];

export function BackOffice({
  initialTab,
  initialCheckout,
}: {
  initialTab?: string;
  initialCheckout?: string;
}) {
  const router = useRouter();
  const [data, setData] = useState<WorkspacePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>(
    initialTab && VALID_TABS.includes(initialTab as TabId)
      ? (initialTab as TabId)
      : "overview",
  );
  const [toast, setToast] = useState<string | null>(
    initialCheckout === "success"
      ? "Abonnement activé avec succès ! Merci pour ta confiance."
      : initialCheckout === "cancelled"
        ? "Paiement annulé. Ton essai gratuit reste actif."
        : null,
  );
  const [syncing, setSyncing] = useState(false);

  const [newListingOpen, setNewListingOpen] = useState(false);
  const [printModal, setPrintModal] = useState<{
    open: boolean;
    mode: "invoice" | "label";
    sale: SaleRecord | null;
  }>({ open: false, mode: "invoice", sale: null });
  const [sellModalItem, setSellModalItem] = useState<InventoryItem | null>(
    null,
  );
  const [sellPlatform, setSellPlatform] = useState("vinted");
  const [sellBuyer, setSellBuyer] = useState("Thomas Garnier");
  const [sellCarrier, setSellCarrier] = useState("Mondial Relay");
  const [sellPrice, setSellPrice] = useState("");

  const [search, setSearch] = useState("");
  const [dressingFilter, setDressingFilter] = useState<
    "all" | "active" | "not_lbc" | "dormant" | "sold"
  >("all");

  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState("");

  const [chatHistory, setChatHistory] = useState<ChatTurn[]>([
    {
      role: "assistant",
      text: "Bonjour ! Je suis Nova, ton copilote Vintflow. Pose-moi une question sur ton CA, ton URSSAF ou tes articles dormants.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const [newAccPlatform, setNewAccPlatform] = useState("vinted");
  const [newAccHandle, setNewAccHandle] = useState("");
  const [settingsForm, setSettingsForm] = useState({
    company_name: "",
    siret: "",
    fiscal_regime: "micro_bic",
    urssaf_rate: "12.3",
    vat_threshold: "85000",
  });
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchWorkspace = useCallback(async () => {
    try {
      const res = await fetch("/api/workspace", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/");
        return;
      }
      if (!res.ok) return;
      const payload = (await res.json()) as WorkspacePayload;
      setData(payload);
      setSettingsForm({
        company_name: payload.user.company_name,
        siret: payload.user.siret,
        fiscal_regime: payload.user.fiscal_regime,
        urssaf_rate: String(payload.user.urssaf_rate),
        vat_threshold: String(payload.user.vat_threshold),
      });
      setSelectedMsgId((prev) => prev ?? payload.messages[0]?.id ?? null);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  const filteredItems = useMemo(() => {
    if (!data) return [];
    return data.items.filter((item) => {
      const q = search.trim().toLowerCase();
      if (
        q &&
        !item.title.toLowerCase().includes(q) &&
        !item.sku.toLowerCase().includes(q) &&
        !item.brand.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (dressingFilter === "active") return item.status === "active";
      if (dressingFilter === "sold") return item.status === "sold";
      if (dressingFilter === "dormant")
        return item.status === "active" && item.days_listed >= 14;
      if (dressingFilter === "not_lbc")
        return item.status === "active" && item.leboncoin_status !== "listed";
      return true;
    });
  }, [data, search, dressingFilter]);

  const platformBreakdown = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { revenue: number; count: number }>();
    for (const s of data.sales) {
      const curr = map.get(s.platform) ?? { revenue: 0, count: 0 };
      curr.revenue += s.gross_amount;
      curr.count += 1;
      map.set(s.platform, curr);
    }
    return Array.from(map.entries()).map(([platform, stats]) => ({
      platform,
      ...stats,
    }));
  }, [data]);

  async function handleSync() {
    setSyncing(true);
    await fetch("/api/accounts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "sync" }),
    });
    await fetchWorkspace();
    setSyncing(false);
    showToast("Comptes Vinted, Leboncoin, TikTok Shop & eBay synchronisés.");
  }

  async function handleToggleUserFlag(
    field: "auto_crosslist" | "auto_delist",
    value: boolean,
  ) {
    await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    await fetchWorkspace();
    showToast(
      field === "auto_crosslist"
        ? `Publication auto Leboncoin (8h–23h) ${value ? "activée" : "désactivée"}.`
        : `Retrait auto à la vente ${value ? "activé" : "désactivé"}.`,
    );
  }

  async function handleCrosslistLbc(itemId: string) {
    await fetch(`/api/items/${itemId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "crosslist_lbc" }),
    });
    await fetchWorkspace();
    showToast("Fiche préremplie publiée sur Leboncoin !");
  }

  async function handleQuickDiscount(item: InventoryItem) {
    const nextPrice = Math.max(5, Math.round(item.listing_price * 0.9));
    await fetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ listing_price: nextPrice }),
    });
    await fetchWorkspace();
    showToast(`${item.title} ajusté à ${formatEuro(nextPrice)} (-10 %).`);
  }

  async function handleConfirmSale(e: React.FormEvent) {
    e.preventDefault();
    if (!sellModalItem) return;
    const res = await fetch(`/api/items/${sellModalItem.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "mark_sold",
        sold_platform: sellPlatform,
        buyer_name: sellBuyer,
        carrier: sellCarrier,
        sold_price: Number(sellPrice) || sellModalItem.listing_price,
      }),
    });
    const out = (await res.json()) as {
      invoice_number?: string;
      auto_delisted?: boolean;
    };
    setSellModalItem(null);
    await fetchWorkspace();
    showToast(
      `Vente enregistrée (${out.invoice_number ?? "Facture générée"})${
        out.auto_delisted ? " · Retirée des autres plateformes !" : ""
      }`,
    );
  }

  async function handleDeleteItem(id: string) {
    await fetch(`/api/items/${id}`, { method: "DELETE" });
    await fetchWorkspace();
    showToast("Article supprimé du stock.");
  }

  async function handleUpdateShipment(saleId: string, shipment_status: string) {
    await fetch(`/api/sales/${saleId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ shipment_status }),
    });
    await fetchWorkspace();
    showToast("Statut du colis mis à jour.");
  }

  async function handleSendReply(msgId: string, text?: string) {
    const bodyText = (text ?? replyInput).trim();
    if (!bodyText) return;
    await fetch("/api/messages", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: msgId, reply_text: bodyText }),
    });
    setReplyInput("");
    await fetchWorkspace();
    showToast("Réponse envoyée depuis la messagerie unifiée.");
  }

  async function handleAskAssistant(customPrompt?: string) {
    const q = (customPrompt ?? chatInput).trim();
    if (!q || chatLoading) return;
    setChatInput("");
    setChatHistory((prev) => [...prev, { role: "user", text: q }]);
    setChatLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const out = (await res.json()) as {
        answer?: string;
        proposedAction?: ChatTurn["proposedAction"];
      };
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          text: out.answer ?? "Réponse indisponible.",
          proposedAction: out.proposedAction ?? null,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  async function handleExecuteAiAction(
    actionId: "discount_dormant" | "crosslist_all_lbc",
  ) {
    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ executeAction: actionId }),
    });
    const out = (await res.json()) as { answer?: string };
    await fetchWorkspace();
    setChatHistory((prev) => [
      ...prev,
      { role: "assistant", text: out.answer ?? "Action appliquée." },
    ]);
    showToast("Modification appliquée par Nova !");
  }

  async function handleConnectAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!newAccHandle.trim()) return;
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "connect",
        platform: newAccPlatform,
        handle: newAccHandle,
      }),
    });
    const out = (await res.json()) as { error?: string };
    if (!res.ok) {
      showToast(out.error ?? "Impossible d'ajouter ce compte");
      return;
    }
    setNewAccHandle("");
    await fetchWorkspace();
    showToast("Compte connecté avec succès !");
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        company_name: settingsForm.company_name,
        siret: settingsForm.siret,
        fiscal_regime: settingsForm.fiscal_regime,
        urssaf_rate: Number(settingsForm.urssaf_rate) || 12.3,
        vat_threshold: Number(settingsForm.vat_threshold) || 85000,
      }),
    });
    if (!res.ok) {
      showToast("Erreur lors de la sauvegarde des paramètres.");
      return;
    }
    await fetchWorkspace();
    showToast("Paramètres fiscaux & URSSAF enregistrés.");
  }

  async function handleSelectPlan(plan: PlanId) {
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plan, billing_cycle: billingCycle }),
    });
    const out = (await res.json()) as {
      mode?: string;
      checkoutUrl?: string;
      message?: string;
      error?: string;
    };
    if (!res.ok) {
      showToast(out.error ?? "Erreur de facturation");
      return;
    }
    if (out.mode === "stripe" && out.checkoutUrl) {
      window.location.assign(out.checkoutUrl);
      return;
    }
    await fetchWorkspace();
    showToast(out.message ?? "Plan mis à jour !");
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin text-teal-600 mr-2" />
        Chargement de ton espace Vintflow...
      </div>
    );
  }

  const { user, accounts, sales, messages, kpis, integrations } = data;
  const activePlan = PLANS[user.plan];
  const selectedMsg = messages.find((m) => m.id === selectedMsgId) ?? messages[0];
  const vatProgress = Math.min(
    100,
    Math.round((kpis.totalRevenue / user.vat_threshold) * 100),
  );

  const navItems: Array<{
    id: TabId;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    {
      id: "overview",
      label: "Vue d'ensemble",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      id: "dressing",
      label: "Dressing & Crosslist",
      icon: <Layers className="h-4 w-4" />,
      badge: kpis.dormantCount > 0 ? kpis.dormantCount : undefined,
    },
    {
      id: "tools",
      label: "Boîte à outils IA",
      icon: <Wand2 className="h-4 w-4" />,
    },
    {
      id: "sales",
      label: "Ventes & Factures",
      icon: <ShoppingBag className="h-4 w-4" />,
      badge: kpis.toShipCount > 0 ? kpis.toShipCount : undefined,
    },
    {
      id: "messages",
      label: "Messagerie",
      icon: <MessageSquare className="h-4 w-4" />,
      badge: kpis.unreadCount > 0 ? kpis.unreadCount : undefined,
    },
    {
      id: "assistant",
      label: "Assistant IA Nova",
      icon: <Bot className="h-4 w-4" />,
    },
    {
      id: "accounts",
      label: "Comptes & URSSAF",
      icon: <Settings className="h-4 w-4" />,
    },
    {
      id: "billing",
      label: "Abonnement",
      icon: <CreditCard className="h-4 w-4" />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col lg:flex-row">
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-teal-200 bg-white px-4 py-3 text-xs font-semibold text-teal-800 shadow-lg">
          {toast}
        </div>
      )}

      {/* Clean White Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col border-r border-slate-200 bg-white p-4 justify-between shrink-0">
        <div>
          <div className="flex items-center justify-between px-2 pb-4 border-b border-slate-100">
            <Link href="/">
              <VintflowLogo size="sm" />
            </Link>
            <Badge className="bg-teal-50 text-teal-700 border border-teal-200 text-[10px] uppercase font-bold">
              {activePlan.name}
            </Badge>
          </div>

          <nav className="mt-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition ${
                  tab === item.id
                    ? "bg-teal-50 text-teal-800 border border-teal-200 font-bold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  {item.icon}
                  {item.label}
                </span>
                {item.badge !== undefined && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="space-y-3 border-t border-slate-100 pt-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
            <p className="font-bold text-slate-900 truncate">{user.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{user.company_name}</p>
            <p className="mt-1 text-[10px] font-medium text-teal-700">
              Essai {activePlan.name} · 14j actifs
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-slate-500 hover:text-slate-900 hover:bg-slate-100 text-xs"
          >
            <LogOut className="h-3.5 w-3.5 mr-2" />
            Déconnexion
          </Button>
          <div className="flex items-center gap-3 px-2 text-[10px] text-slate-400">
            <Link href="/legal/cgv" className="hover:text-slate-700">
              CGV
            </Link>
            <Link href="/legal/mentions-legales" className="hover:text-slate-700">
              Mentions
            </Link>
            <Link href="/legal/confidentialite" className="hover:text-slate-700">
              RGPD
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link href="/" className="lg:hidden">
                <VintflowLogo size="sm" showText={false} />
              </Link>
              <div>
                <h1 className="text-base sm:text-lg font-extrabold text-slate-900">
                  {navItems.find((n) => n.id === tab)?.label}
                </h1>
                <p className="text-[11px] text-slate-500">
                  {accounts.length} compte(s) connecté(s) · URSSAF {user.urssaf_rate}%
                  {user.is_demo ? " · Bac à sable Démo" : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSync}
                disabled={syncing}
                className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 mr-1.5 ${syncing ? "animate-spin" : ""}`}
                />
                Synchroniser
              </Button>
              <Button
                size="sm"
                onClick={() => setNewListingOpen(true)}
                className="bg-teal-600 text-white hover:bg-teal-700 font-semibold text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Nouvel article
              </Button>
            </div>
          </div>

          {/* Mobile Horizontal Nav */}
          <div className="mt-3 flex lg:hidden gap-1.5 overflow-x-auto pb-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium ${
                  tab === item.id
                    ? "bg-teal-600 text-white font-bold"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
          {/* TAB 1: OVERVIEW */}
          {tab === "overview" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <p className="text-xs font-medium text-slate-500">CA brut synchronisé</p>
                  <p className="mt-2 text-2xl font-extrabold text-slate-950">
                    {formatEuro(kpis.totalRevenue)}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Sur {sales.length} vente(s) multi-plateformes
                  </p>
                </div>

                <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-5 shadow-xs">
                  <p className="text-xs font-semibold text-teal-800">Marge nette réelle</p>
                  <p className="mt-2 text-2xl font-extrabold text-teal-700">
                    {formatEuro(kpis.totalNetMargin)}
                  </p>
                  <p className="mt-1 text-[11px] text-teal-800/80">
                    Taux net : {kpis.marginPercent} % · URSSAF : {formatEuro(kpis.totalUrssaf)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <p className="text-xs font-medium text-slate-500">Stock actif (coût d&apos;achat)</p>
                  <p className="mt-2 text-2xl font-extrabold text-slate-950">
                    {formatEuro(kpis.stockCostValue)}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {kpis.activeListingsCount} annonces · Valeur {formatEuro(kpis.stockListingValue)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <p className="text-xs font-medium text-slate-500">À traiter aujourd&apos;hui</p>
                  <p className="mt-2 text-2xl font-extrabold text-amber-600">
                    {kpis.toShipCount} colis · {kpis.unreadCount} msg
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {kpis.crosslistedCount} annonces crosslistées Vinted ↔ LBC
                  </p>
                </div>
              </div>

              {/* Quick AI Studio Shortcut */}
              <div className="rounded-2xl border border-teal-200 bg-white p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
                    <Wand2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Boîte à outils IA : Studio Photo, Détourage &amp; Sniper Négo
                    </h2>
                    <p className="text-xs text-slate-500">
                      Optimise tes photos, crée 3 annonces d&apos;un coup ou réponds aux
                      offres agressives sans brader ta marge.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setTab("tools")}
                  className="bg-teal-600 text-white hover:bg-teal-700 font-semibold text-xs"
                >
                  Ouvrir la Boîte à outils
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-teal-600" />
                      Ventes par plateforme
                    </h2>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setTab("sales")}
                      className="text-xs text-teal-700 hover:text-teal-800 hover:bg-teal-50"
                    >
                      Voir toutes les ventes <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {platformBreakdown.map((p) => {
                      const pct =
                        kpis.totalRevenue > 0
                          ? Math.round((p.revenue / kpis.totalRevenue) * 100)
                          : 0;
                      const badge = PLATFORM_BADGE[p.platform] ?? {
                        label: p.platform,
                        cls: "bg-slate-100 text-slate-700",
                      };
                      return (
                        <div key={p.platform} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-2">
                              <Badge className={`${badge.cls} border text-[10px]`}>
                                {badge.label}
                              </Badge>
                              <span className="text-slate-500">
                                {p.count} vente(s)
                              </span>
                            </span>
                            <span className="font-bold text-slate-900">
                              {formatEuro(p.revenue)} ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-teal-600"
                              style={{ width: `${Math.max(4, pct)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
                  <h2 className="text-sm font-bold text-slate-900">
                    Seuil TVA &amp; Alertes stock
                  </h2>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">CA / Seuil TVA</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {formatEuro(kpis.totalRevenue)} /{" "}
                        {formatEuro(user.vat_threshold)}
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-teal-600 to-cyan-500"
                        style={{ width: `${Math.max(3, vatProgress)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {vatProgress}% du seuil de franchise en base de TVA atteint.
                    </p>
                  </div>

                  {kpis.dormantCount > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold text-amber-800">
                        <AlertTriangle className="h-4 w-4" />
                        {kpis.dormantCount} article(s) dormant(s) (+14j)
                      </div>
                      <p className="text-amber-700 text-[11px]">
                        Baisse légèrement le prix ou rafraîchis l&apos;annonce avec le Bouclier Anti-Shadowban.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => {
                          setDressingFilter("dormant");
                          setTab("dressing");
                        }}
                        className="w-full bg-amber-500 text-white hover:bg-amber-600 font-bold text-xs h-8"
                      >
                        Traiter le stock dormant
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: DRESSING, SKU & CROSSLISTING */}
          {tab === "dressing" && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Publier tout seul sur Leboncoin (8h–23h)
                    </p>
                    <p className="text-xs text-slate-500">
                      Crossliste automatiquement chaque nouvel article ajouté.
                    </p>
                  </div>
                  <Switch
                    checked={user.auto_crosslist}
                    onCheckedChange={(val) =>
                      handleToggleUserFlag("auto_crosslist", val)
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Retirer quand ça se vend
                    </p>
                    <p className="text-xs text-slate-500">
                      Masque automatiquement l&apos;annonce sur les autres plateformes.
                    </p>
                  </div>
                  <Switch
                    checked={user.auto_delist}
                    onCheckedChange={(val) =>
                      handleToggleUserFlag("auto_delist", val)
                    }
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "all", label: "Tous" },
                    { id: "active", label: "En ligne" },
                    { id: "not_lbc", label: "À crosslister LBC" },
                    { id: "dormant", label: "Dormants (+14j)" },
                    { id: "sold", label: "Vendus" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() =>
                        setDressingFilter(f.id as typeof dressingFilter)
                      }
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        dressingFilter === f.id
                          ? "bg-teal-600 text-white font-bold"
                          : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher SKU, marque, titre..."
                    className="pl-9 bg-white border-slate-200 text-xs text-slate-900"
                  />
                </div>
              </div>

              {filteredItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
                  Aucun article ne correspond à ce filtre.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredItems.map((item) => {
                    const est = computeNetMargin({
                      grossAmount: item.listing_price,
                      purchaseCost: item.purchase_price + item.extra_costs,
                      platformFees: 0,
                      boostCost: 0,
                      shippingCost: 0,
                      urssafRate: user.urssaf_rate,
                    });
                    const isDormant =
                      item.status === "active" && item.days_listed >= 14;

                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs"
                      >
                        <div className="flex items-start gap-3.5">
                          <div
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white shadow-xs"
                            style={{ backgroundColor: item.image_color }}
                          >
                            {(item.brand || item.title).slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-sm text-slate-900">
                                {item.title}
                              </span>
                              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600">
                                {item.sku}
                              </span>
                              {isDormant && (
                                <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">
                                  Dormant · {item.days_listed}j
                                </Badge>
                              )}
                              {item.status === "sold" && (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                                  Vendu
                                </Badge>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                              Taille {item.size} · {item.condition} ·{" "}
                              {item.location} · Compte {item.vinted_account}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                              <span
                                className={`rounded-full px-2 py-0.5 border font-medium ${
                                  item.vinted_status === "listed"
                                    ? "bg-teal-50 text-teal-700 border-teal-200"
                                    : "bg-slate-100 text-slate-500 border-slate-200"
                                }`}
                              >
                                Vinted : {item.vinted_status}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 border font-medium ${
                                  item.leboncoin_status === "listed"
                                    ? "bg-orange-50 text-orange-700 border-orange-200"
                                    : "bg-slate-100 text-slate-500 border-slate-200"
                                }`}
                              >
                                Leboncoin : {item.leboncoin_status}
                              </span>
                              {item.tiktok_status === "listed" && (
                                <span className="rounded-full bg-pink-50 text-pink-700 border border-pink-200 px-2 py-0.5 font-medium">
                                  TikTok Shop
                                </span>
                              )}
                              {item.ebay_status === "listed" && (
                                <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 font-medium">
                                  eBay
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 border-slate-100 pt-3 lg:pt-0">
                          <div className="text-left lg:text-right text-xs">
                            <p className="text-base font-extrabold text-slate-900">
                              {formatEuro(item.listing_price)}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Achat {formatEuro(item.purchase_price + item.extra_costs)} ·
                              Marge est.{" "}
                              <strong className="text-teal-700">
                                {formatEuro(est.netMargin)}
                              </strong>
                            </p>
                          </div>

                          {item.status === "active" && (
                            <div className="flex flex-wrap items-center gap-2">
                              {item.leboncoin_status !== "listed" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCrosslistLbc(item.id)}
                                  className="border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 text-xs h-8"
                                >
                                  Crosslister LBC
                                </Button>
                              )}
                              {isDormant && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleQuickDiscount(item)}
                                  className="border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs h-8"
                                >
                                  -10 %
                                </Button>
                              )}
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSellModalItem(item);
                                  setSellPrice(String(item.listing_price));
                                }}
                                className="bg-teal-600 text-white hover:bg-teal-700 font-semibold text-xs h-8"
                              >
                                Marquer vendu
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteItem(item.id)}
                                className="h-8 w-8 text-slate-400 hover:text-red-600"
                                title="Supprimer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2B: AI TOOLS STUDIO */}
          {tab === "tools" && (
            <ResellerToolsStudio
              urssafRate={user.urssaf_rate}
              onItemCreated={fetchWorkspace}
              onToast={showToast}
            />
          )}

          {/* TAB 3: SALES, LABELS & INVOICES */}
          {tab === "sales" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-600">
                  {sales.length} vente(s) · Marge nette cumulée :{" "}
                  <strong className="text-teal-700">
                    {formatEuro(kpis.totalNetMargin)}
                  </strong>
                </p>
                <a
                  href="/api/exports/csv"
                  className="inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3.5 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-100"
                >
                  <Download className="h-3.5 w-3.5" />
                  Exporter Livre des recettes (CSV / Excel)
                </a>
              </div>

              <div className="space-y-3">
                {sales.map((sale) => {
                  const badge = PLATFORM_BADGE[sale.platform] ?? {
                    label: sale.platform,
                    cls: "bg-slate-100 text-slate-700",
                  };
                  return (
                    <div
                      key={sale.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-teal-700">
                            {sale.invoice_number}
                          </span>
                          <Badge className={`${badge.cls} border text-[10px]`}>
                            {badge.label}
                          </Badge>
                          <span className="text-xs font-bold text-slate-900">
                            {sale.item_title}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Acheteur : <strong className="text-slate-800">{sale.buyer_name}</strong> (
                          {sale.buyer_city}) · {sale.carrier} ({sale.tracking_code}) ·{" "}
                          {formatDateFr(sale.sold_at)}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Brut {formatEuro(sale.gross_amount)} − Achat{" "}
                          {formatEuro(sale.purchase_cost)} − Frais{" "}
                          {formatEuro(sale.platform_fees + sale.boost_cost)} − URSSAF{" "}
                          {formatEuro(sale.urssaf_amount)} ={" "}
                          <strong className="text-teal-700">
                            Marge nette {formatEuro(sale.net_margin)}
                          </strong>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={sale.shipment_status}
                          onChange={(e) =>
                            handleUpdateShipment(sale.id, e.target.value)
                          }
                          className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-800"
                        >
                          <option value="to_ship">À expédier</option>
                          <option value="in_transit">En transit</option>
                          <option value="delivered">Livré</option>
                          <option value="completed">Finalisé</option>
                        </select>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setPrintModal({ open: true, mode: "label", sale })
                          }
                          className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs h-8"
                        >
                          <Printer className="h-3.5 w-3.5 mr-1.5" />
                          Bordereau 10×15
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setPrintModal({ open: true, mode: "invoice", sale })
                          }
                          className="border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 text-xs h-8"
                        >
                          <FileText className="h-3.5 w-3.5 mr-1.5" />
                          Facture PDF
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: UNIFIED MESSAGING */}
          {tab === "messages" && (
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-3 space-y-2 shadow-xs">
                {messages.map((m) => {
                  const badge = PLATFORM_BADGE[m.platform] ?? {
                    label: m.platform,
                    cls: "bg-slate-100 text-slate-700",
                  };
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMsgId(m.id)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        selectedMsg?.id === m.id
                          ? "border-teal-500 bg-teal-50/60"
                          : "border-slate-100 bg-slate-50/70 hover:border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-slate-900 flex items-center gap-2">
                          {m.unread && (
                            <span className="h-2 w-2 rounded-full bg-teal-600" />
                          )}
                          {m.buyer_name}
                        </span>
                        <Badge className={`${badge.cls} border text-[10px]`}>
                          {badge.label}
                        </Badge>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500 truncate">
                        {m.item_title} · {formatEuro(m.item_price)}
                      </p>
                      <p className="mt-1 text-xs text-slate-700 truncate">
                        {m.last_message}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between min-h-[380px] shadow-xs">
                {selectedMsg ? (
                  <>
                    <div className="space-y-4">
                      <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {selectedMsg.buyer_name} ·{" "}
                            <span className="text-teal-700">
                              {selectedMsg.item_title}
                            </span>
                          </p>
                          <p className="text-xs text-slate-500">
                            Compte : {selectedMsg.account_handle} · Affiché à{" "}
                            {formatEuro(selectedMsg.item_price)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-800">
                          {selectedMsg.last_message}
                        </div>
                        {selectedMsg.reply_text && (
                          <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-teal-600 px-4 py-3 text-xs text-white">
                            {selectedMsg.reply_text}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 space-y-3 border-t border-slate-100 pt-4">
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          "Bonjour ! Oui toujours dispo, envoi dès demain matin.",
                          `Je peux vous faire une offre à ${Math.round(
                            selectedMsg.item_price * 0.9,
                          )} € si vous validez aujourd'hui.`,
                          "Taille conforme, maison non-fumeur, envoi soigné sous 24h.",
                        ].map((quick, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSendReply(selectedMsg.id, quick)}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-700 hover:border-teal-400 hover:text-slate-900 text-left"
                          >
                            {quick}
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Input
                          value={replyInput}
                          onChange={(e) => setReplyInput(e.target.value)}
                          placeholder="Écrire une réponse..."
                          className="bg-white border-slate-200 text-xs text-slate-900"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSendReply(selectedMsg.id);
                            }
                          }}
                        />
                        <Button
                          onClick={() => handleSendReply(selectedMsg.id)}
                          className="bg-teal-600 text-white hover:bg-teal-700 font-semibold text-xs"
                        >
                          <Send className="h-3.5 w-3.5 mr-1.5" />
                          Envoyer
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-500">
                    Sélectionne une conversation.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: AI ASSISTANT NOVA */}
          {tab === "assistant" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Nova · Assistant IA connecté à tes chiffres
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      {integrations.openaiConfigured
                        ? "Propulsé par OpenAI + tes données SQL temps réel"
                        : "Moteur analytique local temps réel (0 € · aucune clé API requise)"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  "Quel est mon ROI et mon seuil TVA ?",
                  "J'ai combien en attente de finalisation ?",
                  "Quels articles dorment depuis +14 jours ?",
                  "Que reste-t-il à crosslister sur Leboncoin ?",
                ].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleAskAssistant(q)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 hover:border-teal-400 hover:text-slate-900"
                  >
                    {q}
                  </button>
                ))}
              </div>

              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {chatHistory.map((turn, idx) => (
                  <div key={idx} className="space-y-2">
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                        turn.role === "user"
                          ? "ml-auto bg-teal-600 text-white rounded-br-sm"
                          : "mr-auto bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-sm"
                      }`}
                    >
                      {turn.text}
                    </div>

                    {turn.proposedAction && (
                      <div className="mr-auto max-w-[88%] rounded-xl border border-teal-200 bg-teal-50/70 p-3.5 text-xs space-y-2">
                        <p className="font-bold text-teal-800 flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5" />
                          Proposition Avant / Après
                        </p>
                        <div className="grid sm:grid-cols-2 gap-2 text-[11px]">
                          <div className="rounded bg-white border border-slate-200 p-2 text-slate-600">
                            <span className="font-bold text-slate-800">Avant :</span>{" "}
                            {turn.proposedAction.before}
                          </div>
                          <div className="rounded bg-teal-100/60 border border-teal-200 p-2 text-teal-900">
                            <span className="font-bold text-teal-800">Après :</span>{" "}
                            {turn.proposedAction.after}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() =>
                            handleExecuteAiAction(turn.proposedAction!.id)
                          }
                          className="bg-teal-600 text-white hover:bg-teal-700 font-bold text-xs h-8"
                        >
                          {turn.proposedAction.label}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {chatLoading && (
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Analyse de tes données en cours...
                  </div>
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAskAssistant();
                }}
                className="flex gap-2 border-t border-slate-100 pt-3"
              >
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Pose une question à Nova sur tes ventes, marges ou stock..."
                  className="bg-white border-slate-200 text-xs text-slate-900"
                />
                <Button
                  type="submit"
                  disabled={chatLoading}
                  className="bg-teal-600 text-white hover:bg-teal-700 font-semibold text-xs"
                >
                  Envoyer
                </Button>
              </form>
            </div>
          )}

          {/* TAB 6: ACCOUNTS & FISCAL SETTINGS */}
          {tab === "accounts" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900">
                    Comptes connectés ({activePlan.name})
                  </h2>
                  <span className="text-xs text-slate-500">
                    Limite Vinted :{" "}
                    {accounts.filter((a) => a.platform === "vinted").length} /{" "}
                    {activePlan.vintedAccountsLimit}
                  </span>
                </div>

                <div className="space-y-2">
                  {accounts.map((acc) => {
                    const badge = PLATFORM_BADGE[acc.platform] ?? {
                      label: acc.platform,
                      cls: "bg-slate-100 text-slate-700",
                    };
                    return (
                      <div
                        key={acc.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <Badge className={`${badge.cls} border text-[10px]`}>
                            {badge.label}
                          </Badge>
                          <span className="font-semibold text-slate-900">
                            {acc.handle}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await fetch("/api/accounts", {
                              method: "POST",
                              headers: { "content-type": "application/json" },
                              body: JSON.stringify({
                                action: "disconnect",
                                id: acc.id,
                              }),
                            });
                            await fetchWorkspace();
                          }}
                          className="text-slate-400 hover:text-red-600 text-[11px]"
                        >
                          Retirer
                        </button>
                      </div>
                    );
                  })}
                </div>

                <form
                  onSubmit={handleConnectAccount}
                  className="flex flex-wrap gap-2 border-t border-slate-100 pt-4"
                >
                  <select
                    value={newAccPlatform}
                    onChange={(e) => setNewAccPlatform(e.target.value)}
                    className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-800"
                  >
                    <option value="vinted">Vinted</option>
                    <option value="leboncoin">Leboncoin</option>
                    <option value="tiktok_shop">TikTok Shop</option>
                    <option value="ebay">eBay</option>
                    <option value="whatnot">Whatnot</option>
                  </select>
                  <Input
                    value={newAccHandle}
                    onChange={(e) => setNewAccHandle(e.target.value)}
                    placeholder="@nouveau_compte"
                    className="flex-1 bg-white border-slate-200 text-xs text-slate-900"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-teal-600 text-white hover:bg-teal-700 font-semibold text-xs"
                  >
                    Connecter
                  </Button>
                </form>
              </div>

              <form
                onSubmit={handleSaveSettings}
                className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs"
              >
                <h2 className="text-sm font-bold text-slate-900">
                  Paramètres Factures &amp; URSSAF
                </h2>
                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">
                      Nom / Raison sociale (sur les factures)
                    </Label>
                    <Input
                      value={settingsForm.company_name}
                      onChange={(e) =>
                        setSettingsForm((s) => ({
                          ...s,
                          company_name: e.target.value,
                        }))
                      }
                      className="bg-white border-slate-200 text-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">SIRET</Label>
                    <Input
                      value={settingsForm.siret}
                      onChange={(e) =>
                        setSettingsForm((s) => ({ ...s, siret: e.target.value }))
                      }
                      className="bg-white border-slate-200 text-slate-900 font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600">Régime fiscal</Label>
                      <select
                        value={settingsForm.fiscal_regime}
                        onChange={(e) =>
                          setSettingsForm((s) => ({
                            ...s,
                            fiscal_regime: e.target.value,
                          }))
                        }
                        className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-900"
                      >
                        <option value="micro_bic">Micro-entreprise BIC</option>
                        <option value="micro_bnc">Micro-entreprise BNC</option>
                        <option value="societe_tva_marge">
                          Société (TVA sur marge)
                        </option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600">
                        Taux URSSAF (%)
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={settingsForm.urssaf_rate}
                        onChange={(e) =>
                          setSettingsForm((s) => ({
                            ...s,
                            urssaf_rate: e.target.value,
                          }))
                        }
                        className="bg-white border-slate-200 text-slate-900"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">
                      Seuil d&apos;alerte TVA (€)
                    </Label>
                    <Input
                      type="number"
                      value={settingsForm.vat_threshold}
                      onChange={(e) =>
                        setSettingsForm((s) => ({
                          ...s,
                          vat_threshold: e.target.value,
                        }))
                      }
                      className="bg-white border-slate-200 text-slate-900"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="bg-teal-600 text-white hover:bg-teal-700 font-semibold text-xs"
                >
                  Enregistrer mes paramètres fiscaux
                </Button>
              </form>
            </div>
          )}

          {/* TAB 7: BILLING & SUBSCRIPTION */}
          {tab === "billing" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-teal-800">
                    Abonnement actuel : {activePlan.name} ({user.billing_cycle})
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    Essai gratuit 14 jours actif jusqu&apos;au{" "}
                    {formatDateFr(user.trial_ends_at)}.
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {integrations.stripeConfigured
                      ? "Paiements Stripe en ligne activés."
                      : "Mode essai 0 € actif : bascule librement entre Starter et Pro."}
                  </p>
                </div>

                <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setBillingCycle("monthly")}
                    className={`rounded-full px-3 py-1.5 font-semibold ${
                      billingCycle === "monthly"
                        ? "bg-slate-900 text-white"
                        : "text-slate-600"
                    }`}
                  >
                    Mensuel
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle("annual")}
                    className={`rounded-full px-3 py-1.5 font-semibold ${
                      billingCycle === "annual"
                        ? "bg-teal-600 text-white"
                        : "text-slate-600"
                    }`}
                  >
                    Annuel (-2 mois)
                  </button>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {(["starter", "pro"] as PlanId[]).map((pid) => {
                  const p = PLANS[pid];
                  const isCurrent = user.plan === pid;
                  const price =
                    billingCycle === "annual"
                      ? p.annualMonthlyPrice
                      : p.monthlyPrice;
                  return (
                    <div
                      key={pid}
                      className={`rounded-2xl border p-6 flex flex-col justify-between bg-white shadow-xs ${
                        pid === "pro"
                          ? "border-teal-500 ring-1 ring-teal-500/20"
                          : "border-slate-200"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-extrabold text-slate-900">
                            {p.name}
                          </h3>
                          {isCurrent && (
                            <Badge className="bg-teal-50 text-teal-800 border-teal-200">
                              Plan actif
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{p.tagline}</p>
                        <p className="mt-4 text-3xl font-extrabold text-slate-950">
                          {price} €{" "}
                          <span className="text-xs font-normal text-slate-500">
                            / mois TTC
                          </span>
                        </p>
                        <ul className="mt-5 space-y-2">
                          {p.features.map((f, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-xs text-slate-700"
                            >
                              <Check className="h-3.5 w-3.5 shrink-0 text-teal-600 mt-0.5" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <Button
                        onClick={() => handleSelectPlan(pid)}
                        className={`mt-6 w-full font-bold text-xs h-10 ${
                          pid === "pro"
                            ? "bg-teal-600 text-white hover:bg-teal-700"
                            : "bg-slate-900 text-white hover:bg-slate-800"
                        }`}
                      >
                        {isCurrent
                          ? `Mettre à jour (${billingCycle})`
                          : `Passer au plan ${p.name}`}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      <NewListingDialog
        open={newListingOpen}
        onOpenChange={setNewListingOpen}
        urssafRate={user.urssaf_rate}
        accounts={accounts}
        onCreated={fetchWorkspace}
      />

      <DocumentPrintModal
        open={printModal.open}
        onOpenChange={(open) => setPrintModal((p) => ({ ...p, open }))}
        mode={printModal.mode}
        sale={printModal.sale}
        user={user}
      />

      <Dialog
        open={Boolean(sellModalItem)}
        onOpenChange={(open) => !open && setSellModalItem(null)}
      >
        <DialogContent className="bg-white border-slate-200 text-slate-900 sm:max-w-md shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Enregistrer la vente
            </DialogTitle>
          </DialogHeader>
          {sellModalItem && (
            <form onSubmit={handleConfirmSale} className="space-y-3 text-xs">
              <p className="text-slate-700 font-semibold">
                {sellModalItem.title} ({sellModalItem.sku})
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Plateforme</Label>
                  <select
                    value={sellPlatform}
                    onChange={(e) => setSellPlatform(e.target.value)}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-slate-900"
                  >
                    <option value="vinted">Vinted</option>
                    <option value="leboncoin">Leboncoin</option>
                    <option value="tiktok_shop">TikTok Shop</option>
                    <option value="ebay">eBay</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Prix vendu (€)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    className="bg-white border-slate-200 text-slate-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Acheteur</Label>
                  <Input
                    value={sellBuyer}
                    onChange={(e) => setSellBuyer(e.target.value)}
                    className="bg-white border-slate-200 text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Transporteur</Label>
                  <select
                    value={sellCarrier}
                    onChange={(e) => setSellCarrier(e.target.value)}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-slate-900"
                  >
                    <option value="Mondial Relay">Mondial Relay</option>
                    <option value="Vinted Go">Vinted Go</option>
                    <option value="Chronopost Shop2Shop">
                      Chronopost Shop2Shop
                    </option>
                    <option value="Colissimo">Colissimo</option>
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-teal-700 font-medium">
                Génère automatiquement la facture, calcule l&apos;URSSAF (
                {user.urssaf_rate}%) et{" "}
                {user.auto_delist
                  ? "retire l'annonce des autres plateformes."
                  : "met à jour ton stock."}
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSellModalItem(null)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="bg-teal-600 text-white hover:bg-teal-700 font-bold"
                >
                  Confirmer la vente
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
