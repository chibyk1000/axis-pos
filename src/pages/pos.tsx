"use client";

import { useMemo, useEffect, useRef, useCallback } from "react";
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
  setTransferSource as setTransferSourceAction,
  setTransferStaged as setTransferStagedAction,
  setTransferSrcSel as setTransferSrcSelAction,
  setTransferStageSel as setTransferStageSelAction,
  setTransferTargetDocId as setTransferTargetDocIdAction,
  setShowOrderPicker as setShowOrderPickerAction,
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
  Copy,
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
} from "lucide-react";
import { BsThreeDots } from "react-icons/bs";
import { TbBasketPlus } from "react-icons/tb";
import { ImDrawer } from "react-icons/im";
import Select from "react-select";
import { Group, Panel, Separator } from "react-resizable-panels";
import { SidebarDrawer } from "@/components/sidebar-drawer";
import { ResponsiveIcon } from "@/components/responsive-icon";
import { useAuth } from "@/providers/auth-provider";
import { useCustomers } from "@/hooks/controllers/customers";
import { usePaymentTypes } from "@/hooks/controllers/paymentTypes";
import { useCreateDocument, useDocuments } from "@/hooks/controllers/documents";
import { useNavigate } from "react-router";
import { getProductPrices, useAllPrices } from "@/hooks/controllers/priceLists";
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
  onConfirm: (qty: number) => void;
  onClose: () => void;
  display: string;
  expr: string;
  hasResult: boolean;
  setDisplay: (val: string) => void;
  setExpr: (val: string) => void;
  setHasResult: (val: boolean) => void;
}) {
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
    if (!isNaN(qty) && qty > 0) onConfirm(qty);
  }, [display, onConfirm]);

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
      return "bg-red-700/80 hover:bg-red-600 text-slate-900 dark:text-white font-semibold";
    if (v === "⌫")
      return "bg-slate-100 dark:bg-slate-700 hover:bg-slate-600 text-amber-400 font-semibold text-base";
    if (["+", "-", "×", "÷"].includes(v))
      return "bg-slate-100 dark:bg-slate-700 hover:bg-slate-600 text-cyan-300 font-bold text-lg";
    return "bg-white dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-base";
  };

  return (
    <Modal onClose={onClose}>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-80 shadow-2xl overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-widest font-semibold">
            Quantity
          </p>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
            {product?.title}
          </p>
        </div>
        <div className="mx-4 mb-3 bg-slate-100 dark:bg-slate-950 rounded-xl px-4 py-3 border border-slate-300 dark:border-slate-800">
          {expr && (
            <div className="text-slate-500 text-sm text-right h-5 truncate">
              {expr}
            </div>
          )}
          <div
            className={`text-right font-mono font-semibold tracking-tight leading-none truncate
            ${display.length > 10 ? "text-xl" : display.length > 7 ? "text-2xl" : "text-3xl"}
            ${display === "Error" ? "text-red-400" : "text-slate-900 dark:text-slate-100"}`}
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
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white font-bold text-xl transition-colors"
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
        <div className="px-3 pb-4">
          <button
            onClick={onClose}
            className="w-full bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-800 dark:text-slate-200 rounded-xl h-10 text-xs transition-colors"
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-96 shadow-2xl overflow-hidden">
        <div className="flex border-b border-slate-300 dark:border-slate-800">
          {item && (
            <button
              onClick={() => {
                setTab("item");
                setValue(String(item.discount));
              }}
              className={`flex-1 py-3 text-xs font-semibold transition-colors ${tab === "item" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200"}`}
            >
              Item Discount
            </button>
          )}
          <button
            onClick={() => {
              setTab("cart");
              setValue(String(cartDiscount));
            }}
            className={`flex-1 py-3 text-xs font-semibold transition-colors ${tab === "cart" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200"}`}
          >
            Cart Discount
          </button>
        </div>
        <div className="p-5">
          {tab === "item" && item && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 truncate">
              Applying to:{" "}
              <span className="text-slate-800 dark:text-slate-200">
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
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-2xl font-mono text-right text-slate-900 dark:text-slate-100 outline-none focus:border-cyan-500"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400 text-xl pointer-events-none">
              %
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => setValue(String(p))}
                className="bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-100 dark:bg-slate-700 rounded-lg py-2 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
              >
                {p}%
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-100 dark:bg-slate-700 rounded-xl py-3 text-xs text-slate-600 dark:text-slate-400"
            >
              Cancel
            </button>
            <button
              onClick={apply}
              className="flex-1 bg-cyan-600 hover:bg-cyan-500 rounded-xl py-3 text-xs font-semibold text-slate-900 dark:text-white"
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-105 max-h-[80vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-slate-300 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-3">
            Select Customer
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or code…"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-cyan-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <button
            onClick={() => {
              onSelect(null);
              onClose();
            }}
            className="w-full px-4 py-3 text-left text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white dark:bg-slate-800 border-b border-slate-300 dark:border-slate-800 flex items-center gap-2"
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
              className={`w-full px-4 py-3 text-left hover:bg-slate-200 dark:hover:bg-white dark:bg-slate-800 border-b border-slate-300 dark:border-slate-800 transition-colors ${selected?.id === c.id ? "bg-slate-200 dark:bg-slate-800" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                    {c.name}
                  </p>
                  {c.code && (
                    <p className="text-xs text-slate-600 dark:text-slate-500">
                      {c.code}
                    </p>
                  )}
                </div>
                {selected?.id === c.id && (
                  <Check className="w-4 h-4 text-cyan-400" />
                )}
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-slate-500 py-8 text-xs">
              No customers found
            </p>
          )}
        </div>
        <div className="p-3 border-t border-slate-300 dark:border-slate-800">
          <button
            onClick={onClose}
            className="w-full bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-100 dark:bg-slate-700 rounded-xl py-2 text-xs text-slate-600 dark:text-slate-400"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Split Payment Screen ───────────────────────────────────────────────────────

function SplitPaymentScreen({
  total,
  subtotal,
  taxTotal,
  items,
  paymentTypes,
  customer,
  paidInput,
  selectedTypeId,
  setPaidInput,
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
  const router = useNavigate();
  const enabled = paymentTypes.filter((p) => p.enabled && p.id !== "split");
  const displayTypes =
    enabled.length > 0
      ? enabled
      : [
          { id: "cash", name: "Cash", changeAllowed: true },
          { id: "card", name: "Card", changeAllowed: false },
          { id: "check", name: "Check", changeAllowed: false },
        ];

  const selectedType = displayTypes.find((p) => p.id === selectedTypeId);
  const paidAmount = parseFloat(paidInput) || 0;
  const remaining = Math.max(0, total - paidAmount);

  const handleKey = React.useCallback(
    (val: string) => {
      if (val === "⌫") {
        setPaidInput(paidInput.length > 1 ? paidInput.slice(0, -1) : "0");
      } else if (val === "C") {
        setPaidInput("0");
      } else if (val === ".") {
        if (!paidInput.includes(".")) setPaidInput(paidInput + ".");
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

  const handleSave = () => {
    console.log("SplitPaymentScreen handleSave called");
    if (!selectedType || paidAmount <= 0) return;

    const paymentData = [
      {
        paymentId: selectedType.id,
        paymentType: selectedType.name,
        amount: paidAmount,
      },
    ];

    console.log("SplitPaymentScreen calling onConfirm with:", paymentData);
    onConfirm(paymentData);
    // Navigate to documents page after saving
    setTimeout(() => {
      console.log("SplitPaymentScreen redirecting to documents");
      router("/documents");
    }, 100);
  };

  console.log("SplitPaymentScreen rendering with total:", total);
  return (
    <div className="fixed inset-0 z-50 flex h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200">
      <div className="w-1/3 border-r border-slate-300 dark:border-slate-700 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-300 dark:border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-600 dark:text-slate-500 uppercase tracking-widest font-semibold">
              Split Payment
            </p>
            {customer && (
              <p className="text-xs text-cyan-400 mt-0.5">{customer.name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 dark:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto px-5 py-3 space-y-2">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Items
          </p>
          {items.map((item) => (
            <div
              key={item.id}
              className="flex justify-between text-sm border-b border-slate-300 dark:border-slate-800 pb-2"
            >
              <span className="text-slate-700 dark:text-slate-300 truncate max-w-[65%]">
                {item.qty !== 1 && (
                  <span className="text-slate-500 mr-1">{item.qty}×</span>
                )}
                {item.title}
              </span>
              <span className="tabular-nums text-slate-800 dark:text-slate-200">
                ₦
                {itemTotal(item).toLocaleString("en-NG", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 space-y-1.5 text-sm">
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Subtotal</span>
            <span>
              ₦{subtotal.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Tax</span>
            <span>
              ₦{taxTotal.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between font-bold text-xl text-cyan-400 pt-2 border-t border-slate-200 dark:border-slate-700">
            <span>Total</span>
            <span>₦{formatPrice(total)}</span>
          </div>
          <div className="flex justify-between text-lg font-semibold text-emerald-400">
            <span>Paid</span>
            <span>₦{formatPrice(paidAmount)}</span>
          </div>
          <div className="flex justify-between text-lg font-semibold text-red-400">
            <span>Remaining</span>
            <span>₦{formatPrice(remaining)}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-300 dark:border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-600 dark:text-slate-500 uppercase tracking-widest font-semibold">
              Payment Methods
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <div className="space-y-4">
            {/* Payment Type Selection */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <label className="text-xs text-slate-500 mb-2 block">
                Payment Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {displayTypes.map((pt) => (
                  <button
                    key={pt.id}
                    onClick={() => setSelectedTypeId(pt.id)}
                    className={`py-2 rounded text-sm font-medium flex items-center justify-center gap-2 transition-colors border ${
                      selectedTypeId === pt.id
                        ? "bg-cyan-900 border-cyan-500 text-cyan-200"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {pt.name.toLowerCase().includes("card") ? (
                      <CreditCard className="w-4 h-4" />
                    ) : (
                      <Banknote className="w-4 h-4" />
                    )}
                    {pt.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Calculator Interface */}
            <div className="flex-1 flex flex-col justify-between min-h-0">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Amount</p>
                  <input
                    type="text"
                    value={paidInput}
                    onChange={(e) => setPaidInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave();
                    }}
                    className="w-full bg-transparent border-b-2 border-cyan-500 pb-1 text-3xl text-cyan-300 font-mono tabular-nums text-right outline-none focus:border-cyan-400 transition-colors"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Remaining</p>
                  <p className="text-2xl font-bold tabular-nums text-red-400">
                    ₦{formatPrice(remaining)}
                    {remaining > 0 && (
                      <span className="text-sm ml-1">(owed)</span>
                    )}
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
                          ? "bg-red-700 hover:bg-red-600 text-slate-900 dark:text-white"
                          : isEnter
                            ? "bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white font-bold"
                            : isDash
                              ? "bg-slate-100 dark:bg-slate-700 hover:bg-slate-600 text-cyan-300 text-sm"
                              : "bg-white dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      }`}
                      title={isDash ? "Set to exact total" : undefined}
                    >
                      {isDash ? "Exact" : key}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleSave}
                disabled={!selectedType || paidAmount <= 0}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 dark:text-white text-lg font-bold rounded transition-colors"
              >
                Save · ₦
                {paidAmount.toLocaleString("en-NG", {
                  minimumFractionDigits: 2,
                })}
              </button>
            </div>
          </div>
        </div>
      </div>
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
    <div className="fixed inset-0 z-50 flex h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200">
      <div className="flex-1 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-300 dark:border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-600 dark:text-slate-500 uppercase tracking-widest font-semibold">
              Tax Management
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 dark:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search taxes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                      ? "border-cyan-500 bg-cyan-950/20"
                      : "border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {tax.name}
                      </p>
                      <p className="text-sm text-slate-500">
                        {tax.description || "No description"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-cyan-600">
                        {tax.rate}%
                      </p>
                      <p className="text-xs text-slate-500">
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
    <div className="fixed inset-0 z-50 flex h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200">
      <div className="flex-1 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-300 dark:border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-600 dark:text-slate-500 uppercase tracking-widest font-semibold">
              Discount Management
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 dark:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <div className="space-y-6">
            {/* Discount Type Selection */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <label className="text-xs text-slate-500 mb-2 block">
                Discount Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setDiscountType("percent")}
                  className={`py-2 rounded text-sm font-medium transition-colors border ${
                    discountType === "percent"
                      ? "bg-cyan-900 border-cyan-500 text-cyan-200"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <Percent className="w-4 h-4 inline mr-1" />
                  Percentage
                </button>
                <button
                  onClick={() => setDiscountType("amount")}
                  className={`py-2 rounded text-sm font-medium transition-colors border ${
                    discountType === "amount"
                      ? "bg-cyan-900 border-cyan-500 text-cyan-200"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <Banknote className="w-4 h-4 inline mr-1" />
                  Fixed Amount
                </button>
              </div>
            </div>

            {/* Preset Discounts */}
            <div>
              <label className="text-xs text-slate-500 mb-2 block">
                Quick Presets
              </label>
              <div className="grid grid-cols-3 gap-2">
                {presetDiscounts.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetClick(preset)}
                    className={`py-2 rounded text-sm font-medium transition-colors border ${
                      selectedPreset === preset.id
                        ? "bg-cyan-900 border-cyan-500 text-cyan-200"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount Input */}
            <div>
              <label className="text-xs text-slate-500 mb-2 block">
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
                    className="w-full bg-transparent border-b-2 border-cyan-500 pb-1 text-3xl text-cyan-300 font-mono tabular-nums text-right outline-none focus:border-cyan-400 transition-colors"
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
                        ? "bg-red-700 hover:bg-red-600 text-slate-900 dark:text-white"
                        : isEnter
                          ? "bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white font-bold"
                          : "bg-white dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100"
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
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 dark:text-white text-lg font-bold rounded transition-colors"
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
    <div className="fixed inset-0 z-50 flex h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200">
      <div className="flex-1 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-300 dark:border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-600 dark:text-slate-500 uppercase tracking-widest font-semibold">
              Customer Management
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 dark:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <div className="space-y-4">
            {/* Search and Add */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Customer
              </button>
            </div>

            {/* Add Customer Form */}
            {showAddForm && (
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">
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
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                      className="flex-1 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
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
                      ? "border-cyan-500 bg-cyan-950/20"
                      : "border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="flex-1"
                      onClick={() => handleCustomerClick(customer)}
                    >
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {customer.name}
                      </p>
                      {customer.email && (
                        <p className="text-sm text-slate-500">
                          {customer.email}
                        </p>
                      )}
                      {customer.phone && (
                        <p className="text-sm text-slate-500">
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
  const enabled = paymentTypes.filter((p) => p.enabled);
  const displayTypes =
    enabled.length > 0
      ? enabled
      : [
          { id: "cash", name: "Cash", changeAllowed: true },
          { id: "card", name: "Card", changeAllowed: false },
          { id: "check", name: "Check", changeAllowed: false },
          { id: "split", name: "Split Payments", changeAllowed: false },
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
    <div className="fixed inset-0 z-50 flex min-h-screen  bg-white dark:bg-slate-900 text-slate-900  dark:text-slate-200">
      <div className="w-1/3 border-r border-slate-300 dark:border-slate-700 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-300 dark:border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-600 dark:text-slate-500 uppercase tracking-widest font-semibold">
              Payment
            </p>
            {customer && (
              <p className="text-xs text-cyan-400 mt-0.5">{customer.name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 dark:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto px-5 py-3 space-y-2">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Items
          </p>
          {items.map((item) => (
            <div
              key={item.id}
              className="flex justify-between text-sm border-b border-slate-300 dark:border-slate-800 pb-2"
            >
              <span className="text-slate-700 dark:text-slate-300 truncate max-w-[65%]">
                {item.qty !== 1 && (
                  <span className="text-slate-500 mr-1">{item.qty}×</span>
                )}
                {item.title}
              </span>
              <span className="tabular-nums text-slate-800 dark:text-slate-200">
                ₦
                {itemTotal(item).toLocaleString("en-NG", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 space-y-1.5 text-sm">
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Subtotal</span>
            <span>
              ₦{subtotal.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Tax</span>
            <span>
              ₦{taxTotal.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between font-bold text-xl text-cyan-400 pt-2 border-t border-slate-200 dark:border-slate-700">
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
            className="bg-red-600 hover:bg-red-700 text-slate-900 dark:text-white text-sm font-medium px-5 py-2 rounded transition-colors"
          >
            Cancel
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setShowTaxManagement(true)}
              className="bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm px-4 py-2 rounded transition-colors"
            >
              Taxes
            </button>
            <button
              onClick={() => setShowDiscountManagement(true)}
              className="bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm px-4 py-2 rounded transition-colors"
            >
              Discount
            </button>
            <button
              onClick={() => toast.info("Rounds management coming soon!")}
              className="bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm px-4 py-2 rounded transition-colors"
            >
              Rounds
            </button>
            <button
              onClick={() => setShowCustomerManagement(true)}
              className={`text-sm px-4 py-2 rounded transition-colors ${customer ? "bg-cyan-800 hover:bg-cyan-700 text-cyan-200 border border-cyan-600" : "bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"}`}
            >
              {customer ? customer.name.split(" ")[0] : "Customer"}
            </button>
          </div>
        </div>

        {/* Selected Items Display */}
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 space-y-2">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">
            Applied Items
          </p>

          {/* Selected Tax */}
          {selectedTax && (
            <div className="flex items-center justify-between bg-purple-100 dark:bg-purple-900/30 rounded p-2">
              <div className="flex items-center gap-2">
                <Receipt className="w-3 h-3 text-purple-600" />
                <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                  Tax
                </span>
              </div>
              <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
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
            <div className="flex items-center justify-between bg-blue-100 dark:bg-blue-900/30 rounded p-2">
              <div className="flex items-center gap-2">
                <Users className="w-3 h-3 text-blue-600" />
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                  Customer
                </span>
              </div>
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300 truncate max-w-24">
                {customer.name}
              </span>
            </div>
          )}

          {!selectedTax && !appliedDiscount && !customer && (
            <div className="text-center text-xs text-slate-400 italic">
              No tax, discount, or customer selected
            </div>
          )}
        </div>

        <div className="flex gap-6 flex-1 min-h-0">
          <div className="w-[180px] flex flex-col gap-2 shrink-0">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">
              Payment type
            </p>
            {displayTypes.map((pt) => (
              <button
                key={pt.id}
                onClick={() => setSelectedPaymentType(pt.id)}
                className={`w-full py-3 rounded text-sm font-medium flex items-center justify-center gap-2 transition-colors border ${
                  selectedPaymentType === pt.id
                    ? "bg-cyan-900 border-cyan-500 text-cyan-200"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                {pt.name.toLowerCase().includes("card") ? (
                  <CreditCard className="w-4 h-4" />
                ) : pt.name.toLowerCase().includes("split") ? (
                  <Percent className="w-4 h-4" />
                ) : (
                  <Banknote className="w-4 h-4" />
                )}
                {pt.name}
              </button>
            ))}
          </div>

          <div className="flex-1 flex flex-col justify-between min-h-0">
            <div className="space-y-3">
              {/* Subtotal */}
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Subtotal</p>
                <p className="text-lg font-medium text-slate-300 tabular-nums">
                  ₦{formatPrice(subtotal)}
                </p>
              </div>

              {/* Discount */}
              {discountAmount > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Discount</p>
                  <p className="text-lg font-medium text-orange-400 tabular-nums">
                    -₦{formatPrice(discountAmount)}
                  </p>
                </div>
              )}

              {/* Tax */}
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Tax</p>
                <p className="text-lg font-medium text-slate-300 tabular-nums">
                  ₦{formatPrice(adjustedTaxTotal)}
                </p>
              </div>

              {/* Final Total */}
              <div className="pt-2 border-t border-slate-300 dark:border-slate-700">
                <p className="text-xs text-slate-500 mb-0.5">Total</p>
                <p className="text-3xl font-bold text-cyan-400 tabular-nums">
                  ₦{formatPrice(finalTotal)}
                </p>
                {(discountAmount > 0 || selectedTax) && (
                  <p className="text-xs text-slate-400 mt-1">
                    {discountAmount > 0 &&
                      `Discount: -₦${formatPrice(discountAmount)} `}
                    {selectedTax && `Tax: ${selectedTax.rate}%`}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Paid</p>
                <input
                  ref={paidInputRef}
                  type="number"
                  value={paidInput}
                  onChange={(e) => setPaidInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConfirm();
                  }}
                  className="w-full bg-transparent border-b-2 border-cyan-500 pb-1 text-3xl text-cyan-300 font-mono tabular-nums text-right outline-none focus:border-cyan-400 transition-colors"
                  placeholder="0.00"
                />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Balance/Change</p>
                <p
                  className={`text-2xl font-bold tabular-nums ${
                    balance > 0
                      ? "text-emerald-400"
                      : balance < 0
                        ? "text-red-400"
                        : "text-slate-400"
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
                        ? "bg-red-700 hover:bg-red-600 text-slate-900 dark:text-white"
                        : isEnter
                          ? "bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white font-bold"
                          : isDash
                            ? "bg-slate-100 dark:bg-slate-700 hover:bg-slate-600 text-cyan-300 text-sm"
                            : "bg-white dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100"
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
              className="w-full py-4 mt-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 dark:text-white text-lg font-bold rounded transition-colors"
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
    <div className="fixed inset-0 z-50 flex h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200">
      <div className="w-1/3 border-r border-slate-300 dark:border-slate-700 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-300 dark:border-slate-700">
          <p className="text-xs text-slate-600 dark:text-slate-500 uppercase tracking-widest font-semibold">
            Refund
          </p>
          <p className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
            {matchedDoc ? matchedDoc.number : "—"}
          </p>
          {matchedDoc?.customer?.name && (
            <p className="text-xs text-cyan-400 mt-0.5">
              {matchedDoc.customer.name}
            </p>
          )}
        </div>
        <div className="flex-1 overflow-auto px-5 py-3 space-y-2">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Refund items
          </p>
          {refundItems.length === 0 ? (
            <p className="text-sm text-slate-600 py-4 text-center">
              {receipt.trim() ? "No items found" : "Enter receipt number"}
            </p>
          ) : (
            refundItems.map((item, i) => (
              <div
                key={i}
                className="flex justify-between text-sm border-b border-slate-300 dark:border-slate-800 pb-2"
              >
                <div>
                  <p className="text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                    {item.name}
                  </p>
                  <p className="text-xs text-slate-500">
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
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 uppercase tracking-wider">
            Total refund amount
          </p>
          <p
            className={`text-2xl font-bold mt-1 tabular-nums ${refundTotal > 0 ? "text-cyan-400" : "text-slate-600"}`}
          >
            {refundTotal > 0 ? `−₦${formatPrice(refundTotal)}` : "—"}
          </p>
        </div>
      </div>

      <div className="w-2/3 p-6 flex flex-col relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-3xl text-slate-500 dark:text-slate-400 select-none">
            ↩
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-center max-w-sm text-sm">
            Enter the receipt number and select a refund payment type to
            confirm.
          </p>
          <div className="w-96 flex flex-col gap-1.5">
            <label className="text-xs text-slate-500 dark:text-slate-400">
              Receipt number
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                autoFocus
                value={receipt}
                onChange={(e) => {
                  setReceipt(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                placeholder="e.g. POS-00012345"
                className={`w-full bg-white dark:bg-slate-800 border pl-9 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none transition-colors rounded-sm
                  ${error ? "border-red-500 focus:border-red-400" : matchedDoc ? "border-emerald-500 focus:border-emerald-400" : "border-slate-600 focus:border-cyan-500"}`}
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
            <p className="text-xs text-slate-500 uppercase tracking-wider">
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
                    className={`relative px-7 py-4 border rounded text-sm font-medium transition-colors ${active ? "bg-cyan-700 border-cyan-500 text-slate-900 dark:text-white" : "bg-white dark:bg-slate-800 border-slate-600 hover:bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"}`}
                  >
                    {active && (
                      <span className="absolute -top-2.5 -left-2.5 bg-cyan-500 rounded-full w-6 h-6 flex items-center justify-center text-xs text-slate-900 dark:text-white shadow">
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
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-300 dark:border-slate-800">
          <button
            onClick={handleConfirm}
            disabled={!receipt.trim()}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 dark:text-white px-6 py-2.5 rounded text-sm font-medium transition-colors"
          >
            <Check className="w-4 h-4" /> OK
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-slate-900 dark:text-white px-6 py-2.5 rounded text-sm font-medium transition-colors"
          >
            <X className="w-4 h-4" /> Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Transfer Screen ──────────────────────────────────────────────────────────

function ChevronDownIcon() {
  return (
    <svg
      className="w-3.5 h-3.5 opacity-50"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function TransferScreen({
  documents,
  source,
  staged,
  srcSel,
  stageSel,
  targetDocId,
  showOrderPicker,
  setSource,
  setStaged,
  setSrcSel,
  setStageSel,
  setTargetDocId,
  setShowOrderPicker,
  onTransfer,
  onClose,
}: {
  items: CartItem[];
  documents: any[];
  source: CartItem[];
  staged: CartItem[];
  srcSel: string | null;
  stageSel: string | null;
  targetDocId: string | null;
  showOrderPicker: boolean;
  setSource: (s: CartItem[]) => void;
  setStaged: (s: CartItem[]) => void;
  setSrcSel: (s: string | null) => void;
  setStageSel: (s: string | null) => void;
  setTargetDocId: (id: string | null) => void;
  setShowOrderPicker: (b: boolean) => void;
  onTransfer: (keptItems: CartItem[], targetDocId: string | null) => void;
  onClose: () => void;
}) {
  const openOrders = (documents ?? []).filter((d) => d.status === "draft");
  const targetDoc = openOrders.find((d) => d.id === targetDocId) ?? null;

  const moveOne = () => {
    const item = srcSel ? source.find((i) => i.id === srcSel) : source[0];
    if (!item) return;
    setSource(source.filter((i) => i.id !== item.id));
    setStaged([...staged, item]);
    setSrcSel(null);
  };
  const moveAll = () => {
    setStaged([...staged, ...source]);
    setSource([]);
    setSrcSel(null);
  };
  const removeOne = () => {
    const item = stageSel
      ? staged.find((i) => i.id === stageSel)
      : staged[staged.length - 1];
    if (!item) return;
    setStaged(staged.filter((i) => i.id !== item.id));
    setSource([...source, item]);
    setStageSel(null);
  };
  const removeAll = () => {
    setSource([...source, ...staged]);
    setStaged([]);
    setStageSel(null);
  };
  const handleOk = () => {
    onTransfer(source, staged.length > 0 ? targetDocId : null);
    onClose();
  };

  function SrcRow({ item }: { item: CartItem }) {
    const sel = srcSel === item.id;
    return (
      <div
        onClick={() => setSrcSel(sel ? null : item.id)}
        className={`flex justify-between border-b border-slate-200 dark:border-slate-700 py-2.5 px-2 cursor-pointer rounded-sm transition-colors select-none ${sel ? "bg-slate-100 dark:bg-slate-700 border-l-2 border-l-cyan-400" : "hover:bg-white dark:bg-slate-800/60"}`}
      >
        <div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            {item.title}
          </p>
          <p className="text-xs text-slate-500">
            {item.qty} × ₦
            {item.cost.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <span className="text-sm tabular-nums text-slate-700 dark:text-slate-300 self-center">
          ₦
          {(item.qty * item.cost * (1 - item.discount / 100)).toLocaleString(
            "en-NG",
            { minimumFractionDigits: 2 },
          )}
        </span>
      </div>
    );
  }

  function StageRow({ item }: { item: CartItem }) {
    const sel = stageSel === item.id;
    return (
      <div
        onClick={() => setStageSel(sel ? null : item.id)}
        className={`flex justify-between border border-cyan-600/50 rounded-sm p-2.5 mb-2 cursor-pointer transition-colors select-none ${sel ? "bg-cyan-700/60 border-cyan-400" : "bg-cyan-900/30 hover:bg-cyan-800/40"}`}
      >
        <div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            {item.title}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {item.qty} × ₦
            {item.cost.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <span className="text-sm tabular-nums text-cyan-300 self-center">
          ₦
          {(item.qty * item.cost * (1 - item.discount / 100)).toLocaleString(
            "en-NG",
            { minimumFractionDigits: 2 },
          )}
        </span>
      </div>
    );
  }

  function OrderPicker() {
    return (
      <div className="absolute top-full mt-1 left-0 right-0 z-20 bg-white dark:bg-slate-800 border border-slate-600 rounded-sm shadow-xl max-h-48 overflow-auto">
        {openOrders.length === 0 ? (
          <p className="text-xs text-slate-500 px-3 py-4 text-center">
            No open orders
          </p>
        ) : (
          openOrders.map((doc) => (
            <button
              key={doc.id}
              onClick={() => {
                setTargetDocId(doc.id);
                setShowOrderPicker(false);
              }}
              className={`w-full text-left px-3 py-2.5 text-sm transition-colors flex justify-between ${targetDocId === doc.id ? "bg-cyan-700/40 text-cyan-200" : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-700"}`}
            >
              <span className="font-mono">{doc.number}</span>
              <span className="text-slate-500 text-xs">
                ₦{(doc.total ?? 0).toFixed(2)}
              </span>
            </button>
          ))
        )}
      </div>
    );
  }

  const CtrlBtn = ({
    label,
    onClick,
    title,
  }: {
    label: string;
    onClick: () => void;
    title?: string;
  }) => (
    <button
      onClick={onClick}
      title={title}
      className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-700 border border-slate-600 px-4 py-2.5 rounded text-lg font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white transition-colors w-12 text-center"
    >
      {label}
    </button>
  );

  const ActionBtn = ({
    label,
    onClick,
    disabled,
  }: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-2.5 px-3 bg-white dark:bg-slate-800 border border-slate-600 rounded text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-700 hover:text-slate-900 dark:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-left"
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200">
      <div className="w-[30%] border-r border-slate-300 dark:border-slate-700 flex flex-col">
        <div className="px-4 py-3 border-b border-slate-300 dark:border-slate-700">
          <p className="text-xs text-slate-600 dark:text-slate-500 uppercase tracking-wider font-semibold">
            Order items
          </p>
          <p className="text-xs text-slate-600 mt-0.5">
            {source.length} item{source.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex-1 overflow-auto px-3 py-2">
          {source.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-8">
              All items transferred
            </p>
          ) : (
            source.map((item) => <SrcRow key={item.id} item={item} />)
          )}
        </div>
      </div>

      <div className="w-[8%] flex flex-col items-center justify-center gap-3 border-r border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-900/50">
        <CtrlBtn label="›" onClick={moveOne} title="Move selected →" />
        <CtrlBtn label="»" onClick={moveAll} title="Move all →" />
        <CtrlBtn label="‹" onClick={removeOne} title="← Move back" />
        <CtrlBtn label="«" onClick={removeAll} title="← Move all back" />
      </div>

      <div className="w-[30%] border-r border-slate-200 dark:border-slate-700 flex flex-col">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
            Selected for transfer
          </p>
          <p className="text-xs text-slate-600 mt-0.5">
            {staged.length} item{staged.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex-1 overflow-auto px-3 py-2">
          {staged.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-8">
              No items staged
            </p>
          ) : (
            staged.map((item) => <StageRow key={item.id} item={item} />)
          )}
        </div>
        {staged.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-700 flex justify-between text-sm">
            <span className="text-slate-500">Transfer total</span>
            <span className="text-cyan-400 font-medium tabular-nums">
              ₦
              {staged
                .reduce(
                  (s, i) => s + i.qty * i.cost * (1 - i.discount / 100),
                  0,
                )
                .toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col p-4 gap-3">
        <div className="relative">
          <p className="text-xs text-slate-500 mb-1">Target order</p>
          <button
            onClick={() => setShowOrderPicker(!showOrderPicker)}
            className={`w-full text-left px-3 py-2 rounded text-sm border transition-colors flex justify-between items-center ${targetDoc ? "bg-cyan-900/30 border-cyan-600 text-cyan-200" : "bg-white dark:bg-slate-800 border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-500"}`}
          >
            <span className="font-mono">
              {targetDoc ? targetDoc.number : "Select order…"}
            </span>
            <ChevronDownIcon />
          </button>
          {showOrderPicker && <OrderPicker />}
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <ActionBtn
            label="Select order"
            onClick={() => setShowOrderPicker(!showOrderPicker)}
          />
          <ActionBtn
            label="Transfer all"
            onClick={moveAll}
            disabled={source.length === 0}
          />
          <ActionBtn
            label="Remove all"
            onClick={removeAll}
            disabled={staged.length === 0}
          />
          <ActionBtn label="Transfer rounds" onClick={() => {}} />
          <ActionBtn
            label="Open orders"
            onClick={() => setShowOrderPicker(!showOrderPicker)}
          />
          <ActionBtn label="Transfer all orders" onClick={() => {}} disabled />
        </div>
        <div className="flex gap-2 justify-end pt-2 border-t border-slate-300 dark:border-slate-800">
          <button
            onClick={handleOk}
            disabled={staged.length === 0}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 dark:text-white px-5 py-2 rounded text-sm font-medium transition-colors"
          >
            <Check className="w-4 h-4" /> OK
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-slate-900 dark:text-white px-5 py-2 rounded text-sm font-medium transition-colors"
          >
            <X className="w-4 h-4" /> Cancel
          </button>
        </div>
      </div>

      <button
        onClick={onClose}
        className="absolute top-3 right-4 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
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
      <div className="bg-white dark:bg-slate-900 border border-red-300 dark:border-red-800 rounded-2xl w-80 shadow-2xl p-6 text-center">
        <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
          Void Order?
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          This will clear all items from the cart. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-700 rounded-xl py-2 text-sm text-slate-500 dark:text-slate-400"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-600 hover:bg-red-500 rounded-xl py-2 text-sm font-bold text-slate-900 dark:text-white"
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-96 shadow-2xl p-5">
        <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-widest font-semibold mb-1">
          Note
        </p>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 truncate">
          {item?.title ?? "Order note"}
        </p>
        <textarea
          ref={ref}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="Add a note or special instruction…"
          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-cyan-500 resize-none mb-3"
        />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-700 rounded-xl py-2 text-sm text-slate-500 dark:text-slate-400"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(note);
              onClose();
            }}
            className="flex-1 bg-cyan-600 hover:bg-cyan-500 rounded-xl py-2 text-sm font-semibold text-slate-900 dark:text-white"
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
      <ImDrawer className="w-5 h-5 text-slate-900 dark:text-white" />
      <p className="text-sm font-semibold text-slate-900 dark:text-white">
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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-60 bg-white dark:bg-slate-800 border border-slate-600 rounded-xl px-5 py-3 shadow-2xl flex items-center gap-3">
      <Save className="w-5 h-5 text-cyan-400" />
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
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
        className="text-amber-400 hover:text-slate-900 dark:text-white ml-2"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Zone label ───────────────────────────────────────────────────────────────

function ZoneLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] uppercase tracking-[0.08em] text-slate-600 font-semibold mb-1.5 px-0.5">
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
              ? "bg-cyan-950 border-cyan-700 hover:bg-cyan-900 text-cyan-300"
              : "bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
        }`}
    >
      {hotkey && (
        <span className="absolute top-1 left-1.5 text-[8px] text-slate-600 leading-none">
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
    transferSource,
    transferStaged,
    transferSrcSel,
    transferStageSel,
    transferTargetDocId,
    showOrderPicker,
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
  const setTransferSource = (val: CartItem[]) =>
    dispatch(setTransferSourceAction(val));
  const setTransferStaged = (val: CartItem[]) =>
    dispatch(setTransferStagedAction(val));
  const setTransferSrcSel = (val: string | null) =>
    dispatch(setTransferSrcSelAction(val));
  const setTransferStageSel = (val: string | null) =>
    dispatch(setTransferStageSelAction(val));
  const setTransferTargetDocId = (val: string | null) =>
    dispatch(setTransferTargetDocIdAction(val));
  const setShowOrderPicker = (val: boolean) =>
    dispatch(setShowOrderPickerAction(val));
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

  // Persistence effect
  useEffect(() => {
    const state = {
      items,
      selectedItemId,
      cartDiscount,
      selectedCustomer,
      dineIn,
      orderNote,
    };
    localStorage.setItem(POS_STATE_KEY, JSON.stringify(state));
  }, [
    items,
    selectedItemId,
    cartDiscount,
    selectedCustomer,
    dineIn,
    orderNote,
  ]);

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

  const productOptions = useMemo(
    () =>
      (priceList?.data || []).map((p) => ({
        value: p.id,
        label: `${p.product.title} — ₦${formatPrice(p.salePrice)} (${p.wholeSale ? "Wholesale" : "Retail"})`,
        product: p.product,
        priceOption: p,
      })),
    [priceList?.data],
  );

  // ── Cart helpers ──

  const openQtyModal = (product: CartItem, currentQty = 1) => {
    setCalcProduct(product);
    setCalcInitialQty(currentQty);
    setModal("qty");
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
      if (existing)
        return prev.map((i) => (i.id === product.id ? { ...i, qty } : i));
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
        customerId: selectedCustomer!.id,
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
    if (!selectedCustomer) {
      setWarning("Select a customer to save the sale.");
      setModal("customer");
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
      setContinuePaymentDoc(null);
    } else {
      // Create new document
      const payload = buildDocumentPayload("posted", payments);
      console.log("handlePaymentConfirm - Payload from buildDocumentPayload:", {
        paymentsInPayload: payload.payments?.length,
      });

      await createDocument.mutateAsync(payload);
    }

    // Update stock for each item (sale decreases stock, refund increases stock)
    // Also create detailed stock logs with purchase information
    for (const item of items) {
      const isRefund = item.qty < 0;
      const documentId =
        continuePaymentDoc?.id ||
        buildDocumentPayload("posted", payments).document.id;

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
          documentNumber:
            continuePaymentDoc?.number ||
            buildDocumentPayload("posted", payments).document.number,
          customerName: selectedCustomer?.name,
          customerId: selectedCustomer?.id,
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

    clearCart();
    router("/");
  };

  const openPayment = () => {
    if (items.length === 0) {
      setWarning("Add at least one item before proceeding to payment.");
      return;
    }
    if (!selectedCustomer) {
      setWarning("Select a customer before proceeding to payment.");
      setModal("customer");
      return;
    }
    setModal("payment");
  };

  const handleQuickPay = async (methodId: string) => {
    if (items.length === 0) {
      setWarning("Add at least one item before proceeding to payment.");
      return;
    }
    if (!selectedCustomer) {
      setWarning("Select a customer before proceeding to payment.");
      setModal("customer");
      return;
    }

    const enabled = paymentTypesQuery.data?.filter((p: any) => p.enabled) || [];
    const displayTypes =
      enabled.length > 0
        ? enabled
        : [
            { id: "cash", name: "Cash", changeAllowed: true },
            { id: "card", name: "Card", changeAllowed: false },
            { id: "check", name: "Check", changeAllowed: false },
            { id: "split", name: "Split Payments", changeAllowed: false },
          ];

    const pType =
      displayTypes.find((p: any) => p.id === methodId) || displayTypes[0];

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

  const handleTransfer = (
    keptItems: CartItem[],
    targetDocId: string | null,
  ) => {
    console.log(targetDocId);
    setItems(keptItems);
    if (keptItems.length === 0) {
      setSelectedItemId(null);
      setCartDiscount(0);
    }
  };

  return (
    <div className="h-dvh w-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden">
      {/* Toasts */}
      {showCashDrawer && (
        <CashDrawerToast onClose={() => setShowCashDrawer(false)} />
      )}
      {showSaveToast && <SaveToast onClose={() => setShowSaveToast(false)} />}
      {warning && (
        <InlineWarning message={warning} onClose={() => setWarning("")} />
      )}

      {/* Modals */}
      {modal === "qty" && calcProduct && (
        <CalcModal
          product={calcProduct}
          display={calcDisplay}
          expr={calcExpr}
          hasResult={calcHasResult}
          setDisplay={setCalcDisplay}
          setExpr={setCalcExprFromState}
          setHasResult={setCalcHasResultFromState}
          onConfirm={(qty) => {
            addOrUpdateItem(calcProduct, qty);
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
          source={transferSource}
          staged={transferStaged}
          srcSel={transferSrcSel}
          stageSel={transferStageSel}
          targetDocId={transferTargetDocId}
          showOrderPicker={showOrderPicker}
          setSource={setTransferSource}
          setStaged={setTransferStaged}
          setSrcSel={setTransferSrcSel}
          setStageSel={setTransferStageSel}
          setTargetDocId={setTransferTargetDocId}
          setShowOrderPicker={setShowOrderPicker}
          onTransfer={handleTransfer}
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
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5">
        <div className="flex items-center gap-3">
          {/* Brand */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 rounded-full bg-cyan-400 text-black flex items-center justify-center text-xs font-bold">
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
              onChange={async (option: any) => {
                if (!option) return;
                const p = option.product;
                const selectedPriceOption = option.priceOption;
                const isSelectedWholesale = selectedPriceOption.wholeSale;

                // Immediate stock check
                const stock = stockLevels[p.id];
                const available = stock?.quantity ?? 0;
                if (available <= 0) {
                  toast.error(`Cannot add ${p.title}. Stock is empty (0).`);
                  return;
                }

                const prices = await getProductPrices(p.id);
                const availablePrices: {
                  label: "Retail" | "Wholesale";
                  price: number;
                }[] = prices.map((pr: any) => ({
                  label: pr.wholeSale ? "Wholesale" : "Retail",
                  price: pr.salePrice,
                }));
                const existing = items.find((i) => i.id === p.id);

                openQtyModal(
                  existing ?? {
                    id: p.id,
                    title: p.title,
                    cost: selectedPriceOption.salePrice,
                    unit: p.unit ?? "",
                    qty: 1,
                    discount: 0,
                    taxRate: p.taxes?.[0]?.tax?.rate ?? 0,
                    priceLabel: isSelectedWholesale ? "Wholesale" : "Retail",
                    availablePrices,
                  },
                  existing?.qty ?? 1,
                );
              }}
              className="text-sm"
              styles={{
                control: (b) => ({
                  ...b,
                  backgroundColor: "#020617",
                  borderColor: "#334155",
                  minHeight: "34px",
                  boxShadow: "none",
                }),
                menu: (b) => ({ ...b, backgroundColor: "#0f172a", zIndex: 99 }),
                option: (b, s) => ({
                  ...b,
                  backgroundColor: s.isFocused ? "#1e293b" : "#0f172a",
                  color: "#e2e8f0",
                  cursor: "pointer",
                }),
                singleValue: (b) => ({ ...b, color: "#e2e8f0" }),
                input: (b) => ({ ...b, color: "#e2e8f0" }),
                placeholder: (b) => ({ ...b, color: "#64748b" }),
              }}
            />
          </div>

          {/* Status chips — only shown when active */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {selectedCustomer && (
              <span className="flex items-center gap-1 bg-cyan-950 border border-cyan-800 rounded px-2 py-0.5 text-xs text-cyan-300">
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
                className="flex items-center gap-1 bg-cyan-950 border border-cyan-800 rounded px-2 py-0.5 text-xs text-cyan-300 hover:bg-cyan-900"
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
                className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-700"
              >
                <MessageSquare className="w-3 h-3" /> Note
              </button>
            )}
          </div>

          {/* User + controls — pushed right */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <span className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500">
              Signed in:{" "}
              <strong className="text-slate-700 dark:text-slate-300 font-medium">
                {useAuth().user?.username ?? "—"}
              </strong>
            </span>
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-1.5 rounded hover:bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 transition-colors"
            >
              <Menu className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded hover:bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 transition-colors">
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
            <div className="h-full flex flex-col rounded border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              {/* Column headers */}
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr] px-5 py-2.5 text-[10px] font-semibold border-b border-slate-300 dark:border-slate-800 text-slate-500 uppercase tracking-wider shrink-0">
                <div>Product</div>
                <div className="text-right">Qty</div>
                <div className="text-right">Price</div>
                <div className="text-right">Amount</div>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-auto">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center gap-2 text-slate-600 select-none">
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
                      className={`grid grid-cols-[2fr_1fr_1fr_1fr] px-5 py-2.5 border-b border-slate-300 dark:border-slate-800/60 cursor-pointer select-none transition-colors ${
                        selectedItemId === item.id
                          ? "bg-emerald-900/30 border-l-2 border-l-emerald-500"
                          : "hover:bg-white dark:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex flex-col justify-center min-w-0">
                        <span className="truncate text-sm text-slate-800 dark:text-slate-200">
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
                                : "bg-sky-900/40 text-sky-400 border border-sky-800"
                            }`}
                          >
                            {item.priceLabel}
                          </span>
                          {item.unit && (
                            <span className="text-[10px] text-slate-600">
                              {item.unit}
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className={`text-right text-sm self-center tabular-nums ${item.qty < 0 ? "text-red-400" : "text-slate-700 dark:text-slate-300"}`}
                      >
                        {item.qty}
                      </div>
                      <div className="text-right text-sm self-center tabular-nums text-slate-500 dark:text-slate-400">
                        <button
                          onClick={(e) =>
                            !item.isLocked && toggleItemPrice(e, item.id)
                          }
                          className={`px-1.5 py-0.5 rounded transition-colors ${
                            item.isLocked
                              ? "cursor-not-allowed opacity-60"
                              : "hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-200 dark:hover:bg-slate-700"
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
                        className={`text-right text-sm font-medium self-center tabular-nums ${item.qty < 0 ? "text-red-400" : "text-slate-800 dark:text-slate-200"}`}
                      >
                        ₦{formatPrice(itemTotal(item))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Totals footer */}
              <div className="border-t border-slate-300 dark:border-slate-800 px-5 py-3 space-y-1 shrink-0">
                <div className="flex justify-between text-xs text-slate-500">
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
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Tax</span>
                  <span className="tabular-nums">₦{formatPrice(taxTotal)}</span>
                </div>
                <div className="flex justify-between font-semibold text-base pt-1.5 border-t border-slate-300 dark:border-slate-800">
                  <span className="text-slate-800 dark:text-slate-200">
                    Total
                  </span>
                  <span className="tabular-nums text-slate-900 dark:text-slate-100">
                    ₦{formatPrice(total)}
                  </span>
                </div>
              </div>
            </div>
          </Panel>

          <Separator className="w-px bg-white dark:bg-slate-800 hover:bg-slate-600 transition-colors cursor-col-resize" />

          {/* ── RIGHT: Actions panel ── */}
          <Panel defaultSize={24} minSize={18}>
            <div className="h-full flex flex-col overflow-y-auto gap-0 bg-white dark:bg-slate-900 rounded border border-slate-300 dark:border-slate-800">
              {/* ── Zone: Item actions ── */}
              <div className="px-2 pt-2.5 pb-2 border-b border-slate-300 dark:border-slate-800">
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
              <div className="px-2 pt-2.5 pb-2 border-b border-slate-300 dark:border-slate-800">
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
                    icon={Copy}
                    label="Transfer"
                    hotkey="F7"
                    onClick={() => items.length > 0 && setModal("transfer")}
                    disabled={items.length === 0}
                  />
                </div>
              </div>

              {/* ── Zone: Quick pay ── */}
              <div className="px-2 pt-2.5 pb-2 border-b border-slate-300 dark:border-slate-800">
                <ZoneLabel>Quick pay</ZoneLabel>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleQuickPay("cash")}
                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 border-b-2 border-b-emerald-600 rounded h-10 hover:bg-slate-100 dark:hover:bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    F12 Cash
                  </button>
                  <button
                    onClick={() => handleQuickPay("card")}
                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 border-b-2 border-b-blue-600 rounded h-10 hover:bg-slate-100 dark:hover:bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    Card
                  </button>
                </div>
              </div>

              {/* ── Zone: Payment (primary CTA) ── */}
              <div className="px-2 pt-2.5 pb-2 border-b border-slate-300 dark:border-slate-800">
                <button
                  onClick={openPayment}
                  disabled={items.length === 0}
                  className="w-full bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed rounded flex flex-col items-center justify-center gap-0.5 py-4 text-slate-900 dark:text-white font-semibold transition-colors"
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
              <div className="px-2 pt-2.5 pb-2 border-b border-slate-300 dark:border-slate-800">
                <ZoneLabel>Document</ZoneLabel>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={saveSale}
                    disabled={items.length === 0 || createDocument.isPending}
                    className="flex flex-col items-center justify-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed rounded py-2.5 transition-colors"
                  >
                    <Save className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span className="text-[9px] text-slate-500 font-medium">
                      F9
                    </span>
                    <span className="text-[10px] text-slate-700 dark:text-slate-300">
                      Save
                    </span>
                  </button>
                  <button
                    onClick={() => setModal("refund")}
                    className="flex flex-col items-center justify-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:bg-white dark:bg-slate-800 rounded py-2.5 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span className="text-[10px] text-slate-700 dark:text-slate-300">
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
                    className="flex flex-col items-center justify-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:bg-white dark:bg-slate-800 rounded py-2.5 transition-colors text-slate-500 dark:text-slate-400"
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
                    className="flex flex-col items-center justify-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:bg-white dark:bg-slate-800 rounded py-2.5 transition-colors text-slate-500 dark:text-slate-400"
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
