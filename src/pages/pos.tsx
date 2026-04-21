"use client";

import { useMemo, useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { BsThreeDots } from "react-icons/bs";
import { TbBasketPlus } from "react-icons/tb";
import { ImDrawer } from "react-icons/im";
import Select from "react-select";
import { Group, Panel, Separator } from "react-resizable-panels";
import { SidebarDrawer } from "@/components/sidebar-drawer";
import { ResponsiveIcon } from "@/components/responsive-icon";
import { useAuth } from "@/App";
import { useCustomers } from "@/hooks/controllers/customers";
import { usePaymentTypes } from "@/hooks/controllers/paymentTypes";
import { useCreateDocument, useDocuments } from "@/hooks/controllers/documents";
import { useNavigate } from "react-router";
import { getProductPrices, useAllPrices } from "@/hooks/controllers/priceLists";
import { useAddStockEntry } from "@/hooks/controllers/stocks";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CartItem {
  id: string;
  title: string;
  cost: number;
  unit: string;
  qty: number;
  discount: number;
  taxRate: number;
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
  | "lock"
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
  initialQty,
  onConfirm,
  onClose,
}: {
  product: CartItem | null;
  initialQty: number;
  onConfirm: (qty: number) => void;
  onClose: () => void;
}) {
  const [display, setDisplay] = useState(String(initialQty));
  const [expr, setExpr] = useState("");
  const [hasResult, setHasResult] = useState(false);

  const handle = (val: string) => {
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
      setDisplay((p) => (p.length > 1 ? p.slice(0, -1) : "0"));
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
      setDisplay((p) =>
        ["+", "-", "×", "÷"].includes(p.slice(-1))
          ? p.slice(0, -1) + val
          : p + val,
      );
      return;
    }
    if (val === ".") {
      const parts = display.split(/[+\-×÷]/);
      if (parts[parts.length - 1].includes(".")) return;
      setDisplay((p) => p + ".");
      return;
    }
    if (hasResult) {
      setDisplay(val);
      setExpr("");
      setHasResult(false);
      return;
    }
    setDisplay((p) => (p === "0" ? val : p + val));
  };

  const confirm = () => {
    const qty = parseFloat(display);
    if (!isNaN(qty) && qty > 0) onConfirm(qty);
  };

  const btnCls = (v: string) => {
    if (v === "C")
      return "bg-red-700/80 hover:bg-red-600 text-slate-900 dark:text-white font-semibold";
    if (v === "⌫")
      return "bg-slate-100 dark:bg-slate-700 hover:bg-slate-600 text-amber-400 font-semibold text-lg";
    if (["+", "-", "×", "÷"].includes(v))
      return "bg-slate-100 dark:bg-slate-700 hover:bg-slate-600 text-cyan-300 font-bold text-xl";
    return "bg-white dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-lg";
  };

  return (
    <Modal onClose={onClose}>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-80 shadow-2xl overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-widest font-semibold">
            Quantity
          </p>
          <p className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
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
            ${display.length > 10 ? "text-2xl" : display.length > 7 ? "text-3xl" : "text-4xl"}
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
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white font-bold text-2xl transition-colors"
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
            className="w-full bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-800 dark:text-slate-200 rounded-xl h-10 text-sm transition-colors"
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
  onItemDiscount,
  onCartDiscount,
  onClose,
}: {
  item: CartItem | null;
  cartDiscount: number;
  onItemDiscount: (id: string, pct: number) => void;
  onCartDiscount: (pct: number) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"item" | "cart">(item ? "item" : "cart");
  const [value, setValue] = useState(
    item ? String(item.discount) : String(cartDiscount),
  );
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
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === "item" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200"}`}
            >
              Item Discount
            </button>
          )}
          <button
            onClick={() => {
              setTab("cart");
              setValue(String(cartDiscount));
            }}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === "cart" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200"}`}
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
              max={100}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apply()}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-3xl font-mono text-right text-slate-900 dark:text-slate-100 outline-none focus:border-cyan-500"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400 text-2xl pointer-events-none">
              %
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => setValue(String(p))}
                className="bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-100 dark:bg-slate-700 rounded-lg py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors"
              >
                {p}%
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-100 dark:bg-slate-700 rounded-xl py-3 text-sm text-slate-600 dark:text-slate-400"
            >
              Cancel
            </button>
            <button
              onClick={apply}
              className="flex-1 bg-cyan-600 hover:bg-cyan-500 rounded-xl py-3 text-sm font-semibold text-slate-900 dark:text-white"
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
  onSelect,
  onClose,
}: {
  customers: any[];
  selected: any | null;
  onSelect: (c: any | null) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.code ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Modal onClose={onClose}>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-105 max-h-[80vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-slate-300 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
            Select Customer
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or code…"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-cyan-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <button
            onClick={() => {
              onSelect(null);
              onClose();
            }}
            className="w-full px-4 py-3 text-left text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white dark:bg-slate-800 border-b border-slate-300 dark:border-slate-800 flex items-center gap-2"
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
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
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
            <p className="text-center text-slate-500 py-8 text-sm">
              No customers found
            </p>
          )}
        </div>
        <div className="p-3 border-t border-slate-300 dark:border-slate-800">
          <button
            onClick={onClose}
            className="w-full bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-100 dark:bg-slate-700 rounded-xl py-2 text-sm text-slate-600 dark:text-slate-400"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
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
  onConfirm,
  onClose,
}: {
  total: number;
  subtotal: number;
  taxTotal: number;
  items: CartItem[];
  paymentTypes: any[];
  customer: any | null;
  onConfirm: (
    payments: { paymentId: string; paymentType: string; amount: number }[],
  ) => void;
  onClose: () => void;
}) {
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

  const [selectedId, setSelectedId] = useState<string>(
    displayTypes[0]?.id ?? "",
  );
  const [paidInput, setPaidInput] = useState(total.toFixed(2));

  const selectedType = displayTypes.find((p) => p.id === selectedId);
  const paidAmount = parseFloat(paidInput) || 0;
  const change = selectedType?.changeAllowed
    ? Math.max(0, paidAmount - total)
    : 0;

  const handleKey = (val: string) => {
    if (val === "⌫") {
      setPaidInput((p) => (p.length > 1 ? p.slice(0, -1) : "0"));
    } else if (val === "C") {
      setPaidInput("0");
    } else if (val === "↵") {
      handleConfirm();
    } else if (val === ".") {
      setPaidInput((p) => (p.includes(".") ? p : p + "."));
    } else if (val === "-") {
      setPaidInput(total.toFixed(2));
    } else {
      setPaidInput((p) => (p === "0" ? val : p + val));
    }
  };

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

  const handleConfirm = () => {
    if (!selectedId || !selectedType) return;
    onConfirm([
      { paymentId: selectedId, paymentType: selectedType.name, amount: total },
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200">
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

      <div className="w-2/3 flex flex-col p-6 gap-5">
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="bg-red-600 hover:bg-red-700 text-slate-900 dark:text-white text-sm font-medium px-5 py-2 rounded transition-colors"
          >
            Cancel
          </button>
          <div className="flex gap-2">
            {["Taxes", "Discount", "Rounds"].map((lbl) => (
              <button
                key={lbl}
                className="bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm px-4 py-2 rounded transition-colors"
              >
                {lbl}
              </button>
            ))}
            <button
              className={`text-sm px-4 py-2 rounded transition-colors ${customer ? "bg-cyan-800 hover:bg-cyan-700 text-cyan-200 border border-cyan-600" : "bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"}`}
            >
              {customer ? customer.name.split(" ")[0] : "Customer"}
            </button>
          </div>
        </div>

        <div className="flex gap-6 flex-1 min-h-0">
          <div className="w-[180px] flex flex-col gap-2 shrink-0">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">
              Payment type
            </p>
            {displayTypes.map((pt) => (
              <button
                key={pt.id}
                onClick={() => setSelectedId(pt.id)}
                className={`w-full py-3 rounded text-sm font-medium flex items-center justify-center gap-2 transition-colors border ${
                  selectedId === pt.id
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
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Total</p>
                <p className="text-3xl font-bold text-cyan-400 tabular-nums">
                  ₦{total.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Paid</p>
                <div className="border-b-2 border-cyan-500 pb-1">
                  <span className="text-3xl text-cyan-300 font-mono tabular-nums">
                    ₦
                    {parseFloat(paidInput || "0").toLocaleString("en-NG", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
              {selectedType?.changeAllowed && change > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Change</p>
                  <p className="text-2xl font-bold text-emerald-400 tabular-nums">
                    ₦
                    {change.toLocaleString("en-NG", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
              )}
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
              disabled={!selectedId || paidAmount < total}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 dark:text-white text-lg font-bold rounded transition-colors"
            >
              Confirm Payment · ₦
              {total.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Refund Screen ────────────────────────────────────────────────────────────

function RefundScreen({
  documents,
  paymentTypes,
  onRefund,
  onClose,
}: {
  documents: any[];
  paymentTypes: any[];
  onRefund: (docId: string) => void;
  onClose: () => void;
}) {
  const [receipt, setReceipt] = useState("");
  const [paymentType, setPaymentType] = useState<string>("");
  const [error, setError] = useState("");

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
                    {item.qty} × ₦
                    {item.price.toLocaleString("en-NG", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <span className="text-red-400 tabular-nums">
                  ₦
                  {item.total.toLocaleString("en-NG", {
                    minimumFractionDigits: 2,
                  })}
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
            {refundTotal > 0
              ? `−₦${refundTotal.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`
              : "—"}
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
                {(matchedDoc.total ?? 0).toLocaleString("en-NG", {
                  minimumFractionDigits: 2,
                })}
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
  items: cartItems,
  documents,
  onTransfer,
  onClose,
}: {
  items: CartItem[];
  documents: any[];
  onTransfer: (keptItems: CartItem[], targetDocId: string | null) => void;
  onClose: () => void;
}) {
  const [source, setSource] = useState<CartItem[]>(cartItems);
  const [staged, setStaged] = useState<CartItem[]>([]);
  const [srcSel, setSrcSel] = useState<string | null>(null);
  const [stageSel, setStageSel] = useState<string | null>(null);
  const [targetDocId, setTargetDocId] = useState<string | null>(null);
  const [showOrderPicker, setShowOrderPicker] = useState(false);

  const openOrders = (documents ?? []).filter((d) => d.status === "draft");
  const targetDoc = openOrders.find((d) => d.id === targetDocId) ?? null;

  const moveOne = () => {
    const item = srcSel ? source.find((i) => i.id === srcSel) : source[0];
    if (!item) return;
    setSource((p) => p.filter((i) => i.id !== item.id));
    setStaged((p) => [...p, item]);
    setSrcSel(null);
  };
  const moveAll = () => {
    setStaged((p) => [...p, ...source]);
    setSource([]);
    setSrcSel(null);
  };
  const removeOne = () => {
    const item = stageSel
      ? staged.find((i) => i.id === stageSel)
      : staged[staged.length - 1];
    if (!item) return;
    setStaged((p) => p.filter((i) => i.id !== item.id));
    setSource((p) => [...p, item]);
    setStageSel(null);
  };
  const removeAll = () => {
    setSource((p) => [...p, ...staged]);
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
            onClick={() => setShowOrderPicker((v) => !v)}
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
            onClick={() => setShowOrderPicker((v) => !v)}
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
            onClick={() => setShowOrderPicker((v) => !v)}
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

// ─── Lock Screen ──────────────────────────────────────────────────────────────

const LOCK_PIN_KEY = "pos_lock_pin";

function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const savedPin =
    typeof window !== "undefined"
      ? (localStorage.getItem(LOCK_PIN_KEY) ?? "1234")
      : "1234";

  const handleDigit = (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === 4) {
      setTimeout(() => {
        if (next === savedPin) onUnlock();
        else {
          setError(true);
          setPin("");
        }
      }, 150);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center z-100">
      <Lock className="w-10 h-10 text-slate-500 mb-6" />
      <p className="text-slate-700 dark:text-slate-300 text-sm mb-6 font-medium">
        Enter PIN to unlock
      </p>
      <div className="flex gap-3 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-colors ${pin.length > i ? (error ? "bg-red-500 border-red-500" : "bg-cyan-400 border-cyan-400") : "border-slate-600"}`}
          />
        ))}
      </div>
      {error && (
        <p className="text-red-400 text-xs mb-4 -mt-4">Incorrect PIN</p>
      )}
      <div className="grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map(
          (d, i) =>
            d === "" ? (
              <div key={i} />
            ) : (
              <button
                key={i}
                onClick={() =>
                  d === "⌫" ? setPin((p) => p.slice(0, -1)) : handleDigit(d)
                }
                className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-xl font-semibold transition-colors"
              >
                {d}
              </button>
            ),
        )}
      </div>
      <p className="text-xs text-slate-600 mt-8">Default PIN: 1234</p>
    </div>
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
  const [note, setNote] = useState(currentNote);
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
  const addStockEntry = useAddStockEntry();

  // Cart state
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [cartDiscount, setCartDiscount] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [dineIn, setDineIn] = useState(false);
  const [orderNote, setOrderNote] = useState("");

  // UI
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modal, setModal] = useState<ModalKind>("none");
  const [showCashDrawer, setShowCashDrawer] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [warning, setWarning] = useState("");

  // Qty calc state
  const [calcProduct, setCalcProduct] = useState<CartItem | null>(null);
  const [calcInitialQty, setCalcInitialQty] = useState(1);
  const priceList = useAllPrices();

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
        value: p.product.id,
        label: `${p.product.title} — ₦${p.salePrice} (${p.wholeSale ? "Wholesale" : "Retail"})`,
        product: p.product,
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
        },
      ];
    });
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

  const clearCart = () => {
    setItems([]);
    setSelectedItemId(null);
    setCartDiscount(0);
    setSelectedCustomer(null);
    setDineIn(false);
    setOrderNote("");
  };

  // ── Document payload ──

  const buildDocumentPayload = (
    status: "draft" | "posted",
    paid: boolean,
    payments?: { paymentId: string; paymentType: string; amount: number }[],
  ) => ({
    document: {
      id: crypto.randomUUID(),
      number: genDocNumber(),
      customerId: selectedCustomer!.id,
      date: new Date(),
      status,
      paid,
      totalBeforeTax: subtotal,
      taxTotal,
      total,
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
  });

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
    await createDocument.mutateAsync(buildDocumentPayload("draft", false));
    setShowSaveToast(true);
  };

  // ── Payment ──

  const handlePaymentConfirm = async (
    payments: { paymentId: string; paymentType: string; amount: number }[],
  ) => {
    await createDocument.mutateAsync(
      buildDocumentPayload("posted", true, payments),
    );

    // Update stock for each item (sale decreases stock, refund increases stock)
    for (const item of items) {
      const isRefund = item.qty < 0;
      await addStockEntry.mutateAsync({
        productId: item.id,
        type: isRefund ? "in" : "out",
        quantity: isRefund ? Math.abs(item.qty) : -Math.abs(item.qty), // Positive for refunds (stock in), negative for sales (stock out)
        note: isRefund ? "Refund" : "Sale",
        createdAt: new Date(),
      });
    }

    clearCart();
    router("/documents");
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
      {/* Lock screen */}
      {modal === "lock" && <LockScreen onUnlock={() => setModal("none")} />}

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
          initialQty={calcInitialQty}
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
          onItemDiscount={applyItemDiscount}
          onCartDiscount={setCartDiscount}
          onClose={() => setModal("none")}
        />
      )}
      {modal === "customer" && (
        <CustomerModal
          customers={customersQuery.data ?? []}
          selected={selectedCustomer}
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
          onConfirm={handlePaymentConfirm}
          onClose={() => setModal("none")}
        />
      )}
      {modal === "refund" && (
        <RefundScreen
          documents={documentsQuery.data ?? []}
          paymentTypes={paymentTypesQuery.data ?? []}
          onRefund={handleRefund}
          onClose={() => setModal("none")}
        />
      )}
      {modal === "transfer" && (
        <TransferScreen
          items={items}
          documents={documentsQuery.data ?? []}
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
                const prices = await getProductPrices(p.id);
                const defaultPrice =
                  prices.find((pr) => pr.isDefault) || prices[0];
                const existing = items.find((i) => i.id === p.id);
                openQtyModal(
                  existing ?? {
                    id: p.id,
                    title: p.title,
                    cost: defaultPrice ? defaultPrice.salePrice : (p.cost ?? 0),
                    unit: p.unit ?? "",
                    qty: 1,
                    discount: 0,
                    taxRate: p.taxes?.[0]?.tax?.rate ?? 0,
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
                      onDoubleClick={() => openQtyModal(item, item.qty)}
                      className={`grid grid-cols-[2fr_1fr_1fr_1fr] px-5 py-2.5 border-b border-slate-300 dark:border-slate-800/60 cursor-pointer select-none transition-colors ${
                        selectedItemId === item.id
                          ? "bg-emerald-900/30 border-l-2 border-l-emerald-500"
                          : "hover:bg-white dark:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex flex-col justify-center min-w-0">
                        <span className="truncate text-sm text-slate-800 dark:text-slate-200">
                          {item.title}
                        </span>
                        {item.discount > 0 && (
                          <span className="text-[10px] text-amber-400">
                            {item.discount}% disc.
                          </span>
                        )}
                        {item.unit && (
                          <span className="text-[10px] text-slate-600">
                            {item.unit}
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-right text-sm self-center tabular-nums ${item.qty < 0 ? "text-red-400" : "text-slate-700 dark:text-slate-300"}`}
                      >
                        {item.qty}
                      </div>
                      <div className="text-right text-sm self-center tabular-nums text-slate-500 dark:text-slate-400">
                        ₦{item.cost.toFixed(2)}
                      </div>
                      <div
                        className={`text-right text-sm font-medium self-center tabular-nums ${item.qty < 0 ? "text-red-400" : "text-slate-800 dark:text-slate-200"}`}
                      >
                        ₦{itemTotal(item).toFixed(2)}
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
                    ₦{subtotalGross.toFixed(2)}
                  </span>
                </div>
                {cartDiscount > 0 && (
                  <div className="flex justify-between text-xs text-amber-500">
                    <span>Discount ({cartDiscount}%)</span>
                    <span className="tabular-nums">
                      −₦{cartDiscountAmt.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Tax</span>
                  <span className="tabular-nums">₦{taxTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-base pt-1.5 border-t border-slate-300 dark:border-slate-800">
                  <span className="text-slate-800 dark:text-slate-200">
                    Total
                  </span>
                  <span className="tabular-nums text-slate-900 dark:text-slate-100">
                    ₦{total.toFixed(2)}
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
                    disabled={!selectedItemId}
                  />
                  <ActBtn
                    icon={TbBasketPlus}
                    label="Qty"
                    hotkey="F8"
                    onClick={() =>
                      selectedItem &&
                      openQtyModal(selectedItem, selectedItem.qty)
                    }
                    disabled={!selectedItemId}
                  />
                  <ActBtn
                    icon={Percent}
                    label="Discount"
                    hotkey="F2"
                    onClick={() => setModal("discount")}
                  />
                  <ActBtn
                    icon={MessageSquare}
                    label="Note"
                    onClick={() => setModal("comment")}
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
                    onClick={openPayment}
                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 border-b-2 border-b-emerald-600 rounded h-10 hover:bg-slate-100 dark:hover:bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    F12 Cash
                  </button>
                  <button
                    onClick={openPayment}
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
                      ₦{total.toFixed(2)}
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
                    onClick={() => setModal("lock")}
                    className="flex flex-col items-center justify-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:bg-white dark:bg-slate-800 rounded py-2.5 transition-colors text-slate-500 dark:text-slate-400"
                  >
                    <Lock className="w-4 h-4" />
                    <span className="text-[10px]">Lock</span>
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
