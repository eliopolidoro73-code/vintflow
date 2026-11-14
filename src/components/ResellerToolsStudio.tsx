"use client";

import { useEffect, useRef, useState } from "react";
import {
  Calculator,
  Camera,
  Check,
  Clock,
  Copy,
  Download,
  ImagePlus,
  Loader2,
  Plus,
  ShieldAlert,
  Sparkles,
  Swords,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatEuro } from "@/lib/format";

interface ResellerToolsStudioProps {
  urssafRate: number;
  onItemCreated: () => void;
  onToast: (msg: string) => void;
}

type ToolSubTab = "photo" | "listing" | "antishadowban" | "negotiation";

const PHOTO_FORMATS = {
  vinted: { label: "Vinted (1080×1080)", w: 1080, h: 1080 },
  leboncoin: { label: "Leboncoin (1200×900)", w: 1200, h: 900 },
  tiktok: { label: "TikTok Shop (1080×1350)", w: 1080, h: 1350 },
};

const STUDIO_BACKGROUNDS = [
  { id: "white", label: "Studio Blanc", color: "#ffffff", text: "#0f172a" },
  { id: "cream", label: "Lin Naturel", color: "#f5f1ea", text: "#1c1917" },
  { id: "slate", label: "Gris Galerie", color: "#e2e8f0", text: "#0f172a" },
  { id: "dark", label: "Dark Luxe", color: "#111827", text: "#f8fafc" },
];

export function ResellerToolsStudio({
  urssafRate,
  onItemCreated,
  onToast,
}: ResellerToolsStudioProps) {
  const [subTab, setSubTab] = useState<ToolSubTab>("photo");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // --- 1. STUDIO PHOTO CANVAS STATE ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [photoFormat, setPhotoFormat] = useState<keyof typeof PHOTO_FORMATS>("vinted");
  const [studioBg, setStudioBg] = useState(STUDIO_BACKGROUNDS[0]);
  const [brightness, setBrightness] = useState(106);
  const [contrast, setContrast] = useState(108);
  const [saturation, setSaturation] = useState(105);
  const [paddingPct, setPaddingPct] = useState(7);
  const [badgeText, setBadgeText] = useState("ENVOI 24H · VÉRIFIÉ");

  // --- 2. LISTING + TIKTOK GENERATOR STATE ---
  const [genTitle, setGenTitle] = useState("Veste Carhartt Detroit Canvas Noir");
  const [genBrand, setGenBrand] = useState("Carhartt");
  const [genCategory, setGenCategory] = useState("Vestes & Manteaux");
  const [genSize, setGenSize] = useState("L");
  const [genCondition, setGenCondition] = useState("Très bon état");
  const [genDefects, setGenDefects] = useState("");
  const [genBuyPrice, setGenBuyPrice] = useState("28");
  const [genTargetPrice, setGenTargetPrice] = useState("89");
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState<{
    seoTitle: string;
    vinted: string;
    leboncoin: string;
    tiktokScript: string;
    pricingTiers: Array<{
      label: string;
      price: number;
      netMargin: number;
      urssafAmount: number;
    }>;
  } | null>(null);

  // --- 3. ANTI-SHADOWBAN STATE ---
  const [shadowTitle, setShadowTitle] = useState("Pull Ralph Lauren Marine Taille M");
  const [shadowText, setShadowText] = useState(
    "Pull Ralph Lauren très bon état taille M envoi rapide #ralphlauren #vintage #mode #pascher #vintedfrance",
  );
  const [shadowLoading, setShadowLoading] = useState(false);
  const [shadowResult, setShadowResult] = useState<{
    reorderedTitle: string;
    refreshedDescription: string;
    bestSlots: Array<{ day: string; window: string; score: string }>;
    checklist: string[];
  } | null>(null);

  // --- 4. NEGOTIATION & BUNDLE CALCULATOR STATE ---
  const [lotTotalCost, setLotTotalCost] = useState("140");
  const [lotShipping, setLotShipping] = useState("12");
  const [lotCount, setLotCount] = useState("10");
  const [negTarget, setNegTarget] = useState("65");
  const [negBuy, setNegBuy] = useState("18");
  const [negOffer, setNegOffer] = useState("40");
  const [negLoading, setNegLoading] = useState(false);
  const [negResult, setNegResult] = useState<{
    offerNetMargin: number;
    offerUrssaf: number;
    minAcceptable: number;
    counterPrice: number;
    discountPct: number;
    verdict: string;
    replies: Array<{ tone: string; text: string }>;
  } | null>(null);

  function copyText(key: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    onToast("Copié dans le presse-papiers !");
    setTimeout(() => setCopiedKey(null), 2000);
  }

  // Render Studio Photo Canvas whenever settings or image change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const fmt = PHOTO_FORMATS[photoFormat];
    canvas.width = fmt.w;
    canvas.height = fmt.h;

    const drawFrame = (img: HTMLImageElement | null) => {
      // Background studio fill
      ctx.fillStyle = studioBg.color;
      ctx.fillRect(0, 0, fmt.w, fmt.h);

      const pad = Math.round((Math.min(fmt.w, fmt.h) * paddingPct) / 100);
      const innerW = fmt.w - pad * 2;
      const innerH = fmt.h - pad * 2;

      if (img) {
        ctx.save();
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
        const scale = Math.min(innerW / img.width, innerH / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const dx = (fmt.w - drawW) / 2;
        const dy = (fmt.h - drawH) / 2;

        // Subtle studio drop shadow
        ctx.shadowColor = "rgba(0,0,0,0.18)";
        ctx.shadowBlur = 28;
        ctx.shadowOffsetY = 12;

        ctx.drawImage(img, dx, dy, drawW, drawH);
        ctx.restore();
      } else {
        // Sample vector garment preview when no file uploaded yet
        ctx.save();
        ctx.fillStyle = studioBg.id === "dark" ? "#1e293b" : "#f1f5f9";
        ctx.strokeStyle = studioBg.id === "dark" ? "#334155" : "#cbd5e1";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(pad, pad, innerW, innerH, 32);
        ctx.fill();
        ctx.stroke();

        // Stylized jacket silhouette
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
        ctx.fillStyle = "#0f766e";
        ctx.beginPath();
        const cx = fmt.w / 2;
        const cy = fmt.h / 2;
        ctx.moveTo(cx - 190, cy - 170);
        ctx.lineTo(cx - 75, cy - 230);
        ctx.lineTo(cx + 75, cy - 230);
        ctx.lineTo(cx + 190, cy - 170);
        ctx.lineTo(cx + 270, cy + 70);
        ctx.lineTo(cx + 185, cy + 100);
        ctx.lineTo(cx + 145, cy - 40);
        ctx.lineTo(cx + 145, cy + 230);
        ctx.lineTo(cx - 145, cy + 230);
        ctx.lineTo(cx - 145, cy - 40);
        ctx.lineTo(cx - 185, cy + 100);
        ctx.lineTo(cx - 270, cy + 70);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = studioBg.id === "dark" ? "#94a3b8" : "#475569";
        ctx.font = "600 28px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Importe ta vraie photo ci-contre", cx, cy + 305);
        ctx.restore();
      }

      if (badgeText.trim()) {
        ctx.save();
        const label = badgeText.trim().slice(0, 28);
        ctx.font = "700 24px sans-serif";
        const textW = ctx.measureText(label).width;
        const pillW = textW + 44;
        const pillH = 52;
        const px = fmt.w - pillW - 36;
        const py = fmt.h - pillH - 36;

        ctx.fillStyle = "rgba(9, 11, 15, 0.86)";
        ctx.beginPath();
        ctx.roundRect(px, py, pillW, pillH, 26);
        ctx.fill();

        ctx.fillStyle = "#34d399";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, px + pillW / 2, py + pillH / 2 + 1);
        ctx.restore();
      }
    };

    if (photoSrc) {
      const img = new Image();
      img.onload = () => drawFrame(img);
      img.src = photoSrc;
    } else {
      drawFrame(null);
    }
  }, [photoSrc, photoFormat, studioBg, brightness, contrast, saturation, paddingPct, badgeText]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhotoSrc(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleDownloadCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `vintflow-${photoFormat}-studio.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    onToast(`Photo exportée au format ${PHOTO_FORMATS[photoFormat].label} !`);
  }

  async function handleGenerateListing(e: React.FormEvent) {
    e.preventDefault();
    setGenLoading(true);
    try {
      const res = await fetch("/api/tools/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "listing",
          title: genTitle,
          brand: genBrand,
          category: genCategory,
          size: genSize,
          condition: genCondition,
          defects: genDefects,
          purchasePrice: Number(genBuyPrice) || 0,
          targetPrice: Number(genTargetPrice) || 30,
        }),
      });
      if (res.ok) {
        setGenResult(await res.json());
      }
    } finally {
      setGenLoading(false);
    }
  }

  async function handleSaveGeneratedToStock() {
    if (!genResult) return;
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: genResult.seoTitle,
        brand: genBrand,
        category: genCategory,
        size: genSize,
        condition: genCondition,
        purchase_price: Number(genBuyPrice) || 0,
        listing_price: Number(genTargetPrice) || 30,
        crosslist_lbc: true,
        crosslist_tiktok: true,
        description_vinted: genResult.vinted,
        description_lbc: genResult.leboncoin,
      }),
    });
    if (res.ok) {
      onItemCreated();
      onToast("Article ajouté au Dressing & crosslisté Vinted + Leboncoin + TikTok !");
    }
  }

  async function handleAntiShadowban(e: React.FormEvent) {
    e.preventDefault();
    setShadowLoading(true);
    try {
      const res = await fetch("/api/tools/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "antishadowban",
          title: shadowTitle,
          originalText: shadowText,
        }),
      });
      if (res.ok) {
        setShadowResult(await res.json());
      }
    } finally {
      setShadowLoading(false);
    }
  }

  async function handleNegotiation(e: React.FormEvent) {
    e.preventDefault();
    setNegLoading(true);
    try {
      const res = await fetch("/api/tools/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "negotiation",
          targetPrice: Number(negTarget) || 50,
          purchasePrice: Number(negBuy) || 15,
          offerPrice: Number(negOffer) || 30,
        }),
      });
      if (res.ok) {
        setNegResult(await res.json());
      }
    } finally {
      setNegLoading(false);
    }
  }

  const unitLotCost =
    Math.max(1, Number(lotCount) || 1) > 0
      ? ((Number(lotTotalCost) || 0) + (Number(lotShipping) || 0)) /
        Math.max(1, Number(lotCount) || 1)
      : 0;

  return (
    <div className="space-y-5">
      {/* Sub-navigation for the 4 killer tools */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {[
          {
            id: "photo" as ToolSubTab,
            title: "Studio Photo & Formats",
            sub: "Retouche + 1080px Vinted/LBC/TT",
            icon: <Camera className="h-4 w-4 text-emerald-400" />,
          },
          {
            id: "listing" as ToolSubTab,
            title: "Générateur IA 3-en-1",
            sub: "Vinted + Leboncoin + Script TikTok",
            icon: <Sparkles className="h-4 w-4 text-cyan-400" />,
          },
          {
            id: "antishadowban" as ToolSubTab,
            title: "Bouclier Anti-Shadowban",
            sub: "Re-listing sûr & meilleurs horaires",
            icon: <ShieldAlert className="h-4 w-4 text-amber-400" />,
          },
          {
            id: "negotiation" as ToolSubTab,
            title: "Sniper Négo & Lots",
            sub: "Contre-offres + Calculateur de lot",
            icon: <Swords className="h-4 w-4 text-rose-400" />,
          },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSubTab(item.id)}
            className={`rounded-2xl border p-3.5 text-left transition ${
              subTab === item.id
                ? "border-emerald-500/60 bg-emerald-500/10"
                : "border-white/10 bg-[#10141c] hover:border-white/20"
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-xs text-white">
              {item.icon}
              <span>{item.title}</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">{item.sub}</p>
          </button>
        ))}
      </div>

      {/* TOOL 1: STUDIO PHOTO CANVAS */}
      {subTab === "photo" && (
        <div className="grid gap-6 lg:grid-cols-12 rounded-2xl border border-white/10 bg-[#10141c] p-5">
          <div className="lg:col-span-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-white">
                Retouche Studio &amp; Empreinte Anti-Shadowban
              </h2>
              <p className="mt-1 text-xs text-zinc-400">
                Redimensionne et éclaire tes photos aux dimensions exactes Vinted,
                Leboncoin ou TikTok Shop. Change aussi l&apos;empreinte numérique du fichier
                pour éviter le flag lors d&apos;une republication.
              </p>
            </div>

            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/[0.06] px-4 py-3 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10">
              <ImagePlus className="h-4 w-4" />
              Importer une photo de mon article
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Format plateforme</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(PHOTO_FORMATS) as Array<keyof typeof PHOTO_FORMATS>).map(
                  (k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setPhotoFormat(k)}
                      className={`rounded-lg border px-2 py-2 text-[11px] font-medium ${
                        photoFormat === k
                          ? "border-emerald-500 bg-emerald-500/15 text-emerald-300 font-bold"
                          : "border-white/10 bg-white/[0.02] text-zinc-400"
                      }`}
                    >
                      {PHOTO_FORMATS[k].label}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Fond studio</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {STUDIO_BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => setStudioBg(bg)}
                    className={`rounded-lg border p-2 text-[10px] font-medium ${
                      studioBg.id === bg.id
                        ? "border-emerald-500 text-white"
                        : "border-white/10 text-zinc-400"
                    }`}
                  >
                    <span
                      className="block h-4 w-full rounded mb-1 border border-white/20"
                      style={{ backgroundColor: bg.color }}
                    />
                    {bg.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="space-y-1">
                <span className="text-zinc-400">Luminosité ({brightness}%)</span>
                <input
                  type="range"
                  min={80}
                  max={135}
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </label>
              <label className="space-y-1">
                <span className="text-zinc-400">Contraste ({contrast}%)</span>
                <input
                  type="range"
                  min={85}
                  max={135}
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </label>
              <label className="space-y-1">
                <span className="text-zinc-400">Couleurs ({saturation}%)</span>
                <input
                  type="range"
                  min={80}
                  max={135}
                  value={saturation}
                  onChange={(e) => setSaturation(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </label>
              <label className="space-y-1">
                <span className="text-zinc-400">Marge cadre ({paddingPct}%)</span>
                <input
                  type="range"
                  min={0}
                  max={16}
                  value={paddingPct}
                  onChange={(e) => setPaddingPct(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </label>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-zinc-400">
                Badge confiance (laisser vide pour aucun)
              </Label>
              <Input
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value)}
                placeholder="Ex: ENVOI 24H · VÉRIFIÉ"
                className="bg-white/5 border-white/10 text-xs text-white"
              />
            </div>

            <Button
              onClick={handleDownloadCanvas}
              className="w-full bg-emerald-500 text-emerald-950 hover:bg-emerald-400 font-bold text-xs h-10"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Télécharger l&apos;image retouchée (.png)
            </Button>
          </div>

          <div className="lg:col-span-7 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#090b0f] p-4">
            <canvas
              ref={canvasRef}
              className="max-h-[430px] w-auto max-w-full rounded-xl border border-white/10 shadow-2xl"
            />
            <p className="mt-2.5 text-[11px] text-zinc-500">
              Aperçu temps réel · Export haute résolution {PHOTO_FORMATS[photoFormat].w}×
              {PHOTO_FORMATS[photoFormat].h} px
            </p>
          </div>
        </div>
      )}

      {/* TOOL 2: AI LISTING + TIKTOK SCRIPT GENERATOR */}
      {subTab === "listing" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleGenerateListing}
            className="lg:col-span-5 rounded-2xl border border-white/10 bg-[#10141c] p-5 space-y-3 text-xs"
          >
            <h2 className="text-sm font-bold text-white">
              Générateur d&apos;annonce SEO + Script TikTok Shop
            </h2>
            <p className="text-zinc-400">
              Fini les 10 minutes par fiche. Rédige d&apos;un coup pour Vinted, Leboncoin et
              TikTok avec stratégie de prix et mention anti-litige.
            </p>

            <div className="space-y-1">
              <Label className="text-zinc-400">Article</Label>
              <Input
                value={genTitle}
                onChange={(e) => setGenTitle(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-zinc-400">Marque</Label>
                <Input
                  value={genBrand}
                  onChange={(e) => setGenBrand(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-400">Catégorie</Label>
                <Input
                  value={genCategory}
                  onChange={(e) => setGenCategory(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-400">Taille</Label>
                <Input
                  value={genSize}
                  onChange={(e) => setGenSize(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-400">État</Label>
                <Input
                  value={genCondition}
                  onChange={(e) => setGenCondition(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-400">Prix achat (€)</Label>
                <Input
                  type="number"
                  value={genBuyPrice}
                  onChange={(e) => setGenBuyPrice(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-400">Prix visé (€)</Label>
                <Input
                  type="number"
                  value={genTargetPrice}
                  onChange={(e) => setGenTargetPrice(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-zinc-400">
                Défaut à signaler (optionnel — évite les retours Vinted)
              </Label>
              <Input
                value={genDefects}
                onChange={(e) => setGenDefects(e.target.value)}
                placeholder="Ex: micro trace sur la manche droite"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <Button
              type="submit"
              disabled={genLoading}
              className="w-full bg-emerald-500 text-emerald-950 hover:bg-emerald-400 font-bold h-10"
            >
              {genLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1.5" />
              )}
              Générer mes 3 fiches + prix
            </Button>
          </form>

          <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-[#10141c] p-5 space-y-4">
            {!genResult ? (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center text-xs text-zinc-400">
                <Sparkles className="h-8 w-8 text-emerald-400/70 mb-2" />
                Clique sur <strong>Générer mes 3 fiches + prix</strong> pour obtenir
                ton titre SEO, tes descriptions Vinted &amp; Leboncoin, ton script vidéo
                TikTok Shop et ta marge nette ({urssafRate}% URSSAF).
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2.5">
                  {genResult.pricingTiers.map((tier) => (
                    <div
                      key={tier.label}
                      className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs"
                    >
                      <p className="text-zinc-400 text-[11px]">{tier.label}</p>
                      <p className="text-lg font-extrabold text-white mt-0.5">
                        {formatEuro(tier.price)}
                      </p>
                      <p className="text-[11px] text-emerald-400">
                        Net : {formatEuro(tier.netMargin)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 text-xs">
                  <div className="rounded-xl border border-white/10 bg-[#090b0f] p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <Badge className="bg-teal-500/15 text-teal-300 border-teal-500/30">
                        Vinted (SEO + Mesures + Hashtags)
                      </Badge>
                      <button
                        type="button"
                        onClick={() => copyText("vinted", genResult.vinted)}
                        className="inline-flex items-center gap-1 text-zinc-400 hover:text-white"
                      >
                        {copiedKey === "vinted" ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        Copier
                      </button>
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-zinc-200 leading-relaxed">
                      {genResult.vinted}
                    </pre>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#090b0f] p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <Badge className="bg-orange-500/15 text-orange-300 border-orange-500/30">
                        Leboncoin (Propre &amp; Rassurant)
                      </Badge>
                      <button
                        type="button"
                        onClick={() => copyText("lbc", genResult.leboncoin)}
                        className="inline-flex items-center gap-1 text-zinc-400 hover:text-white"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copier
                      </button>
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-zinc-200 leading-relaxed">
                      {genResult.leboncoin}
                    </pre>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#090b0f] p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <Badge className="bg-pink-500/15 text-pink-300 border-pink-500/30">
                        <Video className="h-3 w-3 mr-1" />
                        Script Vidéo TikTok Shop / Reels (15s)
                      </Badge>
                      <button
                        type="button"
                        onClick={() => copyText("tiktok", genResult.tiktokScript)}
                        className="inline-flex items-center gap-1 text-zinc-400 hover:text-white"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copier
                      </button>
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-zinc-200 leading-relaxed">
                      {genResult.tiktokScript}
                    </pre>
                  </div>
                </div>

                <Button
                  onClick={handleSaveGeneratedToStock}
                  className="w-full bg-emerald-500 text-emerald-950 hover:bg-emerald-400 font-bold text-xs"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Enregistrer cet article dans mon Dressing &amp; Crosslister
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* TOOL 3: ANTI-SHADOWBAN & RELIST SHIELD */}
      {subTab === "antishadowban" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleAntiShadowban}
            className="lg:col-span-5 rounded-2xl border border-white/10 bg-[#10141c] p-5 space-y-3 text-xs"
          >
            <h2 className="text-sm font-bold text-white">
              Bouclier Anti-Shadowban &amp; Vérification 24h
            </h2>
            <p className="text-zinc-400">
              Les vendeurs perdent leurs vues quand ils republient le même texte/hashtags
              en boucle. Colle ton annonce qui stagne : Vintflow la réécrit proprement.
            </p>
            <div className="space-y-1">
              <Label className="text-zinc-400">Titre actuel</Label>
              <Input
                value={shadowTitle}
                onChange={(e) => setShadowTitle(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-zinc-400">Description actuelle</Label>
              <Textarea
                rows={5}
                value={shadowText}
                onChange={(e) => setShadowText(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <Button
              type="submit"
              disabled={shadowLoading}
              className="w-full bg-amber-400 text-amber-950 hover:bg-amber-300 font-bold h-10"
            >
              {shadowLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <ShieldAlert className="h-4 w-4 mr-1.5" />
              )}
              Générer une variante sûre sans shadowban
            </Button>
          </form>

          <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-[#10141c] p-5 space-y-4 text-xs">
            {!shadowResult ? (
              <div className="space-y-4">
                <p className="text-zinc-300 font-semibold">
                  Meilleurs créneaux de publication Vinted / Leboncoin (heure FR) :
                </p>
                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    { day: "Dimanche", window: "18h00 – 21h30", score: "+42 % vues" },
                    { day: "Mercredi", window: "18h30 – 21h00", score: "+28 % vues" },
                    { day: "Vendredi", window: "17h00 – 20h00", score: "+31 % vues" },
                  ].map((slot) => (
                    <div
                      key={slot.day}
                      className="rounded-xl border border-white/10 bg-[#090b0f] p-3"
                    >
                      <p className="font-bold text-white flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-emerald-400" />
                        {slot.day}
                      </p>
                      <p className="mt-1 text-zinc-300">{slot.window}</p>
                      <p className="mt-1 text-emerald-400 font-semibold">{slot.score}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-500/30 bg-[#090b0f] p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300">
                      Nouveau titre anti-duplication
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText("stitle", shadowResult.reorderedTitle)}
                      className="text-zinc-400 hover:text-white inline-flex items-center gap-1"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copier
                    </button>
                  </div>
                  <p className="font-semibold text-white">
                    {shadowResult.reorderedTitle}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#090b0f] p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">
                      Description nettoyée (zéro spam)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyText("sdesc", shadowResult.refreshedDescription)
                      }
                      className="text-zinc-400 hover:text-white inline-flex items-center gap-1"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copier
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-zinc-300 leading-relaxed">
                    {shadowResult.refreshedDescription}
                  </pre>
                </div>

                <div className="space-y-1.5">
                  <p className="font-bold text-amber-300">Checklist anti-shadowban :</p>
                  {shadowResult.checklist.map((tip, i) => (
                    <p key={i} className="text-zinc-400 flex items-start gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      {tip}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TOOL 4: BUNDLE CALCULATOR & NEGOTIATION SNIPER */}
      {subTab === "negotiation" && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Bundle Calculator */}
          <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-[#10141c] p-5 space-y-4 text-xs">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Calculator className="h-4 w-4 text-emerald-400" />
              Calculateur de Lot &amp; Seuil de Rentabilité
            </h2>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <Label className="text-zinc-400">Prix du lot (€)</Label>
                <Input
                  type="number"
                  value={lotTotalCost}
                  onChange={(e) => setLotTotalCost(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-400">Frais port (€)</Label>
                <Input
                  type="number"
                  value={lotShipping}
                  onChange={(e) => setLotShipping(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-400">Nb de pièces</Label>
                <Input
                  type="number"
                  min={1}
                  value={lotCount}
                  onChange={(e) => setLotCount(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>

            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-3.5 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-zinc-300">Coût de revient / pièce :</span>
                <strong className="text-white">{formatEuro(unitLotCost)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-300">
                  Seuil zéro perte (URSSAF {urssafRate}%) :
                </span>
                <strong className="text-amber-300">
                  {formatEuro(unitLotCost / Math.max(0.1, 1 - urssafRate / 100))}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-300">Prix conseillé cible (×2,8) :</span>
                <strong className="text-emerald-400">
                  {formatEuro(Math.round(unitLotCost * 2.8))}
                </strong>
              </div>
            </div>

            {/* Negotiation Sniper Form */}
            <form
              onSubmit={handleNegotiation}
              className="space-y-3 border-t border-white/10 pt-4"
            >
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Swords className="h-4 w-4 text-rose-400" />
                Sniper Négociation (Offres -40% / &quot;Dernier prix ?&quot;)
              </h3>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-zinc-400">Affiché (€)</Label>
                  <Input
                    type="number"
                    value={negTarget}
                    onChange={(e) => setNegTarget(e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-zinc-400">Ton achat (€)</Label>
                  <Input
                    type="number"
                    value={negBuy}
                    onChange={(e) => setNegBuy(e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-rose-300">Offre reçue (€)</Label>
                  <Input
                    type="number"
                    value={negOffer}
                    onChange={(e) => setNegOffer(e.target.value)}
                    className="bg-rose-500/10 border-rose-500/30 text-white font-bold"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={negLoading}
                className="w-full bg-emerald-500 text-emerald-950 hover:bg-emerald-400 font-bold"
              >
                Calculer ma riposte &amp; contre-offre
              </Button>
            </form>
          </div>

          <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-[#10141c] p-5 space-y-4 text-xs">
            {!negResult ? (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center text-zinc-400">
                <Swords className="h-8 w-8 text-rose-400/70 mb-2" />
                Entre une offre agressive à gauche pour voir ta marge réelle après
                URSSAF et copier la meilleure contre-offre en 1 clic.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="rounded-xl border border-white/10 bg-[#090b0f] p-3">
                    <p className="text-zinc-400">Marge à l&apos;offre</p>
                    <p
                      className={`text-lg font-extrabold mt-0.5 ${
                        negResult.offerNetMargin > 0
                          ? "text-white"
                          : "text-red-400"
                      }`}
                    >
                      {formatEuro(negResult.offerNetMargin)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#090b0f] p-3">
                    <p className="text-zinc-400">Prix plancher sûr</p>
                    <p className="text-lg font-extrabold text-amber-300 mt-0.5">
                      {formatEuro(negResult.minAcceptable)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                    <p className="text-emerald-300">Contre-offre idéale</p>
                    <p className="text-lg font-extrabold text-emerald-400 mt-0.5">
                      {formatEuro(negResult.counterPrice)}
                    </p>
                  </div>
                </div>

                <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 font-medium text-zinc-200">
                  {negResult.verdict}
                </p>

                <div className="space-y-2.5">
                  {negResult.replies.map((rep, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-white/10 bg-[#090b0f] p-3.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-400">
                          {rep.tone}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyText(`rep-${idx}`, rep.text)}
                          className="text-zinc-400 hover:text-white inline-flex items-center gap-1"
                        >
                          <Copy className="h-3.5 w-3.5" /> Copier
                        </button>
                      </div>
                      <p className="text-zinc-200 leading-relaxed">{rep.text}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
