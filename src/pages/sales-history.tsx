import { useState, useCallback } from "react";
import {
  Calendar,
  RefreshCw,
  User,
  Printer,
  FileDown,
  Receipt,
  Mail,
  RotateCcw,
  Trash2,
  X,
  Check,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router";
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subMonths,
  subWeeks,
  startOfYear,
  endOfYear,
  subYears,
} from "date-fns";
import { Calendar as ShadCalendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { nanoid } from "nanoid";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  useSalesDocuments,
  useDocumentItems,
  useSalesSummary,
  useDeleteDocument,
  useCreateRefundDocument,
} from "@/hooks/controllers/sales-history";
import type {
  DocumentRow,
  DocumentItemRow,
  SalesFilters,
} from "@/hooks/controllers/sales-history";
import { useCustomers } from "@/hooks/controllers/customers";

/* ─────────────────────────────────────────────────────────────────────────── */
/*                              PDF BUILDERS                                  */
/* ─────────────────────────────────────────────────────────────────────────── */

function buildDocPdf(doc: DocumentRow, items: DocumentItemRow[]): jsPDF {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = pdf.internal.pageSize.getWidth();
  let y = 18;

  // Title
  pdf.setFontSize(16).setFont("helvetica", "bold").setTextColor(0);
  pdf.text("Sales Document", W / 2, y, { align: "center" });
  y += 9;

  // Meta row
  pdf.setFontSize(9).setFont("helvetica", "normal").setTextColor(80);
  pdf.text(`Number: ${doc.number}`, 14, y);
  pdf.text(
    `Date: ${format(new Date(doc.date), "dd/MM/yyyy HH:mm")}`,
    W - 14,
    y,
    { align: "right" },
  );
  y += 5;

  if (doc.customerName) {
    pdf.text(`Customer: ${doc.customerName}`, 14, y);
    y += 5;
  }
  if (doc.externalNumber) {
    pdf.text(`External ref: ${doc.externalNumber}`, 14, y);
    y += 5;
  }
  pdf.text(
    `Status: ${doc.status ?? "—"}   Paid: ${doc.paid ? "Yes" : "No"}`,
    14,
    y,
  );
  y += 4;

  pdf.setDrawColor(200);
  pdf.line(14, y, W - 14, y);
  y += 6;

  // Items table
  pdf.setTextColor(0);
  autoTable(pdf, {
    startY: y,
    head: [
      ["Name", "Unit", "Qty", "Price (ex tax)", "Tax %", "Discount", "Total"],
    ],
    body: items.map((i) => [
      i.name,
      i.unit ?? "—",
      i.quantity,
      i.priceBeforeTax.toFixed(2),
      i.taxRate != null ? `${i.taxRate}%` : "—",
      i.discount ? i.discount.toFixed(2) : "—",
      i.total.toFixed(2),
    ]),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    margin: { left: 14, right: 14 },
  });

  // Totals block
  const afterTable = (pdf as any).lastAutoTable?.finalY ?? y + 20;
  let ty = afterTable + 8;
  const tx = W - 14;

  pdf.setFontSize(9).setFont("helvetica", "normal").setTextColor(100);
  pdf.text("Subtotal (ex tax):", tx - 40, ty, { align: "right" });
  pdf.setTextColor(0);
  pdf.text((doc.totalBeforeTax ?? 0).toFixed(2), tx, ty, { align: "right" });
  ty += 5;

  pdf.setTextColor(100);
  pdf.text("Tax:", tx - 40, ty, { align: "right" });
  pdf.setTextColor(0);
  pdf.text((doc.taxTotal ?? 0).toFixed(2), tx, ty, { align: "right" });
  ty += 5;

  pdf.setFontSize(11).setFont("helvetica", "bold").setTextColor(0);
  pdf.text("Total:", tx - 40, ty, { align: "right" });
  pdf.text((doc.total ?? 0).toFixed(2), tx, ty, { align: "right" });

  // Page footer
  const pH = pdf.internal.pageSize.getHeight();
  pdf.setFontSize(7).setFont("helvetica", "normal").setTextColor(160);
  pdf.text(
    `Generated ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
    W / 2,
    pH - 8,
    { align: "center" },
  );

  return pdf;
}

function buildReceiptPdf(doc: DocumentRow, items: DocumentItemRow[]): jsPDF {
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
  center(doc.number, 9);
  center(format(new Date(doc.date), "dd/MM/yyyy HH:mm"), 8);
  if (doc.customerName) center(doc.customerName, 8);
  y += 2;
  line();

  items.forEach((item) => {
    pdf.setFontSize(8).setFont("helvetica", "normal").setTextColor(0);
    pdf.text(item.name.slice(0, 30), 4, y);
    y += 4;
    row(
      `  ${item.quantity} × ${item.priceBeforeTax.toFixed(2)}`,
      item.total.toFixed(2),
    );
  });

  line();
  row("Subtotal", (doc.totalBeforeTax ?? 0).toFixed(2));
  row("Tax", (doc.taxTotal ?? 0).toFixed(2));
  row("TOTAL", (doc.total ?? 0).toFixed(2), true);
  row("Paid", doc.paid ? "Yes" : "No");
  y += 3;
  line();

  pdf.setFontSize(8).setFont("helvetica", "normal").setTextColor(130);
  pdf.text("Thank you!", W / 2, y + 4, { align: "center" });

  return pdf;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*                              MODALS                                        */
/* ─────────────────────────────────────────────────────────────────────────── */

const DATE_PRESETS = [
  {
    label: "Today",
    range: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }),
  },
  {
    label: "Yesterday",
    range: () => {
      const d = subDays(new Date(), 1);
      return { from: startOfDay(d), to: endOfDay(d) };
    },
  },
  {
    label: "This week",
    range: () => ({ from: startOfWeek(new Date()), to: endOfWeek(new Date()) }),
  },
  {
    label: "Last week",
    range: () => {
      const d = subWeeks(new Date(), 1);
      return { from: startOfWeek(d), to: endOfWeek(d) };
    },
  },
  {
    label: "This month",
    range: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  {
    label: "Last month",
    range: () => {
      const d = subMonths(new Date(), 1);
      return { from: startOfMonth(d), to: endOfMonth(d) };
    },
  },
  {
    label: "This year",
    range: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }),
  },
  {
    label: "Last year",
    range: () => {
      const d = subYears(new Date(), 1);
      return { from: startOfYear(d), to: endOfYear(d) };
    },
  },
];

function DateRangeModal({
  range,
  onApply,
  onClose,
}: {
  range: { from: Date; to: Date };
  onApply: (r: { from: Date; to: Date }) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<{ from?: Date; to?: Date }>(range);
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl p-6 shadow-xl">
        <h3 className="text-sm font-semibold mb-4">Select date range</h3>
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-4 grid grid-cols-2 gap-2 content-start">
            {DATE_PRESETS.map((p) => (
              <Button
                key={p.label}
                variant="outline"
                size="sm"
                className="justify-start bg-transparent hover:bg-slate-800 hover:text-white text-slate-300 text-xs"
                onClick={() => setDraft(p.range())}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="col-span-8">
            <ShadCalendar
              required
              mode="range"
              selected={draft as any}
              onSelect={setDraft as any}
              numberOfMonths={2}
              pagedNavigation
              className="rounded-xl border border-slate-700 bg-slate-900"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!draft.from || !draft.to}
            onClick={() => {
              if (draft.from && draft.to) {
                onApply({ from: draft.from, to: draft.to });
                onClose();
              }
            }}
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({
  icon: Icon,
  iconColor,
  title,
  body,
  confirmLabel,
  confirmClass,
  onConfirm,
  onCancel,
  isPending,
}: {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  confirmClass: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm p-6 shadow-xl">
        <div className="flex items-start gap-3 mb-5">
          <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
          <div>
            <p className="text-sm font-medium text-slate-100">{title}</p>
            <div className="text-xs text-slate-400 mt-1">{body}</div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs border border-slate-600 text-slate-300 hover:text-white rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={`px-3 py-1.5 text-xs text-white rounded disabled:opacity-40 transition-colors ${confirmClass}`}
          >
            {isPending ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*                         CUSTOMER PICKER                                    */
/* ─────────────────────────────────────────────────────────────────────────── */

function CustomerPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const { data: customers = [] } = useCustomers();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = customers.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()),
  );
  const name = customers.find((c) => c.id === value)?.name ?? null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs border transition-colors
          ${value ? "border-sky-500 text-sky-300 bg-sky-600/10" : "border-slate-600 text-slate-400 hover:text-white hover:border-slate-500"}`}
      >
        <User className="w-3.5 h-3.5" />
        {name ?? "Customer"}
        {value && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="ml-1 text-slate-500 hover:text-red-400"
          >
            <X className="w-3 h-3" />
          </span>
        )}
        <ChevronDown className="w-3 h-3 opacity-50" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-30 w-60 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-700">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full bg-slate-700 border border-slate-600 text-slate-100 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-sky-500 placeholder:text-slate-500"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-slate-500 px-3 py-4 text-center">
                No customers found
              </p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onChange(c.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors
                    ${value === c.id ? "bg-sky-600/20 text-sky-300" : "text-slate-300 hover:bg-slate-700"}`}
                >
                  {c.name}
                  {value === c.id && <Check className="w-3 h-3" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*                           TOAST STACK                                      */
/* ─────────────────────────────────────────────────────────────────────────── */

type Toast = { id: string; message: string; type: "success" | "error" };

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-16 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-2.5 rounded-lg text-xs font-medium shadow-lg border ${
            t.type === "success"
              ? "bg-emerald-900/90 border-emerald-700 text-emerald-200"
              : "bg-red-900/90 border-red-700 text-red-200"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*                         STATUS BADGE                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: DocumentRow["status"] }) {
  if (!status) return null;
  const map = {
    posted: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    draft: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
  } as const;
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${map[status]}`}>
      {status}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*                           MAIN SCREEN                                      */
/* ─────────────────────────────────────────────────────────────────────────── */

const NUMBER_PREFIXES = ["POS", "INV", "ORD", "REF", "ALL"];

export default function SalesHistory() {
  const navigate = useNavigate();

  // ── Filters ────────────────────────────────────────────────────────────────
  const [dateRange, setDateRange] = useState({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });
  const [numberPrefix, setNumberPrefix] = useState("POS");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [dateModalOpen, setDateModalOpen] = useState(false);

  const filters: SalesFilters = {
    from: dateRange.from,
    to: dateRange.to,
    numberPrefix: numberPrefix === "ALL" ? "" : numberPrefix,
    customerId,
  };

  // ── Data ───────────────────────────────────────────────────────────────────
  const {
    data: docs = [],
    isLoading: loadingDocs,
    refetch,
  } = useSalesDocuments(filters);
  const { data: summary = { count: 0, total: 0 } } = useSalesSummary(filters);
  const deleteMutation = useDeleteDocument();
  const refundMutation = useCreateRefundDocument();

  // ── Selection ──────────────────────────────────────────────────────────────
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const { data: items = [], isLoading: loadingItems } =
    useDocumentItems(selectedDocId);
  const selectedDoc = docs.find((d) => d.id === selectedDocId) ?? null;

  // ── Modal flags ────────────────────────────────────────────────────────────
  const [deleteModal, setDeleteModal] = useState(false);
  const [refundModal, setRefundModal] = useState(false);

  // ── Toasts ─────────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback(
    (message: string, type: Toast["type"] = "success") => {
      const id = nanoid(6);
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
    },
    [],
  );

  // ── Toolbar handlers ───────────────────────────────────────────────────────

  function handlePrint() {
    if (!selectedDoc) return;
    const url = URL.createObjectURL(
      buildDocPdf(selectedDoc, items).output("blob"),
    );
    const win = window.open(url, "_blank");
    win?.addEventListener("load", () => win.print());
    toast("Print dialog opened");
  }

  function handleSavePdf() {
    if (!selectedDoc) return;
    buildDocPdf(selectedDoc, items).save(
      `${selectedDoc.number.replace(/\//g, "-")}.pdf`,
    );
    toast("PDF downloaded");
  }

  function handleReceipt() {
    if (!selectedDoc) return;
    const url = URL.createObjectURL(
      buildReceiptPdf(selectedDoc, items).output("blob"),
    );
    const win = window.open(url, "_blank");
    win?.addEventListener("load", () => win.print());
    toast("Receipt dialog opened");
  }

  function handleEmail() {
    if (!selectedDoc) return;
    const subject = encodeURIComponent(`Document ${selectedDoc.number}`);
    const itemLines = items
      .map((i) => `  • ${i.name}  ×${i.quantity}  ${i.total.toFixed(2)}`)
      .join("\n");
    const body = encodeURIComponent(
      `Hello${selectedDoc.customerName ? ` ${selectedDoc.customerName}` : ""},\n\n` +
        `Details for document ${selectedDoc.number}:\n\n` +
        `Date: ${format(new Date(selectedDoc.date), "dd/MM/yyyy HH:mm")}\n` +
        `Status: ${selectedDoc.status ?? "—"}\n\n` +
        `Items:\n${itemLines || "  (no items)"}\n\n` +
        `Subtotal (ex tax): ${(selectedDoc.totalBeforeTax ?? 0).toFixed(2)}\n` +
        `Tax:               ${(selectedDoc.taxTotal ?? 0).toFixed(2)}\n` +
        `Total:             ${(selectedDoc.total ?? 0).toFixed(2)}\n\n` +
        `Kind regards`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    toast("Email composer opened");
  }

  function handleDeleteConfirm() {
    if (!selectedDoc) return;
    deleteMutation.mutate(selectedDoc.id, {
      onSuccess: () => {
        setDeleteModal(false);
        setSelectedDocId(null);
        toast(`Document ${selectedDoc.number} deleted`);
      },
      onError: () => toast("Failed to delete document", "error"),
    });
  }

  function handleRefundConfirm() {
    if (!selectedDoc) return;
    refundMutation.mutate(
      { sourceDocument: selectedDoc, sourceItems: items },
      {
        onSuccess: (refund) => {
          setRefundModal(false);
          toast(`Refund ${refund.number} created`);
        },
        onError: () => toast("Failed to create refund", "error"),
      },
    );
  }

  // ── Toolbar definition ─────────────────────────────────────────────────────
  const noDoc = !selectedDoc;
  const noItems = !selectedDoc || items.length === 0;

  const toolbarButtons = [
    {
      icon: RefreshCw,
      label: "Refresh",
      onClick: () => refetch(),
      disabled: false,
      danger: false,
    },
    {
      icon: Printer,
      label: "Print",
      onClick: handlePrint,
      disabled: noItems,
      danger: false,
    },
    {
      icon: FileDown,
      label: "Save as PDF",
      onClick: handleSavePdf,
      disabled: noItems,
      danger: false,
    },
    {
      icon: Receipt,
      label: "Receipt",
      onClick: handleReceipt,
      disabled: noItems,
      danger: false,
    },
    {
      icon: Mail,
      label: "Send email",
      onClick: handleEmail,
      disabled: noDoc,
      danger: false,
    },
    {
      icon: RotateCcw,
      label: "Refund",
      onClick: () => setRefundModal(true),
      disabled: noDoc,
      danger: false,
    },
    {
      icon: Trash2,
      label: "Delete",
      onClick: () => setDeleteModal(true),
      disabled: noDoc,
      danger: true,
    },
  ];

  const dateLabel =
    format(dateRange.from, "dd/MM/yyyy") === format(dateRange.to, "dd/MM/yyyy")
      ? format(dateRange.from, "dd/MM/yyyy")
      : `${format(dateRange.from, "dd/MM/yyyy")} – ${format(dateRange.to, "dd/MM/yyyy")}`;

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <div className="h-screen w-screen bg-slate-900 text-slate-200 flex flex-col overflow-hidden">
      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {dateModalOpen && (
        <DateRangeModal
          range={dateRange}
          onApply={setDateRange}
          onClose={() => setDateModalOpen(false)}
        />
      )}
      {deleteModal && selectedDoc && (
        <ConfirmModal
          icon={AlertTriangle}
          iconColor="text-red-400"
          title="Delete document?"
          body={
            <>
              <span className="font-mono text-slate-200">
                {selectedDoc.number}
              </span>{" "}
              will be permanently removed. This cannot be undone.
            </>
          }
          confirmLabel="Delete"
          confirmClass="bg-red-600 hover:bg-red-500"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteModal(false)}
          isPending={deleteMutation.isPending}
        />
      )}
      {refundModal && selectedDoc && (
        <ConfirmModal
          icon={RotateCcw}
          iconColor="text-amber-400"
          title="Create refund?"
          body={
            <>
              A refund document will be created for{" "}
              <span className="font-mono text-slate-200">
                {selectedDoc.number}
              </span>{" "}
              totalling{" "}
              <span className="text-slate-200">
                −{(selectedDoc.total ?? 0).toFixed(2)}
              </span>
              .
            </>
          }
          confirmLabel="Create refund"
          confirmClass="bg-amber-600 hover:bg-amber-500"
          onConfirm={handleRefundConfirm}
          onCancel={() => setRefundModal(false)}
          isPending={refundMutation.isPending}
        />
      )}

      <ToastStack toasts={toasts} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 shrink-0">
        <h1 className="text-base font-semibold">Sales history</h1>
        <button
          onClick={() => navigate(-1)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 border-b border-slate-800 bg-slate-800/40 shrink-0">
        {/* Number prefix */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Number</span>
          <select
            value={numberPrefix}
            onChange={(e) => setNumberPrefix(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none focus:border-sky-500"
          >
            {NUMBER_PREFIXES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Date */}
        <button
          onClick={() => setDateModalOpen(true)}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
        >
          <Calendar className="w-3.5 h-3.5" />
          {dateLabel}
        </button>

        {/* Customer */}
        <CustomerPicker value={customerId} onChange={setCustomerId} />

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Action buttons */}
        {toolbarButtons.map(
          ({ icon: Icon, label, onClick, disabled, danger }) => (
            <button
              key={label}
              onClick={onClick}
              disabled={disabled}
              title={label}
              className={`flex flex-col items-center gap-0.5 transition-colors
              disabled:opacity-25 disabled:cursor-not-allowed
              ${danger ? "text-red-400 hover:text-red-300" : "text-slate-400 hover:text-sky-400"}`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px]">{label}</span>
            </button>
          ),
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Documents table */}
        <div className="flex-[3] flex flex-col border-b border-slate-800 overflow-hidden">
          <div className="px-4 py-1.5 text-xs text-slate-500 border-b border-slate-800 bg-slate-800/30 shrink-0">
            Documents
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs border-collapse min-w-max">
              <thead className="sticky top-0 bg-slate-800 z-10">
                <tr>
                  {[
                    "Number",
                    "Status",
                    "Customer",
                    "Date",
                    "Paid",
                    "Total before tax",
                    "Tax",
                    "Total",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left font-medium border-b border-slate-700 text-slate-400 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingDocs ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-10 text-center text-slate-500"
                    >
                      <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                      Loading…
                    </td>
                  </tr>
                ) : docs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-10 text-center text-slate-500"
                    >
                      No documents for the selected filters
                    </td>
                  </tr>
                ) : (
                  docs.map((doc) => (
                    <tr
                      key={doc.id}
                      onClick={() =>
                        setSelectedDocId(
                          selectedDocId === doc.id ? null : doc.id,
                        )
                      }
                      className={`border-b border-slate-800/60 cursor-pointer transition-colors ${
                        selectedDocId === doc.id
                          ? "bg-sky-600/20 text-sky-100"
                          : "hover:bg-slate-800/50"
                      }`}
                    >
                      <td className="px-3 py-2 font-mono whitespace-nowrap">
                        {doc.number}
                        {doc.externalNumber && (
                          <span className="ml-1 text-slate-500">
                            / {doc.externalNumber}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="px-3 py-2 text-slate-300 max-w-[160px] truncate">
                        {doc.customerName ?? (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-400">
                        {format(new Date(doc.date), "dd/MM/yyyy HH:mm")}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {doc.paid ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400 inline" />
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-300">
                        {(doc.totalBeforeTax ?? 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-400">
                        {(doc.taxTotal ?? 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">
                        {(doc.total ?? 0).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Items table */}
        <div className="flex-[2] flex flex-col overflow-hidden">
          <div className="px-4 py-1.5 text-xs text-slate-500 border-b border-slate-800 bg-slate-800/30 shrink-0 flex items-center justify-between">
            <span>Document items</span>
            {selectedDoc && (
              <span className="text-slate-600 font-mono">
                {selectedDoc.number}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs border-collapse min-w-max">
              <thead className="sticky top-0 bg-slate-800 z-10">
                <tr>
                  {[
                    "Name",
                    "Unit",
                    "Quantity",
                    "Price before tax",
                    "Tax %",
                    "Discount",
                    "Total",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left font-medium border-b border-slate-700 text-slate-400 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!selectedDocId ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-slate-600"
                    >
                      Select a document above to view its items
                    </td>
                  </tr>
                ) : loadingItems ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-slate-500"
                    >
                      <RefreshCw className="w-3.5 h-3.5 animate-spin inline mr-2" />
                      Loading…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-slate-500"
                    >
                      No items on this document
                    </td>
                  </tr>
                ) : (
                  items.map((item, i) => (
                    <tr
                      key={item.id}
                      className={`border-b border-slate-800/50 ${i % 2 === 0 ? "" : "bg-slate-800/20"}`}
                    >
                      <td className="px-3 py-2 text-slate-200 max-w-[220px] truncate">
                        {item.name}
                      </td>
                      <td className="px-3 py-2 text-slate-400">
                        {item.unit ?? "—"}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {item.quantity}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-300">
                        {item.priceBeforeTax.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-400">
                        {item.taxRate != null ? `${item.taxRate}%` : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-400">
                        {item.discount ? item.discount.toFixed(2) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">
                        {item.total.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-800 bg-slate-900 shrink-0">
        <div className="flex items-center gap-6 text-xs text-slate-400">
          <span>
            Documents:{" "}
            <span className="text-slate-200 font-medium tabular-nums">
              {summary.count}
            </span>
          </span>
          <span>
            Total:{" "}
            <span className="text-slate-200 font-medium tabular-nums">
              {summary.total.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </span>
          {selectedDoc && (
            <span className="text-slate-600">
              Selected: <span className="font-mono">{selectedDoc.number}</span>{" "}
              — {(selectedDoc.total ?? 0).toFixed(2)}
            </span>
          )}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="bg-red-600 hover:bg-red-700 text-white text-xs px-5 py-1.5 rounded transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
