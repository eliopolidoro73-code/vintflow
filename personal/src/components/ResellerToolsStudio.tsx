"use client";

import { useEffect, useRef, useState } from "react";
import {
  Calculator,
  Camera,
  Check,
  Clock,
  Copy,
  Download,
  Eraser,
  Eye,
  ImagePlus,
  Loader2,
  Lock,
  Plus,
  ScanSearch,
  ShieldAlert,
  Sparkles,
  Swords,
  Video,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { formatEuro } from "@/lib/format";
import type { PlanId } from "@/lib/plans";
import type { StudioPresets } from "@/lib/user-preferences";
import { buildAiImageDataUrl } from "@/lib/client-ai-image";
import { localAntiShadowbanRewrite } from "@/lib/antishadowban-engine";
import { studioThumbFromCanvas } from "@/lib/studio-thumb";

interface ResellerToolsStudioProps {
  planId: PlanId;
  aiCreditsUsed: number;
  aiCreditsLimit: number; // 0 = disabled, -1 = unlimited
  studioPresets?: StudioPresets;
  onStudioPresetsChange?: (patch: StudioPresets) => void;
  onItemCreated: () => void;
  onUpgradeClick: () => void;
  onToast: (msg: string) => void;
}

type ToolSubTab =
  | "photo"
  | "listing"
  | "antishadowban"
  | "negotiation"
  | "visibility";

type PublishSlot = {
  day: string;
  window: string;
  score: string;
  reason?: string;
};

function aiEngineBadge(engine?: string, usedLocalFallback?: boolean) {
  if (!engine) return "Assistant";
  if (engine.includes("gemini")) return "Gemini cloud";
  if (engine.includes("openai")) return "OpenAI cloud";
  if (usedLocalFallback) return "Règles pro locales (cloud indisponible)";
  return "Assistant local";
}

async function postToolsGenerate(
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await fetch("/api/tools/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Connexion coupée — vérifie Wi‑Fi ou 4G.");
  }
  const raw = await res.text();
  let parsed: Record<string, unknown> & { error?: string };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    if (res.status === 413) {
      throw new Error("Photo trop lourde pour le serveur. Réessaie.");
    }
    throw new Error(`Réponse serveur invalide (${res.status}).`);
  }
  if (!res.ok) {
    throw new Error(parsed.error ?? `Erreur ${res.status}`);
  }
  return parsed;
}

const PHOTO_FORMATS = {
  vinted: { label: "Vinted (1080×1080)", w: 1080, h: 1080 },
  leboncoin: { label: "Leboncoin (1200×900)", w: 1200, h: 900 },
  tiktok: { label: "TikTok Shop (1080×1350)", w: 1080, h: 1350 },
};

const STUDIO_BACKGROUNDS = [
  { id: "white", label: "Studio Blanc", color: "#ffffff" },
  { id: "cream", label: "Lin Naturel", color: "#f5f1ea" },
  { id: "slate", label: "Gris Galerie", color: "#e2e8f0" },
  { id: "dark", label: "Dark Luxe", color: "#111827" },
];

/** Réglages testés pour limiter l’empreinte photo Vinted (anti-duplication). */
const PHOTO_ANTI_BAN_PRESETS = [
  {
    id: "vinted_safe",
    label: "Vinted sûr",
    hint: "Fond clair, léger padding",
    bgId: "cream" as const,
    brightness: 108,
    contrast: 106,
    saturation: 102,
    paddingPct: 9,
    removeBg: true,
    bgTolerance: 42,
  },
  {
    id: "luxe_dark",
    label: "Luxe sombre",
    hint: "Sacs / montres premium",
    bgId: "dark" as const,
    brightness: 112,
    contrast: 114,
    saturation: 98,
    paddingPct: 8,
    removeBg: true,
    bgTolerance: 36,
  },
  {
    id: "repost",
    label: "Re-post",
    hint: "Rotation visuelle max",
    bgId: "slate" as const,
    brightness: 104,
    contrast: 110,
    saturation: 106,
    paddingPct: 11,
    removeBg: false,
    bgTolerance: 34,
  },
  {
    id: "lbc_wide",
    label: "Leboncoin",
    hint: "Format large + fond neutre",
    bgId: "white" as const,
    brightness: 110,
    contrast: 108,
    saturation: 100,
    paddingPct: 6,
    removeBg: true,
    bgTolerance: 40,
  },
] as const;

function detectColorName(r: number, g: number, b: number): string {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max < 55) return "Noir";
  if (min > 205) return "Blanc";
  if (max - min < 22) return max > 130 ? "Gris Clair" : "Gris Anthracite";
  if (r > g + 35 && r > b + 35) return r > 170 && g > 80 ? "Orange" : "Rouge";
  if (g > r + 20 && g > b + 20) return "Vert";
  if (b > r + 20 && b > g + 15) return b < 110 ? "Bleu Marine" : "Bleu";
  if (r > 150 && g > 120 && b < 100) return "Beige / Camel";
  return "Multicolore";
}

function removeBackgroundByEdgeFlood(
  srcImg: HTMLImageElement,
  tolerance: number,
): HTMLCanvasElement {
  const maxSide = 720;
  const scale = Math.min(1, maxSide / Math.max(srcImg.width, srcImg.height));
  const w = Math.max(1, Math.round(srcImg.width * scale));
  const h = Math.max(1, Math.round(srcImg.height * scale));

  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const octx = off.getContext("2d", { willReadFrequently: true });
  if (!octx) return off;

  octx.drawImage(srcImg, 0, 0, w, h);
  const imgData = octx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const corners = [
    [2, 2],
    [w - 3, 2],
    [2, h - 3],
    [w - 3, h - 3],
  ];
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let valid = 0;
  for (const [cx, cy] of corners) {
    if (cx >= 0 && cy >= 0 && cx < w && cy < h) {
      const idx = (cy * w + cx) * 4;
      sr += data[idx];
      sg += data[idx + 1];
      sb += data[idx + 2];
      valid += 1;
    }
  }
  const bgR = sr / Math.max(1, valid);
  const bgG = sg / Math.max(1, valid);
  const bgB = sb / Math.max(1, valid);

  const visited = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;

  const pushIfBg = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (visited[p]) return;
    const idx = p * 4;
    const dist = Math.sqrt(
      (data[idx] - bgR) ** 2 +
        (data[idx + 1] - bgG) ** 2 +
        (data[idx + 2] - bgB) ** 2,
    );
    if (dist <= tolerance) {
      visited[p] = 1;
      queue[tail++] = p;
    }
  };

  for (let x = 0; x < w; x++) {
    pushIfBg(x, 0);
    pushIfBg(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    pushIfBg(0, y);
    pushIfBg(w - 1, y);
  }

  while (head < tail) {
    const p = queue[head++];
    const x = p % w;
    const y = (p - x) / w;
    data[p * 4 + 3] = 0;
    pushIfBg(x + 1, y);
    pushIfBg(x - 1, y);
    pushIfBg(x, y + 1);
    pushIfBg(x, y - 1);
  }

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      if (visited[p]) continue;
      if (
        visited[p - 1] ||
        visited[p + 1] ||
        visited[p - w] ||
        visited[p + w]
      ) {
        data[p * 4 + 3] = Math.min(data[p * 4 + 3], 175);
      }
    }
  }

  octx.putImageData(imgData, 0, 0);
  return off;
}

export function ResellerToolsStudio({
  planId,
  aiCreditsUsed,
  aiCreditsLimit,
  studioPresets,
  onStudioPresetsChange,
  onItemCreated,
  onUpgradeClick,
  onToast,
}: ResellerToolsStudioProps) {
  const initialBg =
    STUDIO_BACKGROUNDS.find((b) => b.id === studioPresets?.studioBgId) ??
    STUDIO_BACKGROUNDS[0];

  const [subTab, setSubTab] = useState<ToolSubTab>(
    studioPresets?.subTab ?? "photo",
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [photoFileName, setPhotoFileName] = useState<string>("");
  const [photoFormat, setPhotoFormat] = useState<keyof typeof PHOTO_FORMATS>(
    (studioPresets?.photoFormat as keyof typeof PHOTO_FORMATS) ?? "vinted",
  );
  const [studioBg, setStudioBg] = useState(initialBg);
  const [brightness, setBrightness] = useState(studioPresets?.brightness ?? 106);
  const [contrast, setContrast] = useState(studioPresets?.contrast ?? 108);
  const [saturation, setSaturation] = useState(studioPresets?.saturation ?? 105);
  const [paddingPct, setPaddingPct] = useState(studioPresets?.paddingPct ?? 7);
  const [badgeText, setBadgeText] = useState(studioPresets?.badgeText ?? "");
  const [removeBg, setRemoveBg] = useState(studioPresets?.removeBg ?? false);
  const [bgTolerance, setBgTolerance] = useState(studioPresets?.bgTolerance ?? 38);
  const [showOriginal, setShowOriginal] = useState(false);
  const [photoRotationDeg, setPhotoRotationDeg] = useState(0);
  const [visionLoading, setVisionLoading] = useState(false);
  const [photoSafetyLoading, setPhotoSafetyLoading] = useState(false);
  const [fullSafetyLoading, setFullSafetyLoading] = useState(false);
  const [powerPipelineLoading, setPowerPipelineLoading] = useState(false);
  const [descSafetyLoading, setDescSafetyLoading] = useState(false);
  const [listingSafetyResult, setListingSafetyResult] = useState<{
    engine: string;
    fingerprintRisk: string;
    descriptionRisk: string;
    globalRisk: string;
    summary: string;
    refreshedDescription: string;
    reorderedTitle: string;
    photoChecklist: string[];
    descriptionChecklist: string[];
    recommendedBrightness?: number;
    recommendedContrast?: number;
    recommendedPaddingPct?: number;
    shouldRemoveBackground?: boolean;
  } | null>(null);
  const [photoSafetyResult, setPhotoSafetyResult] = useState<{
    engine: string;
    fingerprintRisk: string;
    recommendedBrightness: number;
    recommendedContrast: number;
    recommendedPaddingPct: number;
    shouldRemoveBackground: boolean;
    checklist: string[];
    summary: string;
  } | null>(null);

  const [genTitle, setGenTitle] = useState(studioPresets?.genTitle ?? "");
  const [genBrand, setGenBrand] = useState(studioPresets?.genBrand ?? "");
  const [genCategory, setGenCategory] = useState(studioPresets?.genCategory ?? "");
  const [genSize, setGenSize] = useState(studioPresets?.genSize ?? "");
  const [genCondition, setGenCondition] = useState(
    studioPresets?.genCondition ?? "",
  );
  const [genDefects, setGenDefects] = useState("");
  const [genBuyPrice, setGenBuyPrice] = useState("");
  const [genTargetPrice, setGenTargetPrice] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState<{
    engine?: string;
    seoTitle: string;
    vinted: string;
    leboncoin: string;
    tiktokScript: string;
    publishAdvice?: string;
    publishNow?: boolean;
    publishSlots?: PublishSlot[];
    avoidWords?: string[];
    hashtags?: string[];
    pricingTiers: Array<{
      label: string;
      price: number;
      netMargin: number;
    }>;
  } | null>(null);

  const [shadowTitle, setShadowTitle] = useState("");
  const [shadowText, setShadowText] = useState("");
  const [shadowCategory, setShadowCategory] = useState("");
  const [shadowIsRepost, setShadowIsRepost] = useState(true);
  const [shadowLoading, setShadowLoading] = useState(false);
  const [shadowResult, setShadowResult] = useState<{
    engine?: string;
    reorderedTitle: string;
    titleAlternatives?: string[];
    refreshedDescription: string;
    bestSlots: PublishSlot[];
    checklist: string[];
    riskLevel?: string;
    riskReasons?: string[];
    avoidWords?: string[];
    photoFingerprintTips?: string[];
    waitMinutesBeforeRepost?: number;
    safeToPostNow?: boolean;
    descriptionRisk?: string;
    duplicateScore?: number;
    descriptionSpamFlags?: string[];
    safeToPostDescription?: boolean;
  } | null>(null);

  const [visCategory, setVisCategory] = useState(
    studioPresets?.genCategory || "Vêtements",
  );
  const [visibilityLoading, setVisibilityLoading] = useState(false);
  const [visibilityResult, setVisibilityResult] = useState<{
    engine: string;
    publishNow: boolean;
    headline: string;
    bestSlots: PublishSlot[];
    weeklyPlan: Record<string, string>;
    categoryTip: string;
    avoidTimes: string[];
  } | null>(null);

  const [lotTotalCost, setLotTotalCost] = useState("");
  const [lotShipping, setLotShipping] = useState("");
  const [lotCount, setLotCount] = useState("");
  const [boostCost, setBoostCost] = useState("");
  const [negTarget, setNegTarget] = useState("");
  const [negBuy, setNegBuy] = useState("");
  const [negOffer, setNegOffer] = useState("");
  const [negLoading, setNegLoading] = useState(false);
  const [negResult, setNegResult] = useState<{
    offerNetMargin: number;
    minAcceptable: number;
    counterPrice: number;
    discountPct: number;
    verdict: string;
    replies: Array<{ tone: string; text: string }>;
  } | null>(null);

  const prefsHydrated = useRef(false);

  useEffect(() => {
    if (!onStudioPresetsChange) return;
    if (!prefsHydrated.current) {
      prefsHydrated.current = true;
      return;
    }
    onStudioPresetsChange({
      subTab,
      photoFormat,
      studioBgId: studioBg.id,
      brightness,
      contrast,
      saturation,
      paddingPct,
      badgeText,
      removeBg,
      bgTolerance,
      genBrand,
      genCategory,
      genSize,
      genCondition,
    });
  }, [
    onStudioPresetsChange,
    subTab,
    photoFormat,
    studioBg.id,
    brightness,
    contrast,
    saturation,
    paddingPct,
    badgeText,
    removeBg,
    bgTolerance,
    genBrand,
    genCategory,
    genSize,
    genCondition,
  ]);

  async function copyText(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      onToast("Copié dans le presse-papiers !");
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      onToast("Copie impossible — sélectionne le texte manuellement.");
    }
  }

  function handleAutoEnhance() {
    setBrightness(110);
    setContrast(112);
    setSaturation(108);
    setPaddingPct(7);
    setShowOriginal(false);
    onToast("Auto-éclairage Studio appliqué !");
  }

  function applyPhotoPreset(presetId: (typeof PHOTO_ANTI_BAN_PRESETS)[number]["id"]) {
    const preset = PHOTO_ANTI_BAN_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const bg =
      STUDIO_BACKGROUNDS.find((b) => b.id === preset.bgId) ??
      STUDIO_BACKGROUNDS[0];
    setStudioBg(bg);
    setBrightness(preset.brightness);
    setContrast(preset.contrast);
    setSaturation(preset.saturation);
    setPaddingPct(preset.paddingPct);
    setRemoveBg(preset.removeBg);
    setBgTolerance(preset.bgTolerance);
    if (presetId === "lbc_wide") setPhotoFormat("leboncoin");
    else if (presetId !== "repost") setPhotoFormat("vinted");
    setShowOriginal(false);
    onStudioPresetsChange?.({
      ...(studioPresets ?? {}),
      studioBgId: bg.id,
      brightness: preset.brightness,
      contrast: preset.contrast,
      saturation: preset.saturation,
      paddingPct: preset.paddingPct,
      removeBg: preset.removeBg,
      bgTolerance: preset.bgTolerance,
      photoFormat: presetId === "lbc_wide" ? "leboncoin" : "vinted",
    });
    onToast(`Preset « ${preset.label} » — lance l’analyse IA ensuite.`);
  }

  const lastFocusKick = useRef(0);

  useEffect(() => {
    const kick = studioPresets?.focusKick ?? 0;
    if (!kick || kick === lastFocusKick.current) return;
    lastFocusKick.current = kick;
    if (studioPresets?.subTab) setSubTab(studioPresets.subTab);
    if (studioPresets?.genTitle) setGenTitle(studioPresets.genTitle);
    if (studioPresets?.genBrand) setGenBrand(studioPresets.genBrand);
    if (studioPresets?.genCategory) setGenCategory(studioPresets.genCategory);
    if (studioPresets?.genSize) setGenSize(studioPresets.genSize);
    if (studioPresets?.genCondition) setGenCondition(studioPresets.genCondition);
    if (studioPresets?.genTargetListingDesc) {
      setShadowText(studioPresets.genTargetListingDesc);
      setShadowTitle(studioPresets.genTitle ?? "");
    }
    if (studioPresets?.studioImageThumb?.startsWith("data:image/")) {
      setPhotoSrc(studioPresets.studioImageThumb);
      setShowOriginal(false);
    }
    if (studioPresets?.genTargetPrice) {
      setGenTargetPrice(String(studioPresets.genTargetPrice));
    }
    if (studioPresets?.genPurchasePrice !== undefined) {
      setGenBuyPrice(String(studioPresets.genPurchasePrice));
    }
    onToast("Article chargé depuis le Dressing — lance le pipeline anti-ban.");
  }, [studioPresets, onToast]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const fmt = PHOTO_FORMATS[photoFormat];
    canvas.width = fmt.w;
    canvas.height = fmt.h;

    const drawFrame = (img: HTMLImageElement | null) => {
      if (img && showOriginal) {
        ctx.fillStyle = "#090b0f";
        ctx.fillRect(0, 0, fmt.w, fmt.h);
        const scale = Math.min(fmt.w / img.width, fmt.h / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        ctx.drawImage(img, (fmt.w - dw) / 2, (fmt.h - dh) / 2, dw, dh);
        return;
      }

      ctx.fillStyle = studioBg.color;
      ctx.fillRect(0, 0, fmt.w, fmt.h);

      const pad = Math.round((Math.min(fmt.w, fmt.h) * paddingPct) / 100);
      const innerW = fmt.w - pad * 2;
      const innerH = fmt.h - pad * 2;

      if (img) {
        const sourceToDraw: CanvasImageSource = removeBg
          ? removeBackgroundByEdgeFlood(img, bgTolerance)
          : img;
        const srcW =
          sourceToDraw instanceof HTMLCanvasElement
            ? sourceToDraw.width
            : img.width;
        const srcH =
          sourceToDraw instanceof HTMLCanvasElement
            ? sourceToDraw.height
            : img.height;

        ctx.save();
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
        const scale = Math.min(innerW / srcW, innerH / srcH);
        const drawW = srcW * scale;
        const drawH = srcH * scale;
        const dx = (fmt.w - drawW) / 2;
        const dy = (fmt.h - drawH) / 2;

        ctx.shadowColor = "rgba(0,0,0,0.22)";
        ctx.shadowBlur = 30;
        ctx.shadowOffsetY = 14;

        if (Math.abs(photoRotationDeg) > 0.05) {
          const rcx = dx + drawW / 2;
          const rcy = dy + drawH / 2;
          ctx.translate(rcx, rcy);
          ctx.rotate((photoRotationDeg * Math.PI) / 180);
          ctx.translate(-rcx, -rcy);
        }

        ctx.drawImage(sourceToDraw, dx, dy, drawW, drawH);
        ctx.restore();
      } else {
        ctx.save();
        ctx.fillStyle = studioBg.id === "dark" ? "#1e293b" : "#f1f5f9";
        ctx.strokeStyle = studioBg.id === "dark" ? "#334155" : "#cbd5e1";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(pad, pad, innerW, innerH, 32);
        ctx.fill();
        ctx.stroke();

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

        ctx.fillStyle = studioBg.id === "dark" ? "#94a3b8" : "#64748b";
        ctx.font = "600 22px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Aperçu — importe une photo à gauche", cx, cy + 285);
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

        ctx.fillStyle = "rgba(9, 11, 15, 0.88)";
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
  }, [
    photoSrc,
    photoFormat,
    studioBg,
    brightness,
    contrast,
    saturation,
    paddingPct,
    badgeText,
    removeBg,
    bgTolerance,
    showOriginal,
    photoRotationDeg,
  ]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhotoSrc(reader.result);
        setShowOriginal(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleExportAllPlatforms() {
    if (!photoSrc) {
      onToast("Importe une photo d'abord.");
      return;
    }
    const original = photoFormat;
    const keys = Object.keys(PHOTO_FORMATS) as (keyof typeof PHOTO_FORMATS)[];
    onToast(`Export ${keys.length} formats — patiente quelques secondes…`);
    for (const key of keys) {
      setPhotoFormat(key);
      await new Promise((r) => setTimeout(r, 280));
      handleDownloadCanvas("jpeg");
      await new Promise((r) => setTimeout(r, 200));
    }
    setPhotoFormat(original);
    onToast("Pack Vinted + Leboncoin + TikTok exporté (JPEG).");
  }

  function handleDownloadCanvas(fmt: "png" | "jpeg" = "png") {
    if (!photoSrc) {
      onToast("Importe d'abord une photo avant d'exporter.");
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    const ext = fmt === "jpeg" ? "jpg" : "png";
    link.download = `vintflow-${photoFormat}-studio.${ext}`;
    link.href =
      fmt === "jpeg"
        ? canvas.toDataURL("image/jpeg", 0.92)
        : canvas.toDataURL("image/png");
    link.click();
    onToast(
      fmt === "jpeg"
        ? `JPEG léger exporté (${PHOTO_FORMATS[photoFormat].label}) — idéal si la photo est lourde.`
        : `PNG haute qualité exporté (${PHOTO_FORMATS[photoFormat].label}).`,
    );
  }

  function mergeShadowSlots(
    title: string,
    desc: string,
    category: string,
    isRepost: boolean,
  ) {
    return localAntiShadowbanRewrite(title, desc, {
      category,
      isRepost,
    }).bestSlots;
  }

  function handleApplyShadowToListing() {
    if (!shadowResult) {
      onToast("Lance d’abord l’analyse anti-ban.");
      return;
    }
    setGenTitle(shadowResult.reorderedTitle);
    setGenResult((prev) =>
      prev
        ? {
            ...prev,
            seoTitle: shadowResult.reorderedTitle,
            vinted: shadowResult.refreshedDescription,
          }
        : {
            seoTitle: shadowResult.reorderedTitle,
            vinted: shadowResult.refreshedDescription,
            leboncoin: shadowResult.refreshedDescription.slice(0, 800),
            tiktokScript: `Présentation : ${shadowResult.reorderedTitle}`,
            pricingTiers: [],
          },
    );
    setSubTab("listing");
    onToast("Titre + description injectés dans le générateur d’annonces.");
  }

  async function handleAnalyzePhotoToListing() {
    if (!photoSrc) {
      onToast("Importe d'abord une photo de ton article.");
      return;
    }
    setVisionLoading(true);
    try {
      let dominantColor = "Noir";
      const canvas = canvasRef.current;
      if (canvas && photoSrc) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const cx = Math.floor(canvas.width / 2);
          const cy = Math.floor(canvas.height / 2);
          const px = ctx.getImageData(
            Math.max(0, cx - 25),
            Math.max(0, cy - 25),
            50,
            50,
          ).data;
          let r = 0;
          let g = 0;
          let b = 0;
          let count = 0;
          for (let i = 0; i < px.length; i += 4) {
            if (px[i + 3] > 200) {
              r += px[i];
              g += px[i + 1];
              b += px[i + 2];
              count++;
            }
          }
          if (count > 0) {
            dominantColor = detectColorName(r / count, g / count, b / count);
          }
        }
      }

      const imageDataUrl = await buildAiImageDataUrl({
        canvas,
        originalSrc: photoSrc,
      });

      const analysis = (await postToolsGenerate({
        mode: "vision_analyze",
        imageDataUrl,
        fileName: photoFileName,
        dominantColor,
        withListing: true,
        purchasePrice: Number(genBuyPrice) || 15,
      })) as {
        engine: string;
        title: string;
        brand: string;
        category: string;
        size: string;
        condition: string;
        defects: string;
        estimatedPrice: number;
        listing?: typeof genResult;
      };

      setGenTitle(String(analysis.title));
      setGenBrand(String(analysis.brand));
      setGenCategory(String(analysis.category));
      setGenSize(String(analysis.size));
      setGenCondition(String(analysis.condition));
      setGenDefects(String(analysis.defects ?? ""));
      setGenTargetPrice(String(analysis.estimatedPrice));
      setSubTab("listing");

      if (analysis.listing) {
        setGenResult(analysis.listing as NonNullable<typeof genResult>);
      } else {
        const listing = (await postToolsGenerate({
          mode: "listing",
          title: analysis.title,
          brand: analysis.brand,
          category: analysis.category,
          size: analysis.size,
          condition: analysis.condition,
          defects: analysis.defects,
          purchasePrice: Number(genBuyPrice) || 15,
          targetPrice: analysis.estimatedPrice,
        })) as typeof genResult;
        setGenResult(listing as NonNullable<typeof genResult>);
      }
      onItemCreated();
      onToast(
        analysis.listing
          ? `Scan OK (${aiEngineBadge(analysis.engine)}) — annonces prêtes !`
          : `Fiche pré-remplie (${dominantColor}) — génération en cours.`,
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Scan impossible.");
    } finally {
      setVisionLoading(false);
    }
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
      const out = await res.json();
      if (!res.ok) {
        onToast(out.error ?? "Quota IA atteint");
        return;
      }
      setGenResult(out);
      onItemCreated();
    } finally {
      setGenLoading(false);
    }
  }

  async function saveGeneratedToStock(includeStudioPhoto: boolean) {
    if (!genResult) return;
    const thumb =
      includeStudioPhoto && photoSrc
        ? studioThumbFromCanvas(canvasRef.current)
        : "";
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
        studio_image_thumb: thumb,
      }),
    });
    const out = (await res.json()) as { error?: string };
    if (!res.ok) {
      onToast(out.error ?? "Erreur lors de l'ajout au stock");
      return;
    }
    onItemCreated();
    onToast(
      thumb
        ? "Article + miniature Studio enregistrés dans le Dressing !"
        : "Article ajouté au Dressing & crosslisté !",
    );
  }

  async function handleAntiShadowban(e: React.FormEvent) {
    e.preventDefault();
    if (!shadowTitle.trim() && !shadowText.trim()) {
      onToast("Colle au moins le titre ou la description.");
      return;
    }
    setShadowLoading(true);
    try {
      const out = (await postToolsGenerate({
        mode: "antishadowban",
        title: shadowTitle,
        originalText: shadowText,
        category: shadowCategory,
        isRepost: shadowIsRepost,
      })) as typeof shadowResult;
      setShadowResult(out);
      onItemCreated();
      onToast(
        out?.safeToPostNow
          ? "Variante sûre — tu peux publier après photo studio."
          : `Attends ${out?.waitMinutesBeforeRepost ?? 5} min entre 2 posts.`,
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Analyse anti-ban impossible.");
    } finally {
      setShadowLoading(false);
    }
  }

  async function handlePhotoSafetyAi() {
    if (!photoSrc) {
      onToast("Importe une photo avant l'analyse anti-ban.");
      return;
    }
    setPhotoSafetyLoading(true);
    try {
      const imageDataUrl = await buildAiImageDataUrl({
        canvas: canvasRef.current,
        originalSrc: photoSrc,
      });
      const out = (await postToolsGenerate({
        mode: "photo_safety",
        imageDataUrl,
      })) as {
        engine: string;
        usedLocalFallback?: boolean;
        fingerprintRisk: string;
        recommendedBrightness: number;
        recommendedContrast: number;
        recommendedPaddingPct: number;
        shouldRemoveBackground: boolean;
        shouldRotateSlight?: boolean;
        checklist: string[];
        summary: string;
      };
      setPhotoSafetyResult(out);
      setBrightness(out.recommendedBrightness);
      setContrast(out.recommendedContrast);
      setPaddingPct(out.recommendedPaddingPct);
      if (out.shouldRemoveBackground) setRemoveBg(true);
      if (out.shouldRotateSlight) setPhotoRotationDeg(0.85);
      else if (!out.shouldRotateSlight) setPhotoRotationDeg(0);
      onItemCreated();
      onToast(
        `${aiEngineBadge(out.engine, out.usedLocalFallback)} — réglages appliqués (${out.fingerprintRisk}).`,
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Analyse photo impossible.");
    } finally {
      setPhotoSafetyLoading(false);
    }
  }

  async function handleDescriptionSafetyAi() {
    const title = shadowTitle.trim() || genTitle.trim();
    const desc = shadowText.trim() || genResult?.vinted?.trim() || "";
    if (!title && !desc) {
      onToast("Saisis un titre et/ou une description à analyser.");
      return;
    }
    setDescSafetyLoading(true);
    try {
      const out = (await postToolsGenerate({
        mode: "description_safety",
        title,
        originalText: desc || title,
        category: shadowCategory || genCategory,
        isRepost: shadowIsRepost,
      })) as {
        engine: string;
        descriptionRisk: string;
        duplicateScore: number;
        refreshedDescription: string;
        reorderedTitle: string;
        titleAlternatives?: string[];
        summary: string;
        checklist: string[];
        spamFlags?: string[];
        safeToPostDescription?: boolean;
      };
      setShadowResult((prev) => ({
        bestSlots: prev?.bestSlots ?? [],
        reorderedTitle: out.reorderedTitle,
        refreshedDescription: out.refreshedDescription,
        checklist: out.checklist,
        titleAlternatives: out.titleAlternatives ?? prev?.titleAlternatives,
        engine: out.engine,
        descriptionRisk: out.descriptionRisk,
        duplicateScore: out.duplicateScore,
        descriptionSpamFlags: out.spamFlags,
        safeToPostDescription: out.safeToPostDescription,
        riskLevel: out.descriptionRisk,
        riskReasons: out.spamFlags,
        photoFingerprintTips: prev?.photoFingerprintTips,
        waitMinutesBeforeRepost: prev?.waitMinutesBeforeRepost,
        safeToPostNow: prev?.safeToPostNow,
        avoidWords: prev?.avoidWords,
      }));
      setShadowTitle(out.reorderedTitle);
      setShadowText(out.refreshedDescription);
      setSubTab("antishadowban");
      onItemCreated();
      onToast(
        `${aiEngineBadge(out.engine)} — description ${out.descriptionRisk} (dup ${out.duplicateScore}%).`,
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Analyse description impossible.");
    } finally {
      setDescSafetyLoading(false);
    }
  }

  async function handleFullListingSafety() {
    if (!photoSrc) {
      onToast("Importe une photo pour l'analyse complète.");
      return;
    }
    const title = shadowTitle.trim() || genTitle.trim() || genResult?.seoTitle || "";
    const desc = shadowText.trim() || genResult?.vinted?.trim() || "";
    if (!desc && !title) {
      onToast("Ajoute au moins un titre ou une description Vinted.");
      return;
    }
    setFullSafetyLoading(true);
    try {
      const imageDataUrl = await buildAiImageDataUrl({
        canvas: canvasRef.current,
        originalSrc: photoSrc,
      });
      const out = (await postToolsGenerate({
        mode: "listing_safety",
        imageDataUrl,
        title,
        originalText: desc,
        category: shadowCategory || genCategory,
        isRepost: shadowIsRepost,
      })) as typeof listingSafetyResult & {
        recommendedBrightness: number;
        recommendedContrast: number;
        recommendedPaddingPct: number;
        shouldRemoveBackground: boolean;
        titleAlternatives?: string[];
      };
      setListingSafetyResult(out);
      if (out.recommendedBrightness) setBrightness(out.recommendedBrightness);
      if (out.recommendedContrast) setContrast(out.recommendedContrast);
      if (out.recommendedPaddingPct) setPaddingPct(out.recommendedPaddingPct);
      if (out.shouldRemoveBackground) setRemoveBg(true);
      if ("shouldRotateSlight" in out && out.shouldRotateSlight) setPhotoRotationDeg(0.85);
      setShadowTitle(out.reorderedTitle);
      setShadowText(out.refreshedDescription);
      const slots = mergeShadowSlots(
        out.reorderedTitle,
        out.refreshedDescription,
        shadowCategory || genCategory,
        shadowIsRepost,
      );
      setShadowResult({
        engine: out.engine,
        reorderedTitle: out.reorderedTitle,
        titleAlternatives: out.titleAlternatives,
        refreshedDescription: out.refreshedDescription,
        bestSlots: slots,
        checklist: [
          ...(out.photoChecklist ?? []).map((t) => `[Photo] ${t}`),
          ...(out.descriptionChecklist ?? []).map((t) => `[Texte] ${t}`),
        ],
        riskLevel: out.globalRisk,
        descriptionRisk: out.descriptionRisk,
        riskReasons: [out.summary],
        safeToPostNow: out.globalRisk === "low",
      });
      setSubTab("antishadowban");
      onItemCreated();
      onToast(
        `${aiEngineBadge(out.engine)} — global ${out.globalRisk} (photo ${out.fingerprintRisk}, texte ${out.descriptionRisk}).`,
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Analyse complète impossible.");
    } finally {
      setFullSafetyLoading(false);
    }
  }

  async function handleMaxPowerPipeline() {
    if (!photoSrc) {
      onToast("Importe une photo pour lancer le pipeline max.");
      return;
    }
    setPowerPipelineLoading(true);
    try {
      applyPhotoPreset("vinted_safe");
      const imageDataUrl = await buildAiImageDataUrl({
        canvas: canvasRef.current,
        originalSrc: photoSrc,
      });
      const photoOut = (await postToolsGenerate({
        mode: "photo_safety",
        imageDataUrl,
        power: true,
      })) as typeof photoSafetyResult & {
        recommendedBrightness: number;
        recommendedContrast: number;
        recommendedPaddingPct: number;
        shouldRemoveBackground: boolean;
      };
      if (photoOut) {
        setPhotoSafetyResult(photoOut);
        setBrightness(photoOut.recommendedBrightness);
        setContrast(photoOut.recommendedContrast);
        setPaddingPct(photoOut.recommendedPaddingPct);
        if (photoOut.shouldRemoveBackground) setRemoveBg(true);
      }

      let title = shadowTitle.trim() || genTitle.trim();
      let desc = shadowText.trim() || genResult?.vinted?.trim() || "";
      if (!title && genBrand.trim()) title = `${genBrand} ${genCategory || "article"}`.trim();
      if (!desc && (genBrand || genTitle)) {
        setGenLoading(true);
        try {
          const listRes = await fetch("/api/tools/generate", {
            method: "POST",
            headers: { "content-type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
              mode: "listing",
              title: title || genTitle || "Article",
              brand: genBrand,
              category: genCategory,
              size: genSize,
              condition: genCondition,
              defects: genDefects,
              purchasePrice: Number(genBuyPrice) || 0,
              targetPrice: Number(genTargetPrice) || 30,
              power: true,
            }),
          });
          const listing = await listRes.json();
          if (listRes.ok) {
            setGenResult(listing);
            title = String(listing.seoTitle ?? title);
            desc = String(listing.vinted ?? desc);
            setShadowTitle(title);
            setShadowText(desc);
          }
        } finally {
          setGenLoading(false);
        }
      }

      const image2 = await buildAiImageDataUrl({
        canvas: canvasRef.current,
        originalSrc: photoSrc,
      });
      const out = (await postToolsGenerate({
        mode: "listing_safety",
        imageDataUrl: image2,
        title: title || "Article mode",
        originalText: desc || title,
        category: shadowCategory || genCategory,
        isRepost: shadowIsRepost,
        power: true,
      })) as typeof listingSafetyResult & {
        recommendedBrightness: number;
        recommendedContrast: number;
        recommendedPaddingPct: number;
        shouldRemoveBackground: boolean;
        titleAlternatives?: string[];
      };
      setListingSafetyResult(out);
      if (out.recommendedBrightness) setBrightness(out.recommendedBrightness);
      if (out.recommendedContrast) setContrast(out.recommendedContrast);
      if (out.recommendedPaddingPct) setPaddingPct(out.recommendedPaddingPct);
      if (out.shouldRemoveBackground) setRemoveBg(true);
      if ("shouldRotateSlight" in out && out.shouldRotateSlight) setPhotoRotationDeg(0.85);
      setShadowTitle(out.reorderedTitle);
      setShadowText(out.refreshedDescription);
      const slots = mergeShadowSlots(
        out.reorderedTitle,
        out.refreshedDescription,
        shadowCategory || genCategory,
        shadowIsRepost,
      );
      setShadowResult({
        engine: out.engine,
        reorderedTitle: out.reorderedTitle,
        titleAlternatives: out.titleAlternatives,
        refreshedDescription: out.refreshedDescription,
        bestSlots: slots,
        checklist: [
          ...(out.photoChecklist ?? []).map((t) => `[Photo] ${t}`),
          ...(out.descriptionChecklist ?? []).map((t) => `[Texte] ${t}`),
        ],
        riskLevel: out.globalRisk,
        descriptionRisk: out.descriptionRisk,
        riskReasons: [out.summary],
        safeToPostNow: out.globalRisk === "low",
      });
      setSubTab("antishadowban");
      onItemCreated();
      onToast(
        `Pipeline max — ${aiEngineBadge(out.engine)} · risque global ${out.globalRisk}.`,
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Pipeline max interrompu.");
    } finally {
      setPowerPipelineLoading(false);
    }
  }

  async function handleLoadVisibility() {
    setVisibilityLoading(true);
    try {
      const res = await fetch("/api/tools/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "visibility",
          category: visCategory || genCategory || "Vêtements",
        }),
      });
      const out = await res.json();
      if (!res.ok) {
        onToast(out.error ?? "Quota IA atteint");
        return;
      }
      setVisibilityResult(out);
      onItemCreated();
    } finally {
      setVisibilityLoading(false);
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
      const out = await res.json();
      if (!res.ok) {
        onToast(out.error ?? "Quota IA atteint");
        return;
      }
      setNegResult(out);
      onItemCreated();
    } finally {
      setNegLoading(false);
    }
  }

  // Gate whole AI tools suite on Essentiel (9€)
  if (planId === "essentiel" || aiCreditsLimit === 0) {
    return (
      <div className="rounded-3xl border border-amber-500/30 bg-[#0e111a] p-8 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300 border border-amber-500/30">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-extrabold text-white">
          Boîte à outils IA réservée aux plans Vendeur Plus &amp; Pro Scale
        </h2>
        <p className="mx-auto max-w-lg text-xs sm:text-sm text-zinc-400">
          Le plan Essentiel (9 €/mois) couvre uniquement le suivi de stock et la marge
          commerciale. Passe à <strong>Vendeur Plus (29 €)</strong> pour 30 crédits IA/mois ou{" "}
          <strong>Pro Scale (49 €)</strong> pour tout débloquer en illimité.
        </p>
        <Button
          onClick={onUpgradeClick}
          className="bg-violet-600 text-white hover:bg-violet-500 font-bold"
        >
          Voir les plans &amp; débloquer l&apos;IA
        </Button>
      </div>
    );
  }

  const unitLotCost =
    ((Number(lotTotalCost) || 0) + (Number(lotShipping) || 0)) /
    Math.max(1, Number(lotCount) || 1);

  return (
    <div className="space-y-5">
      {/* Quota bar for Vendeur Plus / Unlimited badge for Pro Scale */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0e111a] px-4 py-3 text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <span className="font-semibold text-white">
            {aiCreditsLimit === -1
              ? "Suite IA Illimitée (Pro Scale)"
              : `Crédits IA mensuels (Vendeur Plus) : ${aiCreditsUsed} / ${aiCreditsLimit} utilisés`}
          </span>
        </div>
        {aiCreditsLimit > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={onUpgradeClick}
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 text-[11px] h-7"
          >
            Passer à l&apos;illimité (Pro Scale)
          </Button>
        )}
      </div>

      {/* Sub-navigation */}
      <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1 -mx-1 px-1 lg:grid lg:grid-cols-5 lg:overflow-visible">
        {[
          {
            id: "photo" as ToolSubTab,
            title: "Studio Photo & Détourage",
            short: "Photo",
            sub: "Anti-ban + Scan IA",
            icon: <Camera className="h-4 w-4 text-emerald-400" />,
          },
          {
            id: "listing" as ToolSubTab,
            title: "Générateur IA 3-en-1",
            short: "Annonces",
            sub: "Titres & desc anti-ban",
            icon: <Sparkles className="h-4 w-4 text-cyan-400" />,
          },
          {
            id: "visibility" as ToolSubTab,
            title: "Quand publier ?",
            short: "Timing",
            sub: "Créneaux Vinted IA",
            icon: <Clock className="h-4 w-4 text-violet-400" />,
          },
          {
            id: "antishadowban" as ToolSubTab,
            title: "Bouclier Anti-Shadowban",
            short: "Anti-ban",
            sub: "Re-listing & Créneaux",
            icon: <ShieldAlert className="h-4 w-4 text-amber-400" />,
          },
          {
            id: "negotiation" as ToolSubTab,
            title: "Sniper Négo & Lots",
            short: "Négo",
            sub: "Contre-offres & Seuil",
            icon: <Swords className="h-4 w-4 text-rose-400" />,
          },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSubTab(item.id)}
            className={`vf-click-press snap-start shrink-0 min-w-[7.5rem] lg:min-w-0 rounded-2xl border p-3 lg:p-3.5 text-left transition-all min-h-[3.25rem] touch-manipulation ${
              subTab === item.id
                ? "border-violet-500/60 bg-violet-500/12 shadow-[0_0_24px_rgba(139,92,246,0.18)]"
                : "border-white/10 bg-[#0e111a] hover:border-white/25"
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-xs text-white">
              {item.icon}
              <span className="lg:hidden">{item.short}</span>
              <span className="hidden lg:inline">{item.title}</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-400 hidden lg:block">{item.sub}</p>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-amber-500/35 bg-gradient-to-r from-amber-500/10 via-violet-500/8 to-emerald-500/10 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-amber-200 uppercase tracking-wide">
            Pipeline anti-ban max
          </p>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Photo IA → annonce (si besoin) → contrôle photo + texte. Consomme{" "}
            <strong className="text-amber-200/90">2 à 3 crédits IA</strong> si le cloud
            répond.
          </p>
        </div>
        <Button
          type="button"
          disabled={powerPipelineLoading || !photoSrc}
          onClick={handleMaxPowerPipeline}
          className="h-11 shrink-0 bg-amber-400 text-amber-950 hover:bg-amber-300 font-bold text-sm touch-manipulation w-full sm:w-auto"
        >
          {powerPipelineLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <ShieldAlert className="h-4 w-4 mr-2" />
          )}
          Lancer pipeline max
        </Button>
      </div>

      {/* TOOL 1: STUDIO PHOTO */}
      {subTab === "photo" && (
        <div key="photo" className="vf-tab-enter flex flex-col-reverse gap-5 lg:grid lg:grid-cols-12 lg:gap-6 rounded-2xl border border-white/10 bg-[#0e111a] p-4 sm:p-5">
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-white">
                  Studio Photo IA &amp; Détourage
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  Détoure le fond, illumine l&apos;article et scanne vers 3 annonces.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAutoEnhance}
                className="shrink-0 border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 text-[11px] h-8"
              >
                <Wand2 className="h-3.5 w-3.5 mr-1" />
                Auto
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Presets photo anti-ban
              </p>
              <div className="flex flex-wrap gap-2">
                {PHOTO_ANTI_BAN_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPhotoPreset(p.id)}
                    className="rounded-xl border border-white/10 bg-[#131722] px-3 py-2 text-left hover:border-emerald-500/40 transition touch-manipulation"
                  >
                    <span className="block text-[11px] font-bold text-white">
                      {p.label}
                    </span>
                    <span className="block text-[10px] text-zinc-500">{p.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-500/40 bg-emerald-500/[0.06] px-4 py-4 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10 transition touch-manipulation">
              <ImagePlus className="h-5 w-5" />
              {photoSrc ? "Changer la photo" : "Prendre ou choisir une photo"}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            <div className="grid grid-cols-1 gap-2 lg:hidden">
              <Button
                type="button"
                disabled={photoSafetyLoading || !photoSrc}
                onClick={handlePhotoSafetyAi}
                className="h-12 w-full bg-amber-400 text-amber-950 hover:bg-amber-300 font-bold text-sm touch-manipulation"
              >
                {photoSafetyLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <ShieldAlert className="h-5 w-5 mr-2" />
                )}
                Photo anti-ban IA
              </Button>
              <Button
                type="button"
                disabled={fullSafetyLoading || !photoSrc}
                onClick={handleFullListingSafety}
                className="h-12 w-full border border-violet-500/40 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20 font-bold text-sm touch-manipulation"
              >
                {fullSafetyLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-5 w-5 mr-2" />
                )}
                Anti-ban complet (photo + description)
              </Button>
              <Button
                type="button"
                disabled={visionLoading || !photoSrc}
                onClick={handleAnalyzePhotoToListing}
                className="h-12 w-full bg-violet-600 text-white hover:bg-violet-500 font-bold text-sm touch-manipulation"
              >
                {visionLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <ScanSearch className="h-5 w-5 mr-2" />
                )}
                Scanner → annonce complète
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  onClick={() => handleDownloadCanvas("png")}
                  variant="outline"
                  className="h-11 border-white/15 bg-white/5 text-white text-xs touch-manipulation"
                >
                  <Download className="h-4 w-4 mr-1" />
                  PNG pro
                </Button>
                <Button
                  type="button"
                  onClick={() => handleDownloadCanvas("jpeg")}
                  variant="outline"
                  className="h-11 border-white/15 bg-white/5 text-white text-xs touch-manipulation"
                >
                  <Download className="h-4 w-4 mr-1" />
                  JPEG léger
                </Button>
              </div>
            </div>

            <div className="lg:hidden rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Détourage rapide</span>
                <Switch checked={removeBg} onCheckedChange={setRemoveBg} />
              </div>
              {removeBg && (
                <div className="space-y-1">
                  <Label className="text-[10px] text-zinc-500">
                    Sensibilité fond ({bgTolerance})
                  </Label>
                  <Input
                    type="range"
                    min={18}
                    max={72}
                    value={bgTolerance}
                    onChange={(e) => setBgTolerance(Number(e.target.value))}
                    className="h-2"
                  />
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2.5 hidden lg:block">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Eraser className="h-3.5 w-3.5 text-emerald-400" />
                  Détourage intelligent du fond
                </span>
                <Switch checked={removeBg} onCheckedChange={setRemoveBg} />
              </div>
              {removeBg && (
                <label className="block space-y-1 text-[11px] text-zinc-400">
                  <span>Sensibilité détourage ({bgTolerance})</span>
                  <input
                    type="range"
                    min={15}
                    max={95}
                    value={bgTolerance}
                    onChange={(e) => setBgTolerance(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </label>
              )}
            </div>

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

            <div className="space-y-1.5 hidden lg:block">
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

            <div className="hidden lg:grid grid-cols-2 gap-3 text-xs">
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
              <label className="space-y-1">
                <span className="text-zinc-400">
                  Rotation anti-empreinte ({photoRotationDeg.toFixed(1)}°)
                </span>
                <input
                  type="range"
                  min={-1.5}
                  max={1.5}
                  step={0.1}
                  value={photoRotationDeg}
                  onChange={(e) => setPhotoRotationDeg(Number(e.target.value))}
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

            <div className="hidden lg:grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button
                type="button"
                onClick={() => handleDownloadCanvas("png")}
                variant="outline"
                className="border-white/15 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs h-10"
              >
                <Download className="h-4 w-4 mr-1.5" />
                PNG pro
              </Button>
              <Button
                type="button"
                onClick={() => handleDownloadCanvas("jpeg")}
                variant="outline"
                className="border-white/15 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs h-10"
              >
                <Download className="h-4 w-4 mr-1.5" />
                JPEG léger
              </Button>
              <Button
                type="button"
                disabled={photoSafetyLoading || !photoSrc}
                onClick={handlePhotoSafetyAi}
                className="bg-amber-500/90 text-amber-950 hover:bg-amber-400 font-bold text-xs h-10"
              >
                {photoSafetyLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <ShieldAlert className="h-4 w-4 mr-1.5" />
                )}
                Photo anti-ban IA
              </Button>
              <Button
                type="button"
                disabled={fullSafetyLoading || !photoSrc}
                onClick={handleFullListingSafety}
                className="sm:col-span-2 border border-violet-500/35 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20 font-bold text-xs h-10"
              >
                {fullSafetyLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1.5" />
                )}
                Anti-ban complet (photo + description IA)
              </Button>
              <Button
                type="button"
                disabled={visionLoading || !photoSrc}
                onClick={handleAnalyzePhotoToListing}
                className="sm:col-span-2 bg-violet-600 text-white hover:bg-violet-500 font-bold text-xs h-10"
              >
                {visionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <ScanSearch className="h-4 w-4 mr-1.5" />
                )}
                Scanner → Annonce
              </Button>
            </div>

            {listingSafetyResult && (
              <div className="rounded-xl border border-violet-500/30 bg-violet-500/[0.08] p-3 text-[11px] space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-violet-500/20 text-violet-100 border-violet-500/30">
                    Global : {listingSafetyResult.globalRisk}
                  </Badge>
                  <Badge variant="outline" className="border-white/15 text-zinc-300">
                    {aiEngineBadge(listingSafetyResult.engine)}
                  </Badge>
                </div>
                <p className="text-zinc-200 leading-relaxed">{listingSafetyResult.summary}</p>
                <p className="text-zinc-400">
                  Photo : {listingSafetyResult.fingerprintRisk} · Description :{" "}
                  {listingSafetyResult.descriptionRisk}
                </p>
              </div>
            )}

            {photoSafetyResult && (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3 text-[11px] space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-amber-500/20 text-amber-200 border-amber-500/30">
                    Risque empreinte : {photoSafetyResult.fingerprintRisk}
                  </Badge>
                  <Badge variant="outline" className="border-white/15 text-zinc-300">
                    {aiEngineBadge(photoSafetyResult.engine)}
                  </Badge>
                </div>
                <p className="text-zinc-200">{photoSafetyResult.summary}</p>
                <ul className="list-disc pl-4 text-zinc-400 space-y-0.5">
                  {photoSafetyResult.checklist.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="lg:col-span-7 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#07080d] p-4 gap-3">
            {photoSrc && (
              <div className="flex w-full items-center justify-between px-2">
                <span className="text-[11px] text-zinc-400 font-mono truncate max-w-[220px]">
                  {photoFileName || "image-article.png"}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowOriginal((v) => !v)}
                  className="text-xs text-zinc-300 hover:text-white h-7"
                >
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  {showOriginal ? "Voir Studio IA" : "Comparer l'original"}
                </Button>
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="max-h-[430px] w-auto max-w-full rounded-xl border border-white/10 shadow-2xl"
            />
            <p className="text-[11px] text-zinc-500">
              Export haute résolution {PHOTO_FORMATS[photoFormat].w}×
              {PHOTO_FORMATS[photoFormat].h} px
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={!photoSrc}
              onClick={() => void handleExportAllPlatforms()}
              className="w-full border-cyan-500/30 text-cyan-200 h-10 text-xs"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Exporter les 3 formats (Vinted · LBC · TikTok)
            </Button>
          </div>
        </div>
      )}

      {/* TOOL 2: AI LISTING + TIKTOK SCRIPT GENERATOR */}
      {subTab === "listing" && (
        <div key="listing" className="vf-tab-enter grid gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleGenerateListing}
            className="lg:col-span-5 rounded-2xl border border-white/10 bg-[#0e111a] p-5 space-y-3 text-xs"
          >
            <h2 className="text-sm font-bold text-white">
              Générateur d&apos;annonce SEO + Script TikTok Shop
            </h2>
            <p className="text-zinc-400">
              Rédige en 1 clic pour Vinted, Leboncoin et TikTok avec stratégie de prix
              et mention anti-litige.
            </p>

            <div className="flex flex-wrap gap-1.5">
              {[
                { b: "Louis Vuitton", c: "Sacs" },
                { b: "Chanel", c: "Sacs luxe" },
                { b: "Nike", c: "Sneakers" },
                { b: "Zara", c: "Vêtements" },
              ].map((chip) => (
                <button
                  key={chip.b}
                  type="button"
                  onClick={() => {
                    setGenBrand(chip.b);
                    setGenCategory(chip.c);
                  }}
                  className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-400 hover:border-violet-500/40 hover:text-white"
                >
                  {chip.b}
                </button>
              ))}
            </div>

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
                <Label className="text-zinc-400">Coût de revient (€)</Label>
                <Input
                  type="number"
                  value={genBuyPrice}
                  onChange={(e) => setGenBuyPrice(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-400">Chiffre d&apos;affaire (€)</Label>
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
              className="w-full bg-violet-600 text-white hover:bg-violet-500 font-bold h-10"
            >
              {genLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1.5" />
              )}
              Générer mes 3 fiches + prix
            </Button>
          </form>

          <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-[#0e111a] p-5 space-y-4">
            {!genResult ? (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center text-xs text-zinc-400">
                <Sparkles className="h-8 w-8 text-emerald-400/70 mb-2" />
                Clique sur <strong>Générer mes 3 fiches + prix</strong> (ou scanne une
                photo dans le Studio) pour obtenir ton titre SEO, tes descriptions Vinted
                &amp; Leboncoin, ton script vidéo TikTok Shop et ta marge commerciale.
              </div>
            ) : (
              <>
                {(genResult.publishAdvice || genResult.engine) && (
                  <div className="rounded-xl border border-violet-500/25 bg-violet-500/[0.07] p-3 text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-white flex items-center gap-2">
                        <Clock className="h-4 w-4 text-violet-300" />
                        {genResult.publishNow
                          ? "Bon moment pour publier maintenant"
                          : "Attends le prochain créneau fort"}
                      </p>
                      {genResult.engine && (
                        <Badge variant="outline" className="border-white/15 text-zinc-300">
                          {aiEngineBadge(genResult.engine)}
                        </Badge>
                      )}
                    </div>
                    {genResult.publishAdvice && (
                      <p className="text-zinc-300">{genResult.publishAdvice}</p>
                    )}
                    {genResult.publishSlots && genResult.publishSlots.length > 0 && (
                      <div className="grid sm:grid-cols-3 gap-2">
                        {genResult.publishSlots.map((slot) => (
                          <div
                            key={`${slot.day}-${slot.window}`}
                            className="rounded-lg border border-white/10 bg-[#07080d] p-2"
                          >
                            <p className="font-bold text-white">{slot.day}</p>
                            <p className="text-violet-300">{slot.window}</p>
                            <p className="text-emerald-400 text-[10px]">{slot.score}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {genResult.avoidWords && genResult.avoidWords.length > 0 && (
                      <p className="text-zinc-500 text-[10px]">
                        Mots à éviter : {genResult.avoidWords.join(", ")}
                      </p>
                    )}
                  </div>
                )}

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
                        Marge : {formatEuro(tier.netMargin)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 text-xs">
                  <div className="rounded-xl border border-white/10 bg-[#07080d] p-3">
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

                  <div className="rounded-xl border border-white/10 bg-[#07080d] p-3">
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

                  <div className="rounded-xl border border-white/10 bg-[#07080d] p-3">
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

                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    onClick={() => void saveGeneratedToStock(false)}
                    className="w-full bg-violet-600 text-white hover:bg-violet-500 font-bold text-xs h-11"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Ajouter au Dressing
                  </Button>
                  <Button
                    type="button"
                    disabled={!photoSrc}
                    onClick={() => void saveGeneratedToStock(true)}
                    className="w-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 font-bold text-xs h-11"
                  >
                    <Camera className="h-4 w-4 mr-1.5" />
                    Dressing + photo Studio
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {subTab === "visibility" && (
        <div key="visibility" className="vf-tab-enter grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-[#0e111a] p-5 space-y-3 text-xs">
            <h2 className="text-sm font-bold text-white">
              Radar visibilité Vinted (heure Paris)
            </h2>
            <p className="text-zinc-400">
              L&apos;IA te dit si tu publies maintenant ou si tu attends le créneau qui
              maximise les vues — sans spam ni shadowban.
            </p>
            <div className="space-y-1">
              <Label className="text-zinc-400">Catégorie principale</Label>
              <Input
                value={visCategory}
                onChange={(e) => setVisCategory(e.target.value)}
                placeholder="Ex : Vestes, Sneakers, Pulls…"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <Button
              type="button"
              disabled={visibilityLoading}
              onClick={handleLoadVisibility}
              className="w-full bg-violet-600 text-white hover:bg-violet-500 font-bold h-10"
            >
              {visibilityLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Clock className="h-4 w-4 mr-1.5" />
              )}
              Analyser mes créneaux IA
            </Button>
          </div>

          <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-[#0e111a] p-5 space-y-4 text-xs">
            {!visibilityResult ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center text-center text-zinc-400">
                <Clock className="h-9 w-9 text-violet-400/70 mb-2" />
                Lance l&apos;analyse pour obtenir tes créneaux personnalisés (heure Paris).
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-violet-500/30 bg-violet-500/[0.08] p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-extrabold text-white">
                      {visibilityResult.publishNow
                        ? "C’est le bon moment — publie maintenant"
                        : "Patiente — meilleur impact aux créneaux ci-dessous"}
                    </p>
                    <Badge variant="outline" className="border-white/15 text-zinc-300">
                      {aiEngineBadge(visibilityResult.engine)}
                    </Badge>
                  </div>
                  <p className="text-zinc-200">{visibilityResult.headline}</p>
                  <p className="text-zinc-500">{visibilityResult.categoryTip}</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-2.5">
                  {visibilityResult.bestSlots.map((slot) => (
                    <div
                      key={`${slot.day}-${slot.window}`}
                      className="rounded-xl border border-white/10 bg-[#07080d] p-3"
                    >
                      <p className="font-bold text-white">{slot.day}</p>
                      <p className="text-violet-300">{slot.window}</p>
                      <p className="text-emerald-400 font-semibold">{slot.score}</p>
                      {slot.reason && (
                        <p className="text-zinc-500 text-[10px] mt-1">{slot.reason}</p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-white/10 bg-[#07080d] p-3">
                  <p className="font-semibold text-white mb-2">Plan de la semaine</p>
                  <div className="grid sm:grid-cols-2 gap-1.5 text-zinc-300 text-[11px]">
                    {Object.entries(visibilityResult.weeklyPlan).map(([day, tip]) => (
                      <p key={day}>
                        <span className="text-white font-medium capitalize">{day}</span> —{" "}
                        {tip}
                      </p>
                    ))}
                  </div>
                </div>

                <p className="text-zinc-500 text-[10px]">
                  À éviter : {visibilityResult.avoidTimes.join(" · ")}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* TOOL 3: ANTI-SHADOWBAN */}
      {subTab === "antishadowban" && (
        <div key="antishadowban" className="vf-tab-enter grid gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleAntiShadowban}
            className="lg:col-span-5 rounded-2xl border border-white/10 bg-[#0e111a] p-5 space-y-3 text-xs"
          >
            <h2 className="text-sm font-bold text-white">
              Bouclier Anti-Shadowban &amp; Vérification 24h
            </h2>
            <p className="text-zinc-400">
              Colle une annonce qui stagne ou que tu veux remettre en ligne sans être
              bloqué en vérification.
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
            <div className="space-y-1">
              <Label className="text-zinc-400">Catégorie (optionnel)</Label>
              <Input
                value={shadowCategory}
                onChange={(e) => setShadowCategory(e.target.value)}
                placeholder="Ex : Sacs luxe, Sneakers…"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
              <span className="text-zinc-300 font-medium">
                C&apos;est une republication ?
              </span>
              <Switch checked={shadowIsRepost} onCheckedChange={setShadowIsRepost} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="submit"
                disabled={shadowLoading}
                className="w-full bg-amber-400 text-amber-950 hover:bg-amber-300 font-bold h-11 touch-manipulation"
              >
                {shadowLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <ShieldAlert className="h-4 w-4 mr-1.5" />
                )}
                Titre + description (IA)
              </Button>
              <Button
                type="button"
                disabled={descSafetyLoading}
                onClick={handleDescriptionSafetyAi}
                className="w-full bg-violet-600 text-white hover:bg-violet-500 font-bold h-11 touch-manipulation"
              >
                {descSafetyLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-1.5" />
                )}
                Description anti-ban IA
              </Button>
            </div>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              La photo se traite dans le Studio ; ici l&apos;IA réécrit vraiment le texte
              (même logique cloud que l&apos;analyse empreinte photo).
            </p>
          </form>

          <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-[#0e111a] p-5 space-y-4 text-xs">
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
                      className="rounded-xl border border-white/10 bg-[#07080d] p-3"
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
                {(shadowResult.riskLevel || shadowResult.engine) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {shadowResult.riskLevel && (
                      <Badge
                        className={
                          shadowResult.riskLevel === "high"
                            ? "bg-rose-500/20 text-rose-200 border-rose-500/30"
                            : shadowResult.riskLevel === "low"
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-200 border-amber-500/30"
                        }
                      >
                        Risque annonce : {shadowResult.riskLevel}
                      </Badge>
                    )}
                    {shadowResult.descriptionRisk && (
                      <Badge
                        className={
                          shadowResult.descriptionRisk === "high"
                            ? "bg-rose-500/20 text-rose-200 border-rose-500/30"
                            : shadowResult.descriptionRisk === "low"
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-violet-500/15 text-violet-200 border-violet-500/30"
                        }
                      >
                        Texte : {shadowResult.descriptionRisk}
                        {typeof shadowResult.duplicateScore === "number"
                          ? ` · dup ${shadowResult.duplicateScore}%`
                          : ""}
                      </Badge>
                    )}
                    {shadowResult.engine && (
                      <Badge variant="outline" className="border-white/15 text-zinc-300">
                        {aiEngineBadge(shadowResult.engine)}
                      </Badge>
                    )}
                  </div>
                )}
                {shadowResult.riskReasons && shadowResult.riskReasons.length > 0 && (
                  <ul className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] p-3 space-y-1 text-[11px] text-zinc-300">
                    {shadowResult.riskReasons.map((r) => (
                      <li key={r}>• {r}</li>
                    ))}
                  </ul>
                )}

                {typeof shadowResult.waitMinutesBeforeRepost === "number" && (
                  <p className="text-amber-200 font-semibold">
                    {shadowResult.safeToPostNow
                      ? "Feu vert publication (après photo modifiée)."
                      : `Attendre ${shadowResult.waitMinutesBeforeRepost} minutes avant republication.`}
                  </p>
                )}

                {shadowResult.titleAlternatives &&
                  shadowResult.titleAlternatives.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-bold text-white">Titres alternatifs sûrs</p>
                      {shadowResult.titleAlternatives.map((alt, i) => (
                        <div
                          key={alt}
                          className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#07080d] px-3 py-2"
                        >
                          <span className="text-zinc-200">{alt}</span>
                          <button
                            type="button"
                            onClick={() => copyText(`alt-${i}`, alt)}
                            className="text-zinc-400 hover:text-white"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                {shadowResult.avoidWords && shadowResult.avoidWords.length > 0 && (
                  <p className="text-[10px] text-zinc-500">
                    Mots interdits : {shadowResult.avoidWords.join(", ")}
                  </p>
                )}

                <div className="rounded-xl border border-emerald-500/30 bg-[#07080d] p-3.5 space-y-2">
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

                <div className="rounded-xl border border-white/10 bg-[#07080d] p-3.5 space-y-2">
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

                <Button
                  type="button"
                  onClick={handleApplyShadowToListing}
                  className="w-full h-11 bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Injecter dans l&apos;onglet Annonces
                </Button>

                <div className="space-y-1.5">
                  <p className="font-bold text-amber-300">Checklist anti-shadowban :</p>
                  {shadowResult.checklist.map((tip, i) => (
                    <p key={i} className="text-zinc-400 flex items-start gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      {tip}
                    </p>
                  ))}
                </div>

                {shadowResult.photoFingerprintTips &&
                  shadowResult.photoFingerprintTips.length > 0 && (
                    <div className="rounded-xl border border-white/10 bg-[#07080d] p-3 space-y-1.5">
                      <p className="font-bold text-white">Photos — éviter la duplication</p>
                      {shadowResult.photoFingerprintTips.map((tip) => (
                        <p key={tip} className="text-zinc-400 flex items-start gap-2">
                          <Camera className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          {tip}
                        </p>
                      ))}
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TOOL 4: BUNDLE CALCULATOR & NEGOTIATION SNIPER */}
      {subTab === "negotiation" && (
        <div key="negotiation" className="vf-tab-enter grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-[#0e111a] p-5 space-y-4 text-xs">
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
                  Seuil zéro perte :
                </span>
                <strong className="text-amber-300">
                  {formatEuro(unitLotCost)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-300">Chiffre d&apos;affaire cible (×2,8) :</span>
                <strong className="text-emerald-400">
                  {formatEuro(Math.round(unitLotCost * 2.8))}
                </strong>
              </div>
            </div>

            {/* Vinted Boost ROI Calculator */}
            <div className="rounded-xl border border-white/10 bg-[#07080d] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Simulateur ROI Boost Vinted</span>
                <select
                  value={boostCost}
                  onChange={(e) => setBoostCost(e.target.value)}
                  className="h-7 rounded border border-white/10 bg-[#161b24] px-2 text-[11px] text-white"
                >
                  <option value="1.15">Boost 3j (1,15 €)</option>
                  <option value="1.95">Boost 7j (1,95 €)</option>
                  <option value="6.95">Vitrine 7j (6,95 €)</option>
                </select>
              </div>
              {(() => {
                const sell = Math.max(1, Number(negTarget) || 65);
                const buy = Math.max(0, Number(negBuy) || 18);
                const bCost = Number(boostCost) || 1.95;
                const netWithBoost = sell - buy - bCost;
                const boostSharePct = netWithBoost > 0 ? Math.round((bCost / (netWithBoost + bCost)) * 100) : 100;
                return (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400">
                      Marge commerciale après Boost :{" "}
                      <strong className={netWithBoost > 10 ? "text-emerald-400" : "text-amber-300"}>
                        {formatEuro(netWithBoost)}
                      </strong>
                    </span>
                    <span className={boostSharePct <= 15 ? "text-emerald-400 font-semibold" : "text-amber-300 font-semibold"}>
                      {boostSharePct <= 15 ? "Boost rentable" : "Boost coûteux (" + boostSharePct + "% marge)"}
                    </span>
                  </div>
                );
              })()}
            </div>

            <form
              onSubmit={handleNegotiation}
              className="space-y-3 border-t border-white/10 pt-4"
            >
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Swords className="h-4 w-4 text-rose-400" />
                Sniper Négociation (Offres -40 %)
              </h3>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-zinc-400">Chiffre d&apos;affaire (€)</Label>
                  <Input
                    type="number"
                    value={negTarget}
                    onChange={(e) => setNegTarget(e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-zinc-400">Coût de revient (€)</Label>
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
                className="w-full bg-violet-600 text-white hover:bg-violet-500 font-bold"
              >
                Calculer ma riposte &amp; contre-offre
              </Button>
            </form>
          </div>

          <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-[#0e111a] p-5 space-y-4 text-xs">
            {!negResult ? (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center text-zinc-400">
                <Swords className="h-8 w-8 text-rose-400/70 mb-2" />
                Entre une offre agressive à gauche pour voir ta marge commerciale et copier la meilleure contre-offre en 1 clic.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="rounded-xl border border-white/10 bg-[#07080d] p-3">
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
                  <div className="rounded-xl border border-white/10 bg-[#07080d] p-3">
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
                      className="rounded-xl border border-white/10 bg-[#07080d] p-3.5 space-y-1.5"
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
