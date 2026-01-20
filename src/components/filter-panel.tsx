"use client";

import { Calendar, Eye, Printer, Download, File } from "lucide-react";

export default function FilterPanel() {
  return (
    <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800">
        <h3 className="font-semibold text-sm text-slate-200">Filter</h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Customers & Suppliers */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 block">
            Customers & suppliers
          </label>
          <select className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 hover:border-slate-500 transition-colors">
            <option>All</option>
          </select>
          <select className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 mt-2 hover:border-slate-500 transition-colors">
            <option>User</option>
          </select>
          <select className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 mt-2 hover:border-slate-500 transition-colors">
            <option>All</option>
          </select>
        </div>

        {/* Cash Register */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 block">
            Cash register
          </label>
          <select className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 hover:border-slate-500 transition-colors">
            <option>All</option>
          </select>
        </div>

        {/* Product */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 block">
            Product
          </label>
          <select className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 hover:border-slate-500 transition-colors">
            <option>All</option>
          </select>
          <select className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 mt-2 hover:border-slate-500 transition-colors">
            <option>Product group</option>
          </select>
          <select className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 mt-2 hover:border-slate-500 transition-colors">
            <option>Products</option>
          </select>

          <label className="flex items-center gap-2 mt-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-sky-500"
            />
            <span className="text-slate-300">Include subgroups</span>
          </label>
        </div>

        {/* Date Range */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 block">
            Date range
          </label>
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-md px-3 py-2 hover:border-slate-500 transition-colors">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              defaultValue="01/01/2026 - 09/01/2026"
              className="flex-1 bg-transparent text-sm text-slate-200 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-slate-800 space-y-3">
        <button className="w-full flex items-center justify-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-sky-500 transition-colors">
          <Eye className="w-4 h-4" />
          Show report
        </button>

        <button className="w-full flex items-center justify-center gap-2 bg-slate-800 border border-slate-700 text-slate-200 px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-700 transition-colors">
          <Printer className="w-4 h-4" />
          Print
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button className="flex items-center justify-center gap-2 bg-slate-800 border border-slate-700 text-slate-200 px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-700 transition-colors">
            <Download className="w-4 h-4" />
            Excel
          </button>
          <button className="flex items-center justify-center gap-2 bg-slate-800 border border-slate-700 text-slate-200 px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-700 transition-colors">
            <File className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>
    </div>
  );
}
