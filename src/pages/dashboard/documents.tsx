import {
  X,
  RefreshCw,
  ChevronLeftIcon,
  Search,
  Trash2,
  Plus,
  Printer,
  Eye,
  FileDown,
  AlertTriangle,
} from "lucide-react";
import { useMemo, useState } from "react";

import SelectDocumentTypeModal, {
  DocumentType,
} from "./selectDocumentTypeModal";
import NewDocument from "@/components/products/new-document";
import { useProducts } from "@/hooks/controllers/products";
import { useCustomers } from "@/hooks/controllers/customers";
import { useUsers } from "@/hooks/controllers/users";
import { useAuth } from "@/App";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDeleteDocument, useDocuments } from "@/hooks/controllers/documents";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { writeFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { openPath } from "@tauri-apps/plugin-opener";
import { tempDir, join } from "@tauri-apps/api/path";
import { save as saveDialog } from "@tauri-apps/plugin-dialog";

// ─── PDF builder (Fix #1, #2, #3) ───────────────────────────────────────────
function buildDocPdf(doc: any, items: any[]): jsPDF {
  const pdf = new jsPDF();

  // Header
  pdf.setFontSize(16);
  pdf.text("Document", 14, 18);

  pdf.setFontSize(10);
  pdf.text(`Number: ${doc.number ?? "-"}`, 14, 28);
  pdf.text(
    `Date: ${doc.date ? format(new Date(doc.date), "MM/dd/yyyy") : "-"}`,
    14,
    34,
  );
  pdf.text(`Customer: ${doc.customerName ?? doc.customerId ?? "-"}`, 14, 40);
  pdf.text(`Paid: ${doc.paid ? "Yes" : "No"}`, 14, 46);
  if (doc.externalNumber) {
    pdf.text(`External #: ${doc.externalNumber}`, 14, 52);
  }

  // Items table
  autoTable(pdf, {
    startY: 60,
    head: [
      [
        "Name",
        "Unit",
        "Qty",
        "Price (pre-tax)",
        "Tax",
        "Price",
        "Discount",
        "Total",
      ],
    ],
    body: items.map((item) => {
      const price = item.priceBeforeTax * (1 + item.taxRate / 100);
      return [
        item.name ?? "-",
        item.unit ?? "-",
        item.quantity,
        Number(item.priceBeforeTax).toFixed(2),
        `${item.taxRate}%`,
        price.toFixed(2),
        item.discount ?? 0,
        Number(item.total).toFixed(2),
      ];
    }),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [79, 70, 229] },
  });

  // Totals
  const finalY = (pdf as any).lastAutoTable?.finalY ?? 60;
  const grandTotal = items.reduce((sum, i) => sum + Number(i.total ?? 0), 0);
  pdf.setFontSize(10);
  pdf.text(`Grand Total: ${grandTotal.toFixed(2)}`, 14, finalY + 10);

  return pdf;
}

// ─── Confirmation Modal (Fix #4) ─────────────────────────────────────────────
function ConfirmDeleteModal({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-sm mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-500/10">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Delete Document
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This action cannot be undone
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300 mb-6">
          Are you sure you want to delete this document? All associated items
          will be permanently removed.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700
              text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-lg bg-rose-500 text-white
              hover:bg-rose-600 transition font-medium"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function DocumentsView() {
  const [open, setOpen] = useState(false);
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentType | null>(
    null,
  );
  const [editingDocument, setEditingDocument] = useState<any>(null);

  const products = useProducts();
  const { data: customers = [] } = useCustomers();
  const auth = useAuth();
  const { data: allUsers = [] } = useUsers();

  const defaultFilters = {
    product: "all",
    user: "all",
    register: "all",
    customer: "all",
    documentType: "all",
    paid: "all",
    number: "",
    external: "",
    period: undefined as DateRange | undefined,
  };

  const [filters, setFilters] = useState(defaultFilters);

  // Fix #5: store refetch from hook so button triggers it properly
  const { data: savedDocuments = [], refetch } = useDocuments();

  const [selectedSavedDocument, setSelectedSavedDocument] = useState<any>(null);

  // Fix #4: proper confirmation modal state
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const deleteDocument = useDeleteDocument();

  const currentUser = useMemo(() => {
    if (!auth.user) return undefined;
    const currentUsername = auth.user.username.toLowerCase();
    return allUsers.find(
      (u) =>
        u.name?.toLowerCase() === currentUsername ||
        u.email?.toLowerCase() === currentUsername,
    );
  }, [auth.user, allUsers]);

  const currentUserId = currentUser?.id ?? null;

  const onAdd = () => setOpen(true);

  // Tauri v2: write via BaseDirectory.Temp (satisfies $TEMP scope), then shellOpen with full path
  const openPdfInTauri = async (
    pdf: jsPDF,
    filename: string,
    autoPrint = false,
  ) => {
    try {
      if (autoPrint) pdf.autoPrint();
      const bytes = new Uint8Array(pdf.output("arraybuffer"));
      // Write using BaseDirectory.Temp so Tauri resolves internally — no raw absolute path
      await writeFile(filename, bytes, { baseDir: BaseDirectory.Temp });
      // Build absolute path only for shellOpen
      const tmp = await tempDir();
      const filePath = await join(tmp, filename);
      await openPath(filePath);
    } catch (err) {
      console.error("Failed to open PDF:", err);
      alert(
        "Could not open PDF. Ensure plugins are registered and $TEMP/** is in your capability scope.",
      );
    }
  };

  const handlePrint = async () => {
    if (!selectedSavedDocument) return alert("Select a document first");
    const pdf = buildDocPdf(
      selectedSavedDocument,
      selectedSavedDocument.items || [],
    );
    await openPdfInTauri(pdf, `print-${selectedSavedDocument.id}.pdf`, true);
  };

  const handlePreview = async () => {
    if (!selectedSavedDocument) return alert("Select a document first");
    const pdf = buildDocPdf(
      selectedSavedDocument,
      selectedSavedDocument.items || [],
    );
    await openPdfInTauri(pdf, `preview-${selectedSavedDocument.id}.pdf`, false);
  };

  const handleSavePdf = async () => {
    if (!selectedSavedDocument) return alert("Select a document first");
    try {
      // plugin-dialog v2: save dialog
      const savePath = await saveDialog({
        defaultPath: `document-${selectedSavedDocument.number ?? selectedSavedDocument.id}.pdf`,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });
      if (savePath) {
        const pdf = buildDocPdf(
          selectedSavedDocument,
          selectedSavedDocument.items || [],
        );
        const bytes = new Uint8Array(pdf.output("arraybuffer"));
        await writeFile(savePath, bytes);
      }
    } catch (err) {
      console.error("Save PDF failed:", err);
      alert("Could not save PDF.");
    }
  };

  const documentTypes = [
    { code: 100, label: "Purchase", category: "Expenses" },
    { code: 120, label: "Stock Return", category: "Expenses" },
    { code: 200, label: "Sales", category: "Sales" },
    { code: 220, label: "Refund", category: "Sales" },
    { code: 230, label: "Proforma", category: "Sales" },
    { code: 300, label: "Inventory count", category: "Inventory" },
    { code: 400, label: "Loss and damage", category: "Loss" },
  ];

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Fix #6: Clear filters resets to default AND refetches
  const clearFilters = () => {
    setFilters(defaultFilters);
    refetch();
  };

  const filteredDocuments = savedDocuments.filter((doc) => {
    if (filters.user !== "all") {
      if (filters.user === "mine") {
        if (currentUserId != null && doc.userId !== currentUserId) return false;
      } else {
        if (doc.userId?.toString() !== filters.user) return false;
      }
    }
    if (filters.customer !== "all" && doc.customerId !== filters.customer)
      return false;
    if (
      filters.documentType !== "all" &&
      doc.type?.toString() !== filters.documentType
    )
      return false;
    if (filters.paid === "paid" && !doc.paid) return false;
    if (filters.paid === "unpaid" && doc.paid) return false;
    if (
      filters.number &&
      !doc.number?.toLowerCase().includes(filters.number.toLowerCase())
    )
      return false;
    if (
      filters.external &&
      !doc.externalNumber
        ?.toLowerCase()
        .includes(filters.external.toLowerCase())
    )
      return false;
    if (filters.period?.from) {
      const docDate = new Date(doc.date);
      if (docDate < filters.period.from) return false;
      if (filters.period.to && docDate > filters.period.to) return false;
    }
    return true;
  });

  // Fix #3: Edit — properly open an existing doc in the NewDocument editor
  const handleEdit = () => {
    if (!selectedSavedDocument) return;

    // Find or create a matching DocumentType for the document's type code
    const docType = documentTypes.find(
      (t) => t.code === selectedSavedDocument.type,
    );
    const editTab: DocumentType = docType ?? {
      code: selectedSavedDocument.type ?? 0,
      label: "Edit",
      category: "Edit",
    };

    setEditingDocument(selectedSavedDocument);

    // Add tab if not already open
    setDocuments((prev) => {
      const exists = prev.some((d) => d.code === editTab.code);
      return exists ? prev : [...prev, editTab];
    });

    setSelectedDocument(editTab);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      {/* Fix #4: Confirmation modal */}
      <ConfirmDeleteModal
        open={confirmDeleteOpen}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={() => {
          if (selectedSavedDocument) {
            deleteDocument.mutate(selectedSavedDocument.id, {
              onSuccess: () => {
                setSelectedSavedDocument(null);
                refetch(); // also refetch after delete
              },
            });
          }
          setConfirmDeleteOpen(false);
        }}
      />

      {/* Header */}
      <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="text-slate-500 dark:text-slate-400 hover:text-indigo-400 transition">
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <span className="text-sm text-slate-700 dark:text-slate-300">
            Management • Documents
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Fix #5: Refresh triggers refetch */}
          <button
            onClick={() => refetch()}
            className="text-slate-500 dark:text-slate-400 hover:text-indigo-400 transition"
            title="Refresh documents"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="text-slate-500 dark:text-slate-400 hover:text-rose-400 transition">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <SelectDocumentTypeModal
        open={open}
        onOpenChange={setOpen}
        onConfirm={(value) => {
          if (value) {
            setEditingDocument(null); // new doc — no pre-existing data
            setDocuments((prev) => {
              const exists = prev.some((d) => d.code === value.code);
              return exists ? prev : [...prev, value];
            });
            setSelectedDocument(value);
          }
        }}
      />

      {/* Tab bar */}
      <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-800 px-6 py-3 flex gap-2">
        <button
          onClick={() => setSelectedDocument(null)}
          className={`flex items-center gap-2 ${
            !selectedDocument ? "bg-white dark:bg-slate-800" : ""
          } w-40 text-xs px-3 py-2`}
        >
          <Search className="w-3 h-3 text-slate-500" />
          <span>View Documents</span>
        </button>

        {documents.length > 0 && (
          <div className="flex items-center gap-1">
            {documents.map((doc) => {
              const isActive = selectedDocument?.code === doc.code;
              return (
                <div
                  key={doc.code}
                  className={`
                    flex items-center justify-between min-w-35 max-w-45
                    px-3 py-2 text-xs rounded-t-md
                    border border-slate-300 dark:border-slate-800 border-b-0
                    transition cursor-pointer
                    ${
                      isActive
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        : "bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-white hover:text-slate-800"
                    }
                  `}
                  onClick={() => setSelectedDocument(doc)}
                >
                  <span className="truncate">
                    {/* Fix #3: show document number for editing tabs */}
                    {editingDocument?.number
                      ? editingDocument.number
                      : `${new Date().getFullYear()} - ${doc.code}`}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const filtered = documents.filter(
                        (d) => d.code !== doc.code,
                      );
                      setDocuments(filtered);
                      if (isActive) {
                        setSelectedDocument(null);
                        setEditingDocument(null);
                      }
                    }}
                    className="ml-2 text-slate-500 hover:text-rose-400 transition"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fix #3: Pass editingDocument to NewDocument so it loads existing data */}
      {documents.length > 0 &&
        documents.map((doc) => {
          if (selectedDocument?.code === doc.code) {
            return (
              <div key={doc.code} className="flex-1 overflow-auto">
                <NewDocument
                  title={editingDocument?.number ?? "New Document"}
                  document={editingDocument}
                  documentType={doc.code}
                />
              </div>
            );
          }
          return null;
        })}

      {(!documents.length || !selectedDocument) && (
        <>
          {/* Toolbar */}
          <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-800 px-6 py-3 flex items-center gap-4">
            <ToolbarButton icon={Plus} label="Add" onClick={onAdd} />
            <ToolbarButton icon={Printer} label="Print" onClick={handlePrint} />
            <ToolbarButton
              icon={Eye}
              label="Print preview"
              onClick={handlePreview}
            />
            <ToolbarButton
              icon={FileDown}
              label="Save as PDF"
              onClick={handleSavePdf}
            />
            {/* Fix #3: Edit now calls handleEdit */}
            <ToolbarButton label="Edit" onClick={handleEdit} />
            {/* Fix #4: Delete opens confirmation modal */}
            <ToolbarButton
              icon={Trash2}
              label="Delete"
              danger
              onClick={() => {
                if (!selectedSavedDocument) return;
                setConfirmDeleteOpen(true);
              }}
            />
          </div>

          {/* Filters */}
          <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-800 px-6 py-4 space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <FilterSelect
                label="Product"
                value={filters.product}
                onChange={(v) => handleFilterChange("product", v)}
                items={[
                  { id: "all", value: "All products" },
                  ...(products?.data?.map((item) => ({
                    id: item.id,
                    value: item.title,
                  })) ?? []),
                ]}
              />
              <FilterSelect
                label="User"
                value={filters.user}
                onChange={(v) => handleFilterChange("user", v)}
                items={[
                  {
                    id: "mine",
                    value: currentUser
                      ? `My documents (${currentUser.name ?? currentUser.email})`
                      : "My documents",
                  },
                  { id: "all", value: "All users" },
                  ...allUsers.map((item) => ({
                    id: item.id.toString(),
                    value: item.name ?? item.email ?? `User ${item.id}`,
                  })),
                ]}
              />
              <FilterSelect
                label="Cash register"
                items={[{ id: "all", value: "All cash register" }]}
              />
              <FilterSelect
                label="Customer"
                value={filters.customer}
                onChange={(v) => handleFilterChange("customer", v)}
                items={[
                  { id: "all", value: "All customers" },
                  ...customers.map((item) => ({
                    id: item.id,
                    value: item.name,
                  })),
                ]}
              />
              <FilterSelect
                label="Document type"
                value={filters.documentType}
                onChange={(v) => handleFilterChange("documentType", v)}
                items={[
                  { id: "all", value: "All document types" },
                  ...documentTypes.map((item) => ({
                    id: item.code.toString(),
                    value: `${item.code} - ${item.label}`,
                  })),
                ]}
              />
              <FilterSelect
                label="Paid status"
                value={filters.paid}
                onChange={(v) => handleFilterChange("paid", v)}
                items={[
                  { id: "all", value: "All transactions" },
                  { id: "paid", value: "Paid" },
                  { id: "unpaid", value: "Unpaid" },
                ]}
              />
              <FilterInput
                label="Document number"
                value={filters.number}
                onChange={(v) => handleFilterChange("number", v)}
              />
              <FilterInput
                label="External document"
                value={filters.external}
                onChange={(v) => handleFilterChange("external", v)}
              />
              <FilterDateRange
                label="Period"
                value={filters.period}
                onChange={(v) => handleFilterChange("period", v)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => refetch()} // Search re-fetches from server
                className="flex items-center gap-1 text-sm text-slate-700 dark:text-slate-300 px-3 py-1 rounded
                  hover:text-indigo-400 hover:bg-indigo-500/10 transition"
              >
                <Search className="w-4 h-4" />
                Search
              </button>
              {/* Fix #6: Clear now resets filters AND refetches */}
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm text-slate-700 dark:text-slate-300 px-3 py-1 rounded
                  hover:text-rose-400 hover:bg-rose-500/10 transition"
              >
                ⊗ Clear
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto px-6 py-4 space-y-6">
            <TableWrapper title={`Documents (${filteredDocuments.length})`}>
              <thead>
                <tr className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-2">
                    <input type="checkbox" />
                  </th>
                  {[
                    "ID",
                    "Number",
                    "External…",
                    "Document type",
                    "Paid",
                    "Customer",
                    "Date",
                    "POS",
                    "Ord…",
                    "Payment…",
                    "User",
                  ].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-2 text-left ${
                        h === "ID" || h === "Number" ? "text-indigo-400" : ""
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.length === 0 ? (
                  <tr className="bg-slate-50 dark:bg-slate-900">
                    <td
                      colSpan={12}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      No documents found
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc) => {
                    const customer = customers.find(
                      (c) => c.id === doc.customerId,
                    );
                    const isSelected = selectedSavedDocument?.id === doc.id;
                    return (
                      <tr
                        key={doc.id}
                        onClick={() => setSelectedSavedDocument(doc)}
                        className={`cursor-pointer transition ${
                          isSelected
                            ? "bg-indigo-50 dark:bg-indigo-500/10"
                            : "hover:bg-white dark:hover:bg-slate-800"
                        }`}
                      >
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            readOnly
                            checked={isSelected}
                          />
                        </td>
                        <td className="px-4 py-2">{doc.id.slice(0, 6)}</td>
                        <td className="px-4 py-2">{doc.number}</td>
                        <td className="px-4 py-2">
                          {doc.externalNumber || "-"}
                        </td>
                        <td className="px-4 py-2">
                          {documentTypes.find((t) => t.code === doc.type)
                            ?.label || doc.type}
                        </td>
                        <td className="px-4 py-2">
                          {doc.paid ? "Paid" : "Unpaid"}
                        </td>
                        <td className="px-4 py-2">
                          {customer?.name ?? "Unknown"}
                        </td>
                        <td className="px-4 py-2">
                          {doc.date
                            ? format(new Date(doc.date), "MM/dd/yyyy")
                            : "-"}
                        </td>
                        <td className="px-4 py-2">-</td>
                        <td className="px-4 py-2">-</td>
                        <td className="px-4 py-2">-</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </TableWrapper>

            <TableWrapper
              title={`Document items (${selectedSavedDocument?.items?.length ?? 0})`}
            >
              <thead>
                <tr className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  {[
                    "ID",
                    "Code",
                    "Name",
                    "Unit",
                    "Qty",
                    "Price (pre-tax)",
                    "Tax",
                    "Price",
                    "Total (pre-disc)",
                    "Discount",
                    "Total",
                  ].map((h) => (
                    <th key={h} className="px-4 py-2 text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!selectedSavedDocument?.items?.length ? (
                  <tr className="bg-slate-50 dark:bg-slate-900">
                    <td
                      colSpan={11}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      No items found
                    </td>
                  </tr>
                ) : (
                  selectedSavedDocument.items.map((item: any) => {
                    const price =
                      item.priceBeforeTax * (1 + item.taxRate / 100);
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-white dark:hover:bg-slate-800"
                      >
                        <td className="px-4 py-2">{item.id.slice(0, 6)}</td>
                        <td className="px-4 py-2">
                          {item.productId?.slice(0, 6)}
                        </td>
                        <td className="px-4 py-2">{item.name}</td>
                        <td className="px-4 py-2">{item.unit || "-"}</td>
                        <td className="px-4 py-2">{item.quantity}</td>
                        <td className="px-4 py-2">{item.priceBeforeTax}</td>
                        <td className="px-4 py-2">{item.taxRate}%</td>
                        <td className="px-4 py-2">{price.toFixed(2)}</td>
                        <td className="px-4 py-2">
                          {(item.quantity * item.priceBeforeTax).toFixed(2)}
                        </td>
                        <td className="px-4 py-2">{item.discount ?? 0}</td>
                        <td className="px-4 py-2">{item.total}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </TableWrapper>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Small helpers ─────────────────────────────────────────────────────────── */

function ToolbarButton({
  icon: Icon,
  label,
  danger,
  onClick,
}: {
  icon?: any;
  label: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={`
        flex items-center gap-2 text-sm px-3 py-2 rounded transition
        ${
          danger
            ? "text-slate-700 dark:text-slate-300 hover:text-rose-400 hover:bg-rose-500/10"
            : "text-slate-700 dark:text-slate-300 hover:text-indigo-400 hover:bg-indigo-500/10"
        }
      `}
      onClick={onClick}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {label}
    </button>
  );
}

function FilterSelect({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: { id: string; value: string }[];
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="flex flex-col">
      <label className="text-xs text-slate-500 dark:text-slate-400 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
      >
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.value}
          </option>
        ))}
      </select>
    </div>
  );
}

function FilterInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="flex flex-col">
      <label className="text-xs text-slate-500 dark:text-slate-400 mb-1">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
      />
    </div>
  );
}

function TableWrapper({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      <div className="border border-slate-300 dark:border-slate-800 rounded overflow-hidden">
        <table className="w-full text-sm">{children}</table>
      </div>
    </div>
  );
}

function FilterDateRange({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: DateRange;
  onChange?: (value: DateRange | undefined) => void;
}) {
  return (
    <div className="flex flex-col">
      <label className="text-xs text-slate-500 dark:text-slate-400 mb-1">
        {label}
      </label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-between bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-white hover:text-slate-900 text-sm px-2 py-1 h-9",
              !value && "text-slate-500",
            )}
          >
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, "MM/dd/yyyy")} –{" "}
                  {format(value.to, "MM/dd/yyyy")}
                </>
              ) : (
                format(value.from, "MM/dd/yyyy")
              )
            ) : (
              "Select period"
            )}
            <CalendarIcon className="ml-2 h-4 w-4 text-slate-500 dark:text-slate-400" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
          align="start"
        >
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={onChange}
            numberOfMonths={2}
            className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
