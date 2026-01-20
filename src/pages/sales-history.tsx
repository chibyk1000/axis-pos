"use client";

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
} from "lucide-react";
import { useNavigate } from "react-router";

export default function SalesHistory() {
  const navigate  = useNavigate()
  return (
    <div className="h-screen w-screen bg-slate-900 text-slate-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
        <h1 className="text-lg font-semibold">Sales history</h1>
        <button className="hover:text-white" onClick={() => {
          navigate(-1)
        }}>
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-b border-slate-800 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Document number</span>
          <select className="bg-slate-800 border border-slate-700 rounded px-2 py-1">
            <option>POS</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>20/01/2026 - 20/01/2026</span>
        </div>

        <div className="flex gap-3 ml-auto">
          <ToolbarIcon icon={RefreshCw} label="Refresh" />
          <ToolbarIcon icon={User} label="Customer" />
          <ToolbarIcon icon={Printer} label="Print" />
          <ToolbarIcon icon={FileDown} label="Save as PDF" />
          <ToolbarIcon icon={Receipt} label="Receipt" />
          <ToolbarIcon icon={Mail} label="Send email" />
          <ToolbarIcon icon={RotateCcw} label="Refund" />
          <ToolbarIcon icon={Trash2} label="Delete" />
        </div>
      </div>

      {/* Documents */}
      <Section title="Documents">
        <DataTable
          headers={[
            "ID",
            "Document type",
            "User",
            "Number",
            "External",
            "Customer",
            "Date",
            "Created",
            "POS",
            "Order",
            "Payment",
            "Discount",
            "Total before tax",
            "Tax",
            "Total",
          ]}
        />
      </Section>

      {/* Document Items */}
      <Section title="Document items">
        <DataTable
          headers={[
            "ID",
            "Code",
            "Name",
            "Unit of measure",
            "Quantity",
            "Price before tax",
            "Tax",
            "Price",
            "Total before discount",
            "Discount",
            "Total",
          ]}
        />
      </Section>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-900">
        <div className="text-sm">
          <div>Documents count: 0</div>
          <div>Total amount: 0.00</div>
        </div>

        <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded">
          Close
        </button>
      </div>
    </div>
  );
}

/* ---------- Reusable Components ---------- */

function ToolbarIcon({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <button
      title={label}
      className="flex flex-col items-center gap-1 text-slate-400 hover:text-indigo-400 transition"
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px]">{label}</span>
    </button>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col border-t border-slate-800">
      <div className="px-4 py-2 text-sm text-slate-400 border-b border-slate-800">
        {title}
      </div>
      {children}
    </div>
  );
}

function DataTable({ headers }: { headers: string[] }) {
  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 bg-slate-800 z-10">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="px-3 py-2 text-left font-medium border-b border-slate-700 text-slate-300"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Empty state */}
          <tr>
            <td
              colSpan={headers.length}
              className="px-3 py-12 text-center text-slate-500"
            >
              No data available
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
