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
export function DocumentsView() {
  const [open, setOpen] = useState(false);
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentType | null>(
    null,
  );
  const products = useProducts();
  const customers = useCustomers();
  const onAdd = () => {
    setOpen(true);
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
          <button className="text-slate-400 hover:text-indigo-400 transition">
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
            min-w-[140px] max-w-[180px]
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
        documents.map((doc) => {
          return (


            <>
            
            <NewDocument
              title={`${new Date().getFullYear()} - ${doc.code} - ??????`}
            />
            </>
          );
        })
      ) : (
        <>
          <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center gap-4">
            <ToolbarButton icon={Plus} label="Add" onClick={onAdd} />
            <ToolbarButton icon={Printer} label="Print" />
            <ToolbarButton icon={Eye} label="Print preview" />
            <ToolbarButton icon={FileDown} label="Save as PDF" />
            <ToolbarButton label="Edit" />
            <ToolbarButton icon={Trash2} label="Delete" danger />
          </div>

          {/* Filters */}
          <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <FilterSelect
                label="Product"
                items={[
                  { id: "all", value: "All users" },
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
                items={[
                  {
                    id: "all",
                    value: "All customers",
                    ...customers.data?.map((item) => ({
                      id: item.id,
                      value: item.name,
                    })),
                  },
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
                items={[
                  { id: "all", value: "All transactions" },
                  { id: "paid", value: "Paid" },
                  { id: "unpaid", value: "Unpaid" },
                ]}
              />

              <FilterInput label="Document number" />
              <FilterInput label="External document" />

              <FilterDateRange label="Period" />
            </div>

            <div className="flex justify-end gap-2">
              <button
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
            <TableWrapper title="Documents (0)">
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
                <tr className="bg-slate-900">
                  <td
                    colSpan={12}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    No documents found
                  </td>
                </tr>
              </tbody>
            </TableWrapper>

            {/* Document Items Table */}
            <TableWrapper title="Document items (0)">
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
                <tr className="bg-slate-900">
                  <td
                    colSpan={11}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    No items found
                  </td>
                </tr>
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
}: {
  label: string;
  items: { id: string; value: string }[];
}) {
  return (
    <div className="flex flex-col">
      <label className="text-xs text-slate-400 mb-1">{label}</label>
      <select className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500">
        {items.map((item) => {
          return <option value={item.id}>{item.value}</option>;
        })}
      </select>
    </div>
  );
}

function FilterInput({
  label,
  placeholder,
}: {
  label: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col">
      <label className="text-xs text-slate-400 mb-1">{label}</label>
      <input
        placeholder={placeholder}
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

function FilterDateRange({ label }: { label: string }) {
  const [date, setDate] = useState<DateRange | undefined>();

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
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
            className="bg-slate-900 text-slate-200"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}