"use client";

import { useState } from "react";
import { Loader2, Sparkles, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { computeNetMargin, formatEuro, generateListingCopy } from "@/lib/format";

interface NewListingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  urssafRate: number;
  accounts: Array<{ platform: string; handle: string }>;
  onCreated: () => void;
}

export function NewListingDialog({
  open,
  onOpenChange,
  urssafRate,
  accounts,
  onCreated,
}: NewListingDialogProps) {
  const vintedAccounts = accounts.filter((a) => a.platform === "vinted");
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("Vestes & Manteaux");
  const [size, setSize] = useState("M");
  const [condition, setCondition] = useState("Très bon état");
  const [location, setLocation] = useState("Rack A1");
  const [sku, setSku] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("15");
  const [extraCosts, setExtraCosts] = useState("0");
  const [listingPrice, setListingPrice] = useState("49");
  const [vintedAccount, setVintedAccount] = useState(
    vintedAccounts[0]?.handle ?? "@charles_resell",
  );
  const [crosslistLbc, setCrosslistLbc] = useState(true);
  const [crosslistTiktok, setCrosslistTiktok] = useState(false);
  const [descVinted, setDescVinted] = useState("");
  const [descLbc, setDescLbc] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewMargin = computeNetMargin({
    grossAmount: Number(listingPrice) || 0,
    purchaseCost: (Number(purchasePrice) || 0) + (Number(extraCosts) || 0),
    platformFees: 0,
    boostCost: 0,
    shippingCost: 0,
    urssafRate,
  });

  function handleGenerateCopy() {
    if (!title.trim()) return;
    const copy = generateListingCopy({
      title,
      brand,
      category,
      size,
      condition,
      listingPrice: Number(listingPrice) || 25,
    });
    setDescVinted(copy.vinted);
    setDescLbc(copy.leboncoin);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sku,
          title,
          brand,
          category,
          size,
          condition,
          location,
          purchase_price: Number(purchasePrice) || 0,
          extra_costs: Number(extraCosts) || 0,
          listing_price: Number(listingPrice) || 25,
          vinted_account: vintedAccount,
          crosslist_lbc: crosslistLbc,
          crosslist_tiktok: crosslistTiktok,
          description_vinted: descVinted || undefined,
          description_lbc: descLbc || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de l'ajout");
        setSaving(false);
        return;
      }
      setTitle("");
      setBrand("");
      setSku("");
      setDescVinted("");
      setDescLbc("");
      setSaving(false);
      onOpenChange(false);
      onCreated();
    } catch {
      setError("Erreur réseau");
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-slate-200 text-slate-900 sm:max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900">
            Ajouter un article au Stock &amp; Dressing
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Renseigne ton article, génère les fiches Vinted + Leboncoin et vérifie
            ta marge nette après URSSAF.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs text-slate-700">Titre de l&apos;article</Label>
              <Input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Veste Nike Vintage Windbreaker Noir"
                className="bg-white border-slate-200 text-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700">Marque</Label>
              <Input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Ex: Nike, Carhartt, Ralph Lauren..."
                className="bg-white border-slate-200 text-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700">Catégorie</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-white border-slate-200 text-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700">Taille</Label>
              <Input
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="bg-white border-slate-200 text-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700">État</Label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900"
              >
                <option value="Neuf avec étiquette">Neuf avec étiquette</option>
                <option value="Neuf sans étiquette">Neuf sans étiquette</option>
                <option value="Très bon état">Très bon état</option>
                <option value="Bon état">Bon état</option>
                <option value="Satisfaisant">Satisfaisant</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700">SKU (auto si vide)</Label>
              <Input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Ex: SKU-NKE-104"
                className="bg-white border-slate-200 text-slate-900 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700">Emplacement stock</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Rack A1, Bac B3"
                className="bg-white border-slate-200 text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-600">Prix achat (€)</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="bg-white border-slate-200 text-slate-900"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-600">Frais annexes (€)</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={extraCosts}
                onChange={(e) => setExtraCosts(e.target.value)}
                className="bg-white border-slate-200 text-slate-900"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-teal-700 font-semibold">
                Prix de vente (€)
              </Label>
              <Input
                type="number"
                step="1"
                min="1"
                value={listingPrice}
                onChange={(e) => setListingPrice(e.target.value)}
                className="bg-white border-teal-500 text-slate-900 font-bold"
              />
            </div>
            <div className="col-span-3 flex flex-wrap items-center justify-between text-xs border-t border-slate-200 pt-2.5">
              <span className="text-slate-600">
                URSSAF ({urssafRate}%) :{" "}
                <strong className="text-slate-900">
                  {formatEuro(previewMargin.urssafAmount)}
                </strong>
              </span>
              <span className="text-slate-700">
                Marge nette estimée :{" "}
                <strong
                  className={
                    previewMargin.netMargin >= 0
                      ? "text-teal-700"
                      : "text-red-600"
                  }
                >
                  {formatEuro(previewMargin.netMargin)}
                </strong>
              </span>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-900">
                Diffusion &amp; Fiches préremplies
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleGenerateCopy}
                className="border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Optimiser textes Vinted &amp; Leboncoin
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-600">Compte Vinted</Label>
                <select
                  value={vintedAccount}
                  onChange={(e) => setVintedAccount(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-900"
                >
                  {(vintedAccounts.length > 0
                    ? vintedAccounts
                    : [{ handle: "@charles_resell" }]
                  ).map((acc) => (
                    <option key={acc.handle} value={acc.handle}>
                      {acc.handle}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-4 pb-1 text-xs text-slate-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={crosslistLbc}
                    onChange={(e) => setCrosslistLbc(e.target.checked)}
                    className="accent-teal-600"
                  />
                  Crosslister Leboncoin
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={crosslistTiktok}
                    onChange={(e) => setCrosslistTiktok(e.target.checked)}
                    className="accent-teal-600"
                  />
                  TikTok Shop
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-600">
                  Description Vinted (auto si vide)
                </Label>
                <Textarea
                  rows={3}
                  value={descVinted}
                  onChange={(e) => setDescVinted(e.target.value)}
                  placeholder="Texte optimisé Vinted avec hashtags..."
                  className="bg-white border-slate-200 text-xs text-slate-900"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-600">
                  Description Leboncoin (auto si vide)
                </Label>
                <Textarea
                  rows={3}
                  value={descLbc}
                  onChange={(e) => setDescLbc(e.target.value)}
                  placeholder="Texte détaillé Leboncoin..."
                  className="bg-white border-slate-200 text-xs text-slate-900"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-slate-600"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-teal-600 text-white hover:bg-teal-700 font-semibold"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Plus className="h-4 w-4 mr-1.5" />
              )}
              Ajouter &amp; Publier
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
