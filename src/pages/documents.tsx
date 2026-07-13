"use client";

import { useState, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import {
  setSearch as setSearchAction,
  setFilterStatus as setFilterStatusAction,
  setDateRange as setDateRangeAction,
  setSelectedDoc as setSelectedDocAction,
  setPage as setPageAction,
  setSelectedIds as setSelectedIdsAction,
  setConfirmModal as setConfirmModalAction,
  setSplitPaymentDoc as setSplitPaymentDocAction,
  setShowTaxManagement as setShowTaxManagementAction,
  setShowDiscountManagement as setShowDiscountManagementAction,
  setShowCustomerManagement as setShowCustomerManagementAction,
  setCustomers as setCustomersAction,
} from "@/store/documentsSlice";
import type { Document as SliceDocument } from "@/store/documentsSlice";
import {
  Search,
  Plus,
  Download,
  Printer,
  Copy,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  TrendingUp,
  Clock,
  Eye,
  Calendar,
  CreditCard,
  Banknote,
  Receipt,
  RotateCcw,
  Percent,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useDocuments } from "@/hooks/controllers/documents";
import { useCreateDocument } from "@/hooks/controllers/documents";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "react-toastify";

// ─── Split Payment Screen Component ───────────────────────────────────────────────

function SplitPaymentScreen({
  document,
  paymentTypes,
  onClose,
  onPaymentComplete,
}: {
  document: SliceDocument;
  paymentTypes: any[];
  onClose: () => void;
  onPaymentComplete: (
    payments: { paymentId: string; paymentType: string; amount: number }[],
  ) => void;
}) {
  const enabled = paymentTypes.filter((p) => p.enabled && p.id !== "split");
  const displayTypes =
    enabled.length > 0
      ? enabled
      : [
          { id: "cash", name: "Cash", changeAllowed: true },
          { id: "card", name: "Card", changeAllowed: false },
          { id: "check", name: "Check", changeAllowed: false },
        ];

  const [paidInput, setPaidInput] = useState("0.00");
  const [selectedTypeId, setSelectedTypeId] = useState<string>(
    displayTypes[0]?.id ?? "",
  );

  const selectedType = displayTypes.find((p) => p.id === selectedTypeId);
  const paidAmount = parseFloat(paidInput) || 0;
  const remaining = Math.max(0, document.outstandingBalance - paidAmount);

  const handleKey = useCallback(
    (val: string) => {
      if (val === "⌫") {
        setPaidInput((p) => (p.length > 1 ? p.slice(0, -1) : "0"));
      } else if (val === "C") {
        setPaidInput("0");
      } else if (val === ".") {
        if (!paidInput.includes(".")) setPaidInput((p) => p + ".");
      } else if (val === "-") {
        setPaidInput(document.total.toFixed(2));
      } else {
        setPaidInput((p) => (p === "0" ? val : p + val));
      }
    },
    [document.total],
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
    if (!selectedType || paidAmount <= 0) return;

    const paymentData = [
      {
        paymentId: selectedType.id,
        paymentType: selectedType.name,
        amount: paidAmount,
      },
    ];

    onPaymentComplete(paymentData);
    onClose();
  };

  const formatPrice = (amount: number) => {
    return amount.toLocaleString("en-NG", { minimumFractionDigits: 2 });
  };

  const itemTotal = (item: any) => {
    return (
      item.priceBeforeTax *
      item.quantity *
      (1 - item.discount / 100) *
      (1 + item.taxRate / 100)
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex h-screen bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-200">
      <div className="w-1/3 border-r border-stone-300 dark:border-stone-700 flex flex-col">
        <div className="px-5 py-4 border-b border-stone-300 dark:border-stone-700 flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-600 dark:text-stone-500 uppercase tracking-widest font-semibold">
              Continue Payment
            </p>
            <p className="text-xs text-amber-400 mt-0.5">{document.number}</p>
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
          {document.items?.map((item: any) => (
            <div
              key={item.id}
              className="flex justify-between text-sm border-b border-stone-300 dark:border-stone-800 pb-2"
            >
              <span className="text-stone-700 dark:text-stone-300 truncate max-w-[65%]">
                {item.quantity !== 1 && (
                  <span className="text-stone-500 mr-1">{item.quantity}×</span>
                )}
                {item.name}
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
              ₦
              {document.totalBeforeTax.toLocaleString("en-NG", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="flex justify-between text-stone-500 dark:text-stone-400">
            <span>Tax</span>
            <span>
              ₦
              {document.taxTotal.toLocaleString("en-NG", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="flex justify-between font-bold text-lg text-amber-400 pt-2 border-t border-stone-200 dark:border-stone-700">
            <span>Total</span>
            <span>₦{formatPrice(document.total)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-emerald-400">
            <span>Paid</span>
            <span>₦{formatPrice(document.totalPaid)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-red-400">
            <span>Remaining</span>
            <span>₦{formatPrice(document.outstandingBalance)}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="px-5 py-4 border-b border-stone-300 dark:border-stone-700 flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-600 dark:text-stone-500 uppercase tracking-widest font-semibold">
              Payment Methods
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <div className="space-y-4">
            {/* Payment Type Selection */}
            <div className="bg-stone-50 dark:bg-stone-800 rounded-lg p-4 border border-stone-200 dark:border-stone-700">
              <label className="text-xs text-stone-500 mb-2 block">
                Payment Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {displayTypes.map((pt) => (
                  <button
                    key={pt.id}
                    onClick={() => setSelectedTypeId(pt.id)}
                    className={`py-2 rounded text-xs font-medium flex items-center justify-center gap-2 transition-colors border ${
                      selectedTypeId === pt.id
                        ? "bg-amber-900 border-amber-500 text-amber-200"
                        : "bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300"
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
                  <p className="text-xs text-stone-500 mb-0.5">Amount</p>
                  <input
                    type="text"
                    value={paidInput}
                    onChange={(e) => setPaidInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave();
                    }}
                    className="w-full bg-transparent border-b-2 border-amber-500 pb-1 text-2xl text-amber-300 font-mono tabular-nums text-right outline-none focus:border-amber-400 transition-colors"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <p className="text-xs text-stone-500 mb-0.5">Remaining</p>
                  <p className="text-xl font-bold tabular-nums text-red-400">
                    ₦{formatPrice(remaining)}
                    {remaining > 0 && (
                      <span className="text-xs ml-1">(owed)</span>
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
                      className={`py-4 rounded text-base font-medium transition-colors ${
                        isBackspace
                          ? "bg-red-700 hover:bg-red-600 text-stone-900 dark:text-white"
                          : isEnter
                            ? "bg-emerald-600 hover:bg-emerald-500 text-stone-900 dark:text-white font-bold"
                            : isDash
                              ? "bg-stone-100 dark:bg-stone-700 hover:bg-stone-600 text-amber-300 text-xs"
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
                onClick={handleSave}
                disabled={!selectedType || paidAmount <= 0}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-stone-900 dark:text-white text-base font-bold rounded transition-colors"
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
  onClose,
  onTaxSelect,
}: {
  taxes: any[];
  onClose: () => void;
  onTaxSelect: (tax: any) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTaxId, setSelectedTaxId] = useState<string>("");

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
                className="w-full pl-10 pr-4 py-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                      <p className="text-xs text-stone-500">
                        {tax.description || "No description"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-amber-600">
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
  onClose,
  onDiscountApply,
}: {
  onClose: () => void;
  onDiscountApply: (discount: {
    type: "percent" | "amount";
    value: number;
  }) => void;
}) {
  const [discountType, setDiscountType] = useState<"percent" | "amount">(
    "percent",
  );
  const [discountInput, setDiscountInput] = useState("0");
  const [selectedPreset, setSelectedPreset] = useState<string>("");

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
        setDiscountInput((p) => (p.length > 1 ? p.slice(0, -1) : "0"));
      } else if (val === "C") {
        setDiscountInput("0");
      } else if (val === ".") {
        if (!discountInput.includes(".")) setDiscountInput((p) => p + ".");
      } else {
        setDiscountInput((p) => (p === "0" ? val : p + val));
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
  onClose,
  onCustomerSelect,
  onCustomerAdd,
  onCustomerRemove,
}: {
  customers: Customer[];
  onClose: () => void;
  onCustomerSelect: (customer: Customer) => void;
  onCustomerAdd: (customer: {
    name: string;
    email?: string;
    phone?: string;
  }) => void;
  onCustomerRemove: (customerId: string) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.email &&
        customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.phoneNumber && customer.phoneNumber.includes(searchTerm)),
  );

  const handleCustomerClick = (customer: Customer) => {
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
      setNewCustomer({ name: "", email: "", phone: "" });
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
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                      setNewCustomer({ ...newCustomer, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    value={newCustomer.email}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <input
                    type="tel"
                    placeholder="Phone (optional)"
                    value={newCustomer.phone}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, phone: e.target.value })
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
                        setNewCustomer({ name: "", email: "", phone: "" });
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
                      {customer.phoneNumber && (
                        <p className="text-sm text-stone-500">
                          {customer.phoneNumber}
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

// ─── Types ────────────────────────────────────────────────────────────────────

type DocStatus = "posted" | "draft" | "cancelled" | "refund" | "void" | "split";

interface Customer {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
}

interface Document {
  id: string;
  number: string;
  customerId?: string;
  customer?: Customer | null;
  date: Date;
  status: DocStatus;
  paid: boolean;
  totalBeforeTax: number;
  taxTotal: number;
  total: number;
  totalPaid: number;
  outstandingBalance: number;
  externalNumber?: string;
  items?: DocumentItem[];
  payments?: DocumentPayment[];
  createdAt: Date;
}

interface DocumentItem {
  id: string;
  documentId: string;
  productId: string;
  name: string;
  unit?: string;
  quantity: number;
  priceBeforeTax: number;
  taxRate: number;
  discount: number;
  total: number;
}

interface DocumentPayment {
  id: string;
  documentId: string;
  paymentId: string;
  paymentType: string;
  amount: number;
  status: string;
  date: Date | string;
}

type FilterStatus = "all" | "paid";
type DateRange = "today" | "week" | "month" | "all";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number, signed = false) {
  const abs = Math.abs(n);
  const str = "₦" + abs.toLocaleString("en-NG", { minimumFractionDigits: 2 });
  if (n < 0) return "−" + str;
  if (signed && n > 0) return "+" + str;
  return str;
}

function fmtDate(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return (
    dt.toLocaleDateString("en-NG", { day: "2-digit", month: "short" }) +
    " · " +
    dt.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })
  );
}

function isToday(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  const now = new Date();
  return dt.toDateString() === now.toDateString();
}

function isThisWeek(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return dt >= weekAgo;
}

function isThisMonth(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  const now = new Date();
  return (
    dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear()
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, paid }: { status?: DocStatus; paid: boolean }) {
  const map: Record<
    "paid" | "unpaid" | "split",
    { label: string; cls: string }
  > = {
    paid: {
      label: "Paid",
      cls: "bg-emerald-950 text-emerald-400 border border-emerald-800",
    },
    unpaid: {
      label: "Unpaid",
      cls: "bg-red-950 text-red-400 border border-red-800",
    },
    split: {
      label: "Split",
      cls: "bg-amber-950 text-amber-400 border border-amber-800",
    },
  };

  let label: string;
  let cls: string;

  if (status === "split") {
    ({ label, cls } = map.split);
  } else if (paid) {
    ({ label, cls } = map.paid);
  } else {
    ({ label, cls } = map.unpaid);
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

// ─── Print Receipt (Hidden by default) ────────────────────────────────────────

function PrintReceipt({ doc }: { doc: Document | null }) {
  if (!doc) return null;
  const items = doc.items ?? [];
  const payments = doc.payments ?? [];

  return (
    <div
      id="print-receipt"
      className="hidden print:block fixed inset-0 bg-white z-[9999] p-10 text-stone-950 font-sans"
    >
      <div className="max-w-[400px] mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold m-0">Axis POS</h1>
          <p className="text-sm text-stone-600 m-1">Receipt / Tax Invoice</p>
        </div>

        <div className="border-y border-stone-200 py-3 mb-5 text-[13px] flex flex-col gap-1">
          <div className="flex justify-between">
            <span>Document #</span> <span>{doc.number}</span>
          </div>
          <div className="flex justify-between">
            <span>Date</span> <span>{fmtDateTime(doc.date)}</span>
          </div>
          <div className="flex justify-between">
            <span>Customer</span> <span>{doc.customer?.name ?? "Walk-in"}</span>
          </div>
        </div>

        <table className="w-full border-collapse mb-5">
          <thead>
            <tr className="text-[12px] text-stone-500 text-left border-b border-stone-100">
              <th className="pb-2 font-semibold">Item</th>
              <th className="pb-2 font-semibold text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-stone-50">
                <td className="py-2">
                  <div className="font-medium text-sm">{item.name}</div>
                  <div className="text-[11px] text-stone-500">
                    {Math.abs(item.quantity)} x {fmt(item.priceBeforeTax)}
                  </div>
                </td>
                <td className="py-2 text-right text-sm">{fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t-2 border-stone-900 pt-3 flex flex-col gap-1">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span> <span>{fmt(doc.totalBeforeTax)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Tax Total</span> <span>{fmt(doc.taxTotal)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold mt-2">
            <span>Total</span> <span>{fmt(doc.total)}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span>Paid</span> <span>{fmt(doc.totalPaid)}</span>
          </div>
          {doc.outstandingBalance > 0 && (
            <div className="flex justify-between text-sm">
              <span>Outstanding</span>{" "}
              <span>{fmt(doc.outstandingBalance)}</span>
            </div>
          )}
        </div>

        <div className="mt-5">
          <p className="text-xs font-bold mb-2">Payments</p>
          {payments.map((p) => (
            <div key={p.id} className="flex justify-between text-[13px] mt-1">
              <span>{p.paymentType}</span>
              <span>{fmt(p.amount)}</span>
            </div>
          ))}
        </div>

        <div className="text-center mt-10 text-xs text-stone-400">
          <p>Thank you for your business!</p>
          <p>{new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  accent?: string;
}) {
  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-widest font-semibold text-stone-600 dark:text-stone-500">
          {label}
        </span>
        <div className="w-7 h-7 rounded-lg bg-stone-200 dark:bg-stone-800 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
        </div>
      </div>
      <div
        className={`text-2xl font-semibold tabular-nums ${accent ?? "text-stone-900 dark:text-stone-100"}`}
      >
        {value}
      </div>
      <div className="text-xs text-stone-500">{sub}</div>
    </div>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({
  title,
  message,
  confirmLabel,
  confirmCls,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmCls: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl w-80 p-6 shadow-2xl">
        <p className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-2">
          {title}
        </p>
        <p className="text-sm text-stone-600 dark:text-stone-400 mb-6">
          {message}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 rounded-xl py-2.5 text-sm text-stone-700 dark:text-stone-400 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-stone-900 dark:text-white transition-colors ${confirmCls}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Side Panel ───────────────────────────────────────────────────────────────

function SidePanel({
  doc,
  isRefunded,
  onClose,
  onVoid,
  onRefund,
  onPrint,
  onDuplicate,
  onContinuePayment,
}: {
  doc: Document;
  isRefunded?: boolean;
  onClose: () => void;
  onVoid: (doc: Document) => void;
  onRefund: (doc: Document) => void;
  onPrint: (doc: Document) => void;
  onDuplicate: (doc: Document) => void;
  onContinuePayment: (doc: Document) => void;
}) {
  const items = doc.items ?? [];
  const payments = doc.payments ?? [];

  console.debug("SidePanel - Document data:", {
    id: doc.id,
    number: doc.number,
    total: doc.total,
    totalPaid: doc.totalPaid,
    outstandingBalance:
      doc.totalPaid > doc.total
        ? doc.totalPaid - doc.total
        : doc.outstandingBalance,
    paid: doc.paid,
    paymentsCount: payments.length,
  });

  const paymentIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("card")) return <CreditCard className="w-3.5 h-3.5" />;
    return <Banknote className="w-3.5 h-3.5" />;
  };

  return (
    <div className="flex flex-col h-full w-75 shrink-0 border-l border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900">
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-300 dark:border-stone-800 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={doc.status} paid={doc.paid} />
          </div>
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
            {doc.customer?.name ?? "Walk-in"}
          </p>
          <p className="text-xs font-mono text-amber-400 mt-0.5">{doc.number}</p>
        </div>
        <button
          onClick={onClose}
          className="text-stone-500 hover:text-stone-700 dark:text-stone-300 mt-0.5 shrink-0 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        {/* Details */}
        <div className="px-4 py-3 border-b border-stone-300 dark:border-stone-800">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-stone-600 mb-2">
            Details
          </p>
          <div className="space-y-1.5 text-[13px]">
            <div className="flex justify-between">
              <span className="text-stone-500">Date</span>
              <span className="text-stone-700 dark:text-stone-300">
                {fmtDateTime(doc.date)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Type</span>
              <span className="text-stone-700 dark:text-stone-300">
                {doc.externalNumber ?? "—"}
              </span>
            </div>
            {doc.customer && (
              <div className="flex justify-between">
                <span className="text-stone-500">Customer</span>
                <span className="text-stone-700 dark:text-stone-300 truncate max-w-40 text-right">
                  {doc.customer.name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div className="px-4 py-3 border-b border-stone-300 dark:border-stone-800">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-stone-600 mb-2">
              Items ({items.length})
            </p>
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] text-stone-700 dark:text-stone-300 truncate">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-stone-500">
                      {Math.abs(item.quantity)} × {fmt(item.priceBeforeTax)}
                      {item.discount > 0 && (
                        <span className="text-amber-500 ml-1">
                          ({item.discount}% off)
                        </span>
                      )}
                    </p>
                  </div>
                  <span
                    className={`text-[13px] tabular-nums shrink-0 ${item.quantity < 0 ? "text-red-400" : "text-amber-400"}`}
                  >
                    {fmt(item.total)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payments */}
        {payments.length > 0 && (
          <div className="px-4 py-3 border-b border-stone-300 dark:border-stone-800">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-stone-600 mb-2">
              Payments
            </p>
            <div className="space-y-1.5">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between text-[13px]"
                >
                  <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400">
                    {paymentIcon(p.paymentType)}
                    <span>{p.paymentType}</span>
                  </div>
                  <span className="text-stone-700 dark:text-stone-300 tabular-nums">
                    {fmt(p.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-stone-600 mb-2">
            Totals
          </p>
          <div className="space-y-1.5 text-[13px]">
            <div className="flex justify-between">
              <span className="text-stone-500">Subtotal</span>
              <span className="text-stone-700 dark:text-stone-300 tabular-nums">
                {fmt(doc.totalBeforeTax)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Tax</span>
              <span className="text-stone-700 dark:text-stone-300 tabular-nums">
                {fmt(doc.taxTotal)}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-stone-300 dark:border-stone-800 font-semibold text-base">
              <span className="text-stone-800 dark:text-stone-200">Total</span>
              <span
                className={`tabular-nums ${doc.total < 0 ? "text-red-400" : "text-amber-400"}`}
              >
                {fmt(doc.total)}
              </span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-stone-500">Paid</span>
              <span className="text-emerald-400 tabular-nums font-medium">
                {fmt(doc.totalPaid)}
              </span>
            </div>
            {doc.outstandingBalance > 0 && (
              <div className="flex justify-between">
                <span className="text-stone-500">Outstanding</span>
                <span className="text-red-400 tabular-nums font-medium">
                  {fmt(doc.outstandingBalance)}
                </span>
              </div>
            )}
            {doc.totalPaid > doc.total && (
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Overpayment</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-amber-400 font-medium">
                    OVERPAY
                  </span>
                  <span className="text-amber-400 tabular-nums font-medium">
                    {fmt(doc.totalPaid - doc.total)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 border-t border-stone-300 dark:border-stone-800 grid grid-cols-2 gap-2">
        <button
          onClick={() => onPrint(doc)}
          className="flex items-center justify-center gap-1.5 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 rounded-lg py-2 text-xs text-stone-700 dark:text-stone-300 transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          Print
        </button>
        <button
          onClick={() => onDuplicate(doc)}
          className="flex items-center justify-center gap-1.5 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 rounded-lg py-2 text-xs text-stone-700 dark:text-stone-300 transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
          Duplicate
        </button>
        {doc.status === "posted" && !isRefunded && (
          <button
            onClick={() => onRefund(doc)}
            className="flex items-center justify-center gap-1.5 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 border border-amber-800 rounded-lg py-2 text-xs text-amber-400 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Refund
          </button>
        )}
        {doc.status === "posted" && isRefunded && (
          <button
            disabled
            className="flex items-center justify-center gap-1.5 bg-stone-200 dark:bg-stone-700 border border-stone-400 dark:border-stone-600 rounded-lg py-2 text-xs text-stone-400 dark:text-stone-500 cursor-not-allowed opacity-60 transition-colors"
            title="Refund already processed"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Refund
          </button>
        )}
        {doc.status === "split" && doc.outstandingBalance > 0 && (
          <button
            onClick={() => onContinuePayment(doc)}
            className="flex items-center justify-center gap-1.5 bg-amber-950 hover:bg-amber-900 border border-amber-700 rounded-lg py-2 text-xs text-amber-400 transition-colors"
          >
            <CreditCard className="w-3.5 h-3.5" />
            Continue Payment
          </button>
        )}
        {(doc.status === "posted" || doc.status === "draft") && (
          <button
            onClick={() => onVoid(doc)}
            className="flex items-center justify-center gap-1.5 bg-white dark:bg-stone-800 hover:bg-red-950 border border-red-900 rounded-lg py-2 text-xs text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Void
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const PAGE_SIZE = 12;

export default function DocumentsPage() {
  const router = useNavigate();
  const documentsQuery = useDocuments();

  const createDocument = useCreateDocument();
  const { user } = useAuth();
  const docs: Document[] = (documentsQuery.data as any) ?? [];

  // ── State ──
  const dispatch = useDispatch();
  const {
    search,
    filterStatus,
    dateRange,
    selectedDoc,
    page,
    confirmModal,
    splitPaymentDoc,
    showTaxManagement,
    showDiscountManagement,
    showCustomerManagement,
    customers,
  } = useSelector((state: RootState) => state.documents);

  const setSearch = (val: string) => dispatch(setSearchAction(val));
  const setFilterStatus = (val: FilterStatus) =>
    dispatch(setFilterStatusAction(val));
  const setDateRange = (val: DateRange) => dispatch(setDateRangeAction(val));

  const setSelectedDoc = (
    val:
      | SliceDocument
      | null
      | ((prev: SliceDocument | null) => SliceDocument | null),
  ) => {
    if (typeof val === "function") {
      dispatch(setSelectedDocAction(val(selectedDoc)));
    } else {
      dispatch(setSelectedDocAction(val));
    }
  };

  const setPage = (val: number | ((prev: number) => number)) => {
    if (typeof val === "function") {
      dispatch(setPageAction(val(page)));
    } else {
      dispatch(setPageAction(val));
    }
  };

  const selectedIdsArr = useSelector(
    (state: RootState) => state.documents.selectedIds,
  );
  const selectedIds = useMemo(() => new Set(selectedIdsArr), [selectedIdsArr]);
  const setSelectedIds = (
    val: Set<string> | ((prev: Set<string>) => Set<string>),
  ) => {
    if (typeof val === "function") {
      const nextSet = val(selectedIds);
      dispatch(setSelectedIdsAction(Array.from(nextSet)));
    } else {
      dispatch(setSelectedIdsAction(Array.from(val)));
    }
  };

  const setConfirmModal = (
    val:
      | typeof confirmModal
      | ((prev: typeof confirmModal) => typeof confirmModal),
  ) => {
    if (typeof val === "function") {
      dispatch(setConfirmModalAction(val(confirmModal)));
    } else {
      dispatch(setConfirmModalAction(val));
    }
  };

  const setSplitPaymentDoc = (val: SliceDocument | null) =>
    dispatch(setSplitPaymentDocAction(val));

  const paymentTypesQuery = [
    { id: "cash", name: "Cash", enabled: true },
    { id: "card", name: "Card", enabled: true },
    { id: "check", name: "Check", enabled: true },
  ];

  // Management screen states
  const setShowTaxManagement = (val: boolean) =>
    dispatch(setShowTaxManagementAction(val));
  const setShowDiscountManagement = (val: boolean) =>
    dispatch(setShowDiscountManagementAction(val));
  const setShowCustomerManagement = (val: boolean) =>
    dispatch(setShowCustomerManagementAction(val));

  // Sample data for demonstration
  const taxes = [
    {
      id: "1",
      name: "VAT",
      rate: 7.5,
      description: "Value Added Tax",
      compound: false,
    },
    {
      id: "2",
      name: "Service Tax",
      rate: 5,
      description: "Service charge",
      compound: false,
    },
    {
      id: "3",
      name: "Luxury Tax",
      rate: 10,
      description: "Luxury goods tax",
      compound: true,
    },
    {
      id: "4",
      name: "Import Duty",
      rate: 15,
      description: "Import tax",
      compound: false,
    },
  ];

  const setCustomers = (
    val: Customer[] | ((prev: Customer[]) => Customer[]),
  ) => {
    if (typeof val === "function") {
      dispatch(setCustomersAction(val(customers)));
    } else {
      dispatch(setCustomersAction(val));
    }
  };

  // ── Derived / filtered data ──
  const filtered = useMemo(() => {
    let result = [...docs];

    // Date range
    if (dateRange === "today") result = result.filter((d) => isToday(d.date));
    else if (dateRange === "week")
      result = result.filter((d) => isThisWeek(d.date));
    else if (dateRange === "month")
      result = result.filter((d) => isThisMonth(d.date));

    // Status
    if (filterStatus !== "all") {
      if (filterStatus === "paid") {
        result = result.filter((d) => d.paid === true && d.status !== "draft");
      } else if (filterStatus === "unpaid") {
        result = result.filter((d) => d.paid === false && d.status !== "draft");
      } else if (filterStatus === "refund") {
        result = result.filter((d) => d.total < 0);
      } else {
        result = result.filter((d) => d.status === filterStatus);
      }
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.number.toLowerCase().includes(q) ||
          (d.customer?.name ?? "").toLowerCase().includes(q),
      );
    }

    // Sort newest first
    result.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return result;
  }, [docs, search, filterStatus, dateRange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Stats ──
  const stats = useMemo(() => {
    const today = docs.filter((d) => isToday(d.date));
    const week = docs.filter((d) => isThisWeek(d.date));

    // Calculate actual sales based on paid amounts, not just totals
    const todaySales = today
      .filter((d) => d.status === "posted")
      .reduce((s, d) => s + d.totalPaid, 0);
    const weekSales = week
      .filter((d) => d.status === "posted")
      .reduce((s, d) => s + d.totalPaid, 0);

    // Calculate refunds based on negative totals (actual refund amounts)
    const refundTotal = docs
      .filter((d) => d.status === "refund" || d.total < 0)
      .reduce((s, d) => s + Math.abs(d.total), 0);

    // Count drafts
    const drafts = docs.filter((d) => d.status === "draft").length;

    return { todaySales, weekSales, refundTotal, drafts };
  }, [docs]);

  // ── Selection helpers ──
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map((d) => d.id)));
    }
  };

  // ── Actions ──
  const handleVoid = async (doc: SliceDocument) => {
    console.log(doc);

    // In a real app, call update mutation to set status: "void"
    // For now, just refresh
    documentsQuery.refetch?.();
  };

  const handleRefund = async (doc: SliceDocument) => {
    try {
      // Create a refund document with negative amounts
      const refundDocument: SliceDocument = {
        id: crypto.randomUUID(),
        number: `REF-${doc.number}`,
        customerId: doc.customerId ?? "",
        date: new Date(),
        status: "refund" as const,
        paid: true,
        totalBeforeTax: -doc.totalBeforeTax,
        taxTotal: -doc.taxTotal,
        total: -doc.total,
        totalPaid: -doc.total,
        outstandingBalance: 0,
        createdAt: new Date(),
        externalNumber: doc.externalNumber,
        items:
          doc.items?.map((item) => ({
            ...item,
            id: crypto.randomUUID(),
            quantity: -item.quantity,
            total: -item.total,
          })) || [],
        payments: [
          {
            id: crypto.randomUUID(),
            documentId: "",
            paymentId: "refund",
            paymentType: "Refund",
            amount: -doc.total,
            status: "paid" as const,
            date: new Date(),
          },
        ],
        customer: doc.customer,
      };

      const refundPayload = {
        document: {
          ...refundDocument,
          customerId: refundDocument.customerId || "walk-in",
        },
        items: refundDocument.items || [],
        payments: refundDocument.payments || [],
      };

      await createDocument.mutateAsync(refundPayload as any);
      toast.success(`Refund document REF-${doc.number} created successfully`);

      // Update selected doc if it matches
      if (selectedDoc?.id === doc.id) {
        setSelectedDoc(null);
      }

      // Refetch documents to update the list
      documentsQuery.refetch?.();
    } catch (err) {
      console.error("Refund creation failed", err);
      toast.error("Failed to create refund document");
    }
  };

  const handlePrint = (doc: Document) => {
    setSelectedDoc(doc);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleContinuePayment = (doc: Document) => {
    console.log("Continue payment clicked for document:", doc.id, doc.number);
    // Show split payment modal
    setSplitPaymentDoc(doc);
  };

  const handlePaymentComplete = async (
    payments: { paymentId: string; paymentType: string; amount: number }[],
  ) => {
    if (!splitPaymentDoc) return;

    console.log("Payment complete for document:", splitPaymentDoc.id, payments);

    // Combine existing payments with new payments
    const existingPayments = splitPaymentDoc.payments || [];
    const allPayments = [...existingPayments, ...payments];

    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
    const outstandingBalance = Math.max(0, splitPaymentDoc.total - totalPaid);
    const isFullyPaid = totalPaid >= splitPaymentDoc.total;

    // In a real app, you would call an update mutation here
    // For now, we'll create a new document to simulate the update
    const docStatus: "draft" | "posted" = isFullyPaid ? "posted" : "draft";
    const updatedDocument: Document = {
      id: splitPaymentDoc.id,
      number: splitPaymentDoc.number,
      customerId: splitPaymentDoc.customerId || "",
      date:
        typeof splitPaymentDoc.date === "string"
          ? new Date(splitPaymentDoc.date)
          : splitPaymentDoc.date,
      status: docStatus,
      paid: isFullyPaid,
      totalBeforeTax: splitPaymentDoc.totalBeforeTax,
      taxTotal: splitPaymentDoc.taxTotal,
      total: splitPaymentDoc.total,
      totalPaid,
      outstandingBalance,
      createdAt:
        typeof splitPaymentDoc.createdAt === "string"
          ? new Date(splitPaymentDoc.createdAt)
          : splitPaymentDoc.createdAt,
      externalNumber: splitPaymentDoc.externalNumber,
      items: splitPaymentDoc.items,
      payments: allPayments.map((p) => ({
        id: crypto.randomUUID(),
        documentId: splitPaymentDoc.id,
        paymentId: p.paymentId,
        paymentType: p.paymentType,
        amount: p.amount,
        status: "paid" as const,
        date: new Date(),
      })),
      customer: splitPaymentDoc.customer,
    };

    const updatedPayload = {
      document: {
        ...updatedDocument,
        customerId: updatedDocument.customerId || "walk-in",
      },
      items: splitPaymentDoc.items || [],
      payments: updatedDocument.payments || [],
    };

    await createDocument.mutateAsync(updatedPayload as any);
    setSplitPaymentDoc(null);

    // Update selectedDoc with the fresh payment data
    if (selectedDoc?.id === updatedDocument.id) {
      setSelectedDoc(updatedDocument);
    }

    documentsQuery.refetch?.();
  };

  // Management screen handlers
  const handleTaxSelect = (tax: any) => {
    console.log("Tax selected:", tax);
    // In a real app, this would apply the tax to the current document/cart
    toast.success(`Tax "${tax.name}" (${tax.rate}%) selected`);
  };

  const handleDiscountApply = (discount: {
    type: "percent" | "amount";
    value: number;
  }) => {
    console.log("Discount applied:", discount);
    // In a real app, this would apply the discount to the current document/cart
    const displayValue =
      discount.type === "percent"
        ? `${discount.value}%`
        : `₦${discount.value.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
    toast.success(`Discount of ${displayValue} applied`);
  };

  const handleCustomerSelect = (customer: Customer) => {
    console.log("Customer selected:", customer);
    // In a real app, this would assign the customer to the current document/cart
    toast.success(`Customer "${customer.name}" selected`);
  };

  const handleCustomerAdd = (customer: {
    name: string;
    email?: string;
    phone?: string;
  }) => {
    const newCustomer: Customer = {
      id: crypto.randomUUID(),
      name: customer.name,
      email: customer.email,
      phoneNumber: customer.phone,
    } as any;
    setCustomers((prev) => [...prev, newCustomer]);
    toast.success(`Customer "${customer.name}" added successfully`);
  };

  const handleCustomerRemove = (customerId: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== customerId));
    toast.success("Customer removed successfully");
  };

  const handleDuplicate = async (doc: Document) => {
    if (!doc.items) return;
    const now = new Date();
    await createDocument.mutateAsync({
      document: {
        id: crypto.randomUUID(),
        number: `POS-${Date.now().toString().slice(-8)}`,
        customerId: doc.customerId || "",
        date: now,
        status: "draft" as const,
        paid: false,
        totalBeforeTax: doc.totalBeforeTax,
        taxTotal: doc.taxTotal,
        total: doc.total,
        totalPaid: 0,
        outstandingBalance: doc.total,
        createdAt: now,
        externalNumber: doc.externalNumber,
      },
      items: doc.items.map((i) => ({
        ...i,
        id: crypto.randomUUID(),
        documentId: "",
      })),
    });
    documentsQuery.refetch?.();
  };

  const handleExportCSV = async () => {
    try {
      const headers = [
        "Number",
        "Customer",
        "Date",
        "Status",
        "Items",
        "Subtotal",
        "Tax",
        "Total",
        "Paid",
        "Outstanding",
      ];

      const rows = filtered.map((d) => {
        let dateStr = "N/A";
        try {
          if (d.date) dateStr = fmtDate(d.date);
        } catch (e) {
          console.error("Date formatting error", e);
        }

        return [
          d.number || "N/A",
          d.customer?.name || "Walk-in",
          dateStr,
          d.paid ? "Paid" : "Unpaid",
          String(d.items?.length ?? 0),
          (d.totalBeforeTax || 0).toFixed(2),
          (d.taxTotal || 0).toFixed(2),
          (d.total || 0).toFixed(2),
          (d.totalPaid || 0).toFixed(2),
          (d.outstandingBalance || 0).toFixed(2),
        ];
      });

      const escape = (val: any) => {
        const str = String(val ?? "");
        const sanitized = str.replace(/"/g, '""');
        return `"${sanitized}"`;
      };

      const csvContent = [
        headers.map(escape).join(","),
        ...rows.map((row) => row.map(escape).join(",")),
      ].join("\n");

      // Try Tauri save dialog first
      try {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { writeTextFile } = await import("@tauri-apps/plugin-fs");

        const path = await save({
          filters: [{ name: "CSV", extensions: ["csv"] }],
          defaultPath: `documents-${new Date().toISOString().slice(0, 10)}.csv`,
        });

        if (path) {
          await writeTextFile(path, csvContent);
          toast.success("File saved successfully!");
          return;
        }
      } catch (tauriErr) {
        console.warn(
          "Tauri export failed, falling back to browser download",
          tauriErr,
        );

        // Fallback for browser
        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          `documents-${new Date().toISOString().slice(0, 10)}.csv`,
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Export CSV failed", err);
      toast.error("Failed to export CSV. Please check console for details.");
    }
  };

  const statusFilters: { key: FilterStatus; label: string }[] = [
    { key: "all", label: "All" },
    { key: "paid", label: "Paid" },
  ];

  const statusCounts: Record<FilterStatus, number> = useMemo(
    () => ({
      all: docs.length,
      paid: docs.filter((d) => d.paid === true && d.status !== "draft").length,
      unpaid: docs.filter((d) => d.paid === false && d.status !== "draft")
        .length,
      draft: docs.filter((d) => d.status === "draft").length,
      refund: docs.filter((d) => d.total < 0).length,
    }),
    [docs],
  );

  return (
    <div className="h-dvh w-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col overflow-hidden">
      {/* ── Confirm modals ── */}
      {confirmModal?.type === "void" && confirmModal.doc && (
        <ConfirmModal
          title="Void document?"
          message={`This will void ${confirmModal.doc.number}. This cannot be undone.`}
          confirmLabel="Void"
          confirmCls="bg-red-600 hover:bg-red-500"
          onConfirm={() => handleVoid(confirmModal.doc!)}
          onClose={() => setConfirmModal(null)}
        />
      )}
      {confirmModal?.type === "refund" && confirmModal.doc && (
        <ConfirmModal
          title="Process refund?"
          message={`Refund ${confirmModal.doc.number} for ${fmt(Math.abs(confirmModal.doc.total))}?`}
          confirmLabel="Refund"
          confirmCls="bg-amber-600 hover:bg-amber-500"
          onConfirm={() => handleRefund(confirmModal.doc!)}
          onClose={() => setConfirmModal(null)}
        />
      )}

      {/* ── Header ── */}
      <PrintReceipt doc={selectedDoc as any} />
      <header className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-4 py-3 flex items-center gap-3 flex-wrap shrink-0 print:hidden">
        {/* Brand + back */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-amber-400 text-black flex items-center justify-center text-xs font-bold">
            A
          </div>
          <span className="text-sm font-medium text-stone-900 dark:text-stone-100">
            Axis Lite
          </span>
          <span className="text-stone-500 dark:text-stone-400">/</span>
          <span className="text-sm text-stone-500 dark:text-stone-400 font-medium">
            Documents
          </span>
        </div>

        {/* Search */}
        <div className="flex-1 min-w-48 max-w-xs relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search number or customer…"
            className="w-full bg-stone-100 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-amber-600 placeholder:text-stone-500 dark:placeholder:text-stone-600 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-700 dark:text-stone-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* User info */}
          {user && (
            <div className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
              <span>Welcome,</span>
              <span className="font-medium text-stone-900 dark:text-stone-100">
                {user.username}
              </span>
            </div>
          )}
          {selectedIds.size > 0 && (
            <span className="text-xs text-amber-400 font-medium">
              {selectedIds.size} selected
            </span>
          )}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-700 dark:text-stone-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => router("/pos")}
            className="flex items-center gap-1.5 bg-amber-700 hover:bg-amber-600 rounded-lg px-3 py-1.5 text-xs text-stone-900 dark:text-white font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Sale
          </button>
        </div>
      </header>

      {/* ── Main layout ── */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              <StatCard
                icon={Receipt}
                label="Today's sales"
                value={fmt(stats.todaySales)}
                sub={`${docs.filter((d) => isToday(d.date) && d.status === "posted").length} transactions`}
                accent="text-amber-400"
              />
              <StatCard
                icon={TrendingUp}
                label="This week"
                value={fmt(stats.weekSales)}
                sub={`${docs.filter((d) => isThisWeek(d.date) && d.status === "posted").length} transactions`}
                accent="text-emerald-400"
              />
              <StatCard
                icon={RotateCcw}
                label="Total refunds"
                value={fmt(stats.refundTotal)}
                sub={`${docs.filter((d) => d.status === "refund").length} refund orders`}
                accent="text-red-400"
              />
              <StatCard
                icon={Clock}
                label="Drafts pending"
                value={String(stats.drafts)}
                sub="unpaid open orders"
                accent="text-orange-400"
              />
            </div>

            {/* Filters + date range */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded-lg p-1">
                {statusFilters.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => {
                      setFilterStatus(f.key);
                      setPage(1);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      filterStatus === f.key
                        ? "bg-amber-900 text-amber-300 border border-amber-700"
                        : "text-stone-500 hover:text-stone-700 dark:text-stone-300"
                    }`}
                  >
                    {f.label}
                    <span
                      className={`text-[10px] tabular-nums ${filterStatus === f.key ? "text-amber-400" : "text-stone-600"}`}
                    >
                      {statusCounts[f.key]}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 ml-auto">
                <Calendar className="w-3.5 h-3.5 text-stone-500" />
                <select
                  value={dateRange}
                  onChange={(e) => {
                    setDateRange(e.target.value as DateRange);
                    setPage(1);
                  }}
                  className="bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded-lg px-3 py-1.5 text-xs text-stone-700 dark:text-stone-300 outline-none focus:border-amber-600 cursor-pointer"
                >
                  <option value="all">All time</option>
                  <option value="today">Today</option>
                  <option value="week">This week</option>
                  <option value="month">This month</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[32px_1.6fr_1.1fr_1fr_0.6fr_1fr_1fr_0.8fr_1fr_90px_72px] gap-0 px-4 py-2.5 bg-stone-100 dark:bg-stone-950 border-b border-stone-300 dark:border-stone-800">
                {[
                  <input
                    key="chk"
                    type="checkbox"
                    checked={
                      selectedIds.size === paginated.length &&
                      paginated.length > 0
                    }
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 accent-amber-500 cursor-pointer"
                  />,
                  "Document",
                  "Customer",
                  "Date",
                  "Items",
                  "Total",
                  "Paid",
                  "Payment Type",
                  "Balance",
                  "Status",
                  "",
                ].map((h, i) => (
                  <div
                    key={i}
                    className={`text-[10px] uppercase tracking-widest font-semibold text-stone-500 flex items-center ${
                      [4, 5, 6, 7, 8].includes(i) ? "justify-end" : ""
                    }`}
                  >
                    {h}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {documentsQuery.isLoading ? (
                <div className="flex items-center justify-center py-16 text-stone-500 text-sm">
                  Loading documents…
                </div>
              ) : paginated.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-stone-500 gap-2">
                  <FileText className="w-8 h-8 opacity-30" />
                  <span className="text-sm">No documents found</span>
                  {(search || filterStatus !== "all") && (
                    <button
                      onClick={() => {
                        setSearch("");
                        setFilterStatus("all");
                      }}
                      className="text-xs text-amber-500 hover:text-amber-400 mt-1"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                paginated.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() =>
                      setSelectedDoc((prev) =>
                        prev?.id === doc.id ? null : doc,
                      )
                    }
                    className={`grid grid-cols-[32px_1.6fr_1.1fr_1fr_0.6fr_1fr_1fr_0.8fr_1fr_90px_72px] gap-0 px-4 py-3 border-b border-stone-300 dark:border-stone-800/60 cursor-pointer select-none transition-colors last:border-b-0 ${
                      selectedDoc?.id === doc.id
                        ? "bg-amber-950/40 border-l-2 border-l-amber-500"
                        : "hover:bg-white dark:bg-stone-800/40"
                    }`}
                  >
                    {/* Checkbox */}
                    <div
                      className="flex items-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(doc.id);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(doc.id)}
                        onChange={() => toggleSelect(doc.id)}
                        className="w-3.5 h-3.5 accent-amber-500 cursor-pointer"
                      />
                    </div>
                    {/* Number */}
                    <div className="flex items-center">
                      <span className="text-xs font-mono text-stone-500 dark:text-stone-400">
                        {doc.number}
                      </span>
                    </div>
                    {/* Customer */}
                    <div className="flex items-center min-w-0">
                      <span className="text-sm font-medium text-stone-800 dark:text-stone-200 truncate">
                        {doc.customer?.name ?? (
                          <span className="text-stone-500 font-normal">
                            Walk-in
                          </span>
                        )}
                      </span>
                    </div>
                    {/* Date */}
                    <div className="flex items-center">
                      <span className="text-xs text-stone-500">
                        {fmtDateTime(doc.date)}
                      </span>
                    </div>
                    {/* Items */}
                    <div className="flex items-center justify-end">
                      <span className="text-xs text-stone-500 tabular-nums">
                        {doc.items?.length ?? 0}
                      </span>
                    </div>
                    {/* Total */}
                    <div className="flex items-center justify-end">
                      <span
                        className={`text-sm font-medium tabular-nums ${
                          doc.total < 0
                            ? "text-red-400"
                            : doc.status === "void"
                              ? "text-stone-600"
                              : "text-stone-800 dark:text-stone-200"
                        }`}
                      >
                        {doc.status === "void" ? "—" : fmt(doc.total)}
                      </span>
                    </div>
                    {/* Amount Paid */}
                    <div className="flex items-center justify-end">
                      <span
                        className={`text-sm font-medium tabular-nums ${
                          doc.totalPaid > 0
                            ? "text-emerald-400"
                            : "text-stone-500"
                        }`}
                      >
                        {fmt(doc.totalPaid)}
                      </span>
                    </div>
                    {/* Payment Type */}
                    <div className="flex items-center justify-end">
                      <span className="text-xs text-stone-600 dark:text-stone-400 truncate max-w-full">
                        {doc.payments && doc.payments.length > 0
                          ? doc.payments.map((p) => p.paymentType).join(", ")
                          : "-"}
                      </span>
                    </div>
                    {/* Balance */}
                    <div className="flex items-center justify-end">
                      <div className="flex items-center gap-1">
                        {doc.totalPaid > doc.total ? (
                          <>
                            <span className="text-[10px] text-amber-400 font-medium">
                              OVERPAY
                            </span>
                            <span
                              className={`text-sm font-medium tabular-nums text-orange-400`}
                            >
                              {fmt(doc.totalPaid - doc.total)}
                            </span>
                          </>
                        ) : (
                          <span
                            className={`text-sm font-medium tabular-nums ${
                              doc.outstandingBalance > 0
                                ? "text-red-400"
                                : doc.outstandingBalance < 0
                                  ? "text-amber-400"
                                  : "text-stone-500"
                            }`}
                          >
                            {fmt(doc.outstandingBalance)}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Status */}
                    <div className="flex items-center justify-end">
                      <StatusBadge status={doc.status} paid={doc.paid} />
                    </div>
                    {/* Actions */}
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => onPrint(doc)}
                        title="Print"
                        className="w-7 h-7 flex items-center justify-center rounded-md text-stone-500 hover:text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:bg-stone-700 transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setSelectedDoc(doc)}
                        title="View"
                        className="w-7 h-7 flex items-center justify-center rounded-md text-stone-500 hover:text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:bg-stone-700 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {doc.status === "split" && doc.outstandingBalance > 0 && (
                        <button
                          onClick={() => handleContinuePayment(doc)}
                          title="Continue Payment"
                          className="w-7 h-7 flex items-center justify-center rounded-md text-amber-500 hover:text-amber-300 hover:bg-amber-950 transition-colors"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span>
                {filtered.length === 0
                  ? "No results"
                  : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-7 h-7 flex items-center justify-center rounded-md border border-stone-300 dark:border-stone-800 text-stone-500 hover:text-stone-700 dark:text-stone-300 hover:bg-white dark:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-7 h-7 flex items-center justify-center rounded-md text-xs transition-colors ${
                        page === p
                          ? "bg-amber-700 text-stone-900 dark:text-white border border-amber-600"
                          : "border border-stone-300 dark:border-stone-800 text-stone-500 hover:bg-white dark:bg-stone-800 hover:text-stone-700 dark:text-stone-300"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded-md border border-stone-300 dark:border-stone-800 text-stone-500 hover:text-stone-700 dark:text-stone-300 hover:bg-white dark:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Side Panel */}
        {selectedDoc && (
          <div className="print:hidden h-full flex shrink-0">
            <SidePanel
              doc={selectedDoc as any}
              isRefunded={docs.some(
                (d) =>
                  d.number.startsWith("REF-") &&
                  d.number === `REF-${selectedDoc.number}`,
              )}
              onClose={() => setSelectedDoc(null)}
              onVoid={(doc) => setConfirmModal({ type: "void", doc })}
              onRefund={(doc) => setConfirmModal({ type: "refund", doc })}
              onPrint={handlePrint}
              onDuplicate={handleDuplicate}
              onContinuePayment={handleContinuePayment}
            />
          </div>
        )}
      </div>

      {/* Split Payment Modal */}
      {splitPaymentDoc && (
        <SplitPaymentScreen
          document={splitPaymentDoc as any}
          paymentTypes={paymentTypesQuery}
          onClose={() => setSplitPaymentDoc(null)}
          onPaymentComplete={handlePaymentComplete}
        />
      )}

      {/* Tax Management Modal */}
      {showTaxManagement && (
        <TaxManagementScreen
          taxes={taxes}
          onClose={() => setShowTaxManagement(false)}
          onTaxSelect={handleTaxSelect}
        />
      )}

      {/* Discount Management Modal */}
      {showDiscountManagement && (
        <DiscountManagementScreen
          onClose={() => setShowDiscountManagement(false)}
          onDiscountApply={handleDiscountApply}
        />
      )}

      {/* Customer Management Modal */}
      {showCustomerManagement && (
        <CustomerManagementScreen
          customers={customers}
          onClose={() => setShowCustomerManagement(false)}
          onCustomerSelect={handleCustomerSelect}
          onCustomerAdd={handleCustomerAdd}
          onCustomerRemove={handleCustomerRemove}
        />
      )}
    </div>
  );

  function onPrint(doc: Document) {
    handlePrint(doc);
  }
}
