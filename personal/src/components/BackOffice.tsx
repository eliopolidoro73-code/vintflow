"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bot,
  Boxes,
  Check,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Gift,
  Layers,
  LayoutDashboard,
  Loader2,
  Lock,
  MessageSquare,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  TrendingUp,
  Wallet,
  Wand2,
  Zap,
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
import { downloadInvoicePdf, downloadShippingLabelPdf } from "@/lib/invoice-pdf";
import {
  comparePlans,
  PLANS,
  type BillingCycle,
  type PlanId,
} from "@/lib/plans";
import type { AuthUser } from "@/lib/auth";
import type { PersoPreferences, StudioPresets } from "@/lib/user-preferences";
import {
  DocumentPrintModal,
  type SaleRecord,
} from "@/components/DocumentPrintModal";
import { NewListingDialog } from "@/components/NewListingDialog";
import { ResellerToolsStudio } from "@/components/ResellerToolsStudio";
import { InvoiceAiStudio } from "@/components/InvoiceAiStudio";
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

interface LotRecord {
  id: string;
  title: string;
  supplier: string;
  items_count: number;
  items_sold: number;
  total_cost: number;
  shipping_cost: number;
  revenue_generated: number;
  unit_cost: number;
  lot_profit: number;
  purchased_at: string;
}

interface ExpenseRecord {
  id: string;
  label: string;
  category: string;
  amount: number;
  incurred_at: string;
}

interface WorkspacePayload {
  user: AuthUser;
  accounts: ConnectedAccount[];
  items: InventoryItem[];
  sales: SaleRecord[];
  messages: MessageRecord[];
  lots: LotRecord[];
  expenses: ExpenseRecord[];
  referralsCount: number;
  kpis: {
    totalRevenue: number;
    totalNetMargin: number;
    totalExpenses: number;
    trueProfitAfterExpenses: number;
    settledNet: number;
    pendingCashflow: number;
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
  | "invoices"
  | "sales"
  | "finance"
  | "messages"
  | "assistant"
  | "accounts";

interface ChatTurn {
  role: "user" | "assistant";
  text: string;
  proposedAction?: {
    id: "discount_dormant" | "crosslist_all_lbc" | "download_invoice_pdf";
    label: string;
    before: string;
    after: string;
    saleId?: string;
  } | null;
}

const PLATFORM_BADGE: Record<string, { label: string; cls: string }> = {
  vinted: {
    label: "Vinted",
    cls: "bg-teal-500/15 text-teal-300 border-teal-500/30",
  },
  leboncoin: {
    label: "Leboncoin",
    cls: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  },
  tiktok_shop: {
    label: "TikTok Shop",
    cls: "bg-pink-500/15 text-pink-300 border-pink-500/30",
  },
  ebay: {
    label: "eBay",
    cls: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  },
  whatnot: {
    label: "Whatnot",
    cls: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
};

const VALID_TABS: TabId[] = [
  "overview",
  "dressing",
  "tools",
  "invoices",
  "sales",
  "finance",
  "messages",
  "assistant",
  "accounts",
];

export function BackOffice({
  initialTab,
  initialCheckout,
  initialStripeSessionId,
  initialWorkspace,
}: {
  initialTab?: string;
  initialCheckout?: string;
  initialStripeSessionId?: string;
  initialWorkspace?: WorkspacePayload | null;
}) {
  const router = useRouter();
  const [data, setData] = useState<WorkspacePayload | null>(
    initialWorkspace ?? null,
  );
  const [loading, setLoading] = useState(!initialWorkspace);
  const [tab, setTab] = useState<TabId>(() => {
    if (initialTab && VALID_TABS.includes(initialTab as TabId)) {
      return initialTab as TabId;
    }
    const saved = initialWorkspace?.user.preferences?.ui?.lastTab;
    if (saved && VALID_TABS.includes(saved as TabId)) {
      return saved as TabId;
    }
    return "overview";
  });
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
  const [copySheetItem, setCopySheetItem] = useState<InventoryItem | null>(
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
      text: "Bonjour ! Je suis Nova, ton copilote Vintflow. Pose-moi une question sur ton chiffre d'affaire, ta marge commerciale ou tes articles dormants.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const [newAccPlatform, setNewAccPlatform] = useState("vinted");
  const [newAccHandle, setNewAccHandle] = useState("");
  const [settingsForm, setSettingsForm] = useState({
    company_name: initialWorkspace?.user.company_name ?? "",
    siret: initialWorkspace?.user.siret ?? "",
    fiscal_regime: initialWorkspace?.user.fiscal_regime ?? "micro_bic",
    vat_threshold: String(initialWorkspace?.user.vat_threshold ?? 85000),
  });
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [lotForm, setLotForm] = useState({
    title: "",
    supplier: "Grossiste Vintage EU",
    items_count: "8",
    total_cost: "120",
    shipping_cost: "10",
  });
  const [expenseForm, setExpenseForm] = useState({
    label: "",
    category: "Emballage & Envoi",
    amount: "12",
  });
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState<PlanId | null>(
    null,
  );
  const [previewTargetPlan, setPreviewTargetPlan] = useState<PlanId | null>(
    null,
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }, []);

  const prefsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const savePreferences = useCallback((patch: PersoPreferences) => {
    if (prefsSaveTimer.current) clearTimeout(prefsSaveTimer.current);
    prefsSaveTimer.current = setTimeout(() => {
      void fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ preferences: patch }),
      });
    }, 600);
  }, []);

  const saveStudioPresets = useCallback(
    (studio: StudioPresets) => savePreferences({ studio }),
    [savePreferences],
  );

  const selectTab = useCallback(
    (next: TabId) => {
      setTab(next);
      savePreferences({ ui: { lastTab: next } });
    },
    [savePreferences],
  );

  const fetchWorkspace = useCallback(async () => {
    try {
      const res = await fetch("/api/workspace", { cache: "no-store" });
      if (res.status === 401) {
        router.refresh();
        return;
      }
      if (!res.ok) return;
      const payload = (await res.json()) as WorkspacePayload;
      setData(payload);
      setSettingsForm({
        company_name: payload.user.company_name,
        siret: payload.user.siret,
        fiscal_regime: payload.user.fiscal_regime,
        vat_threshold: String(payload.user.vat_threshold),
      });
      setSelectedMsgId((prev) => prev ?? payload.messages[0]?.id ?? null);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (initialWorkspace) return;
    void fetchWorkspace();
  }, [fetchWorkspace, initialWorkspace]);

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
    showToast("Données de ton espace actualisées.");
  }

  async function handleToggleUserFlag(
    field: "auto_crosslist" | "auto_delist",
    value: boolean,
  ) {
    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    const out = (await res.json()) as { error?: string };
    if (!res.ok) {
      showToast(out.error ?? "Fonctionnalité réservée au plan Pro Scale (49 €)");
      return;
    }
    await fetchWorkspace();
    showToast(
      field === "auto_crosslist"
        ? `Crosslist Leboncoin à l'ajout ${value ? "activé" : "désactivé"} (dans Vintflow uniquement).`
        : `Retrait auto à la vente ${value ? "activé" : "désactivé"}.`,
    );
  }

  async function handleCrosslistLbc(itemId: string) {
    const res = await fetch(`/api/items/${itemId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "crosslist_lbc" }),
    });
    const out = (await res.json()) as { error?: string };
    if (!res.ok) {
      showToast(out.error ?? "Crosslisting bloqué sur ce plan");
      return;
    }
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
    const res = await fetch("/api/messages", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: msgId, reply_text: bodyText }),
    });
    const out = (await res.json()) as { error?: string };
    if (!res.ok) {
      showToast(out.error ?? "Messagerie disponible dès Vendeur Plus");
      return;
    }
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
        error?: string;
        proposedAction?: ChatTurn["proposedAction"];
      };
      if (!res.ok) {
        setChatHistory((prev) => [
          ...prev,
          { role: "assistant", text: out.error ?? "Réservé au plan Pro Scale." },
        ]);
        return;
      }
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
    actionId: "discount_dormant" | "crosslist_all_lbc" | "download_invoice_pdf",
    saleId?: string,
  ) {
    if (actionId === "download_invoice_pdf" && saleId) {
      window.location.href = `/api/sales/${saleId}/invoice`;
      showToast("Téléchargement du PDF…");
      return;
    }
    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ executeAction: actionId }),
    });
    const out = (await res.json()) as { answer?: string; error?: string };
    if (!res.ok) {
      showToast(out.error ?? "Réservé au plan Pro Scale");
      return;
    }
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
        vat_threshold: Number(settingsForm.vat_threshold) || 85000,
      }),
    });
    if (!res.ok) {
      showToast("Erreur lors de la sauvegarde des paramètres.");
      return;
    }
    await fetchWorkspace();
    showToast("Paramètres enregistrés et sauvegardés.");
  }

  function handleSelectPlan(_plan: PlanId) {
    showToast("Édition perso · Pro Scale déjà débloqué pour toi.");
  }

  async function handleCreateLot(e: React.FormEvent) {
    e.preventDefault();
    if (!lotForm.title.trim()) return;
    const res = await fetch("/api/lots", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "create",
        title: lotForm.title,
        supplier: lotForm.supplier,
        items_count: Number(lotForm.items_count) || 1,
        total_cost: Number(lotForm.total_cost) || 0,
        shipping_cost: Number(lotForm.shipping_cost) || 0,
      }),
    });
    if (res.ok) {
      setLotForm((f) => ({ ...f, title: "" }));
      await fetchWorkspace();
      showToast("Lot d'achat enregistré dans ta trésorerie !");
    }
  }

  async function handleLotAction(
    action: "record_sale" | "delete",
    id: string,
    saleAmount?: number,
  ) {
    await fetch("/api/lots", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, id, sale_amount: saleAmount }),
    });
    await fetchWorkspace();
    showToast(
      action === "record_sale"
        ? "Vente rattachée au lot !"
        : "Lot supprimé.",
    );
  }

  async function handleCreateExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!expenseForm.label.trim()) return;
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "create",
        label: expenseForm.label,
        category: expenseForm.category,
        amount: Number(expenseForm.amount) || 0,
      }),
    });
    if (res.ok) {
      setExpenseForm((f) => ({ ...f, label: "" }));
      await fetchWorkspace();
      showToast("Dépense déductible ajoutée !");
    }
  }

  async function handleDeleteExpense(id: string) {
    await fetch("/api/expenses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    await fetchWorkspace();
    showToast("Dépense supprimée.");
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#07080d] flex items-center justify-center text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-400 mr-2" />
        Chargement de ton espace Vintflow...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#07080d] flex flex-col items-center justify-center gap-4 text-zinc-300 px-4">
        <p className="text-sm text-zinc-400 text-center">
          Impossible de charger le cockpit pour le moment.
        </p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void fetchWorkspace();
          }}
          className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-500"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const {
    user,
    accounts,
    sales,
    messages,
    lots,
    expenses,
    referralsCount,
    kpis,
    integrations,
  } = data;
  const activePlan = PLANS.pro;
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
    locked?: boolean;
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
      locked: activePlan.aiCreditsMonthlyLimit === 0,
    },
    {
      id: "invoices",
      label: "Factures PDF · IA",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      id: "sales",
      label: "Ventes & Factures",
      icon: <ShoppingBag className="h-4 w-4" />,
      badge: kpis.toShipCount > 0 ? kpis.toShipCount : undefined,
    },
    {
      id: "finance",
      label: "Trésorerie & Lots",
      icon: <Wallet className="h-4 w-4" />,
    },
    {
      id: "messages",
      label: "Messagerie",
      icon: <MessageSquare className="h-4 w-4" />,
      badge: kpis.unreadCount > 0 ? kpis.unreadCount : undefined,
      locked: !activePlan.unifiedMessagesAllowed,
    },
    {
      id: "assistant",
      label: "Assistant IA Nova",
      icon: <Bot className="h-4 w-4" />,
      locked: !activePlan.novaAssistantAllowed,
    },
    {
      id: "accounts",
      label: "Comptes & Paramètres",
      icon: <Settings className="h-4 w-4" />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#07080d] text-zinc-100 flex flex-col lg:flex-row">
      {toast && (
        <div className="fixed z-50 max-lg:top-[max(1rem,env(safe-area-inset-top))] max-lg:left-1/2 max-lg:-translate-x-1/2 max-lg:w-[min(92vw,24rem)] lg:bottom-5 lg:right-5 rounded-xl border border-emerald-500/40 bg-[#0e111a] px-4 py-3 text-xs font-semibold text-emerald-200 shadow-2xl text-center lg:text-left">
          {toast}
        </div>
      )}

      {/* Dark Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col border-r border-white/10 bg-[#0a0c12] p-4 justify-between shrink-0">
        <div>
          <div className="flex items-center justify-between px-2 pb-4 border-b border-white/10">
            <Link href="/">
              <VintflowLogo size="sm" />
            </Link>
            <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px] uppercase font-bold">
              {activePlan.name}
            </Badge>
          </div>

          <nav className="mt-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectTab(item.id)}
                className={`vf-click-press flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                  tab === item.id
                    ? "bg-violet-500/15 text-violet-300 border border-violet-500/40 font-bold shadow-[0_0_18px_rgba(139,92,246,0.16)]"
                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  {item.icon}
                  {item.label}
                </span>
                {item.locked ? (
                  <Lock className="h-3.5 w-3.5 text-zinc-600" />
                ) : (
                  item.badge !== undefined && (
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                      {item.badge}
                    </span>
                  )
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="space-y-3 border-t border-white/10 pt-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs">
            <p className="font-bold text-white truncate">{user.name}</p>
            <p className="text-[11px] text-zinc-400 truncate">{user.company_name}</p>
            <p className="mt-1 text-[10px] font-medium text-violet-300">
              Édition perso · {activePlan.name} · sans abonnement
            </p>
          </div>
          <div className="flex items-center gap-3 px-2 text-[10px] text-zinc-500">
            <Link href="/legal/cgv" className="hover:text-zinc-300">
              CGV
            </Link>
            <Link href="/legal/mentions-legales" className="hover:text-zinc-300">
              Mentions
            </Link>
            <Link href="/legal/confidentialite" className="hover:text-zinc-300">
              RGPD
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#07080d]/90 backdrop-blur-lg px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link href="/" className="lg:hidden">
                <VintflowLogo size="sm" showText={false} />
              </Link>
              <div>
                <h1 className="text-base sm:text-lg font-extrabold text-white">
                  {navItems.find((n) => n.id === tab)?.label}
                </h1>
                <p className="text-[11px] text-zinc-400">
                  Plan {activePlan.name} · {accounts.length} compte(s) connecté(s)
                  {user.is_demo ? " · Bac à sable" : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSync}
                disabled={syncing}
                className="border-white/15 bg-white/5 text-zinc-200 hover:bg-white/10 text-xs"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 mr-1.5 ${syncing ? "animate-spin" : ""}`}
                />
                Actualiser
              </Button>
              <Button
                size="sm"
                onClick={() => setNewListingOpen(true)}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 font-bold text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Nouvel article
              </Button>
            </div>
          </div>

        </header>

        <main
          key={tab}
          className="vf-tab-enter flex-1 p-4 sm:p-6 pb-24 lg:pb-6 space-y-6 max-w-7xl w-full mx-auto"
        >
          {/* TAB 1: OVERVIEW */}
          {tab === "overview" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-white/10 bg-[#0e111a] p-5">
                  <p className="text-xs text-zinc-400">Chiffre d&apos;affaire total</p>
                  <p className="mt-2 text-2xl font-extrabold text-white">
                    {formatEuro(kpis.totalRevenue)}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    Sur {sales.length} vente(s) multi-plateformes
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-5">
                  <p className="text-xs text-emerald-300">Marge commerciale</p>
                  <p className="mt-2 text-2xl font-extrabold text-emerald-400">
                    {formatEuro(kpis.totalNetMargin)}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-300">
                    Taux de marge : {kpis.marginPercent} %
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0e111a] p-5">
                  <p className="text-xs text-zinc-400">Stock actif (coût de revient)</p>
                  <p className="mt-2 text-2xl font-extrabold text-white">
                    {formatEuro(kpis.stockCostValue)}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    {kpis.activeListingsCount}
                    {activePlan.activeItemsLimit ? ` / ${activePlan.activeItemsLimit}` : ""} annonces · CA est. {formatEuro(kpis.stockListingValue)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0e111a] p-5">
                  <p className="text-xs text-zinc-400">À traiter aujourd&apos;hui</p>
                  <p className="mt-2 text-2xl font-extrabold text-amber-300">
                    {kpis.toShipCount} colis · {kpis.unreadCount} msg
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    {kpis.crosslistedCount} annonces crosslistées Vinted ↔ LBC
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-violet-500/35 bg-gradient-to-r from-violet-500/[0.12] via-[#0e111a] to-indigo-500/[0.08] p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300">
                    <Wand2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">
                      Boîte à outils IA : Studio Photo, Détourage &amp; Sniper Négo
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Optimise tes photos, crée 3 annonces d&apos;un coup ou réponds aux
                      offres agressives sans brader ta marge.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => selectTab("tools")}
                  className="vf-shimmer-btn bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 font-bold text-xs"
                >
                  Ouvrir la Boîte à outils
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Financial Cashflow Strip + Visual Chart */}
              <div className="grid gap-4 lg:grid-cols-12">
                <div className="lg:col-span-8 rounded-2xl border border-white/10 bg-[#0e111a] p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-bold text-white">
                        Rentabilité par vente (Chiffre d&apos;affaire vs Marge commerciale)
                      </h2>
                      <p className="text-[11px] text-zinc-400">
                        Résultat après dépenses ({formatEuro(kpis.totalExpenses)}) :{" "}
                        <strong className="text-emerald-400">
                          {formatEuro(kpis.trueProfitAfterExpenses)}
                        </strong>
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => selectTab("finance")}
                      className="border-white/15 bg-white/5 text-zinc-200 hover:bg-white/10 text-xs h-8"
                    >
                      <Wallet className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                      Trésorerie &amp; Lots
                    </Button>
                  </div>

                  {sales.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-8 text-center">
                      Aucune vente enregistrée pour afficher le graphique.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-7 gap-2 items-end h-36 pt-3 px-1 border-b border-white/10 pb-2">
                        {sales.slice(0, 7).reverse().map((s) => {
                          const maxVal = Math.max(
                            ...sales.slice(0, 7).map((x) => x.gross_amount),
                            50,
                          );
                          const grossH = Math.max(
                            14,
                            Math.round((s.gross_amount / maxVal) * 100),
                          );
                          const netH = Math.max(
                            8,
                            Math.round((Math.max(0, s.net_margin) / maxVal) * 100),
                          );
                          return (
                            <div
                              key={s.id}
                              className="group flex flex-col items-center justify-end h-full gap-1"
                              title={`${s.item_title} · CA ${formatEuro(s.gross_amount)} / Net ${formatEuro(s.net_margin)}`}
                            >
                              <div className="w-full flex items-end justify-center gap-1 h-28">
                                <div
                                  className="w-2.5 sm:w-3.5 rounded-t bg-white/15 group-hover:bg-white/30 transition-all"
                                  style={{ height: `${grossH}%` }}
                                />
                                <div
                                  className="w-2.5 sm:w-3.5 rounded-t bg-emerald-500 group-hover:bg-emerald-400 transition-all"
                                  style={{ height: `${netH}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-zinc-500 truncate max-w-full">
                                {s.invoice_number.slice(-3)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-xs bg-white/20" /> Chiffre d&apos;affaire
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500" /> Marge commerciale
                          </span>
                        </div>
                        <span>Dernières ventes ({Math.min(7, sales.length)})</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-4 rounded-2xl border border-white/10 bg-[#0e111a] p-5 space-y-3">
                  <h2 className="text-sm font-bold text-white">Pilotage Trésorerie</h2>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
                      <span className="text-zinc-400">Marge déjà encaissée</span>
                      <strong className="text-emerald-400">{formatEuro(kpis.settledNet)}</strong>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
                      <span className="text-zinc-400">En transit / À expédier</span>
                      <strong className="text-amber-300">{formatEuro(kpis.pendingCashflow)}</strong>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
                      <span className="text-zinc-400">Dépenses &amp; emballages</span>
                      <strong className="text-rose-300">−{formatEuro(kpis.totalExpenses)}</strong>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
                      <span className="text-emerald-200 font-medium">Marge commerciale finale</span>
                      <strong className="text-emerald-400 font-extrabold">
                        {formatEuro(kpis.trueProfitAfterExpenses)}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-[#0e111a] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                      Ventes par plateforme
                    </h2>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => selectTab("sales")}
                      className="text-xs text-emerald-400 hover:text-emerald-300"
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
                        cls: "bg-zinc-800 text-zinc-300",
                      };
                      return (
                        <div key={p.platform} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-2">
                              <Badge className={`${badge.cls} border text-[10px]`}>
                                {badge.label}
                              </Badge>
                              <span className="text-zinc-400">
                                {p.count} vente(s)
                              </span>
                            </span>
                            <span className="font-bold text-white">
                              {formatEuro(p.revenue)} ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${Math.max(4, pct)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0e111a] p-5 space-y-4">
                  <h2 className="text-sm font-bold text-white">
                    Seuil TVA &amp; Alertes stock
                  </h2>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">CA / Seuil TVA</span>
                      <span className="font-mono text-white">
                        {formatEuro(kpis.totalRevenue)} /{" "}
                        {formatEuro(user.vat_threshold)}
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                        style={{ width: `${Math.max(3, vatProgress)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      {vatProgress}% du seuil de franchise en base de TVA atteint.
                    </p>
                  </div>

                  {kpis.dormantCount > 0 && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold text-amber-300">
                        <AlertTriangle className="h-4 w-4" />
                        {kpis.dormantCount} article(s) dormant(s) (+14j)
                      </div>
                      <p className="text-amber-100/80 text-[11px]">
                        Baisse légèrement le prix ou rafraîchis l&apos;annonce avec le Bouclier Anti-Shadowban.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => {
                          setDressingFilter("dormant");
                          selectTab("dressing");
                        }}
                        className="w-full bg-amber-400 text-amber-950 hover:bg-amber-300 font-bold text-xs h-8"
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
              {activePlan.crosslistMonthlyLimit > 0 && (
                <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-xs text-cyan-200 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Quota Crosslisting (Vendeur Plus) :{" "}
                    <strong>
                      {user.crosslist_used} / {activePlan.crosslistMonthlyLimit}
                    </strong>{" "}
                    publications ce mois-ci.
                  </span>
                  <button
                    type="button"
                    onClick={() => showToast("Pro Scale actif — aucun abonnement requis sur cette version.")}
                    className="font-bold underline hover:text-white"
                  >
                    Passer à Pro Scale (crosslist illimité)
                  </button>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0e111a] p-4">
                  <div>
                    <p className="text-sm font-bold text-white flex items-center gap-2">
                      Crosslist Leboncoin à chaque nouvel article
                      {!activePlan.autoCrosslistAllowed && (
                        <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px]">
                          Pro Scale
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-zinc-400">
                      Marque l&apos;article pour Leboncoin dans Vintflow. La publication
                      se fait sur leboncoin.fr par tes soins.
                    </p>
                  </div>
                  <Switch
                    checked={user.auto_crosslist && activePlan.autoCrosslistAllowed}
                    onCheckedChange={(val) =>
                      handleToggleUserFlag("auto_crosslist", val)
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0e111a] p-4">
                  <div>
                    <p className="text-sm font-bold text-white">
                      Retirer quand ça se vend
                    </p>
                    <p className="text-xs text-zinc-400">
                      Met à jour les statuts dans ton dressing quand tu marques une vente
                      (sans retrait automatique sur Vinted ou Leboncoin).
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
                          ? "bg-emerald-500 text-emerald-950 font-bold"
                          : "bg-white/5 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher SKU, marque, titre..."
                    className="pl-9 bg-[#0e111a] border-white/10 text-xs text-white"
                  />
                </div>
              </div>

              {filteredItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-zinc-400">
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
                    });
                    const isDormant =
                      item.status === "active" && item.days_listed >= 14;

                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-white/10 bg-[#0e111a] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-3.5">
                          <div
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white shadow-inner"
                            style={{ backgroundColor: item.image_color }}
                          >
                            {(item.brand || item.title).slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-sm text-white">
                                {item.title}
                              </span>
                              <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-[10px] text-zinc-300">
                                {item.sku}
                              </span>
                              {isDormant && (
                                <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px]">
                                  Dormant · {item.days_listed}j
                                </Badge>
                              )}
                              {item.status === "sold" && (
                                <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px]">
                                  Vendu
                                </Badge>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-zinc-400">
                              Taille {item.size} · {item.condition} ·{" "}
                              {item.location} · Compte {item.vinted_account}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                              <span
                                className={`rounded-full px-2 py-0.5 border ${
                                  item.vinted_status === "listed"
                                    ? "bg-teal-500/15 text-teal-300 border-teal-500/30"
                                    : "bg-zinc-800 text-zinc-400 border-white/10"
                                }`}
                              >
                                Vinted : {item.vinted_status}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 border ${
                                  item.leboncoin_status === "listed"
                                    ? "bg-orange-500/15 text-orange-300 border-orange-500/30"
                                    : "bg-zinc-800 text-zinc-400 border-white/10"
                                }`}
                              >
                                Leboncoin : {item.leboncoin_status}
                              </span>
                              {item.tiktok_status === "listed" && (
                                <span className="rounded-full bg-pink-500/15 text-pink-300 border border-pink-500/30 px-2 py-0.5">
                                  TikTok Shop
                                </span>
                              )}
                              {item.ebay_status === "listed" && (
                                <span className="rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30 px-2 py-0.5">
                                  eBay
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 border-white/10 pt-3 lg:pt-0">
                          <div className="text-left lg:text-right text-xs">
                            <p className="text-base font-extrabold text-white">
                              {formatEuro(item.listing_price)}
                            </p>
                            <p className="text-[11px] text-zinc-400">
                              Coût de revient {formatEuro(item.purchase_price + item.extra_costs)} ·
                              Marge est.{" "}
                              <strong className="text-emerald-400">
                                {formatEuro(est.netMargin)}
                              </strong>
                            </p>
                          </div>

                          {item.status === "active" && (
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setCopySheetItem(item)}
                                className="border-white/15 bg-white/5 text-zinc-200 hover:bg-white/10 text-xs h-8"
                              >
                                <Copy className="h-3.5 w-3.5 mr-1" />
                                Fiches
                              </Button>
                              {item.leboncoin_status !== "listed" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCrosslistLbc(item.id)}
                                  className="border-orange-500/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 text-xs h-8"
                                >
                                  Crosslister LBC
                                </Button>
                              )}
                              {isDormant && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleQuickDiscount(item)}
                                  className="border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs h-8"
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
                                className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400 font-bold text-xs h-8"
                              >
                                Marquer vendu
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteItem(item.id)}
                                className="h-8 w-8 text-zinc-500 hover:text-red-400"
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
              planId="pro"
              aiCreditsUsed={user.ai_credits_used}
              aiCreditsLimit={-1}
              studioPresets={user.preferences?.studio}
              onStudioPresetsChange={saveStudioPresets}
              onItemCreated={fetchWorkspace}
              onUpgradeClick={() =>
                showToast("Pro Scale actif — tous les outils sont débloqués.")
              }
              onToast={showToast}
            />
          )}

          {tab === "invoices" && (
            <InvoiceAiStudio
              user={user}
              cloudAiActive={integrations.openaiConfigured}
              onRefresh={fetchWorkspace}
              onToast={showToast}
              onPreview={(sale) =>
                setPrintModal({ open: true, mode: "invoice", sale })
              }
            />
          )}

          {/* TAB 3: SALES, LABELS & INVOICES */}
          {tab === "sales" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-zinc-400">
                  {sales.length} vente(s) · Marge commerciale cumulée :{" "}
                  <strong className="text-emerald-400">
                    {formatEuro(kpis.totalNetMargin)}
                  </strong>
                </p>
                <a
                  href="/api/exports/csv"
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
                >
                  <Download className="h-3.5 w-3.5" />
                  Exporter Livre des recettes (CSV / Excel)
                </a>
              </div>

              {!activePlan.pdfInvoicesAllowed && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Les <strong>Factures PDF</strong> et <strong>Bordereaux 10×15</strong>{" "}
                    sont débloqués dès le plan Vendeur Plus (29 €/mois).
                  </span>
                  <Button
                    size="sm"
                    onClick={() => showToast("Pro Scale actif — aucun abonnement requis sur cette version.")}
                    className="bg-amber-400 text-amber-950 hover:bg-amber-300 font-bold text-xs h-7"
                  >
                    Débloquer
                  </Button>
                </div>
              )}

              <div className="space-y-3">
                {sales.map((sale) => {
                  const badge = PLATFORM_BADGE[sale.platform] ?? {
                    label: sale.platform,
                    cls: "bg-zinc-800 text-zinc-300",
                  };
                  return (
                    <div
                      key={sale.id}
                      className="rounded-2xl border border-white/10 bg-[#0e111a] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-emerald-400">
                            {sale.invoice_number}
                          </span>
                          <Badge className={`${badge.cls} border text-[10px]`}>
                            {badge.label}
                          </Badge>
                          <span className="text-xs font-bold text-white">
                            {sale.item_title}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400">
                          Acheteur : <strong className="text-zinc-200">{sale.buyer_name}</strong> (
                          {sale.buyer_city}) · {sale.carrier} ({sale.tracking_code}) ·{" "}
                          {formatDateFr(sale.sold_at)}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          Chiffre d&apos;affaire {formatEuro(sale.gross_amount)} − Coût de revient{" "}
                          {formatEuro(sale.purchase_cost)} − Frais{" "}
                          {formatEuro(sale.platform_fees + sale.boost_cost)} ={" "}
                          <strong className="text-emerald-400">
                            Marge commerciale {formatEuro(sale.net_margin)}
                          </strong>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={sale.shipment_status}
                          onChange={(e) =>
                            handleUpdateShipment(sale.id, e.target.value)
                          }
                          className="h-8 rounded-md border border-white/10 bg-[#161b24] px-2.5 text-xs text-white"
                        >
                          <option value="to_ship">À expédier</option>
                          <option value="in_transit">En transit</option>
                          <option value="delivered">Livré</option>
                          <option value="completed">Finalisé</option>
                        </select>

                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!activePlan.pdfInvoicesAllowed}
                          onClick={() =>
                            setPrintModal({ open: true, mode: "label", sale })
                          }
                          className="border-white/15 bg-white/5 text-zinc-200 hover:bg-white/10 text-xs h-8 disabled:opacity-40"
                        >
                          <Printer className="h-3.5 w-3.5 mr-1.5" />
                          Bordereau 10×15
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!activePlan.pdfInvoicesAllowed}
                          onClick={() => downloadInvoicePdf(sale, user)}
                          className="border-violet-500/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20 text-xs h-8 disabled:opacity-40"
                        >
                          <Download className="h-3.5 w-3.5 mr-1.5" />
                          Télécharger PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!activePlan.pdfInvoicesAllowed}
                          onClick={() =>
                            setPrintModal({ open: true, mode: "invoice", sale })
                          }
                          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 text-xs h-8 disabled:opacity-40"
                        >
                          <FileText className="h-3.5 w-3.5 mr-1.5" />
                          Aperçu
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3B: TREASURY, SOURCING LOTS & DEDUCTIBLE EXPENSES */}
          {tab === "finance" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-white/10 bg-[#0e111a] p-4">
                  <p className="text-xs text-zinc-400">Marge commerciale des ventes</p>
                  <p className="mt-1.5 text-2xl font-extrabold text-white">
                    {formatEuro(kpis.totalNetMargin)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0e111a] p-4">
                  <p className="text-xs text-zinc-400">Dépenses &amp; emballages</p>
                  <p className="mt-1.5 text-2xl font-extrabold text-rose-400">
                    −{formatEuro(kpis.totalExpenses)}
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.08] p-4">
                  <p className="text-xs text-emerald-300">Marge commerciale finale</p>
                  <p className="mt-1.5 text-2xl font-extrabold text-emerald-400">
                    {formatEuro(kpis.trueProfitAfterExpenses)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0e111a] p-4">
                  <p className="text-xs text-zinc-400">En transit / À expédier</p>
                  <p className="mt-1.5 text-2xl font-extrabold text-amber-300">
                    {formatEuro(kpis.pendingCashflow)}
                  </p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-12">
                {/* Lots & Ballots Manager */}
                <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-[#0e111a] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <Boxes className="h-4 w-4 text-emerald-400" />
                      Lots &amp; Ballots achetés (Suivi ROI par lot)
                    </h2>
                    <span className="text-xs text-zinc-400">{lots.length} lot(s)</span>
                  </div>

                  <div className="space-y-3">
                    {lots.map((lot) => {
                      const pctSold = Math.min(
                        100,
                        Math.round(
                          (lot.items_sold / Math.max(1, lot.items_count)) * 100,
                        ),
                      );
                      return (
                        <div
                          key={lot.id}
                          className="rounded-xl border border-white/10 bg-[#07080d] p-4 space-y-2.5 text-xs"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-white text-sm">{lot.title}</p>
                              <p className="text-[11px] text-zinc-400">
                                {lot.supplier} · Coût/pièce :{" "}
                                <strong className="text-white">{formatEuro(lot.unit_cost)}</strong> ·{" "}
                                {lot.items_sold} / {lot.items_count} vendues ({pctSold}%)
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[11px] text-zinc-400">
                                Encaissé {formatEuro(lot.revenue_generated)} / Coût{" "}
                                {formatEuro(lot.total_cost + lot.shipping_cost)}
                              </p>
                              <p
                                className={`text-sm font-extrabold ${
                                  lot.lot_profit >= 0 ? "text-emerald-400" : "text-amber-300"
                                }`}
                              >
                                {lot.lot_profit >= 0 ? "+" : ""}
                                {formatEuro(lot.lot_profit)} net lot
                              </p>
                            </div>
                          </div>

                          <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${Math.max(4, pctSold)}%` }}
                            />
                          </div>

                          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                            {lot.items_sold < lot.items_count && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleLotAction("record_sale", lot.id, 45)
                                }
                                className="h-7 text-[11px] border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                              >
                                +1 vente (+45 €)
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleLotAction("delete", lot.id)}
                              className="h-7 text-[11px] text-zinc-500 hover:text-red-400"
                            >
                              Supprimer
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <form
                    onSubmit={handleCreateLot}
                    className="border-t border-white/10 pt-4 space-y-2.5 text-xs"
                  >
                    <p className="font-bold text-white">Ajouter un nouveau lot d&apos;achat</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        required
                        value={lotForm.title}
                        onChange={(e) =>
                          setLotForm((f) => ({ ...f, title: e.target.value }))
                        }
                        placeholder="Ex: Lot 10 sweats Nike vintage"
                        className="bg-white/5 border-white/10 text-white"
                      />
                      <Input
                        value={lotForm.supplier}
                        onChange={(e) =>
                          setLotForm((f) => ({ ...f, supplier: e.target.value }))
                        }
                        placeholder="Fournisseur / Brocante"
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        type="number"
                        min={1}
                        value={lotForm.items_count}
                        onChange={(e) =>
                          setLotForm((f) => ({ ...f, items_count: e.target.value }))
                        }
                        placeholder="Pièces"
                        className="bg-white/5 border-white/10 text-white"
                      />
                      <Input
                        type="number"
                        step="0.5"
                        value={lotForm.total_cost}
                        onChange={(e) =>
                          setLotForm((f) => ({ ...f, total_cost: e.target.value }))
                        }
                        placeholder="Coût lot (€)"
                        className="bg-white/5 border-white/10 text-white"
                      />
                      <Input
                        type="number"
                        step="0.5"
                        value={lotForm.shipping_cost}
                        onChange={(e) =>
                          setLotForm((f) => ({ ...f, shipping_cost: e.target.value }))
                        }
                        placeholder="Port (€)"
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <Button
                      type="submit"
                      size="sm"
                      className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400 font-bold"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Enregistrer le lot
                    </Button>
                  </form>
                </div>

                {/* Expenses Tracker */}
                <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-[#0e111a] p-5 space-y-4">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-rose-400" />
                    Dépenses &amp; Frais d&apos;activité
                  </h2>

                  <div className="space-y-2">
                    {expenses.map((exp) => (
                      <div
                        key={exp.id}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-[#07080d] px-3.5 py-2.5 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-white">{exp.label}</p>
                          <p className="text-[11px] text-zinc-400">
                            {exp.category} · {formatDateFr(exp.incurred_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-rose-300">
                            −{formatEuro(exp.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="text-zinc-500 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <form
                    onSubmit={handleCreateExpense}
                    className="border-t border-white/10 pt-4 space-y-2.5 text-xs"
                  >
                    <p className="font-bold text-white">Ajouter une dépense</p>
                    <Input
                      required
                      value={expenseForm.label}
                      onChange={(e) =>
                        setExpenseForm((f) => ({ ...f, label: e.target.value }))
                      }
                      placeholder="Ex: Scotch, cartons, pressing..."
                      className="bg-white/5 border-white/10 text-white"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={expenseForm.category}
                        onChange={(e) =>
                          setExpenseForm((f) => ({ ...f, category: e.target.value }))
                        }
                        className="h-9 rounded-md border border-white/10 bg-[#161b24] px-2.5 text-xs text-white"
                      >
                        <option value="Emballage & Envoi">Emballage &amp; Envoi</option>
                        <option value="Remise en état">Remise en état</option>
                        <option value="Matériel & Imprimante">Matériel &amp; Imprimante</option>
                        <option value="Transport & Sourcing">Transport &amp; Sourcing</option>
                      </select>
                      <Input
                        type="number"
                        step="0.5"
                        value={expenseForm.amount}
                        onChange={(e) =>
                          setExpenseForm((f) => ({ ...f, amount: e.target.value }))
                        }
                        placeholder="Montant (€)"
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <Button
                      type="submit"
                      size="sm"
                      className="w-full bg-white/10 hover:bg-white/15 text-white font-semibold"
                    >
                      Ajouter la dépense
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: UNIFIED MESSAGING */}
          {tab === "messages" &&
            (!activePlan.unifiedMessagesAllowed ? (
              <div className="rounded-3xl border border-amber-500/30 bg-[#0e111a] p-8 text-center space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  <Lock className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-extrabold text-white">
                  Messagerie multi-comptes réservée à Vendeur Plus &amp; Pro Scale
                </h2>
                <p className="mx-auto max-w-lg text-xs sm:text-sm text-zinc-400">
                  Centralise toutes tes conversations Vinted, Leboncoin et TikTok Shop au
                  même endroit à partir de 29 €/mois.
                </p>
                <Button
                  onClick={() => showToast("Pro Scale actif — aucun abonnement requis sur cette version.")}
                  className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400 font-bold"
                >
                  Débloquer la messagerie unifiée
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-12">
                <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-[#0e111a] p-3 space-y-2">
                  {messages.map((m) => {
                    const badge = PLATFORM_BADGE[m.platform] ?? {
                      label: m.platform,
                      cls: "bg-zinc-800 text-zinc-300",
                    };
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMsgId(m.id)}
                        className={`w-full rounded-xl border p-3 text-left transition ${
                          selectedMsg?.id === m.id
                            ? "border-emerald-500/50 bg-emerald-500/10"
                            : "border-white/[0.06] bg-white/[0.02] hover:border-white/15"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-white flex items-center gap-2">
                            {m.unread && (
                              <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            )}
                            {m.buyer_name}
                          </span>
                          <Badge className={`${badge.cls} border text-[10px]`}>
                            {badge.label}
                          </Badge>
                        </div>
                        <p className="mt-1 text-[11px] text-zinc-400 truncate">
                          {m.item_title} · {formatEuro(m.item_price)}
                        </p>
                        <p className="mt-1 text-xs text-zinc-200 truncate">
                          {m.last_message}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-[#0e111a] p-5 flex flex-col justify-between min-h-[380px]">
                  {selectedMsg ? (
                    <>
                      <div className="space-y-4">
                        <div className="border-b border-white/10 pb-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-white">
                              {selectedMsg.buyer_name} ·{" "}
                              <span className="text-emerald-400">
                                {selectedMsg.item_title}
                              </span>
                            </p>
                            <p className="text-xs text-zinc-400">
                              Compte : {selectedMsg.account_handle} · Affiché à{" "}
                              {formatEuro(selectedMsg.item_price)}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-zinc-100">
                            {selectedMsg.last_message}
                          </div>
                          {selectedMsg.reply_text && (
                            <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-xs text-emerald-100">
                              {selectedMsg.reply_text}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 space-y-3 border-t border-white/10 pt-4">
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
                              className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-zinc-300 hover:border-emerald-500/40 hover:text-white text-left"
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
                            className="bg-white/5 border-white/10 text-xs text-white"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSendReply(selectedMsg.id);
                              }
                            }}
                          />
                          <Button
                            onClick={() => handleSendReply(selectedMsg.id)}
                            className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400 font-bold text-xs"
                          >
                            <Send className="h-3.5 w-3.5 mr-1.5" />
                            Envoyer
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-zinc-400">
                      Sélectionne une conversation.
                    </p>
                  )}
                </div>
              </div>
            ))}

          {/* TAB 5: AI ASSISTANT NOVA (PRO SCALE EXCLUSIVE) */}
          {tab === "assistant" &&
            (!activePlan.novaAssistantAllowed ? (
              <div className="rounded-3xl border border-emerald-500/30 bg-[#0e111a] p-8 text-center space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <Bot className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-extrabold text-white">
                  Assistant IA Nova exclusif au plan Pro Scale (49 €/mois)
                </h2>
                <p className="mx-auto max-w-lg text-xs sm:text-sm text-zinc-400">
                  Nova analyse tes ventes, ton ROI réel, ton seuil TVA et applique des
                  modifications Avant / Après en 1 clic sur tout ton stock.
                </p>
                <Button
                  onClick={() => showToast("Pro Scale actif — aucun abonnement requis sur cette version.")}
                  className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400 font-bold"
                >
                  Passer à Pro Scale (essai 14j)
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-[#0e111a] p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white">
                        Nova · Assistant IA connecté à tes chiffres
                      </h2>
                      <p className="text-[11px] text-zinc-400">
                        {integrations.openaiConfigured
                          ? "Propulsé par OpenAI + tes données SQL temps réel"
                          : "Moteur analytique local temps réel (0 € · aucune clé API requise)"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    "Fais une facture sac Louis Vuitton vendu 420€ à Marie Lyon",
                    "Quel est mon ROI et mon seuil TVA ?",
                    "J'ai combien en attente de finalisation ?",
                    "Quels articles dorment depuis +14 jours ?",
                  ].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleAskAssistant(q)}
                      className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300 hover:border-emerald-500/40 hover:text-white"
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
                            ? "ml-auto bg-emerald-500/20 border border-emerald-500/30 text-emerald-100 rounded-br-sm"
                            : "mr-auto bg-white/[0.04] border border-white/10 text-zinc-200 rounded-bl-sm"
                        }`}
                      >
                        {turn.text}
                      </div>

                      {turn.proposedAction && (
                        <div className="mr-auto max-w-[88%] rounded-xl border border-emerald-500/40 bg-emerald-500/[0.08] p-3.5 text-xs space-y-2">
                          <p className="font-bold text-emerald-300 flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5" />
                            Proposition Avant / Après
                          </p>
                          <div className="grid sm:grid-cols-2 gap-2 text-[11px]">
                            <div className="rounded bg-black/30 p-2 text-zinc-400">
                              <span className="font-bold text-zinc-300">Avant :</span>{" "}
                              {turn.proposedAction.before}
                            </div>
                            <div className="rounded bg-emerald-950/60 p-2 text-emerald-200">
                              <span className="font-bold text-emerald-300">Après :</span>{" "}
                              {turn.proposedAction.after}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() =>
                              handleExecuteAiAction(
                                turn.proposedAction!.id,
                                turn.proposedAction!.saleId,
                              )
                            }
                            className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400 font-bold text-xs h-8"
                          >
                            {turn.proposedAction.label}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="text-xs text-zinc-400 flex items-center gap-2">
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
                  className="flex gap-2 border-t border-white/10 pt-3"
                >
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Pose une question à Nova sur tes ventes, marges ou stock..."
                    className="bg-white/5 border-white/10 text-xs text-white"
                  />
                  <Button
                    type="submit"
                    disabled={chatLoading}
                    className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400 font-bold text-xs"
                  >
                    Envoyer
                  </Button>
                </form>
              </div>
            ))}

          {/* TAB 6: ACCOUNTS & FISCAL SETTINGS */}
          {tab === "accounts" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#0e111a] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white">
                    Comptes connectés ({activePlan.name})
                  </h2>
                  <span className="text-xs text-zinc-400">
                    Limite Vinted :{" "}
                    {accounts.filter((a) => a.platform === "vinted").length} /{" "}
                    {activePlan.vintedAccountsLimit}
                  </span>
                </div>

                <div className="space-y-2">
                  {accounts.map((acc) => {
                    const badge = PLATFORM_BADGE[acc.platform] ?? {
                      label: acc.platform,
                      cls: "bg-zinc-800 text-zinc-300",
                    };
                    return (
                      <div
                        key={acc.id}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <Badge className={`${badge.cls} border text-[10px]`}>
                            {badge.label}
                          </Badge>
                          <span className="font-semibold text-white">
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
                          className="text-zinc-500 hover:text-red-400 text-[11px]"
                        >
                          Retirer
                        </button>
                      </div>
                    );
                  })}
                </div>

                <form
                  onSubmit={handleConnectAccount}
                  className="flex flex-wrap gap-2 border-t border-white/10 pt-4"
                >
                  <select
                    value={newAccPlatform}
                    onChange={(e) => setNewAccPlatform(e.target.value)}
                    className="h-9 rounded-md border border-white/10 bg-[#161b24] px-2.5 text-xs text-white"
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
                    className="flex-1 bg-white/5 border-white/10 text-xs text-white"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400 font-bold text-xs"
                  >
                    Connecter
                  </Button>
                </form>
              </div>

              <form
                onSubmit={handleSaveSettings}
                className="rounded-2xl border border-white/10 bg-[#0e111a] p-5 space-y-4"
              >
                <h2 className="text-sm font-bold text-white">
                  Paramètres Factures &amp; Seuils
                </h2>
                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-400">
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
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-400">SIRET</Label>
                    <Input
                      value={settingsForm.siret}
                      onChange={(e) =>
                        setSettingsForm((s) => ({ ...s, siret: e.target.value }))
                      }
                      className="bg-white/5 border-white/10 text-white font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">Régime de facturation</Label>
                      <select
                        value={settingsForm.fiscal_regime}
                        onChange={(e) =>
                          setSettingsForm((s) => ({
                            ...s,
                            fiscal_regime: e.target.value,
                          }))
                        }
                        className="h-9 w-full rounded-md border border-white/10 bg-[#161b24] px-2.5 text-xs text-white"
                      >
                        <option value="micro_bic">Micro-entreprise BIC</option>
                        <option value="micro_bnc">Micro-entreprise BNC</option>
                        <option value="societe_tva_marge">
                          Société (TVA sur marge)
                        </option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">
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
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400 font-bold text-xs"
                >
                  Enregistrer mes paramètres
                </Button>
              </form>
            </div>
          )}

        </main>
      </div>

      <NewListingDialog
        open={newListingOpen}
        onOpenChange={setNewListingOpen}
        canCrosslist={activePlan.crosslistMonthlyLimit !== 0}
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
        open={Boolean(copySheetItem)}
        onOpenChange={(open) => !open && setCopySheetItem(null)}
      >
        <DialogContent className="vf-tab-enter bg-[#0e111a] border-white/10 text-zinc-100 sm:max-w-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white">
              Crosslist Express · {copySheetItem?.title}
            </DialogTitle>
          </DialogHeader>
          {copySheetItem && (
            <div className="space-y-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#07080d] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(copySheetItem.title);
                      showToast("Titre SEO copié !");
                    }}
                    className="h-7 text-[11px] border-white/15 bg-white/5 text-zinc-200"
                  >
                    <Copy className="h-3 w-3 mr-1" /> Copier Titre
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(String(copySheetItem.listing_price));
                      showToast("Prix copié !");
                    }}
                    className="h-7 text-[11px] border-white/15 bg-white/5 text-zinc-200"
                  >
                    <Copy className="h-3 w-3 mr-1" /> Copier Prix ({formatEuro(copySheetItem.listing_price)})
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href="https://www.vinted.fr/items/new"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-teal-500/15 border border-teal-500/30 px-2.5 py-1.5 text-[11px] font-semibold text-teal-300 hover:bg-teal-500/25"
                  >
                    Ouvrir Vinted <ExternalLink className="h-3 w-3" />
                  </a>
                  <a
                    href="https://www.leboncoin.fr/deposer-une-annonce"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-orange-500/15 border border-orange-500/30 px-2.5 py-1.5 text-[11px] font-semibold text-orange-300 hover:bg-orange-500/25"
                  >
                    Ouvrir Leboncoin <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#07080d] p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className="bg-teal-500/15 text-teal-300 border-teal-500/30">
                    Vinted · {formatEuro(copySheetItem.listing_price)}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${copySheetItem.title}\n\n${copySheetItem.description_vinted}`,
                      );
                      showToast("Annonce Vinted copiée !");
                    }}
                    className="h-7 text-[11px] border-white/15 bg-white/5 text-zinc-200"
                  >
                    <Copy className="h-3 w-3 mr-1" /> Copier Vinted
                  </Button>
                </div>
                <p className="whitespace-pre-wrap text-zinc-300 leading-relaxed">
                  {copySheetItem.description_vinted}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#07080d] p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className="bg-orange-500/15 text-orange-300 border-orange-500/30">
                    Leboncoin · {formatEuro(copySheetItem.listing_price)}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${copySheetItem.title}\n\n${copySheetItem.description_lbc}`,
                      );
                      showToast("Annonce Leboncoin copiée !");
                    }}
                    className="h-7 text-[11px] border-white/15 bg-white/5 text-zinc-200"
                  >
                    <Copy className="h-3 w-3 mr-1" /> Copier Leboncoin
                  </Button>
                </div>
                <p className="whitespace-pre-wrap text-zinc-300 leading-relaxed">
                  {copySheetItem.description_lbc}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(sellModalItem)}
        onOpenChange={(open) => !open && setSellModalItem(null)}
      >
        <DialogContent className="bg-[#0e111a] border-white/10 text-zinc-100 sm:max-w-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white">
              Enregistrer la vente
            </DialogTitle>
          </DialogHeader>
          {sellModalItem && (
            <form onSubmit={handleConfirmSale} className="space-y-3 text-xs">
              <p className="text-zinc-200 font-semibold">
                {sellModalItem.title} ({sellModalItem.sku})
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400">Plateforme</Label>
                  <select
                    value={sellPlatform}
                    onChange={(e) => setSellPlatform(e.target.value)}
                    className="h-9 w-full rounded-md border border-white/10 bg-[#161b24] px-2.5 text-white"
                  >
                    <option value="vinted">Vinted</option>
                    <option value="leboncoin">Leboncoin</option>
                    <option value="tiktok_shop">TikTok Shop</option>
                    <option value="ebay">eBay</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400">Prix vendu (€)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400">Acheteur</Label>
                  <Input
                    value={sellBuyer}
                    onChange={(e) => setSellBuyer(e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400">Transporteur</Label>
                  <select
                    value={sellCarrier}
                    onChange={(e) => setSellCarrier(e.target.value)}
                    className="h-9 w-full rounded-md border border-white/10 bg-[#161b24] px-2.5 text-white"
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
              <p className="text-[11px] text-emerald-400">
                Génère automatiquement la facture, calcule ta marge commerciale et{" "}
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
                  className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400 font-bold"
                >
                  Confirmer la vente
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-[#0a0c12]/95 backdrop-blur-xl"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="grid grid-cols-5 gap-0.5 px-1 pt-1.5">
          {(
            [
              { id: "overview", label: "Accueil" },
              { id: "invoices", label: "Factures" },
              { id: "tools", label: "IA" },
              { id: "dressing", label: "Stock" },
              { id: "sales", label: "Ventes" },
            ] as const satisfies ReadonlyArray<{ id: TabId; label: string }>
          ).map((item) => {
            const full = navItems.find((n) => n.id === item.id);
            if (!full) return null;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectTab(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 min-h-[3.25rem] touch-manipulation ${
                  active
                    ? "bg-violet-600/90 text-white"
                    : "text-zinc-400 active:bg-white/5"
                }`}
              >
                <span className={active ? "text-white" : "text-zinc-500"}>
                  {full.icon}
                </span>
                <span className="text-[10px] font-semibold leading-tight">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
