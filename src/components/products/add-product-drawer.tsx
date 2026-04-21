"use client";

import * as React from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import ReactSelect from "react-select";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "../ui/drawer";
import { Alert, AlertDescription } from "../ui/alert";
import { Info, Minus, Plus, Trash } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";

import { Tax, useTaxes } from "@/hooks/controllers/taxes";
import { useCustomers } from "@/hooks/controllers/customers";
import { useRootWithoutChildren } from "@/hooks/controllers/nodes";
import { uploadImage } from "@/helpers/image";
import type { UploadedImage } from "@/helpers/image";
import {
  PRICE_LABELS,
  type PriceLabel,

  wholeSaleToLabel,
} from "@/hooks/controllers/priceLists";
import { NewProduct } from "@/db/schema";

/* -------------------------------------------------------------------------- */
/*  TYPES                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * One price entry per label.
 * `label` is kept as a convenience field in the drawer;
 * products.tsx converts it to `wholeSale` boolean via `labelToWholeSale()`
 * before calling `useUpsertProductPrice`.
 */
export interface DrawerPriceEntry {
  label: PriceLabel;
  cost: number;
  markup: number;
  salePrice: number;
  priceAfterTax: boolean;
  priceChangeAllowed: boolean;
  isDefault: boolean;
}

function makeDefaultPrices(): DrawerPriceEntry[] {
  return PRICE_LABELS.map((label, i) => ({
    label,
    cost: 0,
    markup: 0,
    salePrice: 0,
    priceAfterTax: false,
    priceChangeAllowed: false,
    isDefault: i === 0, // Retail is default
  }));
}

/* -------------------------------------------------------------------------- */
/*  PROPS                                                                      */
/* -------------------------------------------------------------------------- */

interface AddProductDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  initialData?: Partial<any>;
  onSave: (
    data: NewProduct,
    groupId: string | null,
    supplier: string | null,
    comments: { id: string; text: string }[],
    selectedTaxes: {
      id: string;
      fixed: boolean;
      name: string;
      code: string;
      rate: number;
      enabled: boolean;
      createdAt: Date;
      updatedAt: Date | null;
    }[],
    barcodes: { id: string; text: string }[],
    prices: DrawerPriceEntry[],
  ) => void;
}

const TABS = [
  "Details",
  "Price & tax",
  "Stock control",
  "Comments",
  "Image & color",
];

/* -------------------------------------------------------------------------- */
/*  PRICING SUB-COMPONENT                                                      */
/* -------------------------------------------------------------------------- */

const labelStyle: Record<PriceLabel, { tab: string; badge: string }> = {
  Retail: {
    tab: "border-sky-500 text-sky-300",
    badge: "bg-sky-600/20 text-sky-300 border border-sky-600/30",
  },
  Wholesale: {
    tab: "border-amber-400 text-amber-300",
    badge: "bg-amber-500/10 text-amber-300 border border-amber-400/30",
  },
};

function PricingSection({
  prices,
  onChange,
}: {
  prices: DrawerPriceEntry[];
  onChange: (updated: DrawerPriceEntry[]) => void;
}) {
  const [activeLabel, setActiveLabel] = React.useState<PriceLabel>("Retail");
  const entry = prices.find((p) => p.label === activeLabel)!;

  function update(patch: Partial<DrawerPriceEntry>) {
    onChange(
      prices.map((p) => (p.label === activeLabel ? { ...p, ...patch } : p)),
    );
  }

  function handleCostChange(val: number) {
    const salePrice =
      val > 0 ? val * (1 + entry.markup / 100) : entry.salePrice;
    update({ cost: val, salePrice: parseFloat(salePrice.toFixed(4)) });
  }

  function handleMarkupChange(val: number) {
    const salePrice =
      entry.cost > 0 ? entry.cost * (1 + val / 100) : entry.salePrice;
    update({ markup: val, salePrice: parseFloat(salePrice.toFixed(4)) });
  }

  function handleSalePriceChange(val: number) {
    const markup = entry.cost > 0 ? ((val - entry.cost) / entry.cost) * 100 : 0;
    update({ salePrice: val, markup: parseFloat(markup.toFixed(2)) });
  }

  function handleSetDefault(label: PriceLabel) {
    onChange(prices.map((p) => ({ ...p, isDefault: p.label === label })));
  }

  return (
    <div className="space-y-4">
      {/* Label tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {PRICE_LABELS.map((label) => {
          const isActive = activeLabel === label;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setActiveLabel(label)}
              className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-px
                ${
                  isActive
                    ? labelStyle[label].tab
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-300"
                }`}
            >
              {label}
              {prices.find((p) => p.label === label)?.isDefault && (
                <span className="ml-1.5 text-amber-400 text-xs">★</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active label info bar */}
      <div
        className={`flex items-center justify-between px-3 py-1.5 rounded text-xs ${labelStyle[activeLabel].badge}`}
      >
        <span className="font-medium">{activeLabel} price</span>
        {entry.isDefault ? (
          <span className="text-amber-400">★ Default</span>
        ) : (
          <button
            type="button"
            onClick={() => handleSetDefault(activeLabel)}
            className="text-slate-500 dark:text-slate-400 hover:text-amber-300 transition-colors"
          >
            Set as default
          </button>
        )}
      </div>

      {/* Cost */}
      <div style={{ marginBottom: "1rem" }}>
        <label className="text-sm text-slate-500 dark:text-slate-400">Cost</label>
        <div className="mt-1">
          <Input
            className="w-34 h-8"
            type="number"
            min={0}
            step="0.01"
            value={entry.cost || ""}
            onChange={(e) => handleCostChange(Number(e.target.value))}
          />
        </div>
      </div>

      {/* Markup */}
      <div style={{ marginBottom: "1rem" }}>
        <label className="text-sm text-slate-500 dark:text-slate-400">Markup</label>
        <div className="mt-1 flex items-center gap-2">
          <Input
            className="w-34 h-8"
            type="number"
            min={0}
            step="0.01"
            value={entry.markup || ""}
            onChange={(e) => handleMarkupChange(Number(e.target.value))}
          />
          <span className="text-sm text-slate-500 dark:text-slate-400">%</span>
        </div>
      </div>

      {/* Sale price */}
      <div style={{ marginBottom: "1rem" }}>
        <label className="text-sm text-slate-500 dark:text-slate-400">Sale price</label>
        <div className="mt-1">
          <Input
            className="w-34 h-8"
            type="number"
            min={0}
            step="0.01"
            value={entry.salePrice || ""}
            onChange={(e) => handleSalePriceChange(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={entry.priceAfterTax}
          onCheckedChange={(v) => update({ priceAfterTax: v })}
        />
        <span className="text-sm text-slate-700 dark:text-slate-300">Price includes tax</span>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <Switch
          checked={entry.priceChangeAllowed}
          onCheckedChange={(v) => update({ priceChangeAllowed: v })}
        />
        <span className="text-sm text-slate-700 dark:text-slate-300">
          Price change allowed at POS
        </span>
      </div>

      {/* Summary cards */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {PRICE_LABELS.map((label) => {
          const p = prices.find((x) => x.label === label)!;
          return (
            <div
              key={label}
              className={`px-3 py-2 rounded text-xs ${labelStyle[label].badge}`}
            >
              <div className="font-medium mb-0.5">{label}</div>
              <div className="text-slate-500 dark:text-slate-400">
                Cost:{" "}
                <span className="text-slate-800 dark:text-slate-200">{p.cost.toFixed(2)}</span>
                {" · "}
                Sale:{" "}
                <span className="text-slate-900 dark:text-slate-100 font-semibold">
                  {p.salePrice.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  MAIN DRAWER                                                                */
/* -------------------------------------------------------------------------- */

const AddProductDrawer = ({
  open,
  onOpenChange,
  onSave,
  nodeId,
  initialData,
}: AddProductDrawerProps) => {
  const [activeTab, setActiveTab] = React.useState("Details");
  const { data = [] } = useRootWithoutChildren();

  // ── form fields ────────────────────────────────────────────────────────────
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [barcode, setBarcode] = React.useState("");
  const [unit, setUnit] = React.useState("");
  const [groupId, setGroupId] = React.useState<string | null>("root");
  const [active, setActive] = React.useState(false);
  const [defaultQuantity, setDefaultQuantity] = React.useState(false);
  const [service, setService] = React.useState(false);
  const [ageRestriction, setAgeRestriction] = React.useState<
    number | undefined
  >();
  const [description, setDescription] = React.useState("");
  const [supplier, setSupplier] = React.useState<string | null>(null);
  const [reorderPoint, setReorderPoint] = React.useState<number | undefined>();
  const [preferredQuantity, setPreferredQuantity] = React.useState<
    number | undefined
  >();
  const [lowStockWarning, setLowStockWarning] = React.useState(false);
  const [lowStockQuantity, setLowStockQuantity] = React.useState<
    number | undefined
  >();
  const [barcodes, setBarcodes] = React.useState<
    { id: string; text: string }[]
  >([]);
  const [comments, setComments] = React.useState<
    { id: string; text: string }[]
  >([]);
  const [color, setColor] = React.useState<string | null>(null);
  const [image, setImage] = React.useState<UploadedImage | null>(null);

  // ── prices ─────────────────────────────────────────────────────────────────
  const [prices, setPrices] =
    React.useState<DrawerPriceEntry[]>(makeDefaultPrices);

  // ── taxes ──────────────────────────────────────────────────────────────────
  const [isAddingTax, setIsAddingTax] = React.useState(false);
  const { data: taxes = [] } = useTaxes();
  const [selectedTaxes, setSelectedTaxes] = React.useState<Tax[]>([]);
  const [selectedTaxId, setSelectedTaxId] = React.useState<string | null>(null);
  const { data: users = [] } = useCustomers();

  const taxOptions = taxes.map((tax) => ({
    value: tax.id,
    label: `${tax.name} (${tax.rate}%)`,
    tax,
  }));

  // ── save ───────────────────────────────────────────────────────────────────
  const handleSave = () => {
    const defaultEntry = prices.find((p) => p.isDefault) ?? prices[0];
    onSave(
      {
        title: name,
        id: crypto.randomUUID(),
        code,
        unit,
        active,
        defaultQuantity,
        service,
        ageRestriction,
        description,
        // Mirror default price onto the product row for quick display
        // @ts-ignore
        cost: defaultEntry?.cost,
        markup: defaultEntry?.markup,
        salePrice: defaultEntry?.salePrice,
        priceChangeAllowed: defaultEntry?.priceChangeAllowed ?? false,
        reorderPoint,
        preferredQuantity,
        lowStockWarning,
        color,
        nodeId,
        lowStockWarningQuantity: lowStockWarning ? (lowStockQuantity ?? 1) : 0,
        priceAfterTax: defaultEntry?.priceAfterTax ?? false,
        image: image?.path,
      },
      groupId,
      supplier,
      comments,
      selectedTaxes,
      barcodes,
      prices, // ← products.tsx maps each entry.label → wholeSale boolean
    );
    onOpenChange(false);
  };

  // ── tax helpers ────────────────────────────────────────────────────────────
  const removeTax = (id: string) =>
    setSelectedTaxes((prev) => prev.filter((t) => t.id !== id));

  const addTax = () => {
    if (!selectedTaxId) return;
    const tax = taxes.find((t) => t.id === selectedTaxId);
    if (!tax) return;
    setSelectedTaxes((prev) => [...prev, { ...tax }]);
    setSelectedTaxId(null);
    setIsAddingTax(false);
  };

  // ── barcode helpers ────────────────────────────────────────────────────────
  const handleAddBarcode = () => {
    const trimmed = barcode.trim();
    if (!trimmed || barcodes.some((b) => b.text === trimmed)) return;
    setBarcodes((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text: trimmed },
    ]);
    setBarcode("");
  };

  const handleGenerateBarcode = () => {
    const generated = Math.floor(Math.random() * 1e12)
      .toString()
      .padStart(12, "0");
    if (barcodes.some((b) => b.text === generated)) return;
    setBarcodes((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text: generated },
    ]);
  };

  const handleRemoveBarcode = (code: string) =>
    setBarcodes((prev) => prev.filter((b) => b.text !== code));

  // ── populate / reset on open ───────────────────────────────────────────────
  React.useEffect(() => {
    if (!open) return;

    if (initialData) {
      setName(initialData.title ?? "");
      setCode(initialData.code ?? "");
      setUnit(initialData.unit ?? "");
      setGroupId(initialData.nodeId ?? "root");
      setActive(initialData.active ?? false);
      setDefaultQuantity(initialData.defaultQuantity ?? false);
      setService(initialData.service ?? false);
      setAgeRestriction(initialData.ageRestriction as number);
      setDescription((initialData.description as string) ?? "");
      setSupplier(initialData.supplier?.id ?? null);
      setReorderPoint(initialData.reorderPoint as number);
      setPreferredQuantity(initialData.preferredQuantity as number);
      setLowStockWarning(initialData.lowStockWarning ?? false);
      setLowStockQuantity(initialData.lowStockWarningQuantity as number);
      setColor(initialData.color ?? null);

      setBarcodes(
        (initialData.barcodes ?? []).map((b: any) => ({
          id: b.id,
          text: b.value,
        })),
      );
      setComments(
        (initialData.comments ?? []).map((c: any) => ({
          id: c.id,
          text: c.content,
        })),
      );
      setImage(
        initialData.image
          ? {
              path: initialData.image,
              base64: "",
              previewUrl: initialData.image,
              name: "existing-image",
            }
          : null,
      );
      setSelectedTaxes(
        (initialData.taxes ?? []).map((t: any) => t.tax).filter(Boolean),
      );
      setSelectedTaxId(null);

      // Restore per-label prices from productPrices relation
      // DB rows use wholeSale boolean — convert back to PriceLabel for the drawer
      const restored: DrawerPriceEntry[] = makeDefaultPrices();
      for (const pp of initialData.productPrices ?? []) {
        const label = wholeSaleToLabel(pp.wholeSale);
        const idx = restored.findIndex((e) => e.label === label);
        if (idx !== -1) {
          restored[idx] = {
            label,
            cost: pp.cost ?? 0,
            markup: pp.markup ?? 0,
            salePrice: pp.salePrice ?? 0,
            priceAfterTax: pp.priceAfterTax ?? false,
            priceChangeAllowed: pp.priceChangeAllowed ?? false,
            isDefault: pp.isDefault ?? false,
          };
        }
      }
      // Guarantee exactly one default
      if (!restored.some((p) => p.isDefault)) restored[0].isDefault = true;
      setPrices(restored);
    } else {
      // Reset for new product
      setName("");
      setCode("");
      setBarcode("");
      setUnit("");
      setGroupId("root");
      setActive(false);
      setDefaultQuantity(false);
      setService(false);
      setAgeRestriction(undefined);
      setDescription("");
      setSupplier(null);
      setReorderPoint(undefined);
      setPreferredQuantity(undefined);
      setLowStockWarning(false);
      setLowStockQuantity(undefined);
      setBarcodes([]);
      setComments([]);
      setColor(null);
      setImage(null);
      setSelectedTaxes([]);
      setSelectedTaxId(null);
      setIsAddingTax(false);
      setPrices(makeDefaultPrices());
    }
  }, [open, initialData]);

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full data-[vaul-drawer-direction=right]:sm:max-w-2xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-l border-slate-200 dark:border-slate-700">
        <DrawerHeader className="flex flex-row items-center justify-between border-b border-slate-200 dark:border-slate-700">
          <DrawerTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {initialData ? "Edit product" : "New product"}
          </DrawerTitle>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            →
          </Button>
        </DrawerHeader>

        {/* Tabs */}
        <div className="flex gap-2 px-6 border-b border-slate-200 dark:border-slate-700">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-px
                ${
                  activeTab === tab
                    ? "border-sky-400 text-slate-900 dark:text-slate-100"
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <ScrollArea className="flex-1 overflow-y-auto px-6 py-6 space-y-5 text-sm">
          {/* ── Details ── */}
          {activeTab === "Details" && (
            <>
              <Field label="Name">
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Code" className="w-40">
                <Input value={code} onChange={(e) => setCode(e.target.value)} />
              </Field>
              <Field label="Barcode">
                <div className="flex gap-2">
                  <Input
                    value={barcode}
                    placeholder="Enter barcode"
                    onChange={(e) => setBarcode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddBarcode();
                    }}
                  />
                  <button
                    type="button"
                    className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 text-xs mt-1"
                    onClick={handleGenerateBarcode}
                  >
                    Generate
                  </button>
                  <button
                    type="button"
                    className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 text-xs mt-1"
                    onClick={handleAddBarcode}
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {barcodes.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded text-sm"
                    >
                      <span>{b.text}</span>
                      <button
                        type="button"
                        className="text-red-400 hover:text-red-600 text-xs"
                        onClick={() => handleRemoveBarcode(b.text)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </Field>
              <Field label="Unit of measurement">
                <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
              </Field>
              <Field label="Group">
                <Select onValueChange={setGroupId} value={groupId as string}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    {data.map((g) => (
                      <SelectItem
                        key={g.id}
                        value={g.id}
                        className="focus:bg-slate-100 dark:bg-slate-700"
                      >
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="flex flex-col gap-3 text-sm text-slate-700 dark:text-slate-300">
                <Toggle
                  label="Active"
                  defaultChecked={active}
                  onChange={setActive}
                />
                <Toggle
                  label="Default quantity"
                  defaultChecked={defaultQuantity}
                  onChange={setDefaultQuantity}
                />
                <Toggle
                  label="Service (not using stock)"
                  onChange={setService}
                />
              </div>
              <Field label="Age restriction" className="w-48">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={ageRestriction ?? ""}
                    onChange={(e) => setAgeRestriction(Number(e.target.value))}
                  />
                  <span className="text-sm text-slate-500 dark:text-slate-400">year(s)</span>
                </div>
              </Field>
              <Field label="Description">
                <Textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>
            </>
          )}

          {/* ── Price & Tax ── */}
          {activeTab === "Price & tax" && (
            <div className="space-y-4">
              {/* Taxes */}
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Taxes</p>
                {selectedTaxes.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {selectedTaxes.map((tax) => (
                      <div
                        key={tax.id}
                        className="flex items-center justify-between bg-white dark:bg-slate-800 px-3 py-2 rounded"
                      >
                        <span className="text-sm">
                          {tax.name} ({tax.rate}%)
                        </span>
                        <button
                          onClick={() => removeTax(tax.id)}
                          className="text-slate-500 dark:text-slate-400 hover:text-red-400"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {!isAddingTax ? (
                  <Button
                    variant="ghost"
                    disabled={taxOptions.length < 1}
                    onClick={() => setIsAddingTax(true)}
                    className="flex items-center gap-2 text-sm bg-sky-500"
                  >
                    <Plus size={16} /> Add tax
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <ReactSelect
                      options={taxOptions}
                      value={
                        taxOptions.find((o) => o.value === selectedTaxId) ??
                        null
                      }
                      onChange={(opt) => setSelectedTaxId(opt?.value ?? null)}
                      className="flex-1"
                      styles={{
                        control: (base) => ({
                          ...base,
                          backgroundColor: "#1e293b",
                          borderColor: "#334155",
                          color: "white",
                        }),
                        menu: (base) => ({
                          ...base,
                          backgroundColor: "#1e293b",
                        }),
                        option: (base) => ({
                          ...base,
                          backgroundColor: "transparent",
                        }),
                        input: (base) => ({ ...base, color: "white" }),
                        singleValue: (base) => ({ ...base, color: "white" }),
                      }}
                    />
                    <button
                      onClick={addTax}
                      disabled={!selectedTaxId}
                      className="p-2 bg-slate-100 dark:bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-50"
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingTax(false);
                        setSelectedTaxId(null);
                      }}
                      className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"
                    >
                      <Minus size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Per-label prices */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Prices per list</p>
                <PricingSection prices={prices} onChange={setPrices} />
              </div>
            </div>
          )}

          {/* ── Stock control ── */}
          {activeTab === "Stock control" && (
            <div className="text-sm text-slate-500 dark:text-slate-400 space-y-3">
              <Alert className="flex items-center gap-3 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-none">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-sky-500/20 text-sky-400">
                  <Info className="h-4 w-4" />
                </div>
                <AlertDescription className="text-sm text-sky-300 flex items-center">
                  Set low stock quantity rules that can be used as a stock
                  reorder point
                </AlertDescription>
              </Alert>
              <Field label="Supplier">
                <Select onValueChange={setSupplier}>
                  <SelectTrigger className="w-lg">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent
                    data-side="bottom"
                    className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 top-10"
                    position="item-aligned"
                  >
                    {users.map((sup) => (
                      <SelectItem
                        key={sup.id}
                        value={sup.id}
                        className="focus:bg-slate-100 dark:bg-slate-700"
                      >
                        {sup.name}
                      </SelectItem>
                    ))}
                    {users.length < 1 && (
                      <SelectItem value="(none)" className="focus:bg-slate-100 dark:bg-slate-700">
                        (none)
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Reorder point">
                <Input
                  className="w-34 h-8"
                  type="number"
                  min={0}
                  value={reorderPoint ?? ""}
                  onChange={(e) => setReorderPoint(Number(e.target.value))}
                />
              </Field>
              <Field label="Preferred quantity">
                <Input
                  className="w-34 h-8"
                  type="number"
                  min={0}
                  value={preferredQuantity ?? ""}
                  onChange={(e) => setPreferredQuantity(Number(e.target.value))}
                />
              </Field>
              <Field label="">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={lowStockWarning}
                    onCheckedChange={setLowStockWarning}
                  />
                  Low stock warning
                </div>
              </Field>
              <Field label="Low stock warning quantity">
                <Input
                  className="w-34 h-8"
                  type="number"
                  min={0}
                  value={lowStockQuantity ?? ""}
                  onChange={(e) => setLowStockQuantity(Number(e.target.value))}
                  disabled={!lowStockWarning}
                />
              </Field>
              <Button variant="link">Reset to default</Button>
            </div>
          )}

          {/* ── Comments ── */}
          {activeTab === "Comments" && (
            <div className="text-sm text-slate-500 dark:text-slate-400 space-y-3">
              <Alert className="flex items-center gap-3 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-none">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-sky-500/20 text-sky-400">
                  <Info className="h-4 w-4" />
                </div>
                <AlertDescription className="text-sm text-sky-300 flex items-center">
                  Comments will be printed on kitchen tickets
                </AlertDescription>
              </Alert>
              <div className="flex items-center gap-x-3">
                <Input
                  placeholder="Enter comment"
                  onChange={(e) =>
                    setComments((prev) => [
                      ...prev,
                      { text: e.target.value, id: crypto.randomUUID() },
                    ])
                  }
                />
                <Button variant="ghost" size="sm">
                  <Plus /> Add
                </Button>
                <Button variant="ghost" size="sm">
                  <Trash /> Delete
                </Button>
              </div>
              <ScrollArea className="border min-h-[20dvh]" />
            </div>
          )}

          {/* ── Image & Color ── */}
          {activeTab === "Image & color" && (
            <div className="text-sm text-slate-500 dark:text-slate-400 space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-slate-500 dark:text-slate-400">Colors</label>
                <Select onValueChange={setColor}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select color" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800">
                    {[
                      "transparent",
                      "slate",
                      "red",
                      "green",
                      "blue",
                      "yellow",
                      "indigo",
                      "purple",
                      "pink",
                    ].map((c) => (
                      <SelectItem key={c} value={c}>
                        <div
                          className={`w-4 h-4 rounded-sm ${c === "transparent" ? "border border-slate-400 bg-transparent" : `bg-${c}-500`}`}
                        />
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm text-slate-500 dark:text-slate-400">Image</label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="bg-transparent text-slate-900 dark:text-white"
                    onClick={async () => {
                      const r = await uploadImage();
                      if (r) setImage(r);
                    }}
                  >
                    Browse
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={!image}
                    onClick={() => setImage(null)}
                  >
                    Clear
                  </Button>
                </div>
                {image && (
                  <div className="flex items-center gap-3 mt-2">
                    <img
                      src={image.previewUrl}
                      alt="Preview"
                      className="w-16 h-16 object-cover rounded border border-slate-200 dark:border-slate-700"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {image.name}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </ScrollArea>

        <DrawerFooter className="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const Field = ({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={className} style={{ marginBottom: "1rem" }}>
    <label className="text-sm text-slate-500 dark:text-slate-400">{label}</label>
    <div className="mt-1">{children}</div>
  </div>
);

const Toggle = ({
  label,
  defaultChecked,
  onChange,
}: {
  label: string;
  defaultChecked?: boolean;
  onChange?: (val: boolean) => void;
}) => (
  <div className="flex items-center gap-2">
    <Switch
      defaultChecked={defaultChecked}
      onCheckedChange={(v) => onChange?.(v)}
    />
    <span>{label}</span>
  </div>
);

export default AddProductDrawer;
