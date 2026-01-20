"use client";

import { X, ChevronLeftIcon, RefreshCw, Search } from "lucide-react";
import { useState } from "react";

export default function StockView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("group-1");

  const products = [
    {
      id: 1,
      code: "1",
      name: "makers",
      quantity: 0,
      unit: "cm",
      costPrice: 399.0,
      cost: 0.0,
      costInclTax: 0.0,
    },
  ];

  const productGroups = [{ id: "group-1", name: "group one" }];

  const toolbarBtn =
    "flex items-center gap-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 px-2 py-1.5 rounded transition-colors";

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-200">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="p-1 rounded hover:bg-slate-700 hover:text-white">
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <span className="text-sm">Management • Stock</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1 rounded hover:bg-slate-700 hover:text-white">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="p-1 rounded hover:bg-slate-700 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center gap-6">
        <button className={toolbarBtn}>
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
        <button className={toolbarBtn}>⏱️ Stock history</button>
        <button className={toolbarBtn}>🖨️ Print</button>
        <button className={toolbarBtn}>📄 Save as PDF</button>
        <button className={toolbarBtn}>📊 Excel</button>
        <button className={toolbarBtn}>📋 Inventory count report</button>
        <button className={toolbarBtn}>⚡ Quick inventory</button>
        <button className={`${toolbarBtn} ml-auto`}>❓ Help</button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-slate-800 border-r border-slate-700">
          <div className="px-4 py-3 border-b border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-slate-300">
                Products
              </span>
            </div>

            <div className="space-y-1 ml-4">
              {productGroups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => setSelectedGroup(group.id)}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors
                    ${
                      selectedGroup === group.id
                        ? "bg-sky-600/20 text-sky-400"
                        : "hover:bg-slate-700 text-slate-300"
                    }`}
                >
                  <span>📁</span>
                  <span className="text-xs">{group.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Filters */}
          <div className="bg-slate-800 border-b border-slate-700 px-6 py-4 space-y-4">
            <div className="flex items-center gap-6">
              <StatusBadge
                color="bg-red-500"
                label="Negative quantity"
                count={0}
              />
              <StatusBadge
                color="bg-sky-500"
                label="Non zero quantity"
                count={1}
              />
              <StatusBadge
                color="bg-emerald-500"
                label="Zero quantity"
                count={0}
              />
            </div>

            <div className="flex items-center gap-3 bg-slate-900 rounded px-3 py-2 border border-slate-700">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Product name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none placeholder-slate-500"
              />
              <span className="text-xs text-slate-400">Products count: 1</span>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-800 border-b border-slate-700">
                <tr>
                  {[
                    "Code",
                    "Name",
                    "Quantity",
                    "Unit",
                    "Cost price",
                    "Cost",
                    "Cost inclusive",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-medium text-slate-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-slate-700 hover:bg-slate-700/60 transition-colors"
                  >
                    <td className="px-6 py-3">
                      <input
                        type="radio"
                        name="product"
                        className="accent-sky-500 mr-2"
                      />
                      {p.code}
                    </td>
                    <td className="px-6 py-3">{p.name}</td>
                    <td className="px-6 py-3">{p.quantity}</td>
                    <td className="px-6 py-3">{p.unit}</td>
                    <td className="px-6 py-3">{p.costPrice.toFixed(2)}</td>
                    <td className="px-6 py-3">{p.cost.toFixed(2)}</td>
                    <td className="px-6 py-3">{p.costInclTax.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="bg-slate-800 border-t border-slate-700 px-6 py-4">
            <div className="flex justify-end gap-12 text-sm">
              <SummaryBlock
                title="Cost price"
                rows={[
                  ["Total cost:", "0.00"],
                  ["Total cost incl. tax:", "0.00"],
                ]}
              />
              <SummaryBlock
                title="Sale price"
                rows={[
                  ["Total:", "0.00"],
                  ["Total inc. tax:", "0.00"],
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function StatusBadge({
  color,
  label,
  count,
}: {
  color: string;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-6 h-6 ${color} rounded flex items-center justify-center text-xs text-white font-bold`}
      >
        {count}
      </span>
      <span className="text-xs text-slate-300">{label}</span>
    </div>
  );
}

function SummaryBlock({
  title,
  rows,
}: {
  title: string;
  rows: [string, string][];
}) {
  return (
    <div>
      <div className="text-xs text-slate-400 mb-1">{title}</div>
      <div className="space-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-8">
            <span className="text-slate-400">{label}</span>
            <span className="font-medium">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
