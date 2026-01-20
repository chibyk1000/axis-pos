"use client";

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


export function DocumentsView() {
 

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

      {/* Search Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3">
        <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="View documents"
            className="bg-transparent text-slate-200 placeholder-slate-500 outline-none flex-1"
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center gap-4">
        <ToolbarButton icon={Plus} label="Add" />
        <ToolbarButton icon={Printer} label="Print" />
        <ToolbarButton icon={Eye} label="Print preview" />
        <ToolbarButton icon={FileDown} label="Save as PDF" />
        <ToolbarButton label="Edit" />
        <ToolbarButton icon={Trash2} label="Delete" danger />
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 space-y-3">
        <div className="grid grid-cols-3 gap-4">
          <FilterSelect label="Product" />
          <FilterSelect label="User" />
          <FilterSelect label="Cash register" />

          <FilterSelect label="Customer" />
          <FilterSelect label="Document type" />
          <FilterSelect label="Paid status" />

          <FilterInput label="Document number" />
          <FilterInput label="External document" />
          <FilterInput label="Period" placeholder="09/01/2026 - 09/01/2026" />
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
    </div>
  );
}

/* ---------- Small helpers (no layout change) ---------- */

function ToolbarButton({
  icon: Icon,
  label,
  danger,
}: {
  icon?: any;
  label: string;
  danger?: boolean;
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
    >
      {Icon && <Icon className="w-4 h-4" />}
      {label}
    </button>
  );
}

function FilterSelect({ label }: { label: string }) {
  return (
    <div className="flex flex-col">
      <label className="text-xs text-slate-400 mb-1">{label}</label>
      <select className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500">
        <option>All</option>
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
