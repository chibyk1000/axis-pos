"use client";

import { useState } from "react";
import {
  RefreshCw as Refresh,
  Plus,
  Pencil,
  Trash2,
  HelpCircle,
  Check,
} from "lucide-react";

interface PaymentType {
  name: string;
  position: number;
  code: string;
  enabled: boolean;
  quickPayment: boolean;
  customerRequired: boolean;
  changeAllowed: boolean;
  markTransactionAsPaid: boolean;
  printReceipt: boolean;
}

const paymentTypes: PaymentType[] = [
  {
    name: "Cash",
    position: 1,
    code: "",
    enabled: true,
    quickPayment: true,
    customerRequired: false,
    changeAllowed: true,
    markTransactionAsPaid: true,
    printReceipt: true,
  },
  {
    name: "Card",
    position: 2,
    code: "",
    enabled: true,
    quickPayment: true,
    customerRequired: false,
    changeAllowed: false,
    markTransactionAsPaid: true,
    printReceipt: true,
  },
];

export default function PaymentTypesClient() {
  const [refreshing, setRefreshing] = useState(false);
  const [activeRow, setActiveRow] = useState<number | null>(null);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-100">
      {/* Toolbar */}
      <div className="border-b border-slate-800 px-6 py-4 flex items-center gap-2 bg-slate-900">
        <button
          onClick={handleRefresh}
          className="
            flex items-center gap-2 px-3 py-2 rounded-md
            text-slate-400
            hover:bg-slate-800 hover:text-slate-100
            active:bg-slate-700
            transition-colors
          "
        >
          <Refresh className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          <span className="text-sm">Refresh</span>
        </button>

        <button
          className="
            flex items-center gap-2 px-3 py-2 rounded-md
            bg-primary text-primary-foreground
            hover:bg-primary/90
            active:bg-primary/80
            transition-colors
          "
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm">New payment type</span>
        </button>

        <button
          className="
            flex items-center gap-2 px-3 py-2 rounded-md
            text-slate-400
            hover:bg-slate-800 hover:text-slate-100
            active:bg-slate-700
            transition-colors
          "
        >
          <Pencil className="w-5 h-5" />
          <span className="text-sm">Edit</span>
        </button>

        <button
          className="
            flex items-center gap-2 px-3 py-2 rounded-md
            text-slate-400
            hover:bg-slate-800 hover:text-red-400
            active:bg-slate-700
            transition-colors
          "
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-sm">Delete</span>
        </button>

        <div className="flex-1" />

        <button
          className="
            flex items-center gap-2 px-3 py-2 rounded-md
            text-slate-400
            hover:bg-slate-800 hover:text-slate-100
            active:bg-slate-700
            transition-colors
          "
        >
          <HelpCircle className="w-5 h-5" />
          <span className="text-sm">Help</span>
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="border border-slate-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900">
                {[
                  "Name",
                  "Position",
                  "Code",
                  "Enabled",
                  "Quick payment",
                  "Customer required",
                  "Change allowed",
                  "Mark transaction as paid",
                  "Print receipt",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-xs font-semibold text-slate-400 text-left"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {paymentTypes.map((type, index) => {
                const isActive = activeRow === index;

                return (
                  <tr
                    key={index}
                    onClick={() => setActiveRow(index)}
                    className={`
                      border-b border-slate-800 cursor-pointer transition-colors
                      hover:bg-slate-800
                      ${isActive ? "bg-slate-700" : ""}
                    `}
                  >
                    {/* Active indicator */}
                    <td className="relative px-4 py-3 text-sm">
                      {isActive && (
                        <span className="absolute left-0 top-0 h-full w-1 bg-primary" />
                      )}
                      {type.name}
                    </td>

                    <td className="px-4 py-3 text-sm">{type.position}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {type.code || "-"}
                    </td>

                    {[
                      type.enabled,
                      type.quickPayment,
                      type.customerRequired,
                      type.changeAllowed,
                      type.markTransactionAsPaid,
                      type.printReceipt,
                    ].map((value, i) => (
                      <td key={i} className="px-4 py-3 text-center">
                        {value && (
                          <Check className="w-5 h-5 text-primary mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
