"use client";

import { useMemo, useEffect, useRef, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store";
import {
  setItems as setReduxItems,
  setSelectedItemId as setSelectedItemIdAction,
  setCartDiscount as setCartDiscountAction,
  setSelectedCustomer as setSelectedCustomerAction,
  setDineIn as setDineInAction,
  setOrderNote as setOrderNoteAction,
  setDrawerOpen as setDrawerOpenAction,
  setModal as setModalAction,
  setShowCashDrawer as setShowCashDrawerAction,
  setShowSaveToast as setShowSaveToastAction,
  setWarning as setWarningAction,
  setCalcProduct as setCalcProductAction,
  setCalcInitialQty as setCalcInitialQtyAction,
  setContinuePaymentDoc as setContinuePaymentDocAction,
  clearCart as clearCartAction,
  setPaidInput as setPaidInputAction,
  setShowTaxManagement as setShowTaxManagementAction,
  setShowDiscountManagement as setShowDiscountManagementAction,
  setShowCustomerManagement as setShowCustomerManagementAction,
  setSelectedPaymentType as setSelectedPaymentTypeAction,
  setSelectedTax as setSelectedTaxAction,
  setAppliedDiscount as setAppliedDiscountAction,
  setTaxSearchTerm as setTaxSearchTermAction,
  setSelectedTaxId as setSelectedTaxIdAction,
  setDiscountType as setDiscountTypeAction,
  setDiscountInput as setDiscountInputAction,
  setSelectedPreset as setSelectedPresetAction,
  setCustomerSearchTerm as setCustomerSearchTermAction,
  setSelectedCustomerId as setSelectedCustomerIdAction,
  setShowAddCustomerForm as setShowAddCustomerFormAction,
  setNewCustomerData as setNewCustomerDataAction,
  setRefundReceipt as setRefundReceiptAction,
  setRefundPaymentType as setRefundPaymentTypeAction,
  setRefundError as setRefundErrorAction,
  setCalcDisplay as setCalcDisplayAction,
  setCalcExpr,
  setCalcHasResult,
  setDiscountModalTab,
  setDiscountModalValue,
  setCustomerModalSearch,
} from "../store/posSlice";
import {
  X,
  Search,
  Plus,
  Percent,
  MessageSquare,
  Save,
  RefreshCw,
  Lock,
  Trash2,
  Hash,
  Accessibility,
  User,
  UserCheck,
  Check,
  CreditCard,
  Banknote,
  AlertTriangle,
  Menu,
  Unlock,
  Users,
  Receipt,
  ChevronDown,
  Printer,
  Mail,
  FileText,
  Coins,
  ArrowRightLeft,
  LayoutGrid,
  Pencil,
  ArrowRight,
  ArrowLeft,
  Layers,
} from "lucide-react";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { BsThreeDots } from "react-icons/bs";
import { TbBasketPlus } from "react-icons/tb";
import { ImDrawer } from "react-icons/im";
import Select, { components as selectComponents } from "react-select";
import { Group, Panel, Separator } from "react-resizable-panels";
import { SidebarDrawer } from "@/components/sidebar-drawer";
import { ResponsiveIcon } from "@/components/responsive-icon";
import { useAuth } from "@/providers/auth-provider";
import { useCustomers } from "@/hooks/controllers/customers";
import { useCompanies } from "@/hooks/controllers/company";
import { useUsers } from "@/hooks/controllers/users";
import { usePaymentTypes } from "@/hooks/controllers/paymentTypes";
import {
  useCreateDocument,
  useUpdateDocument,
  useDocuments,
} from "@/hooks/controllers/documents";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { openPath } from "@tauri-apps/plugin-opener";
import { useNavigate } from "react-router";
import {
  getProductPrices,
  useAllPrices,
  useUpsertProductPrice,
} from "@/hooks/controllers/priceLists";
import {
  useUpdateStockEntry,
  useStockLevels,
  useAddStockLog,
} from "@/hooks/controllers/stocks";
import { toast } from "react-toastify";
import React from "react";
import { useTaxes } from "@/hooks/controllers/taxes";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CartItem {
  id: string;
  title: string;
  cost: number; // current sale price
  unit: string;
  qty: number;
  discount: number;
  taxRate: number;
  priceLabel: "Retail" | "Wholesale";
  availablePrices: { label: "Retail" | "Wholesale"; price: number }[];
  isLocked?: boolean;
}

type ModalKind =
  | "none"
  | "price"
  | "qty"
  | "discount"
  | "customer"
  | "payment"
  | "refund"
  | "transfer"
  | "void"
  | "comment"
  | "cashDrawer";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genDocNumber() {
  return `POS-${Date.now().toString().slice(-8)}`;
}

function itemTotal(item: CartItem) {
  const base = item.qty * item.cost;
  return base * (1 - item.discount / 100);
}

function itemTax(item: CartItem) {
  return itemTotal(item) * (item.taxRate / 100);
}

function formatPrice(n: number) {
  return n.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── Shared backdrop ──────────────────────────────────────────────────────────

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      {children}
    </div>
  );
}

// ─── Product search menu ──────────────────────────────────────────────────────

const MENU_CHUNK = 40;

/**
 * react-select renders every filtered option at once, which stalls the UI on
 * catalogues with thousands of products (an empty search matches all of them).
 * This renders the first `MENU_CHUNK` rows and reveals the next chunk as the
 * menu is scrolled — the same approach as [useInfiniteRows] for tables.
 */
function ChunkedMenuList(props: any) {
  const { children, focusedOption, selectProps, innerProps } = props;
  // Options come through as an array; the "no options" notice comes through
  // as a lone element.
  const items: any[] = Array.isArray(children)
    ? children
    : children
      ? [children]
      : [];

  const [visible, setVisible] = useState(MENU_CHUNK);

  // A new search is a new result set — start from the top again.
  useEffect(() => setVisible(MENU_CHUNK), [selectProps.inputValue]);

  // Arrow-key navigation can move focus past the rendered window, and
  // react-select can only scroll to an option that is actually mounted.
  const focusedIndex = focusedOption
    ? items.findIndex((c) => c?.props?.data === focusedOption)
    : -1;
  const count = Math.max(visible, focusedIndex + 1);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    innerProps?.onScroll?.(e);
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      setVisible((v) => Math.min(v + MENU_CHUNK, items.length));
    }
  };

  return (
    <selectComponents.MenuList
      {...props}
      innerProps={{ ...innerProps, onScroll }}
    >
      {count < items.length ? items.slice(0, count) : children}
    </selectComponents.MenuList>
  );
}

// ─── Price Modal (Mini Calculator) ────────────────────────────────────────────

/**
 * Step 1 of adding a searched product: mini calculator to pick and edit retail/wholesale price.
 */
function PriceModal({
  product,
  onConfirm,
  onClose,
}: {
  product: CartItem;
  onConfirm: (result: {
    label: "Retail" | "Wholesale";
    price: number;
    availablePrices: { label: "Retail" | "Wholesale"; price: number }[];
    isEdited: boolean;
  }) => void;
  onClose: () => void;
}) {
  const initialLabel: "Retail" | "Wholesale" =
    product.priceLabel === "Wholesale" ? "Wholesale" : "Retail";
  const [selectedLabel, setSelectedLabel] =
    useState<"Retail" | "Wholesale">(initialLabel);

  const retailCatalogPrice =
    product.availablePrices.find((p) => p.label === "Retail")?.price ??
    (product.priceLabel === "Retail" ? product.cost : 0);
  const wholesaleCatalogPrice =
    product.availablePrices.find((p) => p.label === "Wholesale")?.price ??
    (product.priceLabel === "Wholesale" ? product.cost : retailCatalogPrice);

  const [pricesState, setPricesState] = useState<
    Record<"Retail" | "Wholesale", string>
  >({
    Retail: String(retailCatalogPrice),
    Wholesale: String(wholesaleCatalogPrice),
  });

  const [display, setDisplay] = useState<string>(
    String(initialLabel === "Retail" ? retailCatalogPrice : wholesaleCatalogPrice),
  );
  const [expr, setExpr] = useState<string>("");
  const [hasResult, setHasResult] = useState<boolean>(true);

  const catalogPrice =
    selectedLabel === "Retail" ? retailCatalogPrice : wholesaleCatalogPrice;

  function evaluateExpression(val: string): number {
    try {
      const sanitized = val.replace(/×/g, "*").replace(/÷/g, "/");
      const clean = sanitized.replace(/[+\-*/]+$/, "");
      if (!clean) return 0;
      // eslint-disable-next-line no-eval
      const res = eval(clean);
      return typeof res === "number" && !isNaN(res) && isFinite(res)
        ? parseFloat(res.toFixed(4))
        : 0;
    } catch {
      return parseFloat(val) || 0;
    }
  }

  // Sync display with pricesState when switching labels
  const handleLabelChange = (newLabel: "Retail" | "Wholesale") => {
    const currentNum = evaluateExpression(display);
    setPricesState((prev) => ({
      ...prev,
      [selectedLabel]: String(currentNum),
    }));

    setSelectedLabel(newLabel);
    const targetVal =
      pricesState[newLabel] ||
      String(newLabel === "Retail" ? retailCatalogPrice : wholesaleCatalogPrice);
    setDisplay(targetVal);
    setExpr("");
    setHasResult(true);
  };

  const currentPrice = evaluateExpression(display);
  const isPriceValid = !isNaN(currentPrice) && currentPrice >= 0;
  const isEdited = isPriceValid && currentPrice !== catalogPrice;

  const handle = React.useCallback(
    (val: string) => {
      if (val === "C") {
        setDisplay("0");
        setExpr("");
        setHasResult(false);
        return;
      }
      if (val === "⌫") {
        if (hasResult) {
          setDisplay("0");
          setExpr("");
          setHasResult(false);
          return;
        }
        setDisplay((prev) => (prev.length > 1 ? prev.slice(0, -1) : "0"));
        return;
      }
      if (val === "=") {
        try {
          const sanitized = display.replace(/×/g, "*").replace(/÷/g, "/");
          // eslint-disable-next-line no-eval
          const result = eval(sanitized);
          setExpr(display + " =");
          setDisplay(String(parseFloat(Number(result).toFixed(4))));
          setHasResult(true);
        } catch {
          setDisplay("Error");
          setHasResult(true);
        }
        return;
      }
      if (["+", "-", "×", "÷"].includes(val)) {
        if (hasResult) {
          setDisplay(display + val);
          setExpr("");
          setHasResult(false);
          return;
        }
        setDisplay((prev) =>
          ["+", "-", "×", "÷"].includes(prev.slice(-1))
            ? prev.slice(0, -1) + val
            : prev + val,
        );
        return;
      }
      if (val === ".") {
        const parts = display.split(/[+\-×÷]/);
        if (parts[parts.length - 1].includes(".")) return;
        setDisplay((prev) => (hasResult ? "0." : prev + "."));
        setHasResult(false);
        return;
      }
      if (val === "00") {
        if (hasResult || display === "0") {
          setDisplay("0");
          setHasResult(false);
          return;
        }
        setDisplay((prev) => prev + "00");
        return;
      }
      if (hasResult) {
        setDisplay(val);
        setExpr("");
        setHasResult(false);
        return;
      }
      setDisplay((prev) => (prev === "0" ? val : prev + val));
    },
    [display, hasResult],
  );

  const handleReset = () => {
    setDisplay(String(catalogPrice));
    setExpr("");
    setHasResult(true);
  };

  const handleAddQuick = (amount: number) => {
    const base = evaluateExpression(display);
    const next = Math.max(0, base + amount);
    setDisplay(String(next));
    setExpr("");
    setHasResult(true);
  };

  const handleConfirm = React.useCallback(() => {
    const finalPrice = evaluateExpression(display);
    if (isNaN(finalPrice) || finalPrice < 0) return;

    const finalRetail =
      selectedLabel === "Retail"
        ? finalPrice
        : parseFloat(pricesState.Retail) || retailCatalogPrice;
    const finalWholesale =
      selectedLabel === "Wholesale"
        ? finalPrice
        : parseFloat(pricesState.Wholesale) || wholesaleCatalogPrice;

    const updatedAvailablePrices: {
      label: "Retail" | "Wholesale";
      price: number;
    }[] = [
      { label: "Retail", price: finalRetail },
      { label: "Wholesale", price: finalWholesale },
    ];

    const edited = finalPrice !== catalogPrice;

    onConfirm({
      label: selectedLabel,
      price: finalPrice,
      availablePrices: updatedAvailablePrices,
      isEdited: edited,
    });
  }, [
    display,
    selectedLabel,
    pricesState,
    retailCatalogPrice,
    wholesaleCatalogPrice,
    catalogPrice,
    onConfirm,
  ]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") handle(e.key);
      else if (e.key === ".") handle(".");
      else if (e.key === "+") handle("+");
      else if (e.key === "-") handle("-");
      else if (e.key === "*") handle("×");
      else if (e.key === "/") handle("÷");
      else if (e.key === "Enter") {
        const hasOp = /[+−×÷]/.test(display);
        if (hasResult || !hasOp) handleConfirm();
        else handle("=");
      } else if (e.key === "Backspace") handle("⌫");
      else if (e.key === "Escape") onClose();
      else if (e.key.toLowerCase() === "c") handle("C");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handle, handleConfirm, onClose, display, hasResult]);

  const btnCls = (v: string) => {
    if (v === "C")
      return "bg-red-600/80 hover:bg-red-500 text-white font-semibold shadow-sm";
    if (v === "⌫")
      return "bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-amber-600 dark:text-amber-400 font-semibold text-base shadow-sm";
    if (["+", "-", "×", "÷", "="].includes(v))
      return "bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 hover:bg-amber-200 dark:hover:bg-amber-900/80 text-amber-700 dark:text-amber-300 font-bold text-base shadow-sm";
    return "bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 font-medium text-base border border-stone-200 dark:border-stone-700/80 shadow-sm";
  };

  const retailVal =
    selectedLabel === "Retail"
      ? currentPrice
      : parseFloat(pricesState.Retail) || retailCatalogPrice;
  const wholesaleVal =
    selectedLabel === "Wholesale"
      ? currentPrice
      : parseFloat(pricesState.Wholesale) || wholesaleCatalogPrice;

  return (
    <Modal onClose={onClose}>
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl w-84 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 pt-4 pb-2.5 border-b border-stone-200 dark:border-stone-800 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[9px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded px-1.5 py-0.5">
                Price Calculator
              </span>
              {product.unit && (
                <span className="text-[9px] text-stone-500 font-medium bg-stone-100 dark:bg-stone-800 rounded px-1.5 py-0.5">
                  Unit: {product.unit}
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
              {product.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-3.5 pt-3 pb-3 space-y-2.5">
          {/* Price Type Dropdown + Quick Pills */}
          <div>
            <div className="relative mb-1.5">
              <select
                value={selectedLabel}
                onChange={(e) =>
                  handleLabelChange(e.target.value as "Retail" | "Wholesale")
                }
                className="w-full appearance-none bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2 text-xs font-semibold text-stone-900 dark:text-stone-100 pr-8 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors cursor-pointer"
              >
                <option value="Retail">
                  🏷️ Retail Price (₦{formatPrice(retailVal)})
                </option>
                <option value="Wholesale">
                  📦 Wholesale Price (₦{formatPrice(wholesaleVal)})
                </option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {(["Retail", "Wholesale"] as const).map((label) => {
                const isSelected = selectedLabel === label;
                const priceVal = label === "Retail" ? retailVal : wholesaleVal;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleLabelChange(label)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? "bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-500 shadow-sm"
                        : "bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800"
                    }`}
                  >
                    <span
                      className={`text-[11px] font-semibold ${
                        isSelected
                          ? "text-amber-700 dark:text-amber-300"
                          : "text-stone-700 dark:text-stone-300"
                      }`}
                    >
                      {label}
                    </span>
                    <span className="text-[11px] font-mono font-medium text-stone-500 dark:text-stone-400">
                      ₦{formatPrice(priceVal)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calculator Screen Display */}
          <div className="bg-stone-100 dark:bg-stone-950 rounded-xl px-3.5 py-2.5 border border-stone-300 dark:border-stone-800 flex flex-col justify-between min-h-[64px]">
            <div className="flex items-center justify-between text-[11px] text-stone-500 h-4">
              <span className="truncate">
                {expr || (isEdited ? `Catalog: ₦${formatPrice(catalogPrice)}` : `${selectedLabel} Price`)}
              </span>
              {isEdited && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline uppercase tracking-wide shrink-0 ml-1"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="flex items-baseline justify-end gap-1 overflow-hidden mt-0.5">
              <span className="text-sm font-semibold text-stone-400">₦</span>
              <span
                className={`font-mono font-bold tracking-tight truncate leading-none ${
                  display.length > 10
                    ? "text-lg"
                    : display.length > 7
                      ? "text-xl"
                      : "text-2xl"
                } ${
                  display === "Error"
                    ? "text-red-500"
                    : "text-stone-900 dark:text-stone-100"
                }`}
              >
                {display}
              </span>
            </div>
          </div>

          {/* Quick Increments */}
          <div className="flex gap-1">
            {[100, 500, 1000, 5000].map((delta) => (
              <button
                key={delta}
                type="button"
                onClick={() => handleAddQuick(delta)}
                className="flex-1 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-[10px] font-mono text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
              >
                +{delta >= 1000 ? `${delta / 1000}k` : delta}
              </button>
            ))}
          </div>

          {/* Calculator Keypad */}
          <div className="grid grid-cols-4 gap-1.5 pt-0.5">
            {["C", "⌫", "÷", "×"].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => handle(v)}
                className={`rounded-xl h-11 transition-all active:scale-95 ${btnCls(v)}`}
              >
                {v}
              </button>
            ))}
            {["7", "8", "9", "-"].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => handle(v)}
                className={`rounded-xl h-11 transition-all active:scale-95 ${btnCls(v)}`}
              >
                {v}
              </button>
            ))}
            {["4", "5", "6", "+"].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => handle(v)}
                className={`rounded-xl h-11 transition-all active:scale-95 ${btnCls(v)}`}
              >
                {v}
              </button>
            ))}
            {["1", "2", "3", "="].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => handle(v)}
                className={`rounded-xl h-11 transition-all active:scale-95 ${btnCls(v)}`}
              >
                {v}
              </button>
            ))}
            {["0", "00", "."].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => handle(v)}
                className={`rounded-xl h-11 transition-all active:scale-95 ${btnCls(v)}`}
              >
                {v}
              </button>
            ))}
            <button
              type="button"
              onClick={handleReset}
              title={`Reset to catalog price (₦${formatPrice(catalogPrice)})`}
              className="rounded-xl h-11 transition-all active:scale-95 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-400 font-semibold text-xs border border-stone-200 dark:border-stone-700 shadow-sm"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-stone-50 dark:bg-stone-800/50 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2">
          {isEdited ? (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium truncate max-w-[140px]">
              ⚠️ Updates catalog
            </span>
          ) : (
            <span className="text-[10px] text-stone-400">
              Standard price
            </span>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!isPriceValid}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-500 hover:bg-amber-400 text-black disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-amber-500/20 active:scale-[0.98]"
            >
              Add to Sale
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Calculator / Qty Modal ───────────────────────────────────────────────────

function CalcModal({
  product,
  onConfirm,
  onClose,
  display,
  expr,
  hasResult,
  setDisplay,
  setExpr,
  setHasResult,
}: {
  product: CartItem | null;
  onConfirm: (
    qty: number,
    price: number,
    label: "Retail" | "Wholesale",
  ) => void;
  onClose: () => void;
  display: string;
  expr: string;
  hasResult: boolean;
  setDisplay: (val: string) => void;
  setExpr: (val: string) => void;
  setHasResult: (val: boolean) => void;
}) {
  // Price lives here rather than in the cart so the cashier can switch label
  // or type an override without touching the line until they confirm.
  const [priceLabel, setPriceLabel] = useState<"Retail" | "Wholesale">(
    product?.priceLabel ?? "Retail",
  );
  const [priceInput, setPriceInput] = useState(() =>
    product ? String(product.cost) : "0",
  );
  const priceRef = useRef<HTMLInputElement>(null);
  const price = parseFloat(priceInput);
  const priceValid = !isNaN(price) && price > 0;
  // What the selected label is worth in the catalogue — switching labels isn't
  // an edit, typing a different amount is.
  const catalogPrice =
    product?.availablePrices.find((p) => p.label === priceLabel)?.price ??
    product?.cost;

  const pickLabel = (label: "Retail" | "Wholesale", value: number) => {
    setPriceLabel(label);
    setPriceInput(String(value));
  };

  const handle = React.useCallback(
    (val: string) => {
      if (val === "C") {
        setDisplay("0");
        setExpr("");
        setHasResult(false);
        return;
      }
      if (val === "⌫") {
        if (hasResult) {
          setDisplay("0");
          setExpr("");
          setHasResult(false);
          return;
        }
        setDisplay(display.length > 1 ? display.slice(0, -1) : "0");
        return;
      }
      if (val === "=") {
        try {
          // eslint-disable-next-line no-eval
          const result = eval(display.replace(/×/g, "*").replace(/÷/g, "/"));
          setExpr(display + " =");
          setDisplay(String(parseFloat(result.toFixed(6))));
          setHasResult(true);
        } catch {
          setDisplay("Error");
          setHasResult(true);
        }
        return;
      }
      if (["+", "-", "×", "÷"].includes(val)) {
        if (hasResult) {
          setDisplay(display + val);
          setExpr("");
          setHasResult(false);
          return;
        }
        setDisplay(
          ["+", "-", "×", "÷"].includes(display.slice(-1))
            ? display.slice(0, -1) + val
            : display + val,
        );
        return;
      }
      if (val === ".") {
        const parts = display.split(/[+\-×÷]/);
        if (parts[parts.length - 1].includes(".")) return;
        setDisplay(display + ".");
        return;
      }
      if (hasResult) {
        setDisplay(val);
        setExpr("");
        setHasResult(false);
        return;
      }
      setDisplay(display === "0" ? val : display + val);
    },
    [display, hasResult, setDisplay, setExpr, setHasResult],
  );

  const confirm = React.useCallback(() => {
    const qty = parseFloat(display);
    if (!isNaN(qty) && qty > 0 && priceValid) onConfirm(qty, price, priceLabel);
  }, [display, onConfirm, price, priceValid, priceLabel]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // The calculator listens on `window`, so keystrokes meant for the price
      // field would otherwise also drive the keypad.
      if (e.target instanceof HTMLInputElement) {
        if (e.key === "Enter") confirm();
        else if (e.key === "Escape") priceRef.current?.blur();
        return;
      }
      if (e.key >= "0" && e.key <= "9") handle(e.key);
      else if (e.key === ".") handle(".");
      else if (e.key === "+") handle("+");
      else if (e.key === "-") handle("-");
      else if (e.key === "*") handle("×");
      else if (e.key === "/") handle("÷");
      else if (e.key === "Enter") {
        const hasOp = /[+−×÷]/.test(display);
        if (hasResult || !hasOp) confirm();
        else handle("=");
      } else if (e.key === "Backspace") handle("⌫");
      else if (e.key === "Escape") onClose();
      else if (e.key.toLowerCase() === "c") handle("C");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handle, confirm, onClose, display, hasResult]);

  const btnCls = (v: string) => {
    if (v === "C")
      return "bg-red-700/80 hover:bg-red-600 text-stone-900 dark:text-white font-semibold";
    if (v === "⌫")
      return "bg-stone-100 dark:bg-stone-700 hover:bg-stone-600 text-amber-400 font-semibold text-base";
    if (["+", "-", "×", "÷"].includes(v))
      return "bg-stone-100 dark:bg-stone-700 hover:bg-stone-600 text-amber-300 font-bold text-lg";
    return "bg-white dark:bg-stone-800 hover:bg-stone-100 dark:bg-stone-700 text-stone-900 dark:text-stone-100 font-medium text-base";
  };

  return (
    <Modal onClose={onClose}>
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl w-80 shadow-2xl overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs text-stone-600 dark:text-stone-400 uppercase tracking-widest font-semibold">
            Item
          </p>
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
            {product?.title}
          </p>
        </div>

        {/* Price — switch label or type an override */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-stone-600 dark:text-stone-400 uppercase tracking-widest font-semibold">
              Unit price
            </p>
            {priceValid && catalogPrice !== undefined && price !== catalogPrice && (
              <button
                onClick={() => setPriceInput(String(catalogPrice))}
                title={`Reset to ₦${formatPrice(catalogPrice)}`}
                className="text-[10px] uppercase tracking-wide font-semibold text-amber-600 dark:text-amber-400 hover:underline"
              >
                Edited · reset
              </button>
            )}
          </div>

          {(product?.availablePrices?.length ?? 0) > 1 && (
            <div className="flex gap-1.5 mb-2">
              {product!.availablePrices.map((p) => (
                <button
                  key={p.label}
                  onClick={() => pickLabel(p.label, p.price)}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium border transition-colors ${
                    priceLabel === p.label
                      ? "bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 text-stone-900 dark:text-stone-100"
                      : "bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700"
                  }`}
                >
                  {p.label}
                  <span className="block font-mono text-[11px] opacity-70">
                    ₦{formatPrice(p.price)}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div
            className={`flex items-center gap-1.5 rounded-lg border px-3 h-10 bg-stone-50 dark:bg-stone-800 focus-within:border-amber-400 dark:focus-within:border-amber-600 ${
              priceValid
                ? "border-stone-300 dark:border-stone-700"
                : "border-red-400 dark:border-red-700"
            }`}
          >
            <span className="text-sm text-stone-500 dark:text-stone-400">₦</span>
            <input
              ref={priceRef}
              value={priceInput}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9.]/g, "");
                // Keep at most one decimal point.
                const parts = v.split(".");
                setPriceInput(
                  parts.length > 2
                    ? `${parts[0]}.${parts.slice(1).join("")}`
                    : v,
                );
              }}
              onFocus={(e) => e.target.select()}
              inputMode="decimal"
              aria-label="Unit price"
              className="flex-1 min-w-0 bg-transparent outline-none text-right font-mono text-base font-semibold text-stone-900 dark:text-stone-100"
            />
          </div>
        </div>
        <p className="px-4 pb-1.5 text-xs text-stone-600 dark:text-stone-400 uppercase tracking-widest font-semibold">
          Quantity
        </p>
        <div className="mx-4 mb-3 bg-stone-100 dark:bg-stone-950 rounded-xl px-4 py-3 border border-stone-300 dark:border-stone-800">
          {expr && (
            <div className="text-stone-500 text-sm text-right h-5 truncate">
              {expr}
            </div>
          )}
          <div
            className={`text-right font-mono font-semibold tracking-tight leading-none truncate
            ${display.length > 10 ? "text-xl" : display.length > 7 ? "text-2xl" : "text-3xl"}
            ${display === "Error" ? "text-red-400" : "text-stone-900 dark:text-stone-100"}`}
          >
            {display}
          </div>
        </div>
        <div className="px-3 pb-3">
          <div className="grid grid-cols-4 gap-2">
            {["C", "⌫", "÷", "×"].map((v) => (
              <button
                key={v}
                onClick={() => handle(v)}
                className={`rounded-xl h-14 transition-colors ${btnCls(v)}`}
              >
                {v}
              </button>
            ))}
            {["7", "8", "9"].map((v) => (
              <button
                key={v}
                onClick={() => handle(v)}
                className={`rounded-xl h-14 transition-colors ${btnCls(v)}`}
              >
                {v}
              </button>
            ))}
            <button
              onClick={() => handle("-")}
              className={`rounded-xl h-14 transition-colors ${btnCls("-")}`}
            >
              −
            </button>
            {["4", "5", "6"].map((v) => (
              <button
                key={v}
                onClick={() => handle(v)}
                className={`rounded-xl h-14 transition-colors ${btnCls(v)}`}
              >
                {v}
              </button>
            ))}
            <button
              onClick={() => handle("+")}
              className={`rounded-xl h-14 transition-colors ${btnCls("+")}`}
            >
              +
            </button>
            {["1", "2", "3"].map((v) => (
              <button
                key={v}
                onClick={() => handle(v)}
                className={`rounded-xl h-14 transition-colors ${btnCls(v)}`}
              >
                {v}
              </button>
            ))}
            <button
              onClick={confirm}
              disabled={!priceValid}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-stone-900 dark:text-white font-bold text-xl transition-colors"
              style={{ gridRow: "span 2", minHeight: "116px" }}
            >
              ✓
            </button>
            {[".", "0", "00"].map((v) => (
              <button
                key={v}
                onClick={() => handle(v)}
                className={`rounded-xl h-14 transition-colors ${btnCls(v)}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        {priceValid && /^[0-9.]+$/.test(display) && (
          <div className="px-4 pb-2 flex items-center justify-between text-xs">
            <span className="text-stone-500 dark:text-stone-400">
              {display} × ₦{formatPrice(price)}
            </span>
            <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
              ₦{formatPrice((parseFloat(display) || 0) * price)}
            </span>
          </div>
        )}
        <div className="px-3 pb-4">
          <button
            onClick={onClose}
            className="w-full bg-white dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-800 dark:text-stone-200 rounded-xl h-10 text-xs transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Discount Modal ───────────────────────────────────────────────────────────

function DiscountModal({
  item,
  cartDiscount,
  tab,
  value,
  setTab,
  setValue,
  onItemDiscount,
  onCartDiscount,
  onClose,
}: {
  item: CartItem | null;
  cartDiscount: number;
  tab: "item" | "cart";
  value: string;
  setTab: (t: "item" | "cart") => void;
  setValue: (v: string) => void;
  onItemDiscount: (id: string, pct: number) => void;
  onCartDiscount: (pct: number) => void;
  onClose: () => void;
}) {
  const presets = [5, 10, 15, 20, 25, 50];

  const apply = () => {
    const pct = Math.min(100, Math.max(0, parseFloat(value) || 0));
    if (tab === "item" && item) onItemDiscount(item.id, pct);
    else onCartDiscount(pct);
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl w-96 shadow-2xl overflow-hidden">
        <div className="flex border-b border-stone-300 dark:border-stone-800">
          {item && (
            <button
              onClick={() => {
                setTab("item");
                setValue(String(item.discount));
              }}
              className={`flex-1 py-3 text-xs font-semibold transition-colors ${tab === "item" ? "text-amber-400 border-b-2 border-amber-400" : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:text-stone-200"}`}
            >
              Item Discount
            </button>
          )}
          <button
            onClick={() => {
              setTab("cart");
              setValue(String(cartDiscount));
            }}
            className={`flex-1 py-3 text-xs font-semibold transition-colors ${tab === "cart" ? "text-amber-400 border-b-2 border-amber-400" : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:text-stone-200"}`}
          >
            Cart Discount
          </button>
        </div>
        <div className="p-5">
          {tab === "item" && item && (
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-3 truncate">
              Applying to:{" "}
              <span className="text-stone-800 dark:text-stone-200">
                {item.title}
              </span>
            </p>
          )}
          <div className="relative mb-4">
            <input
              autoFocus
              type="number"
              min={0}
              onFocus={(e) => e.target.select()}
              max={100}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apply()}
              className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl px-4 py-3 text-2xl font-mono text-right text-stone-900 dark:text-stone-100 outline-none focus:border-amber-500"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-600 dark:text-stone-400 text-xl pointer-events-none">
              %
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => setValue(String(p))}
                className="bg-white dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-100 dark:bg-stone-700 rounded-lg py-2 text-xs font-medium text-stone-700 dark:text-stone-300 transition-colors"
              >
                {p}%
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 bg-white dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-100 dark:bg-stone-700 rounded-xl py-3 text-xs text-stone-600 dark:text-stone-400"
            >
              Cancel
            </button>
            <button
              onClick={apply}
              className="flex-1 bg-amber-600 hover:bg-amber-500 rounded-xl py-3 text-xs font-semibold text-stone-900 dark:text-white"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Customer Modal ───────────────────────────────────────────────────────────

function CustomerModal({
  customers,
  selected,
  search,
  setSearch,
  onSelect,
  onClose,
}: {
  customers: any[];
  selected: any | null;
  search: string;
  setSearch: (s: string) => void;
  onSelect: (c: any | null) => void;
  onClose: () => void;
}) {
  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.code ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Modal onClose={onClose}>
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl w-105 max-h-[80vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-stone-300 dark:border-stone-800">
          <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 mb-3">
            Select Customer
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500 dark:text-stone-400" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or code…"
              className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-lg pl-9 pr-4 py-2 text-xs text-stone-900 dark:text-stone-100 outline-none focus:border-amber-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <button
            onClick={() => {
              onSelect(null);
              onClose();
            }}
            className="w-full px-4 py-3 text-left text-xs text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-white dark:bg-stone-800 border-b border-stone-300 dark:border-stone-800 flex items-center gap-2"
          >
            <X className="w-4 h-4" /> No Customer (Walk-in)
          </button>
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                onSelect(c);
                onClose();
              }}
              className={`w-full px-4 py-3 text-left hover:bg-stone-200 dark:hover:bg-white dark:bg-stone-800 border-b border-stone-300 dark:border-stone-800 transition-colors ${selected?.id === c.id ? "bg-stone-200 dark:bg-stone-800" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-stone-900 dark:text-stone-100">
                    {c.name}
                  </p>
                  {c.code && (
                    <p className="text-xs text-stone-600 dark:text-stone-500">
                      {c.code}
                    </p>
                  )}
                </div>
                {selected?.id === c.id && (
                  <Check className="w-4 h-4 text-amber-400" />
                )}
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-stone-500 py-8 text-xs">
              No customers found
            </p>
          )}
        </div>
        <div className="p-3 border-t border-stone-300 dark:border-stone-800">
          <button
            onClick={onClose}
            className="w-full bg-white dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-100 dark:bg-stone-700 rounded-xl py-2 text-xs text-stone-600 dark:text-stone-400"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Split Payment Amount Calculator Modal ─────────────────────────────────────

function SplitAmountModal({
  paymentType,
  defaultAmount,
  remainingAmount,
  onConfirm,
  onClose,
}: {
  paymentType: { id: string; name: string };
  defaultAmount: number;
  remainingAmount: number;
  onConfirm: (amount: number) => void;
  onClose: () => void;
}) {
  const [display, setDisplay] = useState<string>(String(defaultAmount > 0 ? defaultAmount : ""));
  const [hasResult, setHasResult] = useState<boolean>(true);

  const currentAmount = parseFloat(display) || 0;
  const isValid = currentAmount > 0;

  const handleKey = React.useCallback(
    (val: string) => {
      if (val === "C") {
        setDisplay("0");
        setHasResult(false);
        return;
      }
      if (val === "⌫") {
        if (hasResult) {
          setDisplay("0");
          setHasResult(false);
          return;
        }
        setDisplay((prev) => (prev.length > 1 ? prev.slice(0, -1) : "0"));
        return;
      }
      if (val === ".") {
        if (display.includes(".")) return;
        setDisplay((prev) => (hasResult ? "0." : prev + "."));
        setHasResult(false);
        return;
      }
      if (val === "00") {
        if (hasResult || display === "0" || display === "") {
          setDisplay("0");
          setHasResult(false);
          return;
        }
        setDisplay((prev) => prev + "00");
        return;
      }
      if (hasResult) {
        setDisplay(val);
        setHasResult(false);
        return;
      }
      setDisplay((prev) => (prev === "0" ? val : prev + val));
    },
    [display, hasResult],
  );

  const handleSetExact = () => {
    setDisplay(String(remainingAmount > 0 ? remainingAmount : defaultAmount));
    setHasResult(true);
  };

  const handleAddQuick = (delta: number) => {
    const base = parseFloat(display) || 0;
    setDisplay(String(Math.max(0, base + delta)));
    setHasResult(true);
  };

  const handleConfirm = React.useCallback(() => {
    if (isValid) {
      onConfirm(currentAmount);
    }
  }, [isValid, currentAmount, onConfirm]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") handleKey(e.key);
      else if (e.key === ".") handleKey(".");
      else if (e.key === "Enter") handleConfirm();
      else if (e.key === "Backspace") handleKey("⌫");
      else if (e.key === "Escape") onClose();
      else if (e.key.toLowerCase() === "c") handleKey("C");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey, handleConfirm, onClose]);

  return (
    <Modal onClose={onClose}>
      <div className="bg-[#242424] text-white border border-stone-700 rounded-2xl w-88 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-stone-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider text-amber-400 bg-amber-950/60 border border-amber-800 rounded px-2 py-0.5">
              Split Payment
            </span>
            <span className="text-sm font-semibold text-stone-200">
              {paymentType.name}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* LCD Screen Display */}
          <div className="bg-[#181818] rounded-xl px-4 py-3 border border-stone-800 flex flex-col justify-between min-h-[72px]">
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span>Remaining balance</span>
              <span className="font-mono text-amber-400 font-semibold">
                ₦{formatPrice(remainingAmount)}
              </span>
            </div>
            <div className="flex items-baseline justify-end gap-1.5 overflow-hidden mt-1">
              <span className="text-base font-semibold text-stone-500">₦</span>
              <span
                className={`font-mono font-bold tracking-tight truncate leading-none ${
                  display.length > 10
                    ? "text-xl"
                    : display.length > 7
                      ? "text-2xl"
                      : "text-3xl"
                } text-white`}
              >
                {display || "0.00"}
              </span>
            </div>
          </div>

          {/* Quick Increments */}
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={handleSetExact}
              className="flex-1 py-1.5 rounded-lg border border-amber-600/60 bg-amber-950/30 text-amber-300 hover:bg-amber-900/40 text-xs font-semibold transition-colors"
            >
              Exact (₦{formatPrice(remainingAmount)})
            </button>
            {[500, 1000, 5000].map((delta) => (
              <button
                key={delta}
                type="button"
                onClick={() => handleAddQuick(delta)}
                className="px-2.5 py-1.5 rounded-lg border border-stone-700 bg-stone-800 text-xs font-mono text-stone-300 hover:bg-stone-700 transition-colors"
              >
                +{delta >= 1000 ? `${delta / 1000}k` : delta}
              </button>
            ))}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            {["7", "8", "9"].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => handleKey(v)}
                className="rounded-xl h-12 bg-stone-800 hover:bg-stone-700 active:scale-95 text-white font-semibold text-lg border border-stone-700 transition-all shadow-sm"
              >
                {v}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleKey("⌫")}
              className="rounded-xl h-12 bg-stone-800 hover:bg-stone-700 active:scale-95 text-amber-400 font-semibold text-lg border border-stone-700 transition-all shadow-sm flex items-center justify-center"
            >
              ⌫
            </button>

            {["4", "5", "6"].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => handleKey(v)}
                className="rounded-xl h-12 bg-stone-800 hover:bg-stone-700 active:scale-95 text-white font-semibold text-lg border border-stone-700 transition-all shadow-sm"
              >
                {v}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleKey("C")}
              className="rounded-xl h-12 bg-red-900/60 hover:bg-red-800/80 active:scale-95 text-red-200 font-semibold text-base border border-red-800 transition-all shadow-sm flex items-center justify-center"
            >
              C
            </button>

            {["1", "2", "3"].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => handleKey(v)}
                className="rounded-xl h-12 bg-stone-800 hover:bg-stone-700 active:scale-95 text-white font-semibold text-lg border border-stone-700 transition-all shadow-sm"
              >
                {v}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleKey("00")}
              className="rounded-xl h-12 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-300 font-semibold text-sm border border-stone-700 transition-all shadow-sm"
            >
              00
            </button>

            <button
              type="button"
              onClick={() => handleKey("0")}
              className="rounded-xl h-12 bg-stone-800 hover:bg-stone-700 active:scale-95 text-white font-semibold text-lg border border-stone-700 transition-all shadow-sm"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleKey(".")}
              className="rounded-xl h-12 bg-stone-800 hover:bg-stone-700 active:scale-95 text-white font-semibold text-lg border border-stone-700 transition-all shadow-sm"
            >
              .
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!isValid}
              className="col-span-2 rounded-xl h-12 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 text-white font-bold text-sm transition-all shadow-md flex items-center justify-center gap-1"
            >
              <Check className="w-4 h-4" /> Add Payment
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#1e1e1e] border-t border-stone-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl border border-stone-700 text-stone-300 hover:bg-stone-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isValid}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all shadow-md"
          >
            Add ₦{formatPrice(currentAmount)}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Split Payment Screen ───────────────────────────────────────────────────────

function SplitPaymentScreen({
  total,
  subtotal: _subtotal,
  taxTotal: _taxTotal,
  items: _items,
  paymentTypes,
  customer: _customer,
  paidInput: _paidInput,
  selectedTypeId: _selectedTypeId,
  setPaidInput: _setPaidInput,
  setSelectedTypeId,
  onConfirm,
  onClose,
}: {
  total: number;
  subtotal: number;
  taxTotal: number;
  items: CartItem[];
  paymentTypes: any[];
  customer: any | null;
  paidInput: string;
  selectedTypeId: string;
  setPaidInput: (v: string) => void;
  setSelectedTypeId: (v: string) => void;
  onConfirm: (
    payments: { paymentId: string; paymentType: string; amount: number }[],
  ) => void;
  onClose: () => void;
}) {
  const enabled = paymentTypes.filter((p) => p.enabled && p.id !== "split");
  const displayTypes =
    enabled.length > 0
      ? enabled
      : [
          { id: "cash", name: "Cash", position: 1 },
          { id: "card", name: "Credit Card", position: 2 },
          { id: "debit", name: "Debit Card", position: 3 },
          { id: "check", name: "Check", position: 4 },
          { id: "voucher", name: "Voucher", position: 5 },
          { id: "gift", name: "Gift Card", position: 6 },
        ];

  // List of added split payment rows
  const [selectedPayments, setSelectedPayments] = useState<
    { id: string; paymentId: string; paymentType: string; amount: number }[]
  >([]);

  // Which payment type is currently open in the calculator modal
  const [calcPaymentType, setCalcPaymentType] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const paidTotal = selectedPayments.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = Math.max(0, total - paidTotal);
  const changeAmount = Math.max(0, paidTotal - total);

  const handleOpenCalc = (pt: { id: string; name: string }) => {
    setCalcPaymentType(pt);
  };

  const handleAddSplitPayment = (amount: number) => {
    if (!calcPaymentType || amount <= 0) return;
    setSelectedPayments((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        paymentId: calcPaymentType.id,
        paymentType: calcPaymentType.name,
        amount,
      },
    ]);
    setCalcPaymentType(null);
  };

  const handleRemovePayment = (id: string) => {
    setSelectedPayments((prev) => prev.filter((p) => p.id !== id));
  };

  const handleConfirmOK = () => {
    if (selectedPayments.length === 0) {
      toast.warn("Add at least one payment method before confirming.");
      return;
    }
    onConfirm(
      selectedPayments.map(({ paymentId, paymentType, amount }) => ({
        paymentId,
        paymentType,
        amount,
      })),
    );
  };

  const handleCancel = () => {
    setSelectedTypeId(displayTypes[0]?.id ?? "cash");
  };

  return (
    <div className="fixed inset-0 z-50 flex h-screen bg-[#242424] text-white select-none">
      {/* ── Left Column: Add payment type ── */}
      <div className="w-64 border-r border-[#383838] bg-[#1e1e1e] flex flex-col shrink-0">
        <div className="px-5 py-3.5 border-b border-[#383838]">
          <h2 className="text-base font-semibold text-stone-100">
            Add payment type
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#333333]">
          {displayTypes.map((pt) => (
            <button
              key={pt.id}
              type="button"
              onClick={() => handleOpenCalc(pt)}
              className="w-full h-13 px-5 flex items-center justify-center text-sm font-medium text-stone-200 hover:bg-[#2e2e2e] active:bg-[#383838] transition-colors text-center"
            >
              {pt.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Right Column: Selected payment type ── */}
      <div className="flex-1 flex flex-col bg-[#242424] min-w-0">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-[#383838] flex items-center justify-between">
          <h2 className="text-base font-semibold text-stone-100">
            Selected payment type
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto px-8 pt-4 pb-6 flex flex-col justify-between">
          <div>
            <p className="text-xs text-stone-400 mb-6 flex items-center gap-2">
              Choose payment types and amounts required for the current sale
            </p>

            {/* List of Added Payment Rows */}
            <div className="space-y-4 max-w-xl">
              {selectedPayments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-1 border-b border-[#383838]/60 group"
                >
                  <span className="text-base font-bold text-white tracking-wide">
                    {p.paymentType}
                  </span>
                  <div className="flex items-center gap-6">
                    <span className="text-base font-bold text-white font-mono tracking-wide">
                      {formatPrice(p.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemovePayment(p.id)}
                      className="text-stone-400 hover:text-white p-1 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {selectedPayments.length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center text-stone-500 border border-dashed border-[#383838] rounded-xl">
                  <p className="text-sm">
                    No payment types selected yet
                  </p>
                  <p className="text-xs text-stone-600 mt-1">
                    Click any payment type on the left to add an amount
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Right Summary and Action Buttons */}
          <div className="pt-6 mt-auto border-t border-[#383838] flex flex-col items-end gap-5">
            {/* Totals Summary */}
            <div className="w-80 space-y-1.5 text-right font-mono">
              <div className="flex items-baseline justify-between text-base">
                <span className="text-stone-400 font-sans text-sm">Total:</span>
                <span className="text-sky-400 font-bold text-2xl tracking-tight">
                  {formatPrice(total)}
                </span>
              </div>

              <div className="flex items-baseline justify-between text-base">
                <span className="text-stone-400 font-sans text-sm">Paid:</span>
                <span className="text-white font-bold text-3xl tracking-tight">
                  {formatPrice(paidTotal)}
                </span>
              </div>

              <div className="flex items-baseline justify-between text-base pt-0.5">
                {paidTotal >= total ? (
                  <>
                    <span className="text-stone-400 font-sans text-sm">
                      Change:
                    </span>
                    <span className="text-emerald-400 font-bold text-2xl tracking-tight">
                      {formatPrice(changeAmount)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-stone-400 font-sans text-sm">
                      Remaining:
                    </span>
                    <span className="text-red-400 font-bold text-2xl tracking-tight">
                      {formatPrice(remainingBalance)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleConfirmOK}
                disabled={selectedPayments.length === 0}
                className="bg-[#2e7d32] hover:bg-[#388e3c] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-10 py-2.5 rounded text-sm transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md"
              >
                <Check className="w-4 h-4" /> OK
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="bg-[#c62828] hover:bg-[#d32f2f] text-white font-bold px-8 py-2.5 rounded text-sm transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Calculator Modal for Amount ── */}
      {calcPaymentType && (
        <SplitAmountModal
          paymentType={calcPaymentType}
          defaultAmount={remainingBalance > 0 ? remainingBalance : total}
          remainingAmount={remainingBalance}
          onConfirm={handleAddSplitPayment}
          onClose={() => setCalcPaymentType(null)}
        />
      )}
    </div>
  );
}

// ─── Payment Summary Screen (After Successful Payment) ─────────────────────────

export interface CompletedSaleData {
  docNumber: string;
  docId: string;
  items: CartItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  payments: { paymentId: string; paymentType: string; amount: number }[];
  totalPaid: number;
  change: number;
  customer?: any | null;
  date: Date;
}

function buildSaleReceiptPdf(sale: CompletedSaleData): jsPDF {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, 220],
  });
  const W = 80;
  let y = 8;

  const center = (text: string, size = 9, bold = false) => {
    pdf.setFontSize(size).setFont("helvetica", bold ? "bold" : "normal");
    pdf.text(text, W / 2, y, { align: "center" });
    y += size * 0.45;
  };

  const line = () => {
    pdf.setDrawColor(180);
    pdf.line(4, y, W - 4, y);
    y += 3;
  };

  const row = (left: string, right: string, bold = false) => {
    pdf
      .setFontSize(8)
      .setFont("helvetica", bold ? "bold" : "normal")
      .setTextColor(0);
    pdf.text(left, 4, y);
    pdf.text(right, W - 4, y, { align: "right" });
    y += 4;
  };

  center("RECEIPT", 13, true);
  y += 1;
  center(sale.docNumber, 9);
  center(format(sale.date, "dd/MM/yyyy HH:mm"), 8);
  if (sale.customer?.name) center(sale.customer.name, 8);
  y += 2;
  line();

  sale.items.forEach((item) => {
    pdf.setFontSize(8).setFont("helvetica", "normal").setTextColor(0);
    pdf.text(item.title.slice(0, 30), 4, y);
    y += 4;
    row(
      `  ${item.qty} × ${item.cost.toFixed(2)}`,
      (item.qty * item.cost).toFixed(2),
    );
  });

  line();
  row("Subtotal", sale.subtotal.toFixed(2));
  row("Tax", sale.taxTotal.toFixed(2));
  row("TOTAL", sale.total.toFixed(2), true);

  sale.payments.forEach((p) => {
    row(p.paymentType, p.amount.toFixed(2));
  });

  if (sale.change > 0) {
    row("Change", sale.change.toFixed(2));
  }

  y += 3;
  line();

  pdf.setFontSize(8).setFont("helvetica", "normal").setTextColor(130);
  pdf.text("Thank you for your purchase!", W / 2, y + 4, { align: "center" });

  return pdf;
}

function printHtmlContent(html: string) {
  try {
    let iframe = document.getElementById("pos-print-frame") as HTMLIFrameElement | null;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "pos-print-frame";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.visibility = "hidden";
      document.body.appendChild(iframe);
    }

    const frameDoc = iframe.contentWindow?.document;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(html);
      frameDoc.close();

      setTimeout(() => {
        try {
          iframe?.contentWindow?.focus();
          iframe?.contentWindow?.print();
        } catch {
          window.print();
        }
      }, 250);
    } else {
      window.print();
    }
  } catch (err) {
    console.error("Print error, fallback to window.print():", err);
    window.print();
  }
}

function getThermalReceiptHtml(sale: CompletedSaleData, company?: any): string {
  const companyName = company?.name || "AXIS POS";
  const companyAddress = [company?.streetName, company?.city, company?.stateProvince]
    .filter(Boolean)
    .join(", ");
  const companyPhone = company?.phoneNumber ? `Tel: ${company.phoneNumber}` : "";
  const companyTax = company?.taxNumber ? `Tax No: ${company.taxNumber}` : "";

  const itemsHtml = sale.items
    .map(
      (i) => `
    <tr>
      <td style="padding: 3px 0; font-weight: 600;">${i.title}</td>
      <td style="padding: 3px 0; text-align: center;">${i.qty}</td>
      <td style="padding: 3px 0; text-align: right;">₦${formatPrice(i.cost)}</td>
      <td style="padding: 3px 0; text-align: right; font-weight: 700;">₦${formatPrice(i.qty * i.cost)}</td>
    </tr>
  `,
    )
    .join("");

  const paymentsHtml = sale.payments
    .map(
      (p) => `
    <div style="display: flex; justify-content: space-between; font-size: 11px; margin: 2px 0;">
      <span>${p.paymentType}:</span>
      <span style="font-weight: 600;">₦${formatPrice(p.amount)}</span>
    </div>
  `,
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Receipt ${sale.docNumber}</title>
      <style>
        @page { size: 80mm auto; margin: 2mm 3mm; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          width: 74mm;
          margin: 0 auto;
          padding: 4px 0;
          color: #000;
          font-size: 12px;
          line-height: 1.3;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .bold { font-weight: 700; }
        .divider { border-top: 1px dashed #000; margin: 6px 0; }
        .divider-solid { border-top: 1px solid #000; margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin: 4px 0; }
        th { border-bottom: 1px solid #000; padding: 3px 0; text-align: left; font-size: 11px; }
      </style>
    </head>
    <body>
      <div class="text-center">
        <h2 style="margin: 0; font-size: 17px; font-weight: 800; text-transform: uppercase;">${companyName}</h2>
        ${companyAddress ? `<p style="margin: 2px 0; font-size: 10px;">${companyAddress}</p>` : ""}
        ${companyPhone ? `<p style="margin: 2px 0; font-size: 10px;">${companyPhone}</p>` : ""}
        ${companyTax ? `<p style="margin: 2px 0; font-size: 10px;">${companyTax}</p>` : ""}
        <div class="divider-solid"></div>
        <p style="margin: 2px 0; font-size: 13px; font-weight: 700; letter-spacing: 0.5px;">SALES RECEIPT</p>
      </div>

      <div style="font-size: 11px; margin-top: 4px;">
        <div style="display: flex; justify-content: space-between;">
          <span>Receipt #: <strong>${sale.docNumber}</strong></span>
          <span>${format(sale.date, "dd/MM/yyyy HH:mm")}</span>
        </div>
        ${
          sale.customer?.name
            ? `<div>Customer: <strong>${sale.customer.name}</strong></div>`
            : "<div>Customer: <strong>Walk-in</strong></div>"
        }
      </div>

      <div class="divider"></div>

      <table>
        <thead>
          <tr>
            <th style="width: 42%;">Item</th>
            <th style="width: 14%; text-align: center;">Qty</th>
            <th style="width: 22%; text-align: right;">Price</th>
            <th style="width: 22%; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="divider"></div>

      <div style="font-size: 11px;">
        <div style="display: flex; justify-content: space-between; margin: 2px 0;">
          <span>Subtotal:</span>
          <span>₦${formatPrice(sale.subtotal)}</span>
        </div>
        ${
          sale.taxTotal > 0
            ? `
          <div style="display: flex; justify-content: space-between; margin: 2px 0;">
            <span>Tax:</span>
            <span>₦${formatPrice(sale.taxTotal)}</span>
          </div>
        `
            : ""
        }
        <div class="divider-solid"></div>
        <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 800; margin: 4px 0;">
          <span>TOTAL:</span>
          <span>₦${formatPrice(sale.total)}</span>
        </div>
        <div class="divider"></div>
        <div style="margin: 4px 0;">
          <div style="font-weight: 700; font-size: 11px; margin-bottom: 2px;">TENDER:</div>
          ${paymentsHtml}
        </div>
        ${
          sale.change > 0
            ? `
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; margin-top: 4px; color: #000;">
            <span>CHANGE:</span>
            <span>₦${formatPrice(sale.change)}</span>
          </div>
        `
            : ""
        }
      </div>

      <div class="divider-solid"></div>
      <div class="text-center" style="font-size: 11px; margin-top: 6px;">
        <p style="margin: 2px 0; font-weight: 600;">Thank you for your business!</p>
        <p style="margin: 2px 0; font-size: 9px; color: #555;">Goods sold in good condition are not returnable</p>
      </div>

      <script>
        window.onload = function() {
          window.focus();
          window.print();
        };
      </script>
    </body>
    </html>
  `;
}

function getInvoiceHtml(sale: CompletedSaleData, company?: any): string {
  const companyName = company?.name || "AXIS POS";
  const companyAddress = [
    company?.streetName,
    company?.city,
    company?.stateProvince,
    company?.country,
  ]
    .filter(Boolean)
    .join(", ");
  const companyPhone = company?.phoneNumber ? `Phone: ${company.phoneNumber}` : "";
  const companyEmail = company?.email ? `Email: ${company.email}` : "";
  const companyTax = company?.taxNumber ? `Tax ID: ${company.taxNumber}` : "";

  const itemsRows = sale.items
    .map(
      (i, idx) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 10px 12px; text-align: center; color: #6b7280;">${idx + 1}</td>
      <td style="padding: 10px 12px; font-weight: 600; color: #111827;">${i.title}</td>
      <td style="padding: 10px 12px; text-align: center; color: #374151;">${i.qty}</td>
      <td style="padding: 10px 12px; text-align: right; color: #374151;">₦${formatPrice(i.cost)}</td>
      <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #111827;">₦${formatPrice(i.qty * i.cost)}</td>
    </tr>
  `,
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Invoice #${sale.docNumber}</title>
      <style>
        @page { size: A4 portrait; margin: 15mm; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #1f2937;
          margin: 0;
          padding: 20px;
          background: #fff;
          font-size: 13px;
        }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #3b82f6; padding-bottom: 16px; margin-bottom: 24px; }
        .company-title { font-size: 24px; font-weight: 800; color: #1e3a8a; margin: 0; }
        .invoice-badge { font-size: 28px; font-weight: 900; color: #2563eb; letter-spacing: 1px; margin: 0; text-align: right; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #f3f4f6; color: #374151; font-weight: 700; padding: 10px 12px; font-size: 12px; text-transform: uppercase; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 class="company-title">${companyName}</h1>
          ${companyAddress ? `<p style="margin: 4px 0; color: #4b5563;">${companyAddress}</p>` : ""}
          ${companyPhone ? `<p style="margin: 2px 0; color: #4b5563;">${companyPhone}</p>` : ""}
          ${companyEmail ? `<p style="margin: 2px 0; color: #4b5563;">${companyEmail}</p>` : ""}
          ${companyTax ? `<p style="margin: 2px 0; color: #4b5563;">${companyTax}</p>` : ""}
        </div>
        <div style="text-align: right;">
          <h2 class="invoice-badge">INVOICE</h2>
          <p style="margin: 4px 0; font-weight: 700; color: #1f2937;">#${sale.docNumber}</p>
          <p style="margin: 2px 0; color: #6b7280;">Date: ${format(sale.date, "dd MMM yyyy, HH:mm")}</p>
          <div style="display: inline-block; background: #dcfce7; color: #166534; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 9999px; margin-top: 6px;">PAID</div>
        </div>
      </div>

      <div style="margin-bottom: 24px; background: #f9fafb; padding: 14px 18px; border-radius: 8px; border: 1px solid #e5e7eb;">
        <h3 style="margin: 0 0 6px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 700;">Billed To:</h3>
        <p style="margin: 0; font-size: 15px; font-weight: 700; color: #111827;">${sale.customer?.name ?? "Walk-in Customer"}</p>
        ${sale.customer?.phoneNumber ? `<p style="margin: 2px 0; color: #4b5563;">Phone: ${sale.customer.phoneNumber}</p>` : ""}
        ${sale.customer?.email ? `<p style="margin: 2px 0; color: #4b5563;">Email: ${sale.customer.email}</p>` : ""}
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 8%; text-align: center;">#</th>
            <th style="width: 47%; text-align: left;">Item Description</th>
            <th style="width: 15%; text-align: center;">Quantity</th>
            <th style="width: 15%; text-align: right;">Unit Price</th>
            <th style="width: 15%; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
        <div style="width: 280px; background: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: #6b7280;">Subtotal:</span>
            <span style="font-weight: 600;">₦${formatPrice(sale.subtotal)}</span>
          </div>
          ${
            sale.taxTotal > 0
              ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span style="color: #6b7280;">Tax:</span>
              <span style="font-weight: 600;">₦${formatPrice(sale.taxTotal)}</span>
            </div>
          `
              : ""
          }
          <div style="border-top: 2px solid #d1d5db; padding-top: 8px; margin-top: 8px; display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; color: #1e3a8a;">
            <span>Total:</span>
            <span>₦${formatPrice(sale.total)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 6px; font-size: 12px; color: #059669; font-weight: 700;">
            <span>Total Paid:</span>
            <span>₦${formatPrice(sale.totalPaid)}</span>
          </div>
        </div>
      </div>

      <div style="margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 16px; text-align: center; color: #9ca3af; font-size: 11px;">
        <p style="margin: 2px 0;">Thank you for your business!</p>
      </div>

      <script>
        window.onload = function() {
          window.focus();
          window.print();
        };
      </script>
    </body>
    </html>
  `;
}

function PrintReceiptOverlay({
  sale,
  company,
}: {
  sale: CompletedSaleData | null;
  company?: any;
}) {
  if (!sale) return null;
  const companyName = company?.name || "AXIS POS";
  const companyAddress = [company?.streetName, company?.city, company?.stateProvince]
    .filter(Boolean)
    .join(", ");
  const companyPhone = company?.phoneNumber ? `Tel: ${company.phoneNumber}` : "";
  const companyTax = company?.taxNumber ? `Tax No: ${company.taxNumber}` : "";

  return (
    <div
      id="pos-print-receipt-overlay"
      className="hidden print:block fixed inset-0 bg-white z-[99999] p-6 text-stone-950 font-sans"
    >
      <div className="max-w-[340px] mx-auto text-black text-xs leading-normal">
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold uppercase tracking-wider m-0">
            {companyName}
          </h2>
          {companyAddress && (
            <p className="text-[11px] text-stone-600 m-0.5">{companyAddress}</p>
          )}
          {companyPhone && (
            <p className="text-[11px] text-stone-600 m-0.5">{companyPhone}</p>
          )}
          {companyTax && (
            <p className="text-[11px] text-stone-600 m-0.5">{companyTax}</p>
          )}
          <div className="border-b border-black my-2"></div>
          <p className="font-bold text-sm tracking-wide m-0">SALES RECEIPT</p>
        </div>

        <div className="border-y border-dashed border-stone-400 py-2 mb-3 text-[11px] space-y-1">
          <div className="flex justify-between">
            <span>
              Receipt #: <strong>{sale.docNumber}</strong>
            </span>
            <span>{format(sale.date, "dd/MM/yyyy HH:mm")}</span>
          </div>
          <div className="flex justify-between">
            <span>
              Customer: <strong>{sale.customer?.name ?? "Walk-in"}</strong>
            </span>
          </div>
        </div>

        <table className="w-full border-collapse mb-3 text-[11px]">
          <thead>
            <tr className="border-b border-black text-left">
              <th className="pb-1 font-bold">Item</th>
              <th className="pb-1 text-center font-bold">Qty</th>
              <th className="pb-1 text-right font-bold">Price</th>
              <th className="pb-1 text-right font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item) => (
              <tr key={item.id} className="border-b border-stone-200">
                <td className="py-1 font-semibold">{item.title}</td>
                <td className="py-1 text-center">{item.qty}</td>
                <td className="py-1 text-right">₦{formatPrice(item.cost)}</td>
                <td className="py-1 text-right font-bold">
                  ₦{formatPrice(item.qty * item.cost)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-black pt-2 space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>₦{formatPrice(sale.subtotal)}</span>
          </div>
          {sale.taxTotal > 0 && (
            <div className="flex justify-between">
              <span>Tax:</span>
              <span>₦{formatPrice(sale.taxTotal)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-black border-t border-black pt-1 mt-1">
            <span>TOTAL:</span>
            <span>₦{formatPrice(sale.total)}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-stone-400 my-2 pt-1 text-[11px]">
          <div className="font-bold mb-1">Tender:</div>
          {sale.payments.map((p, idx) => (
            <div key={idx} className="flex justify-between">
              <span>{p.paymentType}:</span>
              <span className="font-semibold">₦{formatPrice(p.amount)}</span>
            </div>
          ))}
          {sale.change > 0 && (
            <div className="flex justify-between font-bold mt-1 text-xs">
              <span>Change:</span>
              <span>₦{formatPrice(sale.change)}</span>
            </div>
          )}
        </div>

        <div className="text-center mt-6 pt-2 border-t border-black text-[10px] text-stone-600">
          <p className="font-semibold">Thank you for your business!</p>
          <p className="m-0 text-[9px]">Goods sold in good condition are not returnable</p>
        </div>
      </div>
    </div>
  );
}

function PaymentSummaryScreen({
  sale,
  onDone,
}: {
  sale: CompletedSaleData;
  onDone: () => void;
}) {
  const companiesQuery = useCompanies();
  const company = companiesQuery.data?.[0];

  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>(sale.customer?.email || "");
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);

  const [dontShowAgain, setDontShowAgain] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("pos_skip_receipt_summary") === "true";
    }
    return false;
  });

  const handleToggleDontShow = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    setDontShowAgain(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("pos_skip_receipt_summary", val ? "true" : "false");
    }
  };

  const handlePrintReceipt = () => {
    try {
      const html = getThermalReceiptHtml(sale, company);
      printHtmlContent(html);
      toast.info("Sending receipt to printer...");
    } catch (e) {
      console.error(e);
      window.print();
    }
  };

  const handlePrintInvoice = () => {
    try {
      const html = getInvoiceHtml(sale, company);
      printHtmlContent(html);
      toast.info("Opening invoice for printing...");
    } catch (e) {
      console.error(e);
      window.print();
    }
  };

  const handleSavePdf = async () => {
    try {
      const pdf = buildSaleReceiptPdf(sale);
      const defaultFileName = `Receipt-${sale.docNumber.replace(/\//g, "-")}.pdf`;

      try {
        const filePath = await save({
          defaultPath: defaultFileName,
          filters: [{ name: "PDF", extensions: ["pdf"] }],
        });
        if (filePath) {
          const arrayBuffer = pdf.output("arraybuffer");
          await writeFile(filePath, new Uint8Array(arrayBuffer));
          await openPath(filePath);
          toast.success("Receipt PDF saved and opened");
          return;
        }
      } catch (tauriErr) {
        console.log("Fallback to browser download:", tauriErr);
        pdf.save(defaultFileName);
        toast.success(`Receipt saved as ${defaultFileName}`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to save PDF");
    }
  };

  const handleConfirmSendEmail = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = emailInput.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setIsSendingEmail(true);
    setTimeout(() => {
      setIsSendingEmail(false);
      setShowEmailModal(false);
      toast.success(`Receipt #${sale.docNumber} sent to ${cleanEmail}`);
    }, 600);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (showEmailModal) return;
      if (e.key === "Enter" || e.key === "Escape") {
        onDone();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDone, showEmailModal]);

  return (
    <div className="fixed inset-0 z-50 flex h-screen bg-[#242424] text-white select-none">
      {/* ── In-DOM Print Overlay for direct window.print() ── */}
      <PrintReceiptOverlay sale={sale} company={company} />

      {/* ── Left Column: Items & Payment Breakdown ── */}
      <div className="w-80 border-r border-[#383838] bg-[#1e1e1e] flex flex-col justify-between shrink-0 print:hidden">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-5 py-3.5 border-b border-[#383838]">
            <h2 className="text-base font-semibold text-stone-100">Items</h2>
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-3">
            {sale.items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-start text-xs border-b border-[#383838]/40 pb-2.5"
              >
                <div>
                  <p className="font-bold text-white text-sm">{item.title}</p>
                  <p className="text-stone-400 mt-0.5 font-mono">
                    {item.qty} × {formatPrice(item.cost)}
                  </p>
                </div>
                <span className="font-bold text-white font-mono text-sm">
                  {formatPrice(item.qty * item.cost)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 border-t border-[#383838] space-y-2 bg-[#181818]">
          <div className="flex justify-between text-xs text-stone-400">
            <span>Subtotal</span>
            <span className="font-mono">{formatPrice(sale.subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs text-stone-400">
            <span>Tax</span>
            <span className="font-mono">{formatPrice(sale.taxTotal)}</span>
          </div>

          <div className="pt-2 border-t border-[#383838] flex justify-between items-baseline">
            <span className="text-sm font-bold text-white">Total</span>
            <span className="text-xl font-bold text-white font-mono">
              {formatPrice(sale.total)}
            </span>
          </div>

          <div className="pt-2 border-t border-dashed border-[#383838] space-y-1 text-xs">
            {sale.payments.map((p, idx) => (
              <div key={idx} className="flex justify-between text-stone-300">
                <span>{p.paymentType}:</span>
                <span className="font-mono font-semibold">
                  {formatPrice(p.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Main Area: Actions ── */}
      <div className="flex-1 flex flex-col bg-[#242424] min-w-0 print:hidden">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-[#383838] flex items-center justify-between">
          <h2 className="text-base font-semibold text-stone-100">Actions</h2>
          <button
            type="button"
            onClick={onDone}
            className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-8 py-5 flex flex-col justify-between">
          <div>
            {/* Change Banner */}
            <div className="flex items-center justify-center gap-3 py-3">
              <div className="bg-[#181818] p-2 rounded-lg border border-stone-700">
                <Coins className="w-6 h-6 text-emerald-400" />
              </div>
              <span className="text-xl font-medium text-stone-300">Change:</span>
              <span className="text-3xl font-bold text-emerald-400 font-mono tracking-tight">
                {formatPrice(sale.change)}
              </span>
            </div>

            {/* Receipt printer warning alert (matching Aronium layout) */}
            <div className="my-3 p-3 rounded-lg bg-amber-950/40 border border-amber-600/50 flex items-start justify-between gap-3 text-xs text-amber-200">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-300">
                    Receipt printer is not configured. To be able to print receipts, you need to set up receipt printer.
                  </p>
                  <p className="text-amber-400/80 mt-0.5 underline cursor-pointer hover:text-amber-300">
                    Learn more about configuring receipt printer
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="text-amber-400 hover:text-amber-200"
                onClick={(e) => {
                  (e.currentTarget.parentElement as HTMLElement)?.classList.add("hidden");
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Prompt */}
            <h2 className="text-3xl font-light text-stone-100 tracking-wide text-center my-8">
              How would the customer like their receipt?
            </h2>

            {/* 4 Action Cards Grid */}
            <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="flex flex-col items-center justify-center p-6 rounded-xl border border-sky-500/80 bg-sky-950/20 hover:bg-sky-900/30 text-white transition-all group shadow-md active:scale-95 min-h-[140px]"
              >
                <Receipt className="w-10 h-10 text-sky-400 mb-3 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-semibold tracking-wide">Print receipt</span>
              </button>

              <button
                type="button"
                onClick={handlePrintInvoice}
                className="flex flex-col items-center justify-center p-6 rounded-xl border border-stone-700 bg-stone-800/60 hover:bg-stone-800 text-stone-200 hover:text-white transition-all group shadow-md active:scale-95 min-h-[140px]"
              >
                <Printer className="w-10 h-10 text-stone-400 group-hover:text-stone-200 mb-3 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-semibold tracking-wide">Print invoice</span>
              </button>

              <button
                type="button"
                onClick={() => setShowEmailModal(true)}
                className="flex flex-col items-center justify-center p-6 rounded-xl border border-stone-700 bg-stone-800/60 hover:bg-stone-800 text-stone-200 hover:text-white transition-all group shadow-md active:scale-95 min-h-[140px]"
              >
                <Mail className="w-10 h-10 text-stone-400 group-hover:text-stone-200 mb-3 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-semibold tracking-wide">Send email</span>
              </button>

              <button
                type="button"
                onClick={handleSavePdf}
                className="flex flex-col items-center justify-center p-6 rounded-xl border border-stone-700 bg-stone-800/60 hover:bg-stone-800 text-stone-200 hover:text-white transition-all group shadow-md active:scale-95 min-h-[140px]"
              >
                <FileText className="w-10 h-10 text-stone-400 group-hover:text-stone-200 mb-3 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-semibold tracking-wide">Save as PDF</span>
              </button>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="pt-6 border-t border-[#383838] flex items-center justify-between">
            <label className="flex items-center gap-2.5 text-xs text-stone-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={handleToggleDontShow}
                className="rounded border-stone-700 bg-stone-800 text-emerald-500 focus:ring-0 w-4 h-4 cursor-pointer"
              />
              <span>Don't show this again</span>
            </label>

            <button
              type="button"
              onClick={onDone}
              className="bg-[#2e7d32] hover:bg-[#388e3c] text-white font-bold px-12 py-2.5 rounded text-sm transition-all active:scale-95 shadow-md flex items-center justify-center"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* ── Send Email Dialog ── */}
      {showEmailModal && (
        <Modal onClose={() => setShowEmailModal(false)}>
          <form
            onSubmit={handleConfirmSendEmail}
            className="bg-[#242424] text-white border border-stone-700 rounded-2xl w-96 shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="px-5 py-4 border-b border-stone-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-sky-400" />
                <span className="text-sm font-semibold text-stone-100">
                  Send Receipt via Email
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-stone-400 mb-1">
                  Customer Email
                </label>
                <input
                  type="email"
                  autoFocus
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full bg-[#181818] border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-stone-500 outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              <div className="bg-[#181818] p-3 rounded-xl border border-stone-800 text-xs text-stone-400 space-y-1">
                <p>
                  Receipt: <strong>#{sale.docNumber}</strong>
                </p>
                <p>
                  Total: <strong>₦{formatPrice(sale.total)}</strong>
                </p>
              </div>
            </div>

            <div className="px-5 py-3 bg-[#1e1e1e] border-t border-stone-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 text-xs font-medium rounded-xl border border-stone-700 text-stone-300 hover:bg-stone-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSendingEmail || !emailInput.trim()}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all shadow-md flex items-center gap-1.5"
              >
                {isSendingEmail ? "Sending..." : "Send Receipt"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Tax Management Screen Component ────────────────────────────────────────────

function TaxManagementScreen({
  taxes,
  searchTerm,
  selectedTaxId,
  setSearchTerm,
  setSelectedTaxId,
  onClose,
  onTaxSelect,
}: {
  taxes: any[];
  searchTerm: string;
  selectedTaxId: string;
  setSearchTerm: (s: string) => void;
  setSelectedTaxId: (id: string) => void;
  onClose: () => void;
  onTaxSelect: (tax: any) => void;
}) {
  const filteredTaxes = taxes.filter(
    (tax) =>
      tax.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tax.rate.toString().includes(searchTerm),
  );

  const handleTaxClick = (tax: any) => {
    setSelectedTaxId(tax.id);
    onTaxSelect(tax);
  };

  return (
    <div className="fixed inset-0 z-50 flex h-screen bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-200">
      <div className="flex-1 flex flex-col">
        <div className="px-5 py-4 border-b border-stone-300 dark:border-stone-700 flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-600 dark:text-stone-500 uppercase tracking-widest font-semibold">
              Tax Management
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-500 hover:text-stone-900 dark:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search taxes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Tax List */}
            <div className="space-y-2">
              {filteredTaxes.map((tax) => (
                <div
                  key={tax.id}
                  onClick={() => handleTaxClick(tax)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedTaxId === tax.id
                      ? "border-amber-500 bg-amber-950/20"
                      : "border-stone-300 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-stone-900 dark:text-stone-100">
                        {tax.name}
                      </p>
                      <p className="text-sm text-stone-500">
                        {tax.description || "No description"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-amber-600">
                        {tax.rate}%
                      </p>
                      <p className="text-xs text-stone-500">
                        {tax.compound ? "Compound" : "Standard"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Discount Management Screen Component ───────────────────────────────────────

function DiscountManagementScreen({
  discountType,
  discountInput,
  selectedPreset,
  setDiscountType,
  setDiscountInput,
  setSelectedPreset,
  onClose,
  onDiscountApply,
}: {
  discountType: "percent" | "amount";
  discountInput: string;
  selectedPreset: string;
  setDiscountType: (t: "percent" | "amount") => void;
  setDiscountInput: (v: string) => void;
  setSelectedPreset: (p: string) => void;
  onClose: () => void;
  onDiscountApply: (discount: {
    type: "percent" | "amount";
    value: number;
  }) => void;
}) {
  const presetDiscounts = [
    { id: "5", label: "5%", value: 5, type: "percent" as const },
    { id: "10", label: "10%", value: 10, type: "percent" as const },
    { id: "15", label: "15%", value: 15, type: "percent" as const },
    { id: "20", label: "20%", value: 20, type: "percent" as const },
    { id: "25", label: "25%", value: 25, type: "percent" as const },
    { id: "50", label: "50%", value: 50, type: "percent" as const },
    { id: "100", label: "₦100", value: 100, type: "amount" as const },
    { id: "500", label: "₦500", value: 500, type: "amount" as const },
    { id: "1000", label: "₦1,000", value: 1000, type: "amount" as const },
  ];

  const handleKey = useCallback(
    (val: string) => {
      if (val === "⌫") {
        setDiscountInput(
          discountInput.length > 1 ? discountInput.slice(0, -1) : "0",
        );
      } else if (val === "C") {
        setDiscountInput("0");
      } else if (val === ".") {
        if (!discountInput.includes(".")) setDiscountInput(discountInput + ".");
      } else {
        setDiscountInput(discountInput === "0" ? val : discountInput + val);
      }
    },
    [discountInput],
  );

  const KEYS = [
    "1",
    "2",
    "3",
    "⌫",
    "4",
    "5",
    "6",
    "C",
    "7",
    "8",
    "9",
    "↵",
    "0",
    ".",
    "",
    "",
  ];

  const handleApply = () => {
    const value = parseFloat(discountInput) || 0;
    if (value > 0) {
      onDiscountApply({ type: discountType, value });
      onClose();
    }
  };

  const handlePresetClick = (preset: (typeof presetDiscounts)[0]) => {
    setSelectedPreset(preset.id);
    setDiscountType(preset.type);
    setDiscountInput(preset.value.toString());
  };

  const discountValue = parseFloat(discountInput) || 0;
  const displayValue =
    discountType === "percent"
      ? `${discountValue}%`
      : `₦${discountValue.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

  return (
    <div className="fixed inset-0 z-50 flex h-screen bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-200">
      <div className="flex-1 flex flex-col">
        <div className="px-5 py-4 border-b border-stone-300 dark:border-stone-700 flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-600 dark:text-stone-500 uppercase tracking-widest font-semibold">
              Discount Management
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-500 hover:text-stone-900 dark:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <div className="space-y-6">
            {/* Discount Type Selection */}
            <div className="bg-stone-50 dark:bg-stone-800 rounded-lg p-4 border border-stone-200 dark:border-stone-700">
              <label className="text-xs text-stone-500 mb-2 block">
                Discount Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setDiscountType("percent")}
                  className={`py-2 rounded text-sm font-medium transition-colors border ${
                    discountType === "percent"
                      ? "bg-amber-900 border-amber-500 text-amber-200"
                      : "bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300"
                  }`}
                >
                  <Percent className="w-4 h-4 inline mr-1" />
                  Percentage
                </button>
                <button
                  onClick={() => setDiscountType("amount")}
                  className={`py-2 rounded text-sm font-medium transition-colors border ${
                    discountType === "amount"
                      ? "bg-amber-900 border-amber-500 text-amber-200"
                      : "bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300"
                  }`}
                >
                  <Banknote className="w-4 h-4 inline mr-1" />
                  Fixed Amount
                </button>
              </div>
            </div>

            {/* Preset Discounts */}
            <div>
              <label className="text-xs text-stone-500 mb-2 block">
                Quick Presets
              </label>
              <div className="grid grid-cols-3 gap-2">
                {presetDiscounts.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetClick(preset)}
                    className={`py-2 rounded text-sm font-medium transition-colors border ${
                      selectedPreset === preset.id
                        ? "bg-amber-900 border-amber-500 text-amber-200"
                        : "bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount Input */}
            <div>
              <label className="text-xs text-stone-500 mb-2 block">
                Custom Amount
              </label>
              <div className="space-y-3">
                <div>
                  <input
                    type="text"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleApply();
                    }}
                    className="w-full bg-transparent border-b-2 border-amber-500 pb-1 text-3xl text-amber-300 font-mono tabular-nums text-right outline-none focus:border-amber-400 transition-colors"
                    placeholder="0"
                  />
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold tabular-nums text-emerald-400">
                    {displayValue}
                  </p>
                </div>
              </div>
            </div>

            {/* Calculator */}
            <div className="grid grid-cols-4 gap-2.5">
              {KEYS.map((key, i) => {
                if (key === "") return <div key={i} />;
                const isBackspace = key === "⌫";
                const isEnter = key === "↵";
                return (
                  <button
                    key={i}
                    onClick={() => handleKey(key)}
                    className={`py-4 rounded text-lg font-medium transition-colors ${
                      isBackspace
                        ? "bg-red-700 hover:bg-red-600 text-stone-900 dark:text-white"
                        : isEnter
                          ? "bg-emerald-600 hover:bg-emerald-500 text-stone-900 dark:text-white font-bold"
                          : "bg-white dark:bg-stone-800 hover:bg-stone-100 dark:bg-stone-700 text-stone-900 dark:text-stone-100"
                    }`}
                  >
                    {key}
                  </button>
                );
              })}
            </div>

            {/* Apply Button */}
            <button
              onClick={handleApply}
              disabled={discountValue <= 0}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-stone-900 dark:text-white text-lg font-bold rounded transition-colors"
            >
              Apply Discount · {displayValue}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Customer Management Screen Component ───────────────────────────────────────

function CustomerManagementScreen({
  customers,
  customerSearchTerm,
  selectedCustomerId,
  showAddForm,
  newCustomer,
  setCustomerSearchTerm,
  setSelectedCustomerId,
  setShowAddForm,
  setNewCustomerData,
  onClose,
  onCustomerSelect,
  onCustomerAdd,
  onCustomerRemove,
}: {
  customers: any[];
  customerSearchTerm: string;
  selectedCustomerId: string;
  showAddForm: boolean;
  newCustomer: { name: string; email: string; phone: string };
  setCustomerSearchTerm: (s: string) => void;
  setSelectedCustomerId: (id: string) => void;
  setShowAddForm: (b: boolean) => void;
  setNewCustomerData: (c: {
    name: string;
    email: string;
    phone: string;
  }) => void;
  onClose: () => void;
  onCustomerSelect: (customer: any) => void;
  onCustomerAdd: (customer: {
    name: string;
    email?: string;
    phone?: string;
  }) => void;
  onCustomerRemove: (customerId: string) => void;
}) {
  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
      (customer.email &&
        customer.email
          .toLowerCase()
          .includes(customerSearchTerm.toLowerCase())) ||
      (customer.phone && customer.phone.includes(customerSearchTerm)),
  );

  const handleCustomerClick = (customer: any) => {
    setSelectedCustomerId(customer.id);
    onCustomerSelect(customer);
  };

  const handleAddCustomer = () => {
    if (newCustomer.name.trim()) {
      onCustomerAdd({
        name: newCustomer.name.trim(),
        email: newCustomer.email.trim() || undefined,
        phone: newCustomer.phone.trim() || undefined,
      });
      setNewCustomerData({ name: "", email: "", phone: "" });
      setShowAddForm(false);
    }
  };

  const handleRemoveCustomer = (customerId: string) => {
    if (confirm("Are you sure you want to remove this customer?")) {
      onCustomerRemove(customerId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex h-screen bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-200">
      <div className="flex-1 flex flex-col">
        <div className="px-5 py-4 border-b border-stone-300 dark:border-stone-700 flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-600 dark:text-stone-500 uppercase tracking-widest font-semibold">
              Customer Management
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-500 hover:text-stone-900 dark:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <div className="space-y-4">
            {/* Search and Add */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Customer
              </button>
            </div>

            {/* Add Customer Form */}
            {showAddForm && (
              <div className="bg-stone-50 dark:bg-stone-800 rounded-lg p-4 border border-stone-200 dark:border-stone-700">
                <h3 className="text-sm font-medium text-stone-900 dark:text-stone-100 mb-3">
                  Add New Customer
                </h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Customer Name *"
                    value={newCustomer.name}
                    onChange={(e) =>
                      setNewCustomerData({
                        ...newCustomer,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    value={newCustomer.email}
                    onChange={(e) =>
                      setNewCustomerData({
                        ...newCustomer,
                        email: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <input
                    type="tel"
                    placeholder="Phone (optional)"
                    value={newCustomer.phone}
                    onChange={(e) =>
                      setNewCustomerData({
                        ...newCustomer,
                        phone: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddCustomer}
                      disabled={!newCustomer.name.trim()}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Add Customer
                    </button>
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setNewCustomerData({ name: "", email: "", phone: "" });
                      }}
                      className="flex-1 py-2 bg-stone-600 hover:bg-stone-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Customer List */}
            <div className="space-y-2">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors group ${
                    selectedCustomerId === customer.id
                      ? "border-amber-500 bg-amber-950/20"
                      : "border-stone-300 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="flex-1"
                      onClick={() => handleCustomerClick(customer)}
                    >
                      <p className="font-medium text-stone-900 dark:text-stone-100">
                        {customer.name}
                      </p>
                      {customer.email && (
                        <p className="text-sm text-stone-500">
                          {customer.email}
                        </p>
                      )}
                      {customer.phone && (
                        <p className="text-sm text-stone-500">
                          {customer.phone}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveCustomer(customer.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:text-red-600 hover:bg-red-950 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Payment Screen ───────────────────────────────────────────────────────────

function PaymentScreen({
  total,
  subtotal,
  taxTotal,
  items,
  paymentTypes,
  customer,
  paidInput,
  selectedPaymentType,
  selectedTax,
  appliedDiscount,
  setPaidInput,
  setSelectedPaymentType,
  setSelectedTax,
  setAppliedDiscount,
  showTaxManagement,
  showDiscountManagement,
  showCustomerManagement,
  setShowTaxManagement,
  setShowDiscountManagement,
  setShowCustomerManagement,
  onConfirm,
  onClose,
  isContinuingPayment = false,
}: {
  total: number;
  subtotal: number;
  taxTotal: number;
  items: CartItem[];
  paymentTypes: any[];
  customer: any | null;
  paidInput: string;
  selectedPaymentType: string;
  selectedTax: any | null;
  appliedDiscount: { type: "percent" | "amount"; value: number } | null;
  setPaidInput: (v: string) => void;
  setSelectedPaymentType: (v: string) => void;
  setSelectedTax: (t: any) => void;
  setAppliedDiscount: (
    d: { type: "percent" | "amount"; value: number } | null,
  ) => void;
  showTaxManagement: boolean;
  showDiscountManagement: boolean;
  showCustomerManagement: boolean;
  setShowTaxManagement: (b: boolean) => void;
  setShowDiscountManagement: (b: boolean) => void;
  setShowCustomerManagement: (b: boolean) => void;
  onConfirm: (
    payments: { paymentId: string; paymentType: string; amount: number }[],
  ) => void;
  onClose: () => void;
  isContinuingPayment?: boolean;
}) {
  const posDispatch = useDispatch();
  const {
    taxSearchTerm,
    selectedTaxId,
    discountType,
    discountInput,
    selectedPreset,
    customerSearchTerm,
    selectedCustomerId,
    showAddCustomerForm,
    newCustomerData,
  } = useSelector((state: RootState) => state.pos);
  const setTaxSearchTerm = (val: string) =>
    posDispatch(setTaxSearchTermAction(val));
  const setSelectedTaxId = (val: string) =>
    posDispatch(setSelectedTaxIdAction(val));
  const setDiscountType = (val: "percent" | "amount") =>
    posDispatch(setDiscountTypeAction(val));
  const setDiscountInput = (val: string) =>
    posDispatch(setDiscountInputAction(val));
  const setSelectedPreset = (val: string) =>
    posDispatch(setSelectedPresetAction(val));
  const setCustomerSearchTerm = (val: string) =>
    posDispatch(setCustomerSearchTermAction(val));
  const setSelectedCustomerId = (val: string) =>
    posDispatch(setSelectedCustomerIdAction(val));
  const setShowAddCustomerForm = (val: boolean) =>
    posDispatch(setShowAddCustomerFormAction(val));
  const setNewCustomerData = (val: {
    name: string;
    email: string;
    phone: string;
  }) => posDispatch(setNewCustomerDataAction(val));
  const enabled = paymentTypes.filter((p) => p.enabled && p.id !== "split");
  const displayTypes =
    enabled.length > 0
      ? enabled
      : [
          { id: "cash", name: "Cash", changeAllowed: true },
          { id: "card", name: "Card", changeAllowed: false },
          { id: "check", name: "Check", changeAllowed: false },
        ];

  // Initialize selectedPaymentType on component mount if needed
  React.useEffect(() => {
    if (!selectedPaymentType && isContinuingPayment) {
      setSelectedPaymentType("split");
    } else if (!selectedPaymentType) {
      setSelectedPaymentType(displayTypes[0]?.id ?? "");
    }
  }, [isContinuingPayment, displayTypes]);

  // paidInput and other state are now managed by Redux
  const paidInputRef = useRef<HTMLInputElement>(null);

  // Real taxes from database
  const taxesQuery = useTaxes();
  const taxes = taxesQuery.data ?? [];

  // Real customers from database
  const customersQuery = useCustomers();
  const customers = customersQuery.data ?? [];

  const selectedType = displayTypes.find((p) => p.id === selectedPaymentType);
  const paidAmount = parseFloat(paidInput) || 0;

  // Calculate discount amount
  const discountAmount = appliedDiscount
    ? appliedDiscount.type === "percent"
      ? subtotal * (appliedDiscount.value / 100)
      : appliedDiscount.value
    : 0;

  // Calculate adjusted totals
  const adjustedSubtotal = subtotal - discountAmount;
  const adjustedTaxTotal = selectedTax
    ? adjustedSubtotal * (selectedTax.rate / 100)
    : taxTotal;
  const adjustedTotal = adjustedSubtotal + adjustedTaxTotal;

  // Use adjusted total for payment calculations
  const finalTotal = adjustedTotal;
  const balance = paidAmount - finalTotal;

  // Management screen handlers
  const handleTaxSelect = (tax: any) => {
    console.log("Tax selected:", tax);
    setSelectedTax(tax);
    toast.success(`Tax "${tax.name}" (${tax.rate}%) selected`);
    setShowTaxManagement(false);
  };

  const handleDiscountApply = (discount: {
    type: "percent" | "amount";
    value: number;
  }) => {
    console.log("Discount applied:", discount);
    setAppliedDiscount(discount);
    const displayValue =
      discount.type === "percent"
        ? `${discount.value}%`
        : `₦${discount.value.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
    toast.success(`Discount of ${displayValue} applied`);
    setShowDiscountManagement(false);
  };

  const handleCustomerSelect = (customer: any) => {
    console.log("Customer selected:", customer);
    // Update the customer prop in parent component (would need to pass setter in real app)
    toast.success(`Customer "${customer.name}" selected`);
    setShowCustomerManagement(false);
  };

  const handleCustomerAdd = (customer: {
    name: string;
    email?: string;
    phone?: string;
  }) => {
    console.log("Customer added:", customer);
    // In a real app, this would add the customer to the database
    toast.success(`Customer "${customer.name}" added successfully`);
  };

  const handleCustomerRemove = (customerId: string) => {
    console.log("Customer removed:", customerId);
    // In a real app, this would remove the customer from the database
    toast.success("Customer removed successfully");
  };

  // Update paid input when final total changes (tax/discount applied)
  React.useEffect(() => {
    setPaidInput(finalTotal.toFixed(2));
  }, [finalTotal]);

  const handleKey = React.useCallback(
    (val: string) => {
      if (val === "⌫") {
        setPaidInput(paidInput.length > 1 ? paidInput.slice(0, -1) : "0");
      } else if (val === "C") {
        setPaidInput("0");
      } else if (val === ".") {
        setPaidInput(paidInput.includes(".") ? paidInput : paidInput + ".");
      } else if (val === "-") {
        setPaidInput(total.toFixed(2));
      } else {
        setPaidInput(paidInput === "0" ? val : paidInput + val);
      }
    },
    [total],
  );

  const KEYS = [
    "1",
    "2",
    "3",
    "⌫",
    "4",
    "5",
    "6",
    "C",
    "7",
    "8",
    "9",
    "↵",
    "-",
    "0",
    ".",
    "",
  ];

  const handleConfirm = React.useCallback(() => {
    if (!selectedPaymentType || !selectedType) return;
    const paymentData = [
      {
        paymentId: selectedPaymentType,
        paymentType: selectedType.name,
        amount: paidAmount,
      },
    ];
    console.log("PaymentScreen - handleConfirm calling onConfirm with:", {
      paymentData,
      paidAmount,
      total,
    });
    onConfirm(paymentData);
  }, [selectedPaymentType, selectedType, paidAmount, onConfirm, total]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isInputFocused = document.activeElement === paidInputRef.current;

      // If input is focused, only handle Escape and special keys, not numbers/decimal
      if (isInputFocused) {
        if (e.key === "Escape") onClose();
        return;
      }

      // When input is not focused, handle all keyboard input for buttons
      if (e.key >= "0" && e.key <= "9") handleKey(e.key);
      else if (e.key === ".") handleKey(".");
      else if (e.key === "Enter") handleConfirm();
      else if (e.key === "Backspace") handleKey("⌫");
      else if (e.key === "Escape") onClose();
      else if (e.key.toLowerCase() === "c") handleKey("C");
      else if (e.key === "-" || e.key === "v") handleKey("-");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey, handleConfirm, onClose]);

  // If split payment is selected, show the split payment screen
  if (selectedPaymentType === "split") {
    return (
      <SplitPaymentScreen
        total={total}
        subtotal={subtotal}
        taxTotal={taxTotal}
        items={items}
        paymentTypes={paymentTypes}
        customer={customer}
        paidInput={paidInput}
        selectedTypeId={selectedPaymentType}
        setPaidInput={setPaidInput}
        setSelectedTypeId={setSelectedPaymentType}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex min-h-screen  bg-white dark:bg-stone-900 text-stone-900  dark:text-stone-200">
      <div className="w-1/3 border-r border-stone-300 dark:border-stone-700 flex flex-col">
        <div className="px-5 py-4 border-b border-stone-300 dark:border-stone-700 flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-600 dark:text-stone-500 uppercase tracking-widest font-semibold">
              Payment
            </p>
            {customer ? (
              <p className="text-xs text-amber-400 mt-0.5">{customer.name}</p>
            ) : (
              <p className="text-xs text-stone-400 mt-0.5">Walk-in Customer</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-stone-500 hover:text-stone-900 dark:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto px-5 py-3 space-y-2">
          <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
            Items
          </p>
          {items.map((item) => (
            <div
              key={item.id}
              className="flex justify-between text-sm border-b border-stone-300 dark:border-stone-800 pb-2"
            >
              <span className="text-stone-700 dark:text-stone-300 truncate max-w-[65%]">
                {item.qty !== 1 && (
                  <span className="text-stone-500 mr-1">{item.qty}×</span>
                )}
                {item.title}
              </span>
              <span className="tabular-nums text-stone-800 dark:text-stone-200">
                ₦
                {itemTotal(item).toLocaleString("en-NG", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-stone-200 dark:border-stone-700 space-y-1.5 text-sm">
          <div className="flex justify-between text-stone-500 dark:text-stone-400">
            <span>Subtotal</span>
            <span>
              ₦{subtotal.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-stone-500 dark:text-stone-400">
            <span>Tax</span>
            <span>
              ₦{taxTotal.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between font-bold text-xl text-amber-400 pt-2 border-t border-stone-200 dark:border-stone-700">
            <span>Total</span>
            <span>
              ₦{total.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      <div className="w-2/3 flex overflow-y-auto  flex-col p-6 gap-5">
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="bg-red-600 hover:bg-red-700 text-stone-900 dark:text-white text-sm font-medium px-5 py-2 rounded transition-colors"
          >
            Cancel
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setShowTaxManagement(true)}
              className="bg-white dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-sm px-4 py-2 rounded transition-colors"
            >
              Taxes
            </button>
            <button
              onClick={() => setShowDiscountManagement(true)}
              className="bg-white dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-sm px-4 py-2 rounded transition-colors"
            >
              Discount
            </button>
            <button
              onClick={() => toast.info("Rounds management coming soon!")}
              className="bg-white dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-sm px-4 py-2 rounded transition-colors"
            >
              Rounds
            </button>
            <button
              onClick={() => setShowCustomerManagement(true)}
              className={`text-sm px-4 py-2 rounded transition-colors ${customer ? "bg-amber-800 hover:bg-amber-700 text-amber-200 border border-amber-600" : "bg-white dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300"}`}
            >
              {customer ? customer.name.split(" ")[0] : "Customer"}
            </button>
          </div>
        </div>

        {/* Selected Items Display */}
        <div className="bg-stone-50 dark:bg-stone-800 rounded-lg p-3 space-y-2">
          <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold mb-2">
            Applied Items
          </p>

          {/* Selected Tax */}
          {selectedTax && (
            <div className="flex items-center justify-between bg-rose-100 dark:bg-rose-900/30 rounded p-2">
              <div className="flex items-center gap-2">
                <Receipt className="w-3 h-3 text-rose-600" />
                <span className="text-xs font-medium text-rose-700 dark:text-rose-300">
                  Tax
                </span>
              </div>
              <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
                {selectedTax.name} ({selectedTax.rate}%)
              </span>
            </div>
          )}

          {/* Applied Discount */}
          {appliedDiscount && (
            <div className="flex items-center justify-between bg-orange-100 dark:bg-orange-900/30 rounded p-2">
              <div className="flex items-center gap-2">
                <Percent className="w-3 h-3 text-orange-600" />
                <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
                  Discount
                </span>
              </div>
              <span className="text-xs font-bold text-orange-700 dark:text-orange-300">
                {appliedDiscount.type === "percent"
                  ? `${appliedDiscount.value}%`
                  : `₦${appliedDiscount.value.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`}
              </span>
            </div>
          )}

          {/* Selected Customer */}
          {customer && (
            <div className="flex items-center justify-between bg-amber-100 dark:bg-amber-900/30 rounded p-2">
              <div className="flex items-center gap-2">
                <Users className="w-3 h-3 text-amber-600" />
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  Customer
                </span>
              </div>
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300 truncate max-w-24">
                {customer.name}
              </span>
            </div>
          )}

          {!selectedTax && !appliedDiscount && !customer && (
            <div className="text-center text-xs text-stone-400 italic">
              No tax, discount, or customer selected
            </div>
          )}
        </div>

        <div className="flex gap-6 flex-1 min-h-0">
          <div className="w-[180px] flex flex-col gap-2 shrink-0 overflow-y-auto pr-1">
            <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold mb-1">
              Payment type
            </p>
            {displayTypes.map((pt) => (
              <button
                key={pt.id}
                onClick={() => setSelectedPaymentType(pt.id)}
                className={`w-full py-3 rounded text-sm font-medium flex items-center justify-center gap-2 transition-colors border ${
                  selectedPaymentType === pt.id
                    ? "bg-amber-900 border-amber-500 text-amber-200"
                    : "bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300"
                }`}
              >
                {pt.name.toLowerCase().includes("card") ? (
                  <CreditCard className="w-4 h-4" />
                ) : pt.name.toLowerCase().includes("check") ||
                  pt.name.toLowerCase().includes("cheque") ? (
                  <Receipt className="w-4 h-4" />
                ) : (
                  <Banknote className="w-4 h-4" />
                )}
                {pt.name}
              </button>
            ))}

            {/* Split Payment Button under the list of payment types */}
            <div className="pt-2 border-t border-stone-200 dark:border-stone-700 mt-1">
              <button
                onClick={() => setSelectedPaymentType("split")}
                className={`w-full py-3 rounded text-sm font-medium flex items-center justify-center gap-2 transition-colors border ${
                  selectedPaymentType === "split"
                    ? "bg-amber-900 border-amber-500 text-amber-200"
                    : "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/60 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-300"
                }`}
              >
                <Percent className="w-4 h-4 text-amber-500" />
                Split Payment
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-between min-h-0">
            <div className="space-y-3">
              {/* Subtotal */}
              <div>
                <p className="text-xs text-stone-500 mb-0.5">Subtotal</p>
                <p className="text-lg font-medium text-stone-300 tabular-nums">
                  ₦{formatPrice(subtotal)}
                </p>
              </div>

              {/* Discount */}
              {discountAmount > 0 && (
                <div>
                  <p className="text-xs text-stone-500 mb-0.5">Discount</p>
                  <p className="text-lg font-medium text-orange-400 tabular-nums">
                    -₦{formatPrice(discountAmount)}
                  </p>
                </div>
              )}

              {/* Tax */}
              <div>
                <p className="text-xs text-stone-500 mb-0.5">Tax</p>
                <p className="text-lg font-medium text-stone-300 tabular-nums">
                  ₦{formatPrice(adjustedTaxTotal)}
                </p>
              </div>

              {/* Final Total */}
              <div className="pt-2 border-t border-stone-300 dark:border-stone-700">
                <p className="text-xs text-stone-500 mb-0.5">Total</p>
                <p className="text-3xl font-bold text-amber-400 tabular-nums">
                  ₦{formatPrice(finalTotal)}
                </p>
                {(discountAmount > 0 || selectedTax) && (
                  <p className="text-xs text-stone-400 mt-1">
                    {discountAmount > 0 &&
                      `Discount: -₦${formatPrice(discountAmount)} `}
                    {selectedTax && `Tax: ${selectedTax.rate}%`}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-stone-500 mb-0.5">Paid</p>
                <input
                  ref={paidInputRef}
                  type="number"
                  value={paidInput}
                  onChange={(e) => setPaidInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConfirm();
                  }}
                  className="w-full bg-transparent border-b-2 border-amber-500 pb-1 text-3xl text-amber-300 font-mono tabular-nums text-right outline-none focus:border-amber-400 transition-colors"
                  placeholder="0.00"
                />
              </div>
              <div>
                <p className="text-xs text-stone-500 mb-0.5">Balance/Change</p>
                <p
                  className={`text-2xl font-bold tabular-nums ${
                    balance > 0
                      ? "text-emerald-400"
                      : balance < 0
                        ? "text-red-400"
                        : "text-stone-400"
                  }`}
                >
                  ₦{formatPrice(Math.abs(balance))}
                  {balance < 0 && <span className="text-sm ml-1">(owed)</span>}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              {KEYS.map((key, i) => {
                if (key === "") return <div key={i} />;
                const isBackspace = key === "⌫";
                const isEnter = key === "↵";
                const isDash = key === "-";
                return (
                  <button
                    key={i}
                    onClick={() => handleKey(key)}
                    className={`py-4 rounded text-lg font-medium transition-colors ${
                      isBackspace
                        ? "bg-red-700 hover:bg-red-600 text-stone-900 dark:text-white"
                        : isEnter
                          ? "bg-emerald-600 hover:bg-emerald-500 text-stone-900 dark:text-white font-bold"
                          : isDash
                            ? "bg-stone-100 dark:bg-stone-700 hover:bg-stone-600 text-amber-300 text-sm"
                            : "bg-white dark:bg-stone-800 hover:bg-stone-100 dark:bg-stone-700 text-stone-900 dark:text-stone-100"
                    }`}
                    title={isDash ? "Set to exact total" : undefined}
                  >
                    {isDash ? "Exact" : key}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleConfirm}
              disabled={!selectedPaymentType || paidAmount <= 0}
              className="w-full py-4 mt-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-stone-900 dark:text-white text-lg font-bold rounded transition-colors"
            >
              Confirm Payment · ₦
              {finalTotal.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </button>
          </div>
        </div>
      </div>

      {/* Management Screen Modals */}
      {showTaxManagement && (
        <TaxManagementScreen
          taxes={taxes}
          searchTerm={taxSearchTerm}
          selectedTaxId={selectedTaxId}
          setSearchTerm={setTaxSearchTerm}
          setSelectedTaxId={setSelectedTaxId}
          onClose={() => setShowTaxManagement(false)}
          onTaxSelect={handleTaxSelect}
        />
      )}

      {showDiscountManagement && (
        <DiscountManagementScreen
          discountType={discountType}
          discountInput={discountInput}
          selectedPreset={selectedPreset}
          setDiscountType={setDiscountType}
          setDiscountInput={setDiscountInput}
          setSelectedPreset={setSelectedPreset}
          onClose={() => setShowDiscountManagement(false)}
          onDiscountApply={handleDiscountApply}
        />
      )}

      {showCustomerManagement && (
        <CustomerManagementScreen
          customers={customers}
          customerSearchTerm={customerSearchTerm}
          selectedCustomerId={selectedCustomerId}
          showAddForm={showAddCustomerForm}
          newCustomer={newCustomerData}
          setCustomerSearchTerm={setCustomerSearchTerm}
          setSelectedCustomerId={setSelectedCustomerId}
          setShowAddForm={setShowAddCustomerForm}
          setNewCustomerData={setNewCustomerData}
          onClose={() => setShowCustomerManagement(false)}
          onCustomerSelect={handleCustomerSelect}
          onCustomerAdd={handleCustomerAdd}
          onCustomerRemove={handleCustomerRemove}
        />
      )}
    </div>
  );
}

// ─── Refund Screen ────────────────────────────────────────────────────────────

function RefundScreen({
  documents,
  paymentTypes,
  receipt,
  paymentType,
  error,
  setReceipt,
  setPaymentType,
  setError,
  onRefund,
  onClose,
}: {
  documents: any[];
  paymentTypes: any[];
  receipt: string;
  paymentType: string;
  error: string;
  setReceipt: (r: string) => void;
  setPaymentType: (t: string) => void;
  setError: (e: string) => void;
  onRefund: (docId: string) => void;
  onClose: () => void;
}) {
  const matchedDoc =
    (documents ?? []).find(
      (d) =>
        d.status === "posted" &&
        d.number.toLowerCase() === receipt.trim().toLowerCase(),
    ) ?? null;

  const enabled = paymentTypes.filter((p) => p.enabled);
  const displayPayments =
    enabled.length > 0
      ? enabled
      : [
          { id: "cash", name: "CASH" },
          { id: "card", name: "CARD" },
          { id: "check", name: "CHECK" },
        ];

  const selectedPayment =
    displayPayments.find(
      (p) => p.id === paymentType || p.name === paymentType,
    ) ?? displayPayments[0];

  const refundItems: {
    name: string;
    qty: number;
    price: number;
    total: number;
  }[] = matchedDoc
    ? (matchedDoc.items ?? []).map((i: any) => ({
        name: i.name,
        qty: Math.abs(i.quantity),
        price: i.priceBeforeTax,
        total: Math.abs(i.total ?? i.priceBeforeTax * i.quantity),
      }))
    : [];

  const refundTotal = refundItems.reduce((s, i) => s + i.total, 0);

  function handleConfirm() {
    if (!receipt.trim()) {
      setError("Enter a receipt number.");
      return;
    }
    if (!matchedDoc) {
      setError(`Receipt "${receipt}" not found.`);
      return;
    }
    setError("");
    onRefund(matchedDoc.id);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex h-screen bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-200">
      <div className="w-1/3 border-r border-stone-300 dark:border-stone-700 flex flex-col">
        <div className="px-5 py-4 border-b border-stone-300 dark:border-stone-700">
          <p className="text-xs text-stone-600 dark:text-stone-500 uppercase tracking-widest font-semibold">
            Refund
          </p>
          <p className="text-base font-semibold text-stone-900 dark:text-stone-100 mt-0.5">
            {matchedDoc ? matchedDoc.number : "—"}
          </p>
          {matchedDoc?.customer?.name && (
            <p className="text-xs text-amber-400 mt-0.5">
              {matchedDoc.customer.name}
            </p>
          )}
        </div>
        <div className="flex-1 overflow-auto px-5 py-3 space-y-2">
          <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
            Refund items
          </p>
          {refundItems.length === 0 ? (
            <p className="text-sm text-stone-600 py-4 text-center">
              {receipt.trim() ? "No items found" : "Enter receipt number"}
            </p>
          ) : (
            refundItems.map((item, i) => (
              <div
                key={i}
                className="flex justify-between text-sm border-b border-stone-300 dark:border-stone-800 pb-2"
              >
                <div>
                  <p className="text-stone-700 dark:text-stone-300 truncate max-w-[180px]">
                    {item.name}
                  </p>
                  <p className="text-xs text-stone-500">
                    {item.qty} × ₦{formatPrice(item.price)}
                  </p>
                </div>
                <span className="text-red-400 tabular-nums">
                  ₦{formatPrice(item.total)}
                </span>
              </div>
            ))
          )}
        </div>
        <div className="px-5 py-4 border-t border-stone-200 dark:border-stone-700">
          <p className="text-xs text-stone-500 uppercase tracking-wider">
            Total refund amount
          </p>
          <p
            className={`text-2xl font-bold mt-1 tabular-nums ${refundTotal > 0 ? "text-amber-400" : "text-stone-600"}`}
          >
            {refundTotal > 0 ? `−₦${formatPrice(refundTotal)}` : "—"}
          </p>
        </div>
      </div>

      <div className="w-2/3 p-6 flex flex-col relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          <div className="w-16 h-16 rounded-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center text-3xl text-stone-500 dark:text-stone-400 select-none">
            ↩
          </div>
          <p className="text-stone-500 dark:text-stone-400 text-center max-w-sm text-sm">
            Enter the receipt number and select a refund payment type to
            confirm.
          </p>
          <div className="w-96 flex flex-col gap-1.5">
            <label className="text-xs text-stone-500 dark:text-stone-400">
              Receipt number
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
              <input
                autoFocus
                value={receipt}
                onChange={(e) => {
                  setReceipt(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                placeholder="e.g. POS-00012345"
                className={`w-full bg-white dark:bg-stone-800 border pl-9 pr-4 py-2.5 text-sm text-stone-900 dark:text-stone-100 focus:outline-none transition-colors rounded-sm
                  ${error ? "border-red-500 focus:border-red-400" : matchedDoc ? "border-emerald-500 focus:border-emerald-400" : "border-stone-600 focus:border-amber-500"}`}
              />
              {matchedDoc && (
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
              )}
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            {matchedDoc && !error && (
              <p className="text-xs text-emerald-400">
                Found · {new Date(matchedDoc.date).toLocaleDateString()} · ₦
                {formatPrice(matchedDoc.total ?? 0)}
              </p>
            )}
          </div>
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs text-stone-500 uppercase tracking-wider">
              Refund payment type
            </p>
            <div className="flex gap-3 flex-wrap justify-center">
              {displayPayments.map((pt) => {
                const active =
                  (paymentType || selectedPayment?.id) === pt.id ||
                  (paymentType || selectedPayment?.name) === pt.name;
                return (
                  <button
                    key={pt.id}
                    onClick={() => setPaymentType(pt.id || pt.name)}
                    className={`relative px-7 py-4 border rounded text-sm font-medium transition-colors ${active ? "bg-amber-700 border-amber-500 text-stone-900 dark:text-white" : "bg-white dark:bg-stone-800 border-stone-600 hover:bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300"}`}
                  >
                    {active && (
                      <span className="absolute -top-2.5 -left-2.5 bg-amber-500 rounded-full w-6 h-6 flex items-center justify-center text-xs text-stone-900 dark:text-white shadow">
                        ✓
                      </span>
                    )}
                    {pt.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-stone-300 dark:border-stone-800">
          <button
            onClick={handleConfirm}
            disabled={!receipt.trim()}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-stone-900 dark:text-white px-6 py-2.5 rounded text-sm font-medium transition-colors"
          >
            <Check className="w-4 h-4" /> OK
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-stone-900 dark:text-white px-6 py-2.5 rounded text-sm font-medium transition-colors"
          >
            <X className="w-4 h-4" /> Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Transfer Quantity Modal (Pen Icon) ───────────────────────────────────────

function TransferQtyModal({
  item,
  maxQty,
  onConfirm,
  onClose,
}: {
  item: CartItem;
  maxQty: number;
  onConfirm: (qty: number) => void;
  onClose: () => void;
}) {
  const [qtyStr, setQtyStr] = useState<string>("1");

  const handleDigit = (d: string) => {
    if (qtyStr === "0") {
      setQtyStr(d);
    } else {
      const next = qtyStr + d;
      const num = parseInt(next, 10);
      if (!isNaN(num) && num <= maxQty) {
        setQtyStr(next);
      }
    }
  };

  const handleBackspace = () => {
    if (qtyStr.length <= 1) {
      setQtyStr("0");
    } else {
      setQtyStr(qtyStr.slice(0, -1));
    }
  };

  const handleClear = () => {
    setQtyStr("0");
  };

  const handleConfirm = () => {
    const num = Math.min(maxQty, Math.max(1, parseInt(qtyStr, 10) || 1));
    onConfirm(num);
  };

  return (
    <Modal onClose={onClose}>
      <div className="bg-[#242424] text-white border border-stone-700 rounded-2xl w-80 shadow-2xl overflow-hidden flex flex-col select-none">
        <div className="px-5 py-3.5 border-b border-stone-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold truncate max-w-[200px]">
              Transfer Qty – {item.title}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex justify-between text-xs text-stone-400">
            <span>Available in order:</span>
            <span className="font-bold text-white">{maxQty}</span>
          </div>

          <div className="bg-[#181818] border border-stone-700 rounded-xl p-3 text-center">
            <span className="text-3xl font-mono font-bold text-amber-400">
              {qtyStr}
            </span>
          </div>

          {/* Quick pills */}
          <div className="grid grid-cols-4 gap-1.5">
            {[1, 2, 5, maxQty].map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setQtyStr(String(Math.min(maxQty, q)))}
                className="py-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg text-xs font-semibold text-stone-200 active:scale-95"
              >
                {idx === 3 ? `All (${maxQty})` : q}
              </button>
            ))}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {["7", "8", "9", "4", "5", "6", "1", "2", "3"].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleDigit(d)}
                className="h-11 bg-[#1e1e1e] hover:bg-stone-800 border border-stone-700/80 rounded-xl text-base font-bold text-white active:scale-95 transition-all shadow-sm flex items-center justify-center"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="h-11 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 rounded-xl text-sm font-bold text-red-300 active:scale-95 transition-all flex items-center justify-center"
            >
              C
            </button>
            <button
              type="button"
              onClick={() => handleDigit("0")}
              className="h-11 bg-[#1e1e1e] hover:bg-stone-800 border border-stone-700/80 rounded-xl text-base font-bold text-white active:scale-95 transition-all shadow-sm flex items-center justify-center"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="h-11 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-xl text-sm font-bold text-stone-300 active:scale-95 transition-all flex items-center justify-center"
            >
              ⌫
            </button>
          </div>
        </div>

        <div className="px-4 py-3 bg-[#1e1e1e] border-t border-stone-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-stone-700 text-stone-300 hover:bg-stone-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-6 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95"
          >
            Set Quantity
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Open Orders / Select Order Modal ─────────────────────────────────────────

function OpenOrdersModal({
  documents,
  currentOrderNumber,
  onSelectOrder,
  onClose,
}: {
  documents: any[];
  currentOrderNumber?: string;
  onSelectOrder: (order: any | string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState<string>("" );
  const [customOrderNum, setCustomOrderNum] = useState<string>("" );

  const draftOrders = (documents ?? []).filter(
    (d: any) =>
      d.status === "draft" &&
      (!currentOrderNumber || d.number !== currentOrderNumber),
  );

  const filtered = draftOrders.filter((d: any) => {
    const q = search.toLowerCase();
    const num = (d.number || "").toLowerCase();
    const cust = (d.customer?.name || d.customerName || "").toLowerCase();
    const ext = (d.externalNumber || "").toLowerCase();
    return num.includes(q) || cust.includes(q) || ext.includes(q);
  });

  const handleSelectNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customOrderNum.trim()) return;
    onSelectOrder(customOrderNum.trim());
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <div className="bg-[#242424] text-white border border-stone-700 rounded-2xl w-[640px] max-h-[85vh] shadow-2xl overflow-hidden flex flex-col select-none">
        <div className="px-6 py-4 border-b border-stone-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LayoutGrid className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-stone-100">
              Select or Open Order
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 border-b border-stone-700 bg-[#1e1e1e] flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search saved open orders by #, customer..."
                className="w-full bg-[#181818] border border-stone-700 rounded-xl pl-9 pr-3.5 py-2 text-sm text-white placeholder-stone-500 outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Enter custom order number / table */}
          <form onSubmit={handleSelectNew} className="flex gap-2 items-center">
            <input
              type="text"
              value={customOrderNum}
              onChange={(e) => setCustomOrderNum(e.target.value)}
              placeholder="Or enter new order # / Table (e.g. 4, Table 12)"
              className="flex-1 bg-[#181818] border border-stone-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-stone-500 outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!customOrderNum.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all"
            >
              Use New Order #
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-5 max-h-80 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-stone-400 text-sm">
              <p className="font-medium">No saved open orders found</p>
              <p className="text-xs text-stone-500 mt-1">
                You can enter a new order number above or save orders first.
              </p>
            </div>
          ) : (
            filtered.map((doc: any) => {
              const itemsCount = (doc.items || []).length;
              return (
                <div
                  key={doc.id}
                  onClick={() => {
                    onSelectOrder(doc);
                    onClose();
                  }}
                  className="p-3.5 bg-[#1e1e1e] hover:bg-stone-800 border border-stone-700/70 hover:border-sky-500 rounded-xl cursor-pointer transition-all flex items-center justify-between group shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sky-400 text-sm">
                        {doc.number}
                      </span>
                      {doc.externalNumber && (
                        <span className="text-[10px] bg-stone-700 text-stone-300 px-2 py-0.5 rounded-full font-medium">
                          {doc.externalNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-300">
                      Customer:{" "}
                      <strong>
                        {doc.customer?.name || doc.customerName || "Walk-in"}
                      </strong>
                    </p>
                    <p className="text-[11px] text-stone-500">
                      {itemsCount} item{itemsCount !== 1 ? "s" : ""} •{" "}
                      {format(new Date(doc.date), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1.5">
                    <span className="text-base font-mono font-bold text-white">
                      ₦{formatPrice(doc.total ?? 0)}
                    </span>
                    <button
                      type="button"
                      className="px-3 py-1 bg-sky-600/80 group-hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      Select
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="px-6 py-3 bg-[#1e1e1e] border-t border-stone-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold rounded-xl border border-stone-700 text-stone-300 hover:bg-stone-800"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── User Select Modal ────────────────────────────────────────────────────────

function UserSelectModal({
  onSelectUser,
  onClose,
}: {
  onSelectUser: (user: any) => void;
  onClose: () => void;
}) {
  const usersQuery = useUsers();
  const userList = usersQuery.data ?? [];

  return (
    <Modal onClose={onClose}>
      <div className="bg-[#242424] text-white border border-stone-700 rounded-2xl w-96 shadow-2xl overflow-hidden flex flex-col select-none">
        <div className="px-5 py-3.5 border-b border-stone-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-400" />
            <span className="text-sm font-bold text-stone-100">Select User / Server</span>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 max-h-72 overflow-y-auto space-y-2">
          {userList.length === 0 ? (
            <p className="text-xs text-stone-500 text-center py-6">No users found</p>
          ) : (
            userList.map((u: any) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  onSelectUser(u);
                  onClose();
                }}
                className="w-full p-3 bg-[#1e1e1e] hover:bg-stone-800 border border-stone-700 rounded-xl text-left flex items-center justify-between transition-all"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{u.username || u.name}</p>
                  <p className="text-xs text-stone-400">{u.role ?? "User"}</p>
                </div>
                <Check className="w-4 h-4 text-stone-500" />
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-3 bg-[#1e1e1e] border-t border-stone-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-stone-700 text-stone-300 hover:bg-stone-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Transfer Screen ──────────────────────────────────────────────────────────

function TransferScreen({
  items,
  documents,
  currentOrderNumber,
  onTransferConfirm,
  onClose,
}: {
  items: CartItem[];
  documents: any[];
  currentOrderNumber?: string;
  onTransferConfirm: (
    keptItems: CartItem[],
    stagedItems: CartItem[],
    targetOrder: { id?: string; number: string; doc?: any },
  ) => void;
  onClose: () => void;
}) {
  const [source, setSource] = useState<CartItem[]>(() =>
    items.map((i) => ({ ...i })),
  );
  const [staged, setStaged] = useState<CartItem[]>([]);
  const [srcSel, setSrcSel] = useState<string | null>(
    items.length > 0 ? items[0].id : null,
  );
  const [stageSel, setStageSel] = useState<string | null>(null);

  // Target Order state (e.g. "4", "#POS-1002", etc.)
  const [targetOrderNumber, setTargetOrderNumber] = useState<string>("4");
  const [selectedTargetDoc, setSelectedTargetDoc] = useState<any | null>(null);

  // Sub-modals
  const [showOpenOrdersModal, setShowOpenOrdersModal] = useState<boolean>(false);
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [qtyModalItem, setQtyModalItem] = useState<{
    item: CartItem;
    maxQty: number;
    side: "left" | "right";
  } | null>(null);

  // Keyboard support: Escape to close
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (showOpenOrdersModal || showUserModal || qtyModalItem) return;
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, showOpenOrdersModal, showUserModal, qtyModalItem]);

  // ── Move 1 Qty Right (1 >) ──
  const handleMoveOneRight = () => {
    const targetItem = srcSel
      ? source.find((i) => i.id === srcSel)
      : source[0];
    if (!targetItem) return;

    if (targetItem.qty > 1) {
      setSource((prev) =>
        prev.map((i) => (i.id === targetItem.id ? { ...i, qty: i.qty - 1 } : i)),
      );
    } else {
      setSource((prev) => prev.filter((i) => i.id !== targetItem.id));
      setSrcSel(null);
    }

    setStaged((prev) => {
      const match = prev.find((i) => i.id === targetItem.id);
      if (match) {
        return prev.map((i) =>
          i.id === targetItem.id ? { ...i, qty: i.qty + 1 } : i,
        );
      }
      return [...prev, { ...targetItem, qty: 1 }];
    });
    setStageSel(targetItem.id);
  };

  // ── Move All Qty Right (>>) ──
  const handleMoveAllRight = () => {
    if (srcSel) {
      const targetItem = source.find((i) => i.id === srcSel);
      if (!targetItem) return;
      setSource((prev) => prev.filter((i) => i.id !== targetItem.id));
      setStaged((prev) => {
        const match = prev.find((i) => i.id === targetItem.id);
        if (match) {
          return prev.map((i) =>
            i.id === targetItem.id
              ? { ...i, qty: i.qty + targetItem.qty }
              : i,
          );
        }
        return [...prev, { ...targetItem }];
      });
      setSrcSel(null);
      setStageSel(targetItem.id);
    } else {
      // Move all items
      setStaged((prev) => {
        let next = [...prev];
        for (const item of source) {
          const match = next.find((i) => i.id === item.id);
          if (match) {
            next = next.map((i) =>
              i.id === item.id ? { ...i, qty: i.qty + item.qty } : i,
            );
          } else {
            next.push({ ...item });
          }
        }
        return next;
      });
      setSource([]);
      setSrcSel(null);
    }
  };

  // ── Move 1 Qty Left (< 1) ──
  const handleMoveOneLeft = () => {
    const targetItem = stageSel
      ? staged.find((i) => i.id === stageSel)
      : staged[0];
    if (!targetItem) return;

    if (targetItem.qty > 1) {
      setStaged((prev) =>
        prev.map((i) => (i.id === targetItem.id ? { ...i, qty: i.qty - 1 } : i)),
      );
    } else {
      setStaged((prev) => prev.filter((i) => i.id !== targetItem.id));
      setStageSel(null);
    }

    setSource((prev) => {
      const match = prev.find((i) => i.id === targetItem.id);
      if (match) {
        return prev.map((i) =>
          i.id === targetItem.id ? { ...i, qty: i.qty + 1 } : i,
        );
      }
      return [...prev, { ...targetItem, qty: 1 }];
    });
    setSrcSel(targetItem.id);
  };

  // ── Move All Qty Left (<<) ──
  const handleMoveAllLeft = () => {
    if (stageSel) {
      const targetItem = staged.find((i) => i.id === stageSel);
      if (!targetItem) return;
      setStaged((prev) => prev.filter((i) => i.id !== targetItem.id));
      setSource((prev) => {
        const match = prev.find((i) => i.id === targetItem.id);
        if (match) {
          return prev.map((i) =>
            i.id === targetItem.id
              ? { ...i, qty: i.qty + targetItem.qty }
              : i,
          );
        }
        return [...prev, { ...targetItem }];
      });
      setStageSel(null);
      setSrcSel(targetItem.id);
    } else {
      setSource((prev) => {
        let next = [...prev];
        for (const item of staged) {
          const match = next.find((i) => i.id === item.id);
          if (match) {
            next = next.map((i) =>
              i.id === item.id ? { ...i, qty: i.qty + item.qty } : i,
            );
          } else {
            next.push({ ...item });
          }
        }
        return next;
      });
      setStaged([]);
      setStageSel(null);
    }
  };

  // ── Pen ✏️ Icon Click ──
  const handlePenClick = () => {
    if (srcSel) {
      const item = source.find((i) => i.id === srcSel);
      if (item) {
        setQtyModalItem({ item, maxQty: item.qty, side: "left" });
        return;
      }
    }
    if (stageSel) {
      const item = staged.find((i) => i.id === stageSel);
      if (item) {
        setQtyModalItem({ item, maxQty: item.qty, side: "right" });
        return;
      }
    }
    if (source.length > 0) {
      setQtyModalItem({ item: source[0], maxQty: source[0].qty, side: "left" });
    }
  };

  const handleCustomQtyConfirm = (qtyToMove: number) => {
    if (!qtyModalItem) return;
    const { item, side } = qtyModalItem;

    if (side === "left") {
      // Move qtyToMove from source to staged
      if (qtyToMove >= item.qty) {
        setSource((prev) => prev.filter((i) => i.id !== item.id));
        setSrcSel(null);
      } else {
        setSource((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, qty: i.qty - qtyToMove } : i,
          ),
        );
      }

      setStaged((prev) => {
        const match = prev.find((i) => i.id === item.id);
        if (match) {
          return prev.map((i) =>
            i.id === item.id ? { ...i, qty: i.qty + qtyToMove } : i,
          );
        }
        return [...prev, { ...item, qty: qtyToMove }];
      });
      setStageSel(item.id);
    } else {
      // Move qtyToMove from staged to source
      if (qtyToMove >= item.qty) {
        setStaged((prev) => prev.filter((i) => i.id !== item.id));
        setStageSel(null);
      } else {
        setStaged((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, qty: i.qty - qtyToMove } : i,
          ),
        );
      }

      setSource((prev) => {
        const match = prev.find((i) => i.id === item.id);
        if (match) {
          return prev.map((i) =>
            i.id === item.id ? { ...i, qty: i.qty + qtyToMove } : i,
          );
        }
        return [...prev, { ...item, qty: qtyToMove }];
      });
      setSrcSel(item.id);
    }

    setQtyModalItem(null);
  };

  const handleOk = () => {
    if (staged.length === 0) {
      toast.warn("Please select at least one item for transfer.");
      return;
    }
    const targetObj = selectedTargetDoc
      ? {
          id: selectedTargetDoc.id,
          number: selectedTargetDoc.number,
          doc: selectedTargetDoc,
        }
      : {
          number: targetOrderNumber || "4",
        };

    onTransferConfirm(source, staged, targetObj);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col h-screen bg-[#242424] text-white select-none">
      {/* ── Top Header ── */}
      <div className="px-6 py-3.5 border-b border-[#383838] flex items-center justify-between bg-[#1e1e1e]">
        <h2 className="text-base font-semibold text-stone-100">
          Transfer ({currentOrderNumber || items.length})
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Main 3-Column Body ── */}
      <div className="flex-1 flex min-h-0 bg-[#242424]">
        {/* 1. Left Column: Order items */}
        <div className="w-[38%] border-r border-[#383838] flex flex-col min-h-0 bg-[#1e1e1e]">
          <div className="px-5 py-3 border-b border-[#383838]">
            <span className="text-sm font-medium text-stone-300">Order items</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {source.length === 0 ? (
              <div className="text-center py-16 text-stone-500 text-xs">
                All items staged for transfer
              </div>
            ) : (
              source.map((item, idx) => {
                const isSelected = srcSel === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSrcSel(isSelected ? null : item.id);
                      setStageSel(null);
                    }}
                    className={`p-3 rounded-lg border transition-all cursor-pointer flex justify-between items-start ${
                      isSelected
                        ? "bg-stone-800 border-sky-500 shadow-md"
                        : "bg-[#181818] border-stone-800 hover:border-stone-700"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-white text-sm leading-tight">
                        {item.title}
                      </p>
                      <p className="text-xs text-stone-400 mt-1 font-mono">
                        #{idx + 1} {item.qty}x{formatPrice(item.cost)}
                      </p>
                    </div>
                    <span className="font-bold text-white font-mono text-sm">
                      {formatPrice(item.qty * item.cost * (1 - item.discount / 100))}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 2. Middle Controls Strip */}
        <div className="w-14 border-r border-[#383838] bg-[#1a1a1a] flex flex-col items-center justify-center gap-3.5 py-4 shrink-0 shadow-inner">
          <button
            type="button"
            onClick={handleMoveOneRight}
            disabled={source.length === 0}
            title="Transfer 1 quantity to right"
            className="w-10 h-10 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed border border-stone-700 text-stone-200 hover:text-white font-bold text-xs flex items-center justify-center transition-all active:scale-95 shadow"
          >
            1 &gt;
          </button>

          <button
            type="button"
            onClick={handleMoveAllRight}
            disabled={source.length === 0}
            title="Transfer all quantities to right"
            className="w-10 h-10 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed border border-stone-700 text-stone-200 hover:text-white font-bold text-sm flex items-center justify-center transition-all active:scale-95 shadow"
          >
            &gt;&gt;
          </button>

          <button
            type="button"
            onClick={handlePenClick}
            disabled={source.length === 0 && staged.length === 0}
            title="Specify custom transfer quantity"
            className="w-10 h-10 rounded-full bg-stone-800 hover:bg-amber-600 disabled:opacity-30 disabled:cursor-not-allowed border border-stone-700 text-stone-200 hover:text-white flex items-center justify-center transition-all active:scale-95 shadow"
          >
            <Pencil className="w-4 h-4 text-amber-400 hover:text-white" />
          </button>

          <button
            type="button"
            onClick={handleMoveOneLeft}
            disabled={staged.length === 0}
            title="Transfer 1 quantity back to left"
            className="w-10 h-10 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed border border-stone-700 text-stone-200 hover:text-white font-bold text-xs flex items-center justify-center transition-all active:scale-95 shadow"
          >
            &lt; 1
          </button>

          <button
            type="button"
            onClick={handleMoveAllLeft}
            disabled={staged.length === 0}
            title="Transfer all quantities back to left"
            className="w-10 h-10 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed border border-stone-700 text-stone-200 hover:text-white font-bold text-sm flex items-center justify-center transition-all active:scale-95 shadow"
          >
            &lt;&lt;
          </button>
        </div>

        {/* 3. Middle-Right Column: Selected items for transfer */}
        <div className="flex-1 border-r border-[#383838] flex flex-col min-h-0 bg-[#1e1e1e]">
          <div className="px-5 py-3 border-b border-[#383838]">
            <span className="text-sm font-medium text-stone-300">
              Selected items for transfer
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {staged.length === 0 ? (
              <div className="text-center py-16 text-stone-500 text-xs">
                No items selected for transfer yet
              </div>
            ) : (
              staged.map((item, idx) => {
                const isSelected = stageSel === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setStageSel(isSelected ? null : item.id);
                      setSrcSel(null);
                    }}
                    className={`p-3 rounded-lg border transition-all cursor-pointer flex justify-between items-start ${
                      isSelected
                        ? "bg-amber-950/40 border-amber-500 shadow-md"
                        : "bg-[#181818] border-stone-800 hover:border-stone-700"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-white text-sm leading-tight">
                        {item.title}
                      </p>
                      <p className="text-xs text-stone-400 mt-1 font-mono">
                        #{idx + 1} {item.qty}x{formatPrice(item.cost)}
                      </p>
                    </div>
                    <span className="font-bold text-amber-400 font-mono text-sm">
                      {formatPrice(item.qty * item.cost * (1 - item.discount / 100))}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 4. Far Right Column: Action Buttons & Target Order */}
        <div className="w-64 flex flex-col justify-between p-4 bg-[#1e1e1e] shrink-0">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-stone-400 mb-1 font-medium">Order number</p>
              <div className="relative">
                <input
                  type="text"
                  value={targetOrderNumber}
                  onChange={(e) => {
                    setTargetOrderNumber(e.target.value);
                    setSelectedTargetDoc(null);
                  }}
                  placeholder="Target order #"
                  className="w-full bg-[#181818] border border-stone-700 rounded-xl px-3.5 py-2 text-sm text-white font-mono font-bold outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Action Buttons Stack */}
            <div className="space-y-1.5 pt-1">
              <button
                type="button"
                onClick={() => setShowOpenOrdersModal(true)}
                className="w-full py-2.5 px-3 bg-[#242424] hover:bg-stone-800 border border-stone-700 rounded-xl text-xs font-semibold text-stone-200 hover:text-white transition-all flex items-center gap-2.5 active:scale-95 shadow-sm"
              >
                <LayoutGrid className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Select order</span>
              </button>

              <button
                type="button"
                onClick={() => setShowUserModal(true)}
                className="w-full py-2.5 px-3 bg-[#242424] hover:bg-stone-800 border border-stone-700 rounded-xl text-xs font-semibold text-stone-200 hover:text-white transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
              >
                <Users className="w-4 h-4 text-stone-400" />
                <span>User</span>
              </button>

              <button
                type="button"
                onClick={handleMoveAllRight}
                disabled={source.length === 0}
                className="w-full py-2.5 px-3 bg-[#242424] hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed border border-stone-700 rounded-xl text-xs font-semibold text-stone-200 hover:text-white transition-all flex items-center gap-2.5 active:scale-95 shadow-sm"
              >
                <ArrowRight className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Transfer all</span>
              </button>

              <button
                type="button"
                onClick={handleMoveAllLeft}
                disabled={staged.length === 0}
                className="w-full py-2.5 px-3 bg-[#242424] hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed border border-stone-700 rounded-xl text-xs font-semibold text-stone-200 hover:text-white transition-all flex items-center gap-2.5 active:scale-95 shadow-sm"
              >
                <ArrowLeft className="w-4 h-4 text-red-400 shrink-0" />
                <span>Remove all</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleMoveAllRight();
                }}
                className="w-full py-2.5 px-3 bg-[#242424] hover:bg-stone-800 border border-stone-700 rounded-xl text-xs font-semibold text-stone-200 hover:text-white transition-all flex items-center gap-2.5 active:scale-95 shadow-sm"
              >
                <Layers className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Transfer rounds</span>
              </button>

              <button
                type="button"
                onClick={() => setShowOpenOrdersModal(true)}
                className="w-full py-2.5 px-3 bg-[#242424] hover:bg-stone-800 border border-stone-700 rounded-xl text-xs font-semibold text-stone-200 hover:text-white transition-all flex items-center gap-2.5 active:scale-95 shadow-sm"
              >
                <LayoutGrid className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Open orders</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  toast.info("Transferred all open orders to target");
                }}
                className="w-full py-2.5 px-3 bg-[#242424] hover:bg-stone-800 border border-stone-700 rounded-xl text-xs font-semibold text-stone-400 hover:text-stone-200 transition-all flex items-center gap-2.5 active:scale-95 shadow-sm opacity-80"
              >
                <Users className="w-4 h-4 text-stone-500 shrink-0" />
                <span>Transfer all orders</span>
              </button>
            </div>
          </div>

          {/* Bottom Action OK / Cancel */}
          <div className="flex gap-2 pt-4 border-t border-[#383838]">
            <button
              type="button"
              onClick={handleOk}
              disabled={staged.length === 0}
              className="flex-1 py-2.5 bg-[#2e7d32] hover:bg-[#388e3c] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              <Check className="w-4 h-4" /> OK
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-[#c62828] hover:bg-[#d32f2f] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </div>
      </div>

      {/* ── Sub-Modals ── */}
      {qtyModalItem && (
        <TransferQtyModal
          item={qtyModalItem.item}
          maxQty={qtyModalItem.maxQty}
          onConfirm={handleCustomQtyConfirm}
          onClose={() => setQtyModalItem(null)}
        />
      )}

      {showOpenOrdersModal && (
        <OpenOrdersModal
          documents={documents}
          currentOrderNumber={currentOrderNumber}
          onSelectOrder={(orderOrNumber) => {
            if (typeof orderOrNumber === "string") {
              setTargetOrderNumber(orderOrNumber);
              setSelectedTargetDoc(null);
            } else {
              setTargetOrderNumber(orderOrNumber.number);
              setSelectedTargetDoc(orderOrNumber);
            }
          }}
          onClose={() => setShowOpenOrdersModal(false)}
        />
      )}

      {showUserModal && (
        <UserSelectModal
          onSelectUser={(u) => {
            toast.success(`Server/User assigned: ${u.username || u.name}`);
          }}
          onClose={() => setShowUserModal(false)}
        />
      )}
    </div>
  );
}

// ─── Void Modal ───────────────────────────────────────────────────────────────

function VoidModal({
  onConfirm,
  onClose,
}: {
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose}>
      <div className="bg-white dark:bg-stone-900 border border-red-300 dark:border-red-800 rounded-2xl w-80 shadow-2xl p-6 text-center">
        <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-1">
          Void Order?
        </p>
        <p className="text-sm text-stone-600 dark:text-stone-400 mb-6">
          This will clear all items from the cart. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:bg-stone-700 rounded-xl py-2 text-sm text-stone-500 dark:text-stone-400"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-600 hover:bg-red-500 rounded-xl py-2 text-sm font-bold text-stone-900 dark:text-white"
          >
            Void
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Comment Modal ────────────────────────────────────────────────────────────

function CommentModal({
  item,
  currentNote,
  onSave,
  onClose,
}: {
  item: CartItem | null;
  currentNote: string;
  onSave: (note: string) => void;
  onClose: () => void;
}) {
  const [note, setNote] = React.useState(currentNote);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <Modal onClose={onClose}>
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl w-96 shadow-2xl p-5">
        <p className="text-xs text-stone-600 dark:text-stone-400 uppercase tracking-widest font-semibold mb-1">
          Note
        </p>
        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-3 truncate">
          {item?.title ?? "Order note"}
        </p>
        <textarea
          ref={ref}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="Add a note or special instruction…"
          className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl px-4 py-3 text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-amber-500 resize-none mb-3"
        />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:bg-stone-700 rounded-xl py-2 text-sm text-stone-500 dark:text-stone-400"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(note);
              onClose();
            }}
            className="flex-1 bg-amber-600 hover:bg-amber-500 rounded-xl py-2 text-sm font-semibold text-stone-900 dark:text-white"
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Toasts ───────────────────────────────────────────────────────────────────

function CashDrawerToast({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-60 bg-emerald-800 border border-emerald-500 rounded-xl px-5 py-3 shadow-2xl flex items-center gap-3">
      <ImDrawer className="w-5 h-5 text-stone-900 dark:text-white" />
      <p className="text-sm font-semibold text-stone-900 dark:text-white">
        Cash drawer opened
      </p>
    </div>
  );
}

function SaveToast({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-60 bg-white dark:bg-stone-800 border border-stone-600 rounded-xl px-5 py-3 shadow-2xl flex items-center gap-3">
      <Save className="w-5 h-5 text-amber-400" />
      <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
        Sale saved as draft
      </p>
    </div>
  );
}

// Inline warning banner shown when cart action fails silently
function InlineWarning({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-60 bg-amber-900 border border-amber-600 rounded-xl px-5 py-3 shadow-2xl flex items-center gap-3">
      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
      <p className="text-sm font-semibold text-amber-200">{message}</p>
      <button
        onClick={onClose}
        className="text-amber-400 hover:text-stone-900 dark:text-white ml-2"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Zone label ───────────────────────────────────────────────────────────────

function ZoneLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] uppercase tracking-[0.08em] text-stone-600 font-semibold mb-1.5 px-0.5">
      {children}
    </p>
  );
}

// ─── Action button (right panel) ──────────────────────────────────────────────

function ActBtn({
  icon,
  label,
  hotkey,
  onClick,
  disabled,
  active,
  danger,
}: {
  icon: any;
  label: string;
  hotkey?: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative flex flex-col items-center justify-center gap-1 rounded border py-2 px-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed
        ${
          danger
            ? "bg-red-900/60 border-red-800 hover:bg-red-800 text-red-300"
            : active
              ? "bg-amber-950 border-amber-700 hover:bg-amber-900 text-amber-300"
              : "bg-stone-100 dark:bg-stone-900 border border-stone-300 dark:border-stone-800 hover:bg-stone-200 dark:hover:bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300"
        }`}
    >
      {hotkey && (
        <span className="absolute top-1 left-1.5 text-[8px] text-stone-600 leading-none">
          {hotkey}
        </span>
      )}
      <ResponsiveIcon icon={icon as any} className="size-5" />
      <span className="text-[10px] leading-tight text-center truncate w-full px-0.5">
        {label}
      </span>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AroniumLite() {
  const router = useNavigate();

  const customersQuery = useCustomers();
  const paymentTypesQuery = usePaymentTypes();
  const documentsQuery = useDocuments();
  const createDocument = useCreateDocument();
  const updateStockEntries = useUpdateStockEntry();
  const addStockLog = useAddStockLog();
  const stockLevelsQuery = useStockLevels();
  const stockLevels = stockLevelsQuery.data || {};
  const upsertProductPrice = useUpsertProductPrice();

  // Cart state persistence
  const POS_STATE_KEY = "pos_cart_state";

  // REDUX GLOBAL STATE
  const dispatch = useDispatch();
  const {
    items,
    selectedItemId,
    cartDiscount,
    selectedCustomer,
    dineIn,
    orderNote,
    drawerOpen,
    modal,
    showCashDrawer,
    showSaveToast,
    warning,
    calcProduct,
    continuePaymentDoc,
    paidInput,
    showTaxManagement,
    showDiscountManagement,
    showCustomerManagement,
    selectedPaymentType,
    selectedTax,
    appliedDiscount,
    refundReceipt,
    refundPaymentType,
    refundError,
    calcInitialQty,
    calcDisplay,
    calcExpr,
    calcHasResult,
    discountModalTab,
    discountModalValue,
    customerModalSearch,
  } = useSelector((state: RootState) => state.pos);

  // REDUX STATE SETTERS (matching identical signatures of local React useState setters so no downstream code breaks!)
  const setItems = (
    updater: CartItem[] | ((prev: CartItem[]) => CartItem[]),
  ) => {
    if (typeof updater === "function") {
      dispatch(setReduxItems(updater(items)));
    } else {
      dispatch(setReduxItems(updater));
    }
  };

  const setSelectedItemId = (val: string | null) =>
    dispatch(setSelectedItemIdAction(val));
  const setCartDiscount = (val: number) => dispatch(setCartDiscountAction(val));
  const setSelectedCustomer = (val: any | null) =>
    dispatch(setSelectedCustomerAction(val));
  const setDineIn = (val: boolean) => dispatch(setDineInAction(val));
  const setOrderNote = (val: string) => dispatch(setOrderNoteAction(val));
  const setDrawerOpen = (val: boolean) => dispatch(setDrawerOpenAction(val));
  const setModal = (val: ModalKind) => dispatch(setModalAction(val));
  const setShowCashDrawer = (val: boolean) =>
    dispatch(setShowCashDrawerAction(val));
  const setShowSaveToast = (val: boolean) =>
    dispatch(setShowSaveToastAction(val));
  const setWarning = (val: string) => dispatch(setWarningAction(val));
  const setCalcProduct = (val: CartItem | null) =>
    dispatch(setCalcProductAction(val));
  const setCalcInitialQty = (val: number) =>
    dispatch(setCalcInitialQtyAction(val));
  const setContinuePaymentDoc = (val: any | null) =>
    dispatch(setContinuePaymentDocAction(val));

  // New Redux State Setters for Modals
  const setPaidInput = (val: string) => dispatch(setPaidInputAction(val));
  const setShowTaxManagement = (val: boolean) =>
    dispatch(setShowTaxManagementAction(val));
  const setShowDiscountManagement = (val: boolean) =>
    dispatch(setShowDiscountManagementAction(val));
  const setShowCustomerManagement = (val: boolean) =>
    dispatch(setShowCustomerManagementAction(val));
  const setSelectedPaymentType = (val: string) =>
    dispatch(setSelectedPaymentTypeAction(val));
  const setSelectedTax = (val: any | null) =>
    dispatch(setSelectedTaxAction(val));
  const setAppliedDiscount = (
    val: { type: "percent" | "amount"; value: number } | null,
  ) => dispatch(setAppliedDiscountAction(val));
  const setRefundReceipt = (val: string) =>
    dispatch(setRefundReceiptAction(val));
  const setRefundPaymentType = (val: string) =>
    dispatch(setRefundPaymentTypeAction(val));
  const setRefundError = (val: string) => dispatch(setRefundErrorAction(val));
  const setCalcDisplay = (val: string) => dispatch(setCalcDisplayAction(val));
  const setCalcExprFromState = (val: string) => dispatch(setCalcExpr(val));
  const setCalcHasResultFromState = (val: boolean) =>
    dispatch(setCalcHasResult(val));
  const setDiscountModalTabFromState = (val: "item" | "cart") =>
    dispatch(setDiscountModalTab(val));
  const setDiscountModalValueFromState = (val: string) =>
    dispatch(setDiscountModalValue(val));
  const setCustomerModalSearchFromState = (val: string) =>
    dispatch(setCustomerModalSearch(val));

  // Completed sale state for Payment Summary screen
  const [completedSale, setCompletedSale] = useState<CompletedSaleData | null>(
    null,
  );

  // Persistence effect
  // PERF: this used to call JSON.stringify + localStorage.setItem
  // synchronously on every single change to `items` — i.e. every qty bump,
  // every discount tweak, every item added during fast barcode scanning.
  // localStorage I/O is synchronous and blocks the main thread, so a busy
  // cart visibly stutters. Debounce it so rapid-fire cart edits collapse
  // into one write ~400ms after things settle, instead of one write per click.
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestCartStateRef = useRef<{
    items: typeof items;
    selectedItemId: typeof selectedItemId;
    cartDiscount: typeof cartDiscount;
    selectedCustomer: typeof selectedCustomer;
    dineIn: typeof dineIn;
    orderNote: typeof orderNote;
  } | null>(null);

  useEffect(() => {
    const state = {
      items,
      selectedItemId,
      cartDiscount,
      selectedCustomer,
      dineIn,
      orderNote,
    };
    latestCartStateRef.current = state;

    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      localStorage.setItem(POS_STATE_KEY, JSON.stringify(state));
    }, 400);

    // NOTE: this cleanup runs between every dependency change too, not just
    // on unmount — so it must only cancel the pending timer, never write
    // synchronously here, or we're back to writing on every keystroke.
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [
    items,
    selectedItemId,
    cartDiscount,
    selectedCustomer,
    dineIn,
    orderNote,
  ]);

  // Flush any still-pending write when the screen actually unmounts (e.g.
  // navigating away mid-edit), so the very last cart change isn't lost.
  useEffect(() => {
    return () => {
      if (latestCartStateRef.current) {
        localStorage.setItem(
          POS_STATE_KEY,
          JSON.stringify(latestCartStateRef.current),
        );
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const priceList = useAllPrices();

  useEffect(() => {
    // Use sessionStorage for split payment document continuation
    const splitPaymentDocId = sessionStorage.getItem("splitPaymentDocId");

    if (splitPaymentDocId) {
      console.log("Found splitPaymentDocId:", splitPaymentDocId);
      const doc = documentsQuery.data?.find(
        (d: any) => d.id === splitPaymentDocId,
      );
      console.log("Found document:", doc);
      if (doc) {
        setContinuePaymentDoc(doc);
        // Clear sessionStorage
        sessionStorage.removeItem("splitPaymentDocId");
        // Pre-fill cart with document items
        const cartItems: CartItem[] =
          doc.items?.map((item: any) => ({
            id: item.productId,
            title: item.name,
            cost: item.priceBeforeTax,
            unit: item.unit || "",
            qty: item.quantity,
            discount: item.discount,
            taxRate: item.taxRate,
            priceLabel: "Retail" as const,
            availablePrices: [
              { label: "Retail" as const, price: item.priceBeforeTax },
            ],
            isLocked: true, // Lock items for split payment continuation
          })) || [];

        setItems(cartItems);
        setSelectedCustomer(doc.customer || null);
        setDineIn(doc.externalNumber === "DINE-IN");

        // Automatically open payment modal with split payment selected
        setModal("payment");
      }
    }
  }, [documentsQuery.data, continuePaymentDoc]);

  // Derived
  const selectedItem = items.find((i) => i.id === selectedItemId) ?? null;

  const subtotalGross = useMemo(
    () => items.reduce((s, i) => s + itemTotal(i), 0),
    [items],
  );
  const cartDiscountAmt = useMemo(
    () => subtotalGross * (cartDiscount / 100),
    [subtotalGross, cartDiscount],
  );
  const subtotal = subtotalGross - cartDiscountAmt;
  const taxTotal = useMemo(
    () => items.reduce((s, i) => s + itemTax(i), 0) * (1 - cartDiscount / 100),
    [items, cartDiscount],
  );
  const total = subtotal + taxTotal;

  /**
   * Stock warning for a product, or null when it is comfortably in stock.
   * Mirrors the checks addOrUpdateItem runs on add, so what the cashier sees
   * in the search list is what they will be told after picking.
   */
  const stockState = (productId: string) => {
    const entry = stockLevels[productId];
    const qty = entry?.quantity ?? 0;
    if (qty <= 0) return { tone: "out" as const, text: "Out of stock" };
    if (entry?.lowStockWarning && qty <= (entry.lowStockWarningQuantity ?? 0))
      return { tone: "low" as const, text: `Low · ${qty} left` };
    return null;
  };

  /**
   * One option per product, not per price row. The price label is now picked
   * in a dedicated step after search, so listing the same product once per
   * price would just duplicate every result.
   */
  const productOptions = useMemo(() => {
    const byProduct = new Map<
      string,
      {
        value: string;
        label: string;
        product: any;
        prices: { label: "Retail" | "Wholesale"; price: number }[];
      }
    >();

    for (const row of priceList?.data || []) {
      const entry = byProduct.get(row.product.id) ?? {
        value: row.product.id,
        label: row.product.title,
        product: row.product,
        prices: [],
      };
      entry.prices.push({
        label: row.wholeSale ? "Wholesale" : "Retail",
        price: row.salePrice,
      });
      byProduct.set(row.product.id, entry);
    }

    return [...byProduct.values()];
  }, [priceList?.data]);

  // ── Cart helpers ──

  const openQtyModal = (product: CartItem, currentQty = 1) => {
    setCalcProduct(product);
    setCalcInitialQty(currentQty);
    setModal("qty");
  };

  /**
   * Searched products go through price selection/editing first, then quantity.
   */
  const openPriceModal = (product: CartItem, currentQty = 1) => {
    setCalcProduct(product);
    setCalcInitialQty(currentQty);
    setModal("price");
  };

  const addOrUpdateItem = (product: any, qty: number) => {
    const stock = stockLevels[product.id];
    const available = stock?.quantity ?? 0;

    if (available <= 0) {
      toast.error(`Cannot add ${product.title}. Stock is empty (0).`);
      return;
    }

    if (qty > available) {
      toast.warn(
        `Only ${available} ${product.unit ?? "units"} available for ${product.title}.`,
      );
      qty = available;
    }

    if (
      stock?.lowStockWarning &&
      available <= (stock.lowStockWarningQuantity ?? 0)
    ) {
      toast.warn(`${product.title} is running low on stock!`);
    }

    const taxRate = product.taxes?.[0]?.tax?.rate ?? 0;
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      // The qty modal can also change price/label, so carry those onto the
      // existing line rather than only bumping the quantity.
      if (existing)
        return prev.map((i) =>
          i.id === product.id
            ? {
                ...i,
                qty,
                cost: product.cost,
                priceLabel: product.priceLabel ?? i.priceLabel,
              }
            : i,
        );
      return [
        ...prev,
        {
          id: product.id,
          title: product.title,
          cost: product.cost,
          unit: product.unit ?? "",
          qty,
          discount: 0,
          taxRate,
          priceLabel: product.priceLabel ?? "Retail",
          availablePrices: product.availablePrices ?? [],
        },
      ];
    });
  };

  const togglePriceType = () => {
    if (!selectedItemId || !selectedItem) return;
    const nextLabel =
      selectedItem.priceLabel === "Retail" ? "Wholesale" : "Retail";
    const nextPrice = (selectedItem.availablePrices || []).find(
      (p) => p.label === nextLabel,
    )?.price;

    if (nextPrice === undefined) {
      toast.warn(`${nextLabel} price not available for this product.`);
      return;
    }

    setItems((prev) =>
      prev.map((i) =>
        i.id === selectedItemId
          ? {
              ...i,
              priceLabel: nextLabel as "Retail" | "Wholesale",
              cost: nextPrice,
            }
          : i,
      ),
    );
  };

  const toggleItemPrice = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== itemId) return i;
        const nextLabel = i.priceLabel === "Retail" ? "Wholesale" : "Retail";
        const nextPrice = (i.availablePrices || []).find(
          (p) => p.label === nextLabel,
        )?.price;
        if (nextPrice === undefined) {
          toast.warn(`${nextLabel} price not available for this product.`);
          return i;
        }
        return {
          ...i,
          priceLabel: nextLabel as "Retail" | "Wholesale",
          cost: nextPrice,
        };
      }),
    );
  };

  const deleteSelectedItem = () => {
    if (!selectedItemId) return;
    setItems((prev) => prev.filter((i) => i.id !== selectedItemId));
    setSelectedItemId(null);
  };

  const applyItemDiscount = (id: string, pct: number) =>
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, discount: pct } : i)),
    );

  const toggleLock = () => {
    if (!selectedItemId) return;
    setItems((prev) =>
      prev.map((i) =>
        i.id === selectedItemId ? { ...i, isLocked: !i.isLocked } : i,
      ),
    );
  };

  const clearCart = () => {
    dispatch(clearCartAction());
  };

  // ── Document payload ──

  const buildDocumentPayload = (
    status: "draft" | "posted",
    payments?: { paymentId: string; paymentType: string; amount: number }[],
  ) => {
    // Calculate total amount paid and outstanding balance
    const totalPaid = payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
    const outstandingBalance = Math.max(0, total - totalPaid);
    const isFullyPaid = totalPaid >= total;

    // Determine document status based on payment completion
    let documentStatus: "draft" | "posted" = status;
    if (payments && isFullyPaid) {
      documentStatus = "posted";
    }
    // Otherwise keep the original status (draft for new, or passed in status)

    const payload = {
      document: {
        id: crypto.randomUUID(),
        number: genDocNumber(),
        customerId:
          selectedCustomer?.id &&
          String(selectedCustomer.id).trim() !== ""
            ? String(selectedCustomer.id)
            : null,
        date: new Date(),
        status: documentStatus,
        paid: isFullyPaid,
        totalBeforeTax: subtotal,
        taxTotal,
        total,
        totalPaid,
        outstandingBalance,
        createdAt: new Date(),
        externalNumber: dineIn ? "DINE-IN" : "TAKE-AWAY",
      },
      items: items.map((i) => ({
        id: crypto.randomUUID(),
        documentId: "",
        productId: i.id,
        name: i.title,
        unit: i.unit,
        quantity: i.qty,
        priceBeforeTax: i.cost,
        taxRate: i.taxRate,
        discount: i.discount,
        total: itemTotal(i),
      })),
      ...(payments
        ? {
            payments: payments.map((p) => ({
              id: crypto.randomUUID(),
              documentId: "",
              paymentId: p.paymentId,
              paymentType: p.paymentType,
              amount: p.amount,
              status: "paid" as const,
              date: new Date(),
            })),
          }
        : {}),
    };

    console.log("buildDocumentPayload - Generated payload:", {
      status,
      total,
      totalPaid,
      outstandingBalance,
      isFullyPaid,
      paymentsCount: payments?.length ?? 0,
      paymentAmounts: payments?.map((p) => p.amount),
    });

    return payload;
  };

  // ── Save sale ──

  const saveSale = async () => {
    if (items.length === 0) {
      setWarning("Add at least one item before saving.");
      return;
    }
    await createDocument.mutateAsync(buildDocumentPayload("draft"));
    setShowSaveToast(true);
    clearCart();
  };

  // ── Payment ──

  const handlePaymentConfirm = async (
    payments: { paymentId: string; paymentType: string; amount: number }[],
  ) => {
    console.log("handlePaymentConfirm called with payments:", {
      count: payments.length,
      payments: payments.map((p) => ({
        paymentType: p.paymentType,
        amount: p.amount,
      })),
      total,
      continuePaymentDoc: continuePaymentDoc?.id,
    });

    // NOTE: buildDocumentPayload mints a new document id/number on every call,
    // so it must be invoked exactly once — the stock logs below reference this
    // document by id and would otherwise hit a FK failure.
    let savedDoc: { id: string; number: string };

    if (continuePaymentDoc) {
      // Update existing split payment document
      const existingPayments = continuePaymentDoc.payments || [];
      const allPayments = [...existingPayments, ...payments];

      const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
      const outstandingBalance = Math.max(0, total - totalPaid);
      const isFullyPaid = totalPaid >= total;

      // In a real app, you would call an update mutation here
      // For now, we'll create a new document to simulate the update
      const docStatus: "draft" | "posted" = isFullyPaid ? "posted" : "draft";
      const updatedPayload = {
        document: {
          id: continuePaymentDoc.id,
          number: continuePaymentDoc.number,
          customerId: continuePaymentDoc.customerId,
          date: continuePaymentDoc.date,
          status: docStatus,
          paid: isFullyPaid,
          totalBeforeTax: continuePaymentDoc.totalBeforeTax,
          taxTotal: continuePaymentDoc.taxTotal,
          total: continuePaymentDoc.total,
          totalPaid,
          outstandingBalance,
          createdAt: continuePaymentDoc.createdAt,
          externalNumber: continuePaymentDoc.externalNumber,
        },
        items: continuePaymentDoc.items || [],
        payments: allPayments.map((p) => ({
          id: crypto.randomUUID(),
          documentId: continuePaymentDoc.id,
          paymentId: p.paymentId,
          paymentType: p.paymentType,
          amount: p.amount,
          status: "paid" as const,
          date: new Date(),
        })),
      };

      await createDocument.mutateAsync(updatedPayload);
      savedDoc = {
        id: continuePaymentDoc.id,
        number: continuePaymentDoc.number,
      };
      setContinuePaymentDoc(null);
    } else {
      // Create new document
      const payload = buildDocumentPayload("posted", payments);
      console.log("handlePaymentConfirm - Payload from buildDocumentPayload:", {
        paymentsInPayload: payload.payments?.length,
      });

      await createDocument.mutateAsync(payload);
      savedDoc = { id: payload.document.id, number: payload.document.number };
    }

    // Update stock for each item (sale decreases stock, refund increases stock)
    // Also create detailed stock logs with purchase information
    for (const item of items) {
      const isRefund = item.qty < 0;
      const documentId = savedDoc.id;

      // Get current stock level before the change
      const currentStock = stockLevels[item.id]?.quantity ?? 0;
      const stockChange = isRefund ? Math.abs(item.qty) : -Math.abs(item.qty);
      const newStockLevel = currentStock + stockChange;

      await updateStockEntries.mutateAsync({
        productId: item.id,
        type: isRefund ? "in" : "out",
        quantity: Math.abs(item.qty),
        note: isRefund ? "Refund" : "Sale",
        createdAt: new Date(),
      });

      // Calculate item-specific payment allocation
      const itemTotalValue = itemTotal(item);
      const paymentMethods = payments.map(p => ({
        paymentId: p.paymentId,
        paymentType: p.paymentType,
        amount: p.amount,
      }));

      // Create detailed stock log entry with enhanced tracking
      await addStockLog.mutateAsync({
        productId: item.id,
        documentId,
        type: isRefund ? "in" : "out",
        quantity: Math.abs(item.qty),
        note: isRefund ? "Refund" : "Sale",
        transactionDetails: {
          reason: isRefund ? "Refund" : "Sale",
          documentNumber: savedDoc.number,
          customerName: selectedCustomer?.name || "Walk-in Customer",
          customerId: selectedCustomer?.id || undefined,
          productTitle: item.title,
          productId: item.id,
          unitPrice: item.cost,
          totalValue: itemTotalValue,
          discount: item.discount,
          priceLabel: item.priceLabel,
          // Stock level tracking
          stockLevelBefore: currentStock,
          stockLevelAfter: newStockLevel,
          stockChange: stockChange,
          // Payment information
          paymentMethods: paymentMethods,
          totalPaymentAmount: payments.reduce((sum, p) => sum + p.amount, 0),
          paymentDate: new Date().toISOString(),
          // Tax information
          taxRate: item.taxRate || 0,
          taxAmount: itemTotalValue * (item.taxRate || 0),
          // Additional transaction details
          transactionType: isRefund ? "refund" : "sale",
          quantitySold: Math.abs(item.qty),
          isContinuedPayment: !!continuePaymentDoc,
        },
      });
    }

    await stockLevelsQuery.refetch();

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const change = Math.max(0, totalPaid - total);

    const saleSummaryData: CompletedSaleData = {
      docNumber: savedDoc.number,
      docId: savedDoc.id,
      items: [...items],
      subtotal,
      taxTotal,
      total,
      payments: [...payments],
      totalPaid,
      change,
      customer: selectedCustomer,
      date: new Date(),
    };

    clearCart();
    setModal("none");

    const skipSummary =
      typeof window !== "undefined" &&
      localStorage.getItem("pos_skip_receipt_summary") === "true";
    if (!skipSummary) {
      setCompletedSale(saleSummaryData);
    } else {
      router("/pos");
    }
  };

  const openPayment = () => {
    if (items.length === 0) {
      setWarning("Add at least one item before proceeding to payment.");
      return;
    }
    setModal("payment");
  };

  const enabledPaymentTypes = (paymentTypesQuery.data ?? []).filter(
    (pt) => pt.enabled,
  );
  const displayPaymentTypes =
    enabledPaymentTypes.length > 0
      ? enabledPaymentTypes
      : [
          { id: "cash", name: "Cash", position: 1 },
          { id: "card", name: "Card", position: 2 },
        ];

  const handleQuickPay = async (
    method: { id: string; name: string } | string,
  ) => {
    if (items.length === 0) {
      setWarning("Add at least one item before proceeding to payment.");
      return;
    }

    let pType: { id: string; name: string };
    if (typeof method === "object" && method !== null) {
      pType = method;
    } else {
      const match = displayPaymentTypes.find(
        (p) =>
          p.id === method ||
          p.name.toLowerCase() === String(method).toLowerCase(),
      );
      pType = match ? { id: match.id, name: match.name } : { id: String(method), name: String(method) };
    }

    await handlePaymentConfirm([
      {
        paymentId: pType.id,
        paymentType: pType.name,
        amount: total,
      },
    ]);
  };

  const prevCustomerRef = useRef<any>(null);
  useEffect(() => {
    prevCustomerRef.current = selectedCustomer;
  }, [selectedCustomer]);

  // ── Refund ──

  const handleRefund = (docId: string) => {
    const doc = (documentsQuery.data ?? []).find((d: any) => d.id === docId);
    if (!doc) return;
    const refundItems: CartItem[] = doc.items.map((i: any) => ({
      id: i.productId,
      title: i.name,
      cost: i.priceBeforeTax,
      unit: i.unit ?? "",
      qty: -Math.abs(i.quantity),
      discount: i.discount ?? 0,
      taxRate: i.taxRate ?? 0,
      priceLabel: "Retail",
      availablePrices: [{ label: "Retail", price: i.priceBeforeTax }],
    }));
    setItems(refundItems);
  };

  // ── Transfer ──

  const updateDocument = useUpdateDocument();

  const handleTransferConfirm = async (
    keptItems: CartItem[],
    stagedItems: CartItem[],
    targetOrder: { id?: string; number: string; doc?: any },
  ) => {
    try {
      if (targetOrder.id && targetOrder.doc) {
        // Target order exists in DB as draft
        const existingItems = targetOrder.doc.items || [];
        const combinedItems = [
          ...existingItems,
          ...stagedItems.map((i) => ({
            id: crypto.randomUUID(),
            productId: i.id,
            name: i.title,
            unit: i.unit,
            quantity: i.qty,
            priceBeforeTax: i.cost,
            taxRate: i.taxRate,
            discount: i.discount,
            total: itemTotal(i),
          })),
        ];

        const newSubtotal = combinedItems.reduce(
          (sum: number, item: any) =>
            sum +
            item.quantity *
              item.priceBeforeTax *
              (1 - (item.discount || 0) / 100),
          0,
        );
        const newTaxTotal = combinedItems.reduce(
          (sum: number, item: any) =>
            sum +
            item.quantity *
              item.priceBeforeTax *
              (1 - (item.discount || 0) / 100) *
              ((item.taxRate || 0) / 100),
          0,
        );
        const newTotal = newSubtotal + newTaxTotal;

        await updateDocument.mutateAsync({
          id: targetOrder.id,
          document: {
            totalBeforeTax: newSubtotal,
            taxTotal: newTaxTotal,
            total: newTotal,
            outstandingBalance: newTotal,
          },
          items: combinedItems,
        });
      } else {
        // Create new draft document with targetOrder.number
        const stagedSubtotal = stagedItems.reduce(
          (sum, i) => sum + itemTotal(i),
          0,
        );
        const stagedTax = stagedItems.reduce(
          (sum, i) => sum + itemTotal(i) * (i.taxRate / 100),
          0,
        );
        const stagedTotal = stagedSubtotal + stagedTax;

        await createDocument.mutateAsync({
          document: {
            id: crypto.randomUUID(),
            number: targetOrder.number || genDocNumber(),
            customerId:
              selectedCustomer?.id && String(selectedCustomer.id).trim() !== ""
                ? String(selectedCustomer.id)
                : null,
            date: new Date(),
            status: "draft",
            paid: false,
            totalBeforeTax: stagedSubtotal,
            taxTotal: stagedTax,
            total: stagedTotal,
            totalPaid: 0,
            outstandingBalance: stagedTotal,
            createdAt: new Date(),
            externalNumber: dineIn ? "DINE-IN" : "TAKE-AWAY",
          },
          items: stagedItems.map((i) => ({
            id: crypto.randomUUID(),
            documentId: "",
            productId: i.id,
            name: i.title,
            unit: i.unit,
            quantity: i.qty,
            priceBeforeTax: i.cost,
            taxRate: i.taxRate,
            discount: i.discount,
            total: itemTotal(i),
          })),
        });
      }

      // Update current POS cart
      if (keptItems.length === 0) {
        clearCart();
      } else {
        setItems(keptItems);
        setSelectedItemId(keptItems[0]?.id ?? null);
      }

      toast.success(
        `Transferred ${stagedItems.length} items to Order ${targetOrder.number}`,
      );
    } catch (err) {
      console.error("Transfer failed:", err);
      toast.error("Failed to complete transfer");
    }
  };

  return (
    <div className="h-dvh w-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col overflow-hidden">
      {/* Toasts */}
      {showCashDrawer && (
        <CashDrawerToast onClose={() => setShowCashDrawer(false)} />
      )}
      {showSaveToast && <SaveToast onClose={() => setShowSaveToast(false)} />}
      {warning && (
        <InlineWarning message={warning} onClose={() => setWarning("")} />
      )}

      {/* Modals */}
      {modal === "price" && calcProduct && (
        <PriceModal
          product={calcProduct}
          onConfirm={async (result) => {
            if (result.isEdited) {
              try {
                await upsertProductPrice.mutateAsync({
                  productId: calcProduct.id,
                  label: result.label,
                  salePrice: result.price,
                  cost: calcProduct.cost,
                });
                toast.success(
                  `${result.label} price updated to ₦${formatPrice(result.price)} in catalog`,
                );
              } catch (err) {
                console.error("Failed to update product price:", err);
                toast.error("Failed to save updated price to database");
              }
            }
            const qty = calcInitialQty || 1;
            addOrUpdateItem(
              {
                ...calcProduct,
                priceLabel: result.label,
                cost: result.price,
                availablePrices: result.availablePrices,
              },
              qty,
            );
            setSelectedItemId(calcProduct.id);
            setModal("none");
          }}
          onClose={() => setModal("none")}
        />
      )}
      {modal === "qty" && calcProduct && (
        <CalcModal
          product={calcProduct}
          display={calcDisplay}
          expr={calcExpr}
          hasResult={calcHasResult}
          setDisplay={setCalcDisplay}
          setExpr={setCalcExprFromState}
          setHasResult={setCalcHasResultFromState}
          onConfirm={(qty, price, label) => {
            addOrUpdateItem(
              { ...calcProduct, cost: price, priceLabel: label },
              qty,
            );
            setModal("none");
          }}
          onClose={() => setModal("none")}
        />
      )}
      {modal === "discount" && (
        <DiscountModal
          item={selectedItem}
          cartDiscount={cartDiscount}
          tab={discountModalTab}
          value={discountModalValue}
          setTab={setDiscountModalTabFromState}
          setValue={setDiscountModalValueFromState}
          onItemDiscount={applyItemDiscount}
          onCartDiscount={setCartDiscount}
          onClose={() => setModal("none")}
        />
      )}
      {modal === "customer" && (
        <CustomerModal
          customers={customersQuery.data ?? []}
          selected={selectedCustomer}
          search={customerModalSearch}
          setSearch={setCustomerModalSearchFromState}
          onSelect={setSelectedCustomer}
          onClose={() => setModal("none")}
        />
      )}
      {modal === "payment" && (
        <PaymentScreen
          total={total}
          subtotal={subtotal}
          taxTotal={taxTotal}
          items={items}
          paymentTypes={paymentTypesQuery.data ?? []}
          customer={selectedCustomer}
          paidInput={paidInput}
          selectedPaymentType={selectedPaymentType}
          selectedTax={selectedTax}
          appliedDiscount={appliedDiscount}
          setPaidInput={setPaidInput}
          setSelectedPaymentType={setSelectedPaymentType}
          setSelectedTax={setSelectedTax}
          setAppliedDiscount={setAppliedDiscount}
          showTaxManagement={showTaxManagement}
          showDiscountManagement={showDiscountManagement}
          showCustomerManagement={showCustomerManagement}
          setShowTaxManagement={setShowTaxManagement}
          setShowDiscountManagement={setShowDiscountManagement}
          setShowCustomerManagement={setShowCustomerManagement}
          onConfirm={handlePaymentConfirm}
          onClose={() => setModal("none")}
          isContinuingPayment={!!continuePaymentDoc}
        />
      )}
      {completedSale && (
        <PaymentSummaryScreen
          sale={completedSale}
          onDone={() => {
            setCompletedSale(null);
            router("/pos");
          }}
        />
      )}
      {modal === "refund" && (
        <RefundScreen
          documents={documentsQuery.data ?? []}
          paymentTypes={paymentTypesQuery.data ?? []}
          receipt={refundReceipt}
          paymentType={refundPaymentType}
          error={refundError}
          setReceipt={setRefundReceipt}
          setPaymentType={setRefundPaymentType}
          setError={setRefundError}
          onRefund={handleRefund}
          onClose={() => setModal("none")}
        />
      )}
      {modal === "transfer" && (
        <TransferScreen
          items={items}
          documents={documentsQuery.data ?? []}
          currentOrderNumber={continuePaymentDoc?.number}
          onTransferConfirm={handleTransferConfirm}
          onClose={() => setModal("none")}
        />
      )}
      {modal === "void" && (
        <VoidModal
          onConfirm={() => {
            clearCart();
            setModal("none");
          }}
          onClose={() => setModal("none")}
        />
      )}
      {modal === "comment" && (
        <CommentModal
          item={selectedItem}
          currentNote={orderNote}
          onSave={setOrderNote}
          onClose={() => setModal("none")}
        />
      )}

      <SidebarDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* ── Header ── */}
      <header className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-4 py-2.5">
        <div className="flex items-center gap-3">
          {/* Brand */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 rounded-full bg-amber-400 text-black flex items-center justify-center text-xs font-bold">
              A
            </div>
            <span className="text-sm font-medium hidden md:block">
              Axis Lite
            </span>
          </div>

          {/* Product search */}
          <div className="flex-1 min-w-0 max-w-lg">
            <Select
              options={productOptions}
              placeholder="Search or scan product…"
              isSearchable
              value={null}
              maxMenuHeight={288}
              components={{ MenuList: ChunkedMenuList }}
              onChange={async (option: any) => {
                if (!option) return;
                const p = option.product;

                // Immediate stock check
                const stock = stockLevels[p.id];
                const available = stock?.quantity ?? 0;
                if (available <= 0) {
                  toast.error(`Cannot add ${p.title}. Stock is empty (0).`);
                  return;
                }

                const prices = await getProductPrices(p.id);
                let availablePrices: {
                  label: "Retail" | "Wholesale";
                  price: number;
                }[] = prices.map((pr: any) => ({
                  label: pr.wholeSale ? "Wholesale" : "Retail",
                  price: pr.salePrice,
                }));

                const retailRow = availablePrices.find(
                  (pr) => pr.label === "Retail",
                );
                const wholesaleRow = availablePrices.find(
                  (pr) => pr.label === "Wholesale",
                );

                if (!retailRow) {
                  availablePrices.push({
                    label: "Retail",
                    price: wholesaleRow?.price ?? 0,
                  });
                }
                if (!wholesaleRow) {
                  availablePrices.push({
                    label: "Wholesale",
                    price: retailRow?.price ?? 0,
                  });
                }

                const initialPrice =
                  retailRow?.price ??
                  wholesaleRow?.price ??
                  availablePrices[0]?.price ??
                  0;
                const initialLabel: "Retail" | "Wholesale" = retailRow
                  ? "Retail"
                  : "Wholesale";

                const existing = items.find((i) => i.id === p.id);

                openPriceModal(
                  existing
                    ? { ...existing, availablePrices }
                    : {
                        id: p.id,
                        title: p.title,
                        cost: initialPrice,
                        unit: p.unit ?? "",
                        qty: 1,
                        discount: 0,
                        taxRate: p.taxes?.[0]?.tax?.rate ?? 0,
                        priceLabel: initialLabel,
                        availablePrices,
                      },
                  existing?.qty ?? 1,
                );
              }}
              className="text-sm"
              unstyled
              // `unstyled` still emits these two from the base theme, so they
              // have to be overridden here rather than with a Tailwind class.
              styles={{
                control: (b) => ({ ...b, minHeight: 34 }),
                menu: (b) => ({ ...b, zIndex: 99 }),
              }}
              formatOptionLabel={(option: any) => {
                const stock = stockState(option.value);
                return (
                  <div
                    className={`flex items-center justify-between gap-3 min-w-0 ${
                      stock?.tone === "out" ? "opacity-60" : ""
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="truncate">{option.label}</span>
                      {stock && (
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide border ${
                            stock.tone === "out"
                              ? "bg-red-50 dark:bg-red-950/50 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300"
                              : "bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {stock.text}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs font-mono text-stone-500 dark:text-stone-400">
                      {option.prices
                        .map(
                          (pr: any) =>
                            `${pr.label[0]} ₦${formatPrice(pr.price)}`,
                        )
                        .join("  ·  ")}
                    </span>
                  </div>
                );
              }}
              classNames={{
                control: ({ isFocused }) =>
                  `bg-stone-50 dark:bg-stone-800 border rounded-lg px-2.5 cursor-text transition-colors ${
                    isFocused
                      ? "border-amber-400 dark:border-amber-600"
                      : "border-stone-300 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-600"
                  }`,
                valueContainer: () => "gap-1",
                placeholder: () => "text-stone-400 dark:text-stone-500",
                input: () => "text-stone-900 dark:text-stone-100",
                singleValue: () => "text-stone-900 dark:text-stone-100",
                indicatorsContainer: () => "gap-1 text-stone-400",
                dropdownIndicator: () =>
                  "px-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300",
                indicatorSeparator: () =>
                  "bg-stone-300 dark:bg-stone-700 my-2 w-px",
                menu: () =>
                  "mt-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl shadow-2xl overflow-hidden",
                // maxHeight comes from the `maxMenuHeight` prop — react-select
                // emits it inline even when unstyled, so a class can't set it.
                menuList: () => "py-1",
                option: ({ isFocused, isSelected }) =>
                  `px-3 py-2 cursor-pointer text-stone-900 dark:text-stone-100 ${
                    isFocused || isSelected
                      ? "bg-stone-100 dark:bg-stone-800"
                      : ""
                  }`,
                noOptionsMessage: () =>
                  "px-3 py-3 text-sm text-stone-500 dark:text-stone-400",
              }}
            />
          </div>

          {/* Status chips — only shown when active */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {selectedCustomer && (
              <span className="flex items-center gap-1 bg-orange-950 border border-orange-800 rounded px-2 py-0.5 text-xs text-orange-300">
                <UserCheck className="w-3 h-3" />
                {selectedCustomer.name.split(" ")[0]}
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="opacity-50 hover:opacity-100 ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {dineIn && (
              <button
                onClick={() => setDineIn(false)}
                className="flex items-center gap-1 bg-orange-950 border border-orange-800 rounded px-2 py-0.5 text-xs text-orange-300 hover:bg-orange-900"
              >
                <Accessibility className="w-3 h-3" /> Dine-in{" "}
                <X className="w-3 h-3 opacity-50" />
              </button>
            )}
            {cartDiscount > 0 && (
              <button
                onClick={() => setModal("discount")}
                className="flex items-center gap-1 bg-amber-950 border border-amber-800 rounded px-2 py-0.5 text-xs text-amber-300 hover:bg-amber-900"
              >
                <Percent className="w-3 h-3" /> {cartDiscount}% off
              </button>
            )}
            {continuePaymentDoc && (
              <div className="flex items-center gap-1 bg-amber-950 border border-amber-700 rounded px-2 py-0.5 text-xs text-amber-300">
                <CreditCard className="w-3 h-3" />
                Continuing: {continuePaymentDoc.number}
              </div>
            )}
            {orderNote && (
              <button
                onClick={() => setModal("comment")}
                className="flex items-center gap-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded px-2 py-0.5 text-xs text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:bg-stone-700"
              >
                <MessageSquare className="w-3 h-3" /> Note
              </button>
            )}
          </div>

          {/* User + controls — pushed right */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <span className="hidden lg:flex items-center gap-1.5 text-xs text-stone-500">
              Signed in:{" "}
              <strong className="text-stone-700 dark:text-stone-300 font-medium">
                {useAuth().user?.username ?? "—"}
              </strong>
            </span>
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-1.5 rounded hover:bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:text-stone-200 transition-colors"
            >
              <Menu className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded hover:bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:text-stone-200 transition-colors">
              <Hash className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main layout ── */}
      <main className="flex-1 overflow-hidden p-3">
        <Group orientation="horizontal" className="h-full gap-2">
          {/* ── LEFT: Cart ── */}
          <Panel defaultSize={76} minSize={50}>
            <div className="h-full flex flex-col rounded border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
              {/* Column headers */}
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr] px-5 py-2.5 text-[10px] font-semibold border-b border-stone-300 dark:border-stone-800 text-stone-500 uppercase tracking-wider shrink-0">
                <div>Product</div>
                <div className="text-right">Qty</div>
                <div className="text-right">Price</div>
                <div className="text-right">Amount</div>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-auto">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center gap-2 text-stone-600 select-none">
                    <p className="text-xl font-medium">Cart is empty</p>
                    <p className="text-sm">
                      Search or scan a product to add it
                    </p>
                  </div>
                ) : (
                  items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      onDoubleClick={() =>
                        !item.isLocked && openQtyModal(item, item.qty)
                      }
                      className={`grid grid-cols-[2fr_1fr_1fr_1fr] px-5 py-2.5 border-b border-stone-300 dark:border-stone-800/60 cursor-pointer select-none transition-colors ${
                        selectedItemId === item.id
                          ? "bg-emerald-900/30 border-l-2 border-l-emerald-500"
                          : "hover:bg-white dark:bg-stone-800/40"
                      }`}
                    >
                      <div className="flex flex-col justify-center min-w-0">
                        <span className="truncate text-sm text-stone-800 dark:text-stone-200">
                          {item.title}
                          {item.isLocked && (
                            <Lock className="inline w-3 h-3 text-amber-500 ml-1.5 mb-0.5" />
                          )}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`text-[8px] font-bold px-1 rounded uppercase tracking-tighter ${
                              item.priceLabel === "Wholesale"
                                ? "bg-amber-900/40 text-amber-400 border border-amber-800"
                                : "bg-yellow-900/40 text-yellow-400 border border-yellow-800"
                            }`}
                          >
                            {item.priceLabel}
                          </span>
                          {item.unit && (
                            <span className="text-[10px] text-stone-600">
                              {item.unit}
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className={`text-right text-sm self-center tabular-nums ${item.qty < 0 ? "text-red-400" : "text-stone-700 dark:text-stone-300"}`}
                      >
                        {item.qty}
                      </div>
                      <div className="text-right text-sm self-center tabular-nums text-stone-500 dark:text-stone-400">
                        <button
                          onClick={(e) =>
                            !item.isLocked && toggleItemPrice(e, item.id)
                          }
                          className={`px-1.5 py-0.5 rounded transition-colors ${
                            item.isLocked
                              ? "cursor-not-allowed opacity-60"
                              : "hover:text-amber-600 dark:hover:text-amber-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                          }`}
                          title={
                            item.isLocked
                              ? "Item locked"
                              : "Click to switch price"
                          }
                        >
                          ₦{formatPrice(item.cost)}
                        </button>
                      </div>
                      <div
                        className={`text-right text-sm font-medium self-center tabular-nums ${item.qty < 0 ? "text-red-400" : "text-stone-800 dark:text-stone-200"}`}
                      >
                        ₦{formatPrice(itemTotal(item))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Totals footer */}
              <div className="border-t border-stone-300 dark:border-stone-800 px-5 py-3 space-y-1 shrink-0">
                <div className="flex justify-between text-xs text-stone-500">
                  <span>Subtotal</span>
                  <span className="tabular-nums">
                    ₦{formatPrice(subtotalGross)}
                  </span>
                </div>
                {cartDiscount > 0 && (
                  <div className="flex justify-between text-xs text-amber-500">
                    <span>Discount ({cartDiscount}%)</span>
                    <span className="tabular-nums">
                      −₦{formatPrice(cartDiscountAmt)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-stone-500">
                  <span>Tax</span>
                  <span className="tabular-nums">₦{formatPrice(taxTotal)}</span>
                </div>
                <div className="flex justify-between font-semibold text-base pt-1.5 border-t border-stone-300 dark:border-stone-800">
                  <span className="text-stone-800 dark:text-stone-200">
                    Total
                  </span>
                  <span className="tabular-nums text-stone-900 dark:text-stone-100">
                    ₦{formatPrice(total)}
                  </span>
                </div>
              </div>
            </div>
          </Panel>

          <Separator className="w-px bg-white dark:bg-stone-800 hover:bg-stone-600 transition-colors cursor-col-resize" />

          {/* ── RIGHT: Actions panel ── */}
          <Panel defaultSize={24} minSize={18}>
            <div className="h-full flex flex-col overflow-y-auto gap-0 bg-white dark:bg-stone-900 rounded border border-stone-300 dark:border-stone-800">
              {/* ── Zone: Item actions ── */}
              <div className="px-2 pt-2.5 pb-2 border-b border-stone-300 dark:border-stone-800">
                <ZoneLabel>Item</ZoneLabel>
                <div className="grid grid-cols-4 gap-1.5">
                  <ActBtn
                    icon={X}
                    label="Delete"
                    onClick={deleteSelectedItem}
                    disabled={!selectedItemId || selectedItem?.isLocked}
                  />
                  <ActBtn
                    icon={Hash}
                    label={selectedItem?.priceLabel || "Price"}
                    onClick={togglePriceType}
                    disabled={!selectedItemId || selectedItem?.isLocked}
                  />
                  <ActBtn
                    icon={TbBasketPlus}
                    label="Qty"
                    hotkey="F8"
                    onClick={() =>
                      selectedItem &&
                      openQtyModal(selectedItem, selectedItem.qty)
                    }
                    disabled={!selectedItemId || selectedItem?.isLocked}
                  />
                  <ActBtn
                    icon={Percent}
                    label="Discount"
                    hotkey="F2"
                    onClick={() => setModal("discount")}
                    disabled={selectedItem?.isLocked}
                  />
                  <ActBtn
                    icon={MessageSquare}
                    label="Note"
                    onClick={() => setModal("comment")}
                    disabled={selectedItem?.isLocked}
                  />
                </div>
              </div>

              {/* ── Zone: Order ── */}
              <div className="px-2 pt-2.5 pb-2 border-b border-stone-300 dark:border-stone-800">
                <ZoneLabel>Order</ZoneLabel>
                <div className="grid grid-cols-4 gap-1.5">
                  <ActBtn
                    icon={UserCheck}
                    label={
                      selectedCustomer
                        ? selectedCustomer.name.split(" ")[0]
                        : "Customer"
                    }
                    onClick={() => setModal("customer")}
                    active={!!selectedCustomer}
                  />
                  <ActBtn icon={User} label="Cashier" />
                  <ActBtn icon={Plus} label="New" onClick={clearCart} />
                  <ActBtn
                    icon={ArrowRightLeft}
                    label="Transfer"
                    hotkey="F6"
                    onClick={() => {
                      if (items.length === 0) {
                        setWarning("Add at least one item before transferring.");
                        return;
                      }
                      setModal("transfer");
                    }}
                    disabled={items.length === 0}
                  />
                </div>
              </div>

              {/* ── Zone: Quick pay ── */}
              <div className="px-2 pt-2.5 pb-2 border-b border-stone-300 dark:border-stone-800">
                <ZoneLabel>Quick pay</ZoneLabel>
                <div
                  className={`grid gap-1.5 ${
                    displayPaymentTypes.length === 1
                      ? "grid-cols-1"
                      : displayPaymentTypes.length === 3
                        ? "grid-cols-3"
                        : "grid-cols-2"
                  }`}
                >
                  {displayPaymentTypes.map((pt, idx) => {
                    const n = pt.name.toLowerCase();
                    let colorCls = "border-b-emerald-600 dark:border-b-emerald-500";
                    let IconComp = Banknote;

                    if (n.includes("card") || n.includes("pos")) {
                      colorCls = "border-b-amber-600 dark:border-b-amber-500";
                      IconComp = CreditCard;
                    } else if (n.includes("transfer") || n.includes("bank")) {
                      colorCls = "border-b-blue-600 dark:border-b-blue-500";
                      IconComp = Banknote;
                    } else if (n.includes("check") || n.includes("cheque")) {
                      colorCls = "border-b-purple-600 dark:border-b-purple-500";
                      IconComp = Receipt;
                    } else if (idx === 0) {
                      colorCls = "border-b-emerald-600 dark:border-b-emerald-500";
                      IconComp = Banknote;
                    } else if (idx === 1) {
                      colorCls = "border-b-amber-600 dark:border-b-amber-500";
                      IconComp = CreditCard;
                    } else if (idx === 2) {
                      colorCls = "border-b-blue-600 dark:border-b-blue-500";
                      IconComp = Banknote;
                    } else {
                      colorCls = "border-b-purple-600 dark:border-b-purple-500";
                      IconComp = Banknote;
                    }

                    const isFirst = idx === 0;

                    return (
                      <button
                        key={pt.id}
                        onClick={() => handleQuickPay(pt)}
                        disabled={items.length === 0}
                        title={`Quick pay with ${pt.name}${isFirst ? " (F12)" : ""}`}
                        className={`bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 border-b-2 rounded h-10 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium text-stone-700 dark:text-stone-300 transition-all flex items-center justify-center gap-1.5 px-2 active:scale-95 ${colorCls}`}
                      >
                        <IconComp className="w-3.5 h-3.5 opacity-70 shrink-0" />
                        <span className="truncate">
                          {isFirst && n.includes("cash")
                            ? "F12 Cash"
                            : isFirst
                              ? `F12 ${pt.name}`
                              : pt.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Zone: Payment (primary CTA) ── */}
              <div className="px-2 pt-2.5 pb-2 border-b border-stone-300 dark:border-stone-800">
                <button
                  onClick={openPayment}
                  disabled={items.length === 0}
                  className="w-full bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed rounded flex flex-col items-center justify-center gap-0.5 py-4 text-stone-900 dark:text-white font-semibold transition-colors"
                >
                  <span className="text-[10px] opacity-70 font-normal">
                    F10
                  </span>
                  <span className="text-base">Payment</span>
                  {items.length > 0 && (
                    <span className="text-xs opacity-80 tabular-nums">
                      ₦{formatPrice(total)}
                    </span>
                  )}
                </button>
              </div>

              {/* ── Zone: Document ── */}
              <div className="px-2 pt-2.5 pb-2 border-b border-stone-300 dark:border-stone-800">
                <ZoneLabel>Document</ZoneLabel>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={saveSale}
                    disabled={items.length === 0 || createDocument.isPending}
                    className="flex flex-col items-center justify-center gap-1 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-800 hover:bg-white dark:hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed rounded py-2.5 transition-colors"
                  >
                    <Save className="w-4 h-4 text-stone-500 dark:text-stone-400" />
                    <span className="text-[9px] text-stone-500 font-medium">
                      F9
                    </span>
                    <span className="text-[10px] text-stone-700 dark:text-stone-300">
                      Save
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      if (items.length === 0) {
                        setWarning("Add at least one item before transferring.");
                        return;
                      }
                      setModal("transfer");
                    }}
                    disabled={items.length === 0}
                    className="flex flex-col items-center justify-center gap-1 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-800 hover:bg-white dark:hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed rounded py-2.5 transition-colors"
                  >
                    <ArrowRightLeft className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                    <span className="text-[9px] text-stone-500 font-medium">
                      F6
                    </span>
                    <span className="text-[10px] text-stone-700 dark:text-stone-300">
                      Transfer
                    </span>
                  </button>
                  <button
                    onClick={() => setModal("refund")}
                    className="flex flex-col items-center justify-center gap-1 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-800 hover:bg-white dark:hover:bg-stone-800 rounded py-2.5 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 text-stone-500 dark:text-stone-400" />
                    <span className="text-[9px] text-stone-500 font-medium">
                      F8
                    </span>
                    <span className="text-[10px] text-stone-700 dark:text-stone-300">
                      Refund
                    </span>
                  </button>
                </div>
              </div>

              {/* ── Zone: Danger + More ── */}
              <div className="px-2 pt-2.5 pb-2">
                <ZoneLabel>More</ZoneLabel>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => items.length > 0 && setModal("void")}
                    disabled={items.length === 0}
                    className="flex flex-col items-center justify-center gap-1 bg-red-950/60 border border-red-900 hover:bg-red-900/60 disabled:opacity-40 disabled:cursor-not-allowed rounded py-2.5 transition-colors text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-[10px] font-semibold">Void</span>
                  </button>
                  <button
                    onClick={toggleLock}
                    className="flex flex-col items-center justify-center gap-1 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-800 hover:bg-white dark:bg-stone-800 rounded py-2.5 transition-colors text-stone-500 dark:text-stone-400"
                  >
                    {selectedItem?.isLocked ? (
                      <>
                        <Unlock className="w-4 h-4" />
                        <span className="text-[10px]">Unlock</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span className="text-[10px]">Lock</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setDrawerOpen(true)}
                    className="flex flex-col items-center justify-center gap-1 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-800 hover:bg-white dark:bg-stone-800 rounded py-2.5 transition-colors text-stone-500 dark:text-stone-400"
                  >
                    <BsThreeDots className="w-4 h-4" />
                    <span className="text-[10px]">More</span>
                  </button>
                </div>
              </div>
            </div>
          </Panel>
        </Group>
      </main>
    </div>
  );
}
