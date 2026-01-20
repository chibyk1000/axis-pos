"use client";

import {
  X,
  RefreshCw,
  ChevronLeftIcon,
  Plus,
  Edit,
  Trash2,
  Printer,
  FileDown,
  Grid3x3,
  Copy,
  Percent,
  Tag,
  HelpCircle,
  Search,
} from "lucide-react";
import { useState } from "react";

export function PriceListsView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("Products");

  const products = [
    {
      id: 1,
      code: "1",
      name: "makers",
      costPrice: 399.0,
      markup: 5,
      price: 418.95,
      taxInclusive: true,
    },
  ];

  const toolbarBtn =
    "flex items-center gap-2 px-3 py-2 rounded text-gray-400 hover:text-white hover:bg-[#003a66] hover:text-[#0099ff] active:bg-[#003a66] transition-colors";

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-[#e0e0e0]">
      {/* Header */}
      <div className="bg-slate-900 border-b border-[#333] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="text-gray-400 hover:text-white hover:bg-[#333] p-1 rounded">
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <span className="text-sm">Management • Price lists</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1 rounded hover:bg-[#333] hover:text-white">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="p-1 rounded hover:bg-[#333] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* License Warning */}
      <div className="bg-[#cc3333] border-b border-[#992222] px-6 py-3 flex items-center gap-3">
        <div className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center">
          <span className="text-white font-bold text-sm">!</span>
        </div>
        <p className="text-sm text-white">
          License missing. Please purchase a license to enable Price lists.
          <a className="ml-2 underline hover:no-underline cursor-pointer">
            Learn more
          </a>
        </p>
      </div>

      {/* Toolbar */}
      <div className="bg-slate-900 border-b border-[#333] px-6 py-3 flex flex-wrap gap-2">
        <button className={toolbarBtn}>
          <RefreshCw className="w-4 h-4" />
          <span className="text-xs">Refresh</span>
        </button>
        <button className={toolbarBtn}>
          <Plus className="w-4 h-4" />
          <span className="text-xs">New price list</span>
        </button>
        <button className={toolbarBtn}>
          <Edit className="w-4 h-4" />
          <span className="text-xs">Edit</span>
        </button>
        <button className={toolbarBtn}>
          <Trash2 className="w-4 h-4" />
          <span className="text-xs">Delete</span>
        </button>
        <button className={toolbarBtn}>
          <Printer className="w-4 h-4" />
          <span className="text-xs">Print</span>
        </button>
        <button className={toolbarBtn}>
          <FileDown className="w-4 h-4" />
          <span className="text-xs">Save as PDF</span>
        </button>
        <button className={toolbarBtn}>
          <Grid3x3 className="w-4 h-4" />
          <span className="text-xs">Excel</span>
        </button>
        <button className={toolbarBtn}>
          <Copy className="w-4 h-4" />
          <span className="text-xs">Copy price list</span>
        </button>
        <button className={toolbarBtn}>
          <Percent className="w-4 h-4" />
          <span className="text-xs">Edit prices</span>
        </button>
        <button className={toolbarBtn}>
          <Tag className="w-4 h-4" />
          <span className="text-xs">Product prices</span>
        </button>
        <button className={toolbarBtn}>
          <HelpCircle className="w-4 h-4" />
          <span className="text-xs">Help</span>
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 bg-slate-900 border-r border-[#333]">
          <div className="p-4 border-b border-[#333]">
            <h3 className="text-sm font-semibold mb-2">Price lists</h3>
            <p className="text-xs text-gray-500 mb-3">
              Select product prices or price list
            </p>

            <button
              onClick={() => setSelectedGroup("Products")}
              className={`w-full px-3 py-2 rounded text-sm font-medium flex items-center gap-2 transition-colors
                ${
                  selectedGroup === "Products"
                    ? "bg-[#003a66] text-[#0099ff]"
                    : "bg-slate-900 hover:bg-slate-800 text-gray-300"
                }`}
            >
              📦 Products
            </button>
          </div>

          <div className="p-4">
            <h3 className="text-sm font-semibold mb-2">Product groups</h3>
            <div className="space-y-1">
              <div className="px-2 py-2 rounded bg-[#003a66] text-[#0099ff] font-medium">
                ▼ Products
              </div>
              <div className="px-6 py-2 rounded cursor-pointer text-gray-400 hover:bg-[#333] hover:text-white">
                📁 group one
              </div>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search */}
          <div className="bg-s border-b border-[#333] px-6 py-3 flex items-center gap-3">
            <input
              type="text"
              placeholder="Product name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-slate-900 border border-[#333] rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#0099ff] focus:outline-none"
            />
            <Search className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-400">Products count: 1</span>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-900 border-b border-[#333]">
                <tr>
                  <th className="px-6 py-3 text-left text-[#0099ff]">Code</th>
                  <th className="px-6 py-3 text-left">Product</th>
                  <th className="px-6 py-3 text-left">Cost price</th>
                  <th className="px-6 py-3 text-left">Markup</th>
                  <th className="px-6 py-3 text-left">Price</th>
                  <th className="px-6 py-3 text-left">Tax inclusive</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-[#333] hover:bg-[#003a66]/30"
                  >
                    <td className="px-6 py-3">{p.code}</td>
                    <td className="px-6 py-3">{p.name}</td>
                    <td className="px-6 py-3">{p.costPrice.toFixed(2)}</td>
                    <td className="px-6 py-3">{p.markup}%</td>
                    <td className="px-6 py-3">{p.price.toFixed(2)}</td>
                    <td className="px-6 py-3">
                      {p.taxInclusive ? "Yes" : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
