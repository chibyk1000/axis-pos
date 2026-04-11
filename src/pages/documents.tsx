"use client";

import { useState, useMemo,  } from "react";
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
  ArrowLeft,

  Calendar,

  CreditCard,
  Banknote,
  Receipt,
  RotateCcw,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useDocuments } from "@/hooks/controllers/documents";
import { useCreateDocument } from "@/hooks/controllers/documents";

// ─── Types ────────────────────────────────────────────────────────────────────

type DocStatus = "posted" | "draft" | "refund" | "void";

interface Document {
  id: string;
  number: string;
  customerId?: string;
  customer?: { id: string; name: string } | null;
  date: Date | string;
  status: DocStatus;
  paid: boolean;
  totalBeforeTax: number;
  taxTotal: number;
  total: number;
  externalNumber?: string;
  items?: DocumentItem[];
  payments?: DocumentPayment[];
  createdAt?: Date | string;
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

type FilterStatus = "all" | DocStatus;
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

function StatusBadge({ status }: { status: DocStatus }) {
  const map: Record<DocStatus, { label: string; cls: string }> = {
    posted: {
      label: "Posted",
      cls: "bg-emerald-950 text-emerald-400 border border-emerald-800",
    },
    draft: {
      label: "Draft",
      cls: "bg-blue-950 text-blue-400 border border-blue-800",
    },
    refund: {
      label: "Refund",
      cls: "bg-red-950 text-red-400 border border-red-900",
    },
    void: {
      label: "Void",
      cls: "bg-slate-800 text-slate-500 border border-slate-700",
    },
  };
  const { label, cls } = map[status] ?? map.void;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${cls}`}
    >
      {label}
    </span>
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
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-widest font-semibold text-slate-500">
          {label}
        </span>
        <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-slate-400" />
        </div>
      </div>
      <div
        className={`text-2xl font-semibold tabular-nums ${accent ?? "text-slate-100"}`}
      >
        {value}
      </div>
      <div className="text-xs text-slate-500">{sub}</div>
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
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-80 p-6 shadow-2xl">
        <p className="text-base font-semibold text-slate-100 mb-2">{title}</p>
        <p className="text-sm text-slate-400 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-800 hover:bg-slate-700 rounded-xl py-2.5 text-sm text-slate-400 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors ${confirmCls}`}
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
  onClose,
  onVoid,
  onRefund,
  onPrint,
  onDuplicate,
}: {
  doc: Document;
  onClose: () => void;
  onVoid: (doc: Document) => void;
  onRefund: (doc: Document) => void;
  onPrint: (doc: Document) => void;
  onDuplicate: (doc: Document) => void;
}) {
  const items = doc.items ?? [];
  const payments = doc.payments ?? [];

  const paymentIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("card")) return <CreditCard className="w-3.5 h-3.5" />;
    return <Banknote className="w-3.5 h-3.5" />;
  };

  return (
    <div className="flex flex-col h-full w-[300px] shrink-0 border-l border-slate-800 bg-slate-900">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={doc.status} />
            {doc.paid && (
              <span className="text-[10px] text-emerald-500 font-medium">
                PAID
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-slate-100 truncate">
            {doc.customer?.name ?? "Walk-in"}
          </p>
          <p className="text-xs font-mono text-cyan-400 mt-0.5">{doc.number}</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 mt-0.5 shrink-0 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        {/* Details */}
        <div className="px-4 py-3 border-b border-slate-800">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-600 mb-2">
            Details
          </p>
          <div className="space-y-1.5 text-[13px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Date</span>
              <span className="text-slate-300">{fmtDateTime(doc.date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Type</span>
              <span className="text-slate-300">
                {doc.externalNumber ?? "—"}
              </span>
            </div>
            {doc.customer && (
              <div className="flex justify-between">
                <span className="text-slate-500">Customer</span>
                <span className="text-slate-300 truncate max-w-[160px] text-right">
                  {doc.customer.name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div className="px-4 py-3 border-b border-slate-800">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-600 mb-2">
              Items ({items.length})
            </p>
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] text-slate-300 truncate">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {Math.abs(item.quantity)} × {fmt(item.priceBeforeTax)}
                      {item.discount > 0 && (
                        <span className="text-amber-500 ml-1">
                          ({item.discount}% off)
                        </span>
                      )}
                    </p>
                  </div>
                  <span
                    className={`text-[13px] tabular-nums shrink-0 ${item.quantity < 0 ? "text-red-400" : "text-cyan-400"}`}
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
          <div className="px-4 py-3 border-b border-slate-800">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-600 mb-2">
              Payments
            </p>
            <div className="space-y-1.5">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between text-[13px]"
                >
                  <div className="flex items-center gap-1.5 text-slate-400">
                    {paymentIcon(p.paymentType)}
                    <span>{p.paymentType}</span>
                  </div>
                  <span className="text-slate-300 tabular-nums">
                    {fmt(p.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-600 mb-2">
            Totals
          </p>
          <div className="space-y-1.5 text-[13px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span className="text-slate-300 tabular-nums">
                {fmt(doc.totalBeforeTax)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tax</span>
              <span className="text-slate-300 tabular-nums">
                {fmt(doc.taxTotal)}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-800 font-semibold text-base">
              <span className="text-slate-200">Total</span>
              <span
                className={`tabular-nums ${doc.total < 0 ? "text-red-400" : "text-cyan-400"}`}
              >
                {fmt(doc.total)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 border-t border-slate-800 grid grid-cols-2 gap-2">
        <button
          onClick={() => onPrint(doc)}
          className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg py-2 text-xs text-slate-300 transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          Print
        </button>
        <button
          onClick={() => onDuplicate(doc)}
          className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg py-2 text-xs text-slate-300 transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
          Duplicate
        </button>
        {doc.status === "posted" && (
          <button
            onClick={() => onRefund(doc)}
            className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-amber-800 rounded-lg py-2 text-xs text-amber-400 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Refund
          </button>
        )}
        {(doc.status === "posted" || doc.status === "draft") && (
          <button
            onClick={() => onVoid(doc)}
            className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-red-950 border border-red-900 rounded-lg py-2 text-xs text-red-400 transition-colors"
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
// @ts-ignore
  const docs: Document[] = documentsQuery.data ?? [];

  // ── State ──
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmModal, setConfirmModal] = useState<{
    type: "void" | "refund" | "bulkVoid";
    doc?: Document;
  } | null>(null);

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
    if (filterStatus !== "all")
      result = result.filter((d) => d.status === filterStatus);

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
    const todaySales = today
      .filter((d) => d.status === "posted")
      .reduce((s, d) => s + d.total, 0);
    const weekSales = week
      .filter((d) => d.status === "posted")
      .reduce((s, d) => s + d.total, 0);
    const refundTotal = docs
      .filter((d) => d.status === "refund")
      .reduce((s, d) => s + Math.abs(d.total), 0);
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
  const handleVoid = async (doc: Document) => {
    console.log(doc);
    
    // In a real app, call update mutation to set status: "void"
    // For now, just refresh
    documentsQuery.refetch?.();
  };

  const handleRefund = (doc: Document) => {
    // Navigate to POS with refund pre-filled (pass state via router)
    router("/", { state: { refundDocId: doc.id } });
  };

  const handlePrint = (doc: Document) => {
    console.log("Print", doc);
    window.print();
  };

  const handleDuplicate = async (doc: Document) => {
    if (!doc.items) return;
    await createDocument.mutateAsync({
      document: {
        id: crypto.randomUUID(),
        number: `POS-${Date.now().toString().slice(-8)}`,
        customerId: doc.customerId as string,
        date: new Date(),
        status: "draft",
        paid: false,
        totalBeforeTax: doc.totalBeforeTax,
        taxTotal: doc.taxTotal,
        total: doc.total,
        createdAt: new Date(),
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

  const handleExportCSV = () => {
    const rows = [
      [
        "Number",
        "Customer",
        "Date",
        "Status",
        "Items",
        "Subtotal",
        "Tax",
        "Total",
      ],
      ...filtered.map((d) => [
        d.number,
        d.customer?.name ?? "Walk-in",
        fmtDate(d.date),
        d.status,
        String(d.items?.length ?? 0),
        d.totalBeforeTax.toFixed(2),
        d.taxTotal.toFixed(2),
        d.total.toFixed(2),
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `documents-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusFilters: { key: FilterStatus; label: string }[] = [
    { key: "all", label: "All" },
    { key: "posted", label: "Posted" },
    { key: "draft", label: "Drafts" },
    { key: "refund", label: "Refunds" },
    { key: "void", label: "Void" },
  ];

  const statusCounts: Record<FilterStatus, number> = useMemo(
    () => ({
      all: docs.length,
      posted: docs.filter((d) => d.status === "posted").length,
      draft: docs.filter((d) => d.status === "draft").length,
      refund: docs.filter((d) => d.status === "refund").length,
      void: docs.filter((d) => d.status === "void").length,
    }),
    [docs],
  );

  return (
    <div className="h-dvh w-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
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
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center gap-3 flex-wrap shrink-0">
        {/* Brand + back */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => router("/")}
            className="text-slate-500 hover:text-slate-300 transition-colors mr-1"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-6 h-6 rounded-full bg-cyan-400 text-black flex items-center justify-center text-xs font-bold">
            A
          </div>
          <span className="text-sm font-medium">Axis Lite</span>
          <span className="text-slate-600">/</span>
          <span className="text-sm text-slate-400 font-medium">Documents</span>
        </div>

        {/* Search */}
        <div className="flex-1 min-w-48 max-w-xs relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search number or customer…"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-100 outline-none focus:border-cyan-600 placeholder:text-slate-600 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {selectedIds.size > 0 && (
            <span className="text-xs text-cyan-400 font-medium">
              {selectedIds.size} selected
            </span>
          )}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => router("/")}
            className="flex items-center gap-1.5 bg-cyan-700 hover:bg-cyan-600 rounded-lg px-3 py-1.5 text-xs text-white font-medium transition-colors"
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
                accent="text-cyan-400"
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
                accent="text-blue-400"
              />
            </div>

            {/* Filters + date range */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
                {statusFilters.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => {
                      setFilterStatus(f.key);
                      setPage(1);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      filterStatus === f.key
                        ? "bg-cyan-900 text-cyan-300 border border-cyan-700"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {f.label}
                    <span
                      className={`text-[10px] tabular-nums ${filterStatus === f.key ? "text-cyan-400" : "text-slate-600"}`}
                    >
                      {statusCounts[f.key]}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 ml-auto">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={dateRange}
                  onChange={(e) => {
                    setDateRange(e.target.value as DateRange);
                    setPage(1);
                  }}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 outline-none focus:border-cyan-600 cursor-pointer"
                >
                  <option value="all">All time</option>
                  <option value="today">Today</option>
                  <option value="week">This week</option>
                  <option value="month">This month</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[32px_1.6fr_1.1fr_1fr_0.6fr_1fr_90px_72px] gap-0 px-4 py-2.5 bg-slate-950 border-b border-slate-800">
                {[
                  <input
                    key="chk"
                    type="checkbox"
                    checked={
                      selectedIds.size === paginated.length &&
                      paginated.length > 0
                    }
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 accent-cyan-500 cursor-pointer"
                  />,
                  "Document",
                  "Customer",
                  "Date",
                  "Items",
                  "Total",
                  "Status",
                  "",
                ].map((h, i) => (
                  <div
                    key={i}
                    className={`text-[10px] uppercase tracking-widest font-semibold text-slate-500 flex items-center ${
                      [4, 5].includes(i) ? "justify-end" : ""
                    }`}
                  >
                    {h}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {documentsQuery.isLoading ? (
                <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
                  Loading documents…
                </div>
              ) : paginated.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
                  <FileText className="w-8 h-8 opacity-30" />
                  <span className="text-sm">No documents found</span>
                  {(search || filterStatus !== "all") && (
                    <button
                      onClick={() => {
                        setSearch("");
                        setFilterStatus("all");
                      }}
                      className="text-xs text-cyan-500 hover:text-cyan-400 mt-1"
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
                    className={`grid grid-cols-[32px_1.6fr_1.1fr_1fr_0.6fr_1fr_90px_72px] gap-0 px-4 py-3 border-b border-slate-800/60 cursor-pointer select-none transition-colors last:border-b-0 ${
                      selectedDoc?.id === doc.id
                        ? "bg-cyan-950/40 border-l-2 border-l-cyan-500"
                        : "hover:bg-slate-800/40"
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
                        className="w-3.5 h-3.5 accent-cyan-500 cursor-pointer"
                      />
                    </div>
                    {/* Number */}
                    <div className="flex items-center">
                      <span className="text-xs font-mono text-slate-400">
                        {doc.number}
                      </span>
                    </div>
                    {/* Customer */}
                    <div className="flex items-center min-w-0">
                      <span className="text-sm font-medium text-slate-200 truncate">
                        {doc.customer?.name ?? (
                          <span className="text-slate-500 font-normal">
                            Walk-in
                          </span>
                        )}
                      </span>
                    </div>
                    {/* Date */}
                    <div className="flex items-center">
                      <span className="text-xs text-slate-500">
                        {fmtDateTime(doc.date)}
                      </span>
                    </div>
                    {/* Items */}
                    <div className="flex items-center justify-end">
                      <span className="text-xs text-slate-500 tabular-nums">
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
                              ? "text-slate-600"
                              : "text-slate-200"
                        }`}
                      >
                        {doc.status === "void" ? "—" : fmt(doc.total)}
                      </span>
                    </div>
                    {/* Status */}
                    <div className="flex items-center justify-end">
                      <StatusBadge status={doc.status} />
                    </div>
                    {/* Actions */}
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => onPrint(doc)}
                        title="Print"
                        className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setSelectedDoc(doc)}
                        title="View"
                        className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                {filtered.length === 0
                  ? "No results"
                  : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
                          ? "bg-cyan-700 text-white border border-cyan-600"
                          : "border border-slate-800 text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Side Panel */}
        {selectedDoc && (
          <SidePanel
            doc={selectedDoc}
            onClose={() => setSelectedDoc(null)}
            onVoid={(doc) => setConfirmModal({ type: "void", doc })}
            onRefund={(doc) => setConfirmModal({ type: "refund", doc })}
            onPrint={handlePrint}
            onDuplicate={handleDuplicate}
          />
        )}
      </div>
    </div>
  );

  function onPrint(doc: Document) {
    handlePrint(doc);
  }
}
