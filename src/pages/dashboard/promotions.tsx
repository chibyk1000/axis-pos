import { useState } from "react";

export default function PriceListsScreen() {
  const [selected, setSelected] = useState(1);

  return (
    <div className="h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* License banner */}
      <div className="bg-red-600/90 text-white px-4 py-2 text-sm flex items-center gap-2">
        ⛔ License missing. Please purchase a license to enable Price lists
        functionality.
        <span className="underline cursor-pointer ml-1">Learn more</span>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-6 px-4 py-3 border-b border-slate-700 bg-slate-800 text-sm">
        {[
          ["⟳", "Refresh"],
          ["＋", "New price list"],
          ["✎", "Edit"],
          ["🗑", "Delete"],
          ["🖨", "Print"],
          ["📄", "Save as PDF"],
          ["XLS", "Excel"],
          ["⧉", "Copy price list"],
          ["%", "Edit prices"],
          ["🏷", "Product prices"],
          ["?", "Help"],
        ].map(([icon, label]) => (
          <button
            key={label}
            className="flex flex-col items-center gap-1 text-slate-300 hover:text-white"
          >
            <span className="text-lg">{icon}</span>
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className="w-64 border-r border-slate-700 bg-slate-800 flex flex-col">
          {/* Price lists */}
          <div className="p-3 border-b border-slate-700">
            <p className="text-sm font-medium mb-2">Price lists</p>
            <p className="text-xs text-slate-400 mb-2">
              Select product prices or price list to edit
            </p>

            <button className="w-full text-left px-3 py-2 bg-sky-600 text-white text-sm rounded">
              Products
            </button>
          </div>

          {/* Product groups */}
          <div className="p-3 text-sm flex-1 overflow-y-auto">
            <p className="font-medium mb-2">Product groups</p>
            <p className="text-xs text-slate-400 mb-2">
              Filter items by product groups
            </p>

            <div className="text-sm">
              <div className="flex items-center gap-2">
                📁 <span className="font-medium">Products</span>
              </div>
              <div className="ml-6 mt-1 flex items-center gap-2">
                📁 <span>group one</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main table */}
        <div className="flex-1 bg-slate-900 overflow-hidden">
          {/* Table header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 bg-slate-800 text-sm">
            <div className="flex gap-4 items-center">
              <span>#</span>
              <span className="flex items-center gap-1">Product name 🔍</span>
            </div>
            <span className="text-slate-400">Products count: 1</span>
          </div>

          {/* Table */}
          <table className="w-full text-sm">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr className="text-left">
                <th className="px-3 py-2 w-16">Code</th>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2 text-right">Cost price</th>
                <th className="px-3 py-2 text-right">Markup</th>
                <th className="px-3 py-2 text-right">Price</th>
                <th className="px-3 py-2">Tax inclusive</th>
                <th className="px-3 py-2">Taxes</th>
              </tr>
            </thead>

            <tbody>
              <tr
                onClick={() => setSelected(1)}
                className={`border-b border-slate-700 cursor-pointer ${
                  selected === 1 ? "bg-sky-600/30" : "hover:bg-slate-800"
                }`}
              >
                <td className="px-3 py-2">1</td>
                <td className="px-3 py-2">makerers</td>
                <td className="px-3 py-2 text-right">399.00</td>
                <td className="px-3 py-2 text-right">5%</td>
                <td className="px-3 py-2 text-right font-medium">418.95</td>
                <td className="px-3 py-2"></td>
                <td className="px-3 py-2"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
