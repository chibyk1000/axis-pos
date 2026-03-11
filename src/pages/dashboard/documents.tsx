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
} from "lucide-react";
import { useState } from "react";

import SelectDocumentTypeModal, {
  DocumentType,
} from "./selectDocumentTypeModal";
import NewDocument from "@/components/products/new-document";
import { useProducts } from "@/hooks/controllers/products";
import { useCustomers } from "@/hooks/controllers/customers";
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
export function DocumentsView() {
  const [open, setOpen] = useState(false);
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentType | null>(
    null,
  );
  
  const [editingDocument, setEditingDocument] = useState<any>(null);
  const products = useProducts();
  const { data: customers = [] } = useCustomers();
  const [filters, setFilters] = useState({
    product: "all",
    user: "all",
    register: "all",
    customer: "all",
    documentType: "all",
    paid: "all",
    number: "",
    external: "",
    period: undefined as DateRange | undefined,
  });
  const { data: savedDocuments = [], refetch } = useDocuments();
  const onAdd = () => {
    setOpen(true);
  };
  const [selectedSavedDocument, setSelectedSavedDocument] = useState<any>(null);

  
const handlePrint = async () => {
  if (!selectedSavedDocument) return alert("Select a document first");
  // If you fix the Rust printer crate, call it here via invoke('print_document')
  // Otherwise, we trigger the system print dialog
  window.print();
};

  const handlePreview = () => {
    if (!selectedSavedDocument?.pdfPath) {
      alert("No PDF available for preview");
      return;
    }

    window.open(selectedSavedDocument.pdfPath);
  };

  const handleSavePdf = () => {
    if (!selectedSavedDocument?.pdfPath) {
      alert("No PDF available");
      return;
    }

    const link = document.createElement("a");
    link.href = selectedSavedDocument.pdfPath;
    link.download = `document-${selectedSavedDocument.number}.pdf`;
    link.click();
  };
  const deleteDocument = useDeleteDocument();
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
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      product: "all",
      user: "all",
      register: "all",
      customer: "all",
      documentType: "all",
      paid: "all",
      number: "",
      external: "",
      period: undefined,
    });
  };
  const filteredDocuments = savedDocuments.filter((doc) => {
   customers.find((c) => c.id === doc.customerId);

    if (filters.customer !== "all" && doc.customerId !== filters.customer)
      return false;

    if (filters.documentType !== "all" && doc.status !== filters.documentType)
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
  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-200">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="text-slate-400 hover:text-indigo-400 transition">
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <span className="text-sm text-slate-300">Management • Documents</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="text-slate-400 hover:text-indigo-400 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="text-slate-400 hover:text-rose-400 transition">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <SelectDocumentTypeModal
        open={open}
        onOpenChange={setOpen}
        onConfirm={(value) => {
          if (value) {
            setDocuments((prev) => [...prev, value]);
            setSelectedDocument(value);
          }
        }}
      />
      {/* Search Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex gap-2">
        <button
          onClick={() => {
            setSelectedDocument(null);
          }}
          className={`flex items-center gap-2 ${
            !selectedDocument && "bg-slate-800"
          }  w-40 text-xs px-3 py-2`}
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
            flex items-center justify-between
            min-w-35 max-w-45
            px-3 py-2 text-xs rounded-t-md
            border border-slate-800 border-b-0
            transition cursor-pointer
            ${
              isActive
                ? "bg-slate-800 text-white"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }
          `}
                  onClick={() => setSelectedDocument(doc)}
                >
                  <span className="truncate">
                    {new Date().getFullYear()} - {doc.code} - ??????
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

      {documents.length > 0 ? (
        documents.map(() => {
          return (
            <>
              <NewDocument
                title={editingDocument?.number ?? "New Document"}
                document={editingDocument}
              />
            </>
          );
        })
      ) : (
        <>
          <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center gap-4">
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
            <ToolbarButton
              label="Edit"
              onClick={() => {
                if (!selectedSavedDocument) return;
                setEditingDocument(selectedSavedDocument);
                setSelectedDocument({
                  code: 0,
                  label: "Edit",
                  category: "Edit",
                });
              }}
            />
            <ToolbarButton
              icon={Trash2}
              label="Delete"
              danger
              onClick={() => {
                if (!selectedSavedDocument) return;

                if (confirm("Delete this document?")) {
                  deleteDocument.mutate(selectedSavedDocument.id);
                  setSelectedSavedDocument(null);
                }
              }}
            />
          </div>

          {/* Filters */}
          <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 space-y-3">
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
                items={[{ id: "all", value: "All users" }]}
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
                items={[
                  { id: "all", value: "All document types" },
                  ...documentTypes?.map((item) => ({
                    id: item.code.toExponential.toString(),
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
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm text-slate-300 px-3 py-1 rounded
            hover:text-indigo-400 hover:bg-indigo-500/10 transition"
              >
                <Search className="w-4 h-4" />
                Search
              </button>
              <button
                className="flex items-center gap-1 text-sm text-slate-300 px-3 py-1 rounded
            hover:text-rose-400 hover:bg-rose-500/10 transition"
              >
                ⊗ Clear
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto px-6 py-4 space-y-6">
            {/* Documents Table */}
            <TableWrapper title={`Documents (${filteredDocuments.length})`}>
              <thead>
                <tr className="bg-slate-800 border-b border-slate-700">
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
                  <tr className="bg-slate-900">
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

                    return (
                      <tr
                        key={doc.id}
                        onClick={() => setSelectedSavedDocument(doc)}
                        className="hover:bg-slate-800 cursor-pointer"
                      >
                        <td className="px-4 py-2">
                          <input type="checkbox" />
                        </td>

                        <td className="px-4 py-2">{doc.id.slice(0, 6)}</td>

                        <td className="px-4 py-2">{doc.number}</td>

                        <td className="px-4 py-2">
                          {doc.externalNumber || "-"}
                        </td>

                        <td className="px-4 py-2">{doc.status}</td>

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

            {/* Document Items Table */}
            <TableWrapper
              title={`Document items (${selectedSavedDocument?.items?.length ?? 0})`}
            >
              <thead>
                <tr className="bg-slate-800 border-b border-slate-700">
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
                  <tr className="bg-slate-900">
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
                      <tr key={item.id} className="hover:bg-slate-800">
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

/* ---------- Small helpers (no layout change) ---------- */

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
            ? "text-slate-300 hover:text-rose-400 hover:bg-rose-500/10"
            : "text-slate-300 hover:text-indigo-400 hover:bg-indigo-500/10"
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
      <label className="text-xs text-slate-400 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
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
      <label className="text-xs text-slate-400 mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
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
      <div className="border border-slate-800 rounded overflow-hidden">
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
  const [date, ] = useState<DateRange | undefined>();

  return (
    <div className="flex flex-col">
      <label className="text-xs text-slate-400 mb-1">{label}</label>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-between bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-slate-100 text-sm px-2 py-1 h-9",
              !date && "text-slate-500",
            )}
          >
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "MM/dd/yyyy")} -{" "}
                  {format(date.to, "MM/dd/yyyy")}
                </>
              ) : (
                format(date.from, "MM/dd/yyyy")
              )
            ) : (
              "Select period"
            )}
            <CalendarIcon className="ml-2 h-4 w-4 text-slate-400" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-auto p-0 bg-slate-900 border border-slate-700"
          align="start"
        >
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={value}
            onSelect={onChange}
            numberOfMonths={2}
            className="bg-slate-900 text-slate-200"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}