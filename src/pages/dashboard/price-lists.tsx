import { useState, useMemo } from "react";
import {
  RefreshCw,
  Percent,
  HelpCircle,
  Search,
  Check,
  X,

  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { nanoid } from "nanoid";
import {
  useAllLabelPrices,
  useUpsertProductPrice,
  useBulkAdjustPricesByLabel,
  PRICE_LABELS,
  useSetDefaultProductPrice, // Add this
  type PriceLabel,
} from "@/hooks/controllers/priceLists";
import { useProducts } from "@/hooks/controllers/products";
import { useRootNodes } from "@/hooks/controllers/nodes";
import type { ProductPrice } from "@/hooks/controllers/priceLists";
import { BsStar } from "react-icons/bs";

/* ─────────────────────────────────────────────────────────────────────────── */
/*  PRIMITIVES                                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */

const toolbarBtnCls =
  "flex items-center gap-2 px-3 py-2 rounded-md text-slate-500 dark:text-slate-400 " +
  "hover:bg-white dark:bg-slate-800 hover:text-slate-900 dark:text-slate-100 active:bg-slate-100 dark:bg-slate-700 transition-colors " +
  "disabled:opacity-40 disabled:cursor-not-allowed text-sm";

function TBtn({
  icon: Icon,
  label,
  onClick,
  disabled,
  spinning,
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  spinning?: boolean;
}) {
  return (
    <button className={toolbarBtnCls} onClick={onClick} disabled={disabled}>
      <Icon className={`w-5 h-5 ${spinning ? "animate-spin" : ""}`} />
      <span>{label}</span>
    </button>
  );
}

function FieldInput({
  label,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-500 dark:text-slate-400">{label}</label>
      <input
        {...props}
        className={`bg-slate-100 dark:bg-slate-700 border text-slate-900 dark:text-slate-100 text-sm rounded px-3 py-1.5 focus:outline-none
          ${error ? "border-red-500 focus:border-red-400" : "border-slate-600 focus:border-sky-500"}
          placeholder:text-slate-500`}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  INLINE EDITABLE CELL                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

function EditableCell({
  value,
  onSave,
  suffix = "",
  className = "",
}: {
  value: number;
  onSave: (v: number) => void;
  suffix?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function startEdit() {
    setDraft(value.toFixed(2));
    setEditing(true);
  }

  function commit() {
    const n = parseFloat(draft);
    if (!isNaN(n) && n >= 0) onSave(n);
    setEditing(false);
  }

  if (!editing) {
    return (
      <span
        onClick={startEdit}
        className={`cursor-pointer tabular-nums hover:text-sky-400 hover:underline decoration-dotted underline-offset-2 transition-colors select-none ${className}`}
        title="Click to edit"
      >
        {value.toFixed(2)}
        {suffix}
      </span>
    );
  }

  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setEditing(false);
      }}
      className="w-24 bg-slate-100 dark:bg-slate-700 border border-sky-500 text-slate-900 dark:text-slate-100 text-xs rounded px-2 py-0.5 text-right focus:outline-none"
    />
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  BULK ADJUST MODAL                                                          */
/* ─────────────────────────────────────────────────────────────────────────── */

function BulkAdjustModal({
  label,
  productCount,
  onSave,
  onClose,
  isSaving,
}: {
  label: PriceLabel;
  productCount: number;
  onSave: (mode: "percent" | "fixed" | "set", delta: number) => void;
  onClose: () => void;
  isSaving: boolean;
}) {
  const [mode, setMode] = useState<"percent" | "fixed" | "set">("percent");
  const [delta, setDelta] = useState("");
  const [error, setError] = useState("");

  const modeLabels = {
    percent: "Adjust by % (e.g. 10 = +10%, -5 = −5%)",
    fixed: "Adjust by fixed amount (e.g. 50 = +₦50)",
    set: "Set all prices to exact value",
  };

  function handleSave() {
    const val = parseFloat(delta);
    if (isNaN(val)) {
      setError("Enter a valid number");
      return;
    }
    onSave(mode, val);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl w-full max-w-sm p-6 shadow-xl">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold">Bulk adjust — {label}</h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Applies to all {productCount} items in the "{label}" price list
        </p>
        <div className="flex flex-col gap-2 mb-4">
          {(["percent", "fixed", "set"] as const).map((m) => (
            <label key={m} className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value={m}
                checked={mode === m}
                onChange={() => setMode(m)}
                className="mt-0.5 accent-sky-500"
              />
              <span className="text-xs text-slate-700 dark:text-slate-300">{modeLabels[m]}</span>
            </label>
          ))}
        </div>
        <FieldInput
          label={
            mode === "percent"
              ? "Percentage"
              : mode === "fixed"
                ? "Amount"
                : "New price"
          }
          value={delta}
          error={error}
          autoFocus
          type="number"
          step="0.01"
          onChange={(e) => {
            setDelta(e.target.value);
            setError("");
          }}
          placeholder={mode === "percent" ? "e.g. 10" : "e.g. 500"}
        />
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs border border-slate-600 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-slate-900 dark:text-white rounded"
          >
            <Percent className="w-3.5 h-3.5" />
            {isSaving ? "Applying…" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  NODE TREE                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */

function NodeTree({
  nodes,
  selectedNodeId,
  onSelect,
}: {
  nodes: any[];
  selectedNodeId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const roots = nodes.filter((n) => !n.parentId);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function NodeRow({ node, depth }: { node: any; depth: number }) {
    const children = nodes.filter((n) => n.parentId === node.id);
    const isOpen = expanded.has(node.id);
    const isSelected = selectedNodeId === node.id;
    return (
      <div>
        <button
          onClick={() => {
            onSelect(isSelected ? null : node.id);
            if (children.length) toggle(node.id);
          }}
          style={{ paddingLeft: `${8 + depth * 12}px` }}
          className={`w-full flex items-center gap-1.5 py-1 pr-2 text-xs rounded transition-colors
            ${isSelected ? "text-sky-400 bg-sky-600/10" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:bg-slate-700/40"}`}
        >
          {children.length > 0 ? (
            isOpen ? (
              <ChevronDown className="w-3 h-3 shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 shrink-0" />
            )
          ) : (
            <span className="w-3 shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {isOpen &&
          children.map((c) => (
            <NodeRow key={c.id} node={c} depth={depth + 1} />
          ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <button
        onClick={() => onSelect(null)}
        className={`text-left px-2 py-1 text-xs rounded transition-colors
          ${selectedNodeId === null ? "text-sky-400 bg-sky-600/10" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:bg-slate-700/40"}`}
      >
        All groups
      </button>
      {roots.map((n) => (
        <NodeRow key={n.id} node={n} depth={0} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  LABEL STYLES                                                               */
/* ─────────────────────────────────────────────────────────────────────────── */

const labelStyle: Record<PriceLabel, string> = {
  Retail: "bg-sky-600/20 text-sky-300 border border-sky-600/30",
  Wholesale: "bg-amber-500/15 text-amber-300 border border-amber-500/25",
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  MAIN VIEW                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */

export function PriceListsView() {
  // ── data ──────────────────────────────────────────────────────────────────
  const {
    data: allLabelPrices = { Retail: [], Wholesale: [] },
    isLoading,
    refetch,
    isFetching,
  } = useAllLabelPrices();
  const { data: allProducts = [] } = useProducts();
  const { data: allNodes = [] } = useRootNodes();

  const upsertPrice = useUpsertProductPrice();
  const bulkAdjust = useBulkAdjustPricesByLabel();

  // ── ui state ──────────────────────────────────────────────────────────────
  const [selectedLabel, setSelectedLabel] = useState<PriceLabel>("Retail");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
const setDefaultPrice = useSetDefaultProductPrice();
  // ── derived ───────────────────────────────────────────────────────────────

  /** productId → price row for the active label */
  const priceMap = useMemo(() => {
    const map: Record<string, ProductPrice> = {};
    for (const row of allLabelPrices[selectedLabel] ?? []) {
      map[row.productId] = row;
    }
    return map;
  }, [allLabelPrices, selectedLabel]);

  const enrichedProducts = useMemo(() => {
    return allProducts
      .filter((p) => {
        if (selectedNodeId && p.nodeId !== selectedNodeId) return false;
        if (
          searchTerm &&
          !p.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !p.code?.toLowerCase().includes(searchTerm.toLowerCase())
        )
          return false;
        return true;
      })
      .map((p) => {
        const pp = priceMap[p.id];
        return {
          ...p,
          cost: pp?.cost ?? 0,
          markup: pp?.markup ?? 0,
          salePrice: pp?.salePrice ?? 0,
          priceAfterTax: pp?.priceAfterTax ?? false,
          priceChangeAllowed: pp?.priceChangeAllowed ?? false,
          isDefault: pp?.isDefault ?? false, // Add this
          hasPriceRow: !!pp,
          priceRowId: pp?.id,
        };
      });
  }, [allProducts, priceMap, selectedNodeId, searchTerm]);

  const pricedCount = enrichedProducts.filter((p) => p.hasPriceRow).length;
function handleSetDefault(productId: string, priceRowId?: string) {
  if (!priceRowId) return;
  setDefaultPrice.mutate({ productId, priceId: priceRowId });
}
  // ── handlers ──────────────────────────────────────────────────────────────

  function handleFieldSave(
    productId: string,
    field: "cost" | "markup" | "salePrice",
    value: number,
  ) {
    const current = priceMap[productId];
    let cost = current?.cost ?? 0;
    let markup = current?.markup ?? 0;
    let salePrice = current?.salePrice ?? 0;

    if (field === "cost") {
      cost = value;
      salePrice = cost > 0 ? cost * (1 + markup / 100) : salePrice;
    } else if (field === "salePrice") {
      salePrice = value;
      markup = cost > 0 ? ((salePrice - cost) / cost) * 100 : 0;
    } else {
      markup = value;
      salePrice = cost > 0 ? cost * (1 + markup / 100) : salePrice;
    }

    upsertPrice.mutate({
      id: current?.id ?? nanoid(),
      productId,
      label: selectedLabel, // hook converts this → wholeSale boolean
      cost: parseFloat(cost.toFixed(4)),
      markup: parseFloat(markup.toFixed(2)),
      salePrice: parseFloat(salePrice.toFixed(4)),
      priceAfterTax: current?.priceAfterTax ?? false,
      priceChangeAllowed: current?.priceChangeAllowed ?? false,
      isDefault: current?.isDefault ?? false,
    });
  }

  function handleToggle(
    productId: string,
    field: "priceAfterTax" | "priceChangeAllowed",
  ) {
    const current = priceMap[productId];
    upsertPrice.mutate({
      id: current?.id ?? nanoid(),
      productId,
      label: selectedLabel,
      cost: current?.cost ?? 0,
      markup: current?.markup ?? 0,
      salePrice: current?.salePrice ?? 0,
      priceAfterTax:
        field === "priceAfterTax"
          ? !(current?.priceAfterTax ?? false)
          : (current?.priceAfterTax ?? false),
      priceChangeAllowed:
        field === "priceChangeAllowed"
          ? !(current?.priceChangeAllowed ?? false)
          : (current?.priceChangeAllowed ?? false),
      isDefault: current?.isDefault ?? false,
    });
  }

  function handleBulkAdjust(mode: "percent" | "fixed" | "set", delta: number) {
    bulkAdjust.mutate(
      { label: selectedLabel, mode, delta },
      { onSuccess: () => setBulkModalOpen(false) },
    );
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {bulkModalOpen && (
        <BulkAdjustModal
          label={selectedLabel}
          productCount={pricedCount}
          onSave={handleBulkAdjust}
          onClose={() => setBulkModalOpen(false)}
          isSaving={bulkAdjust.isPending}
        />
      )}

      {/* Toolbar */}
      <div className="border-b border-slate-300 dark:border-slate-800 px-6 py-4 flex items-center gap-2 bg-slate-50 dark:bg-slate-900 shrink-0">
        <TBtn
          icon={RefreshCw}
          label="Refresh"
          onClick={() => refetch()}
          spinning={isFetching}
        />
        <TBtn
          icon={Percent}
          label="Bulk adjust"
          onClick={() => setBulkModalOpen(true)}
        />
        <div className="flex-1" />
        <TBtn icon={HelpCircle} label="Help" />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 border-r border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col shrink-0 overflow-hidden">
          <div className="p-3 border-b border-slate-300 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Price lists
            </p>
            <div className="space-y-0.5">
              {PRICE_LABELS.map((label) => {
                const count = allLabelPrices[label]?.length ?? 0;
                const isActive = selectedLabel === label;
                return (
                  <button
                    key={label}
                    onClick={() => setSelectedLabel(label)}
                    className={`w-full text-left px-2 py-2 rounded text-xs transition-colors flex items-center justify-between gap-1
                      ${isActive ? labelStyle[label] : "text-slate-500 dark:text-slate-400 hover:bg-white dark:bg-slate-800 hover:text-slate-800 dark:text-slate-200"}`}
                  >
                    <span className="truncate">{label}</span>
                    <span
                      className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full
                      ${isActive ? "bg-white/10" : "bg-white dark:bg-slate-800 text-slate-500"}`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Product groups
            </p>
            <NodeTree
              nodes={allNodes}
              selectedNodeId={selectedNodeId}
              onSelect={setSelectedNodeId}
            />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search bar */}
          <div className="border-b border-slate-300 dark:border-slate-800 px-6 py-3 flex items-center gap-3 bg-slate-50 dark:bg-slate-900 shrink-0">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search product…"
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded pl-8 pr-3 py-1.5 focus:outline-none focus:border-sky-500 placeholder:text-slate-500"
              />
            </div>
            <span className="text-xs text-slate-500">
              {enrichedProducts.length} product
              {enrichedProducts.length !== 1 ? "s" : ""}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${labelStyle[selectedLabel]}`}
            >
              {selectedLabel}
            </span>
            <span className="text-xs text-slate-600 ml-auto">
              Click any price field to edit
            </span>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto px-6 py-4">
            <div className="border border-slate-300 dark:border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                    {[
                      { label: "Code", cls: "w-20 text-left" },
                      { label: "Product", cls: "text-left" },
                      { label: "Cost", cls: "w-28 text-right" },
                      { label: "Markup %", cls: "w-28 text-right" },
                      { label: "Sale price", cls: "w-32 text-right" },
                      { label: "Tax incl.", cls: "w-20 text-center" },
                      { label: "Price editable", cls: "w-28 text-center" },
                      { label: "Default", cls: "w-20 text-center" },
                    ].map(({ label, cls }) => (
                      <th
                        key={label}
                        className={`px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 ${cls}`}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-12 text-center text-slate-600"
                      >
                        Loading…
                      </td>
                    </tr>
                  ) : enrichedProducts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-12 text-center text-slate-600"
                      >
                        No products match the current filter.
                      </td>
                    </tr>
                  ) : (
                    enrichedProducts.map((p, index, arr) => (
                      <tr
                        key={p.id}
                        className={`transition-colors
                          ${p.hasPriceRow ? "hover:bg-sky-900/10" : "hover:bg-white dark:bg-slate-800/40 opacity-70"}
                          ${index === arr.length - 1 ? "" : "border-b border-slate-300 dark:border-slate-800"}`}
                      >
                        <td className="px-4 py-2.5 font-mono text-slate-500">
                          {p.code}
                        </td>
                        <td className="px-4 py-2.5 text-slate-800 dark:text-slate-200">
                          {p.title}
                          {!p.hasPriceRow && (
                            <span className="ml-1.5 text-[10px] text-slate-600 bg-white dark:bg-slate-800 px-1 py-0.5 rounded">
                              no price
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-500 dark:text-slate-400">
                          <EditableCell
                            value={p.cost}
                            onSave={(v) => handleFieldSave(p.id, "cost", v)}
                          />
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-500 dark:text-slate-400">
                          <EditableCell
                            value={p.markup}
                            onSave={(v) => handleFieldSave(p.id, "markup", v)}
                            suffix="%"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-slate-900 dark:text-slate-100">
                          <EditableCell
                            value={p.salePrice}
                            onSave={(v) =>
                              handleFieldSave(p.id, "salePrice", v)
                            }
                            className="text-slate-900 dark:text-slate-100"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            onClick={() => handleToggle(p.id, "priceAfterTax")}
                            title={
                              p.priceAfterTax
                                ? "Tax inclusive — click to toggle"
                                : "Not tax inclusive — click to toggle"
                            }
                            className={`inline-flex items-center justify-center w-6 h-6 rounded transition-colors
                              ${
                                p.priceAfterTax
                                  ? "text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20"
                                  : "text-slate-600 hover:text-slate-500 dark:text-slate-400 hover:bg-white dark:bg-slate-800"
                              }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            onClick={() =>
                              handleToggle(p.id, "priceChangeAllowed")
                            }
                            title={
                              p.priceChangeAllowed
                                ? "Price editable at POS — click to toggle"
                                : "Price locked at POS — click to toggle"
                            }
                            className={`inline-flex items-center justify-center w-6 h-6 rounded transition-colors
                              ${
                                p.priceChangeAllowed
                                  ? "text-sky-400 bg-sky-400/10 hover:bg-sky-400/20"
                                  : "text-slate-600 hover:text-slate-500 dark:text-slate-400 hover:bg-white dark:bg-slate-800"
                              }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </td>

                        {/* Add this <td> after the "priceChangeAllowed" column */}
                        <td className="px-4 py-2.5 text-center">
                          <button
                            disabled={
                              !p.hasPriceRow || setDefaultPrice.isPending
                            }
                            onClick={() => handleSetDefault(p.id, p.priceRowId)}
                            title={
                              p.isDefault
                                ? "This is the default price"
                                : "Set as default price for this product"
                            }
                            className={`inline-flex items-center justify-center w-6 h-6 rounded transition-colors
      ${
        p.isDefault
          ? "text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20"
          : p.hasPriceRow
            ? "text-slate-600 hover:text-yellow-500 hover:bg-white dark:bg-slate-800"
            : "text-slate-800 cursor-not-allowed"
      }`}
                          >
                            <BsStar
                              className={`w-3.5 h-3.5 ${p.isDefault ? "fill-yellow-400" : ""}`}
                            />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between text-xs text-slate-500 shrink-0">
            <span>
              {pricedCount} / {enrichedProducts.length} products priced
            </span>
            <span>
              Avg sale price:{" "}
              {pricedCount > 0
                ? (
                    enrichedProducts
                      .filter((p) => p.hasPriceRow)
                      .reduce((s, p) => s + p.salePrice, 0) / pricedCount
                  ).toFixed(2)
                : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
