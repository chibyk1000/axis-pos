import { useState } from "react";

export default function ImportModal() {
  const [tab, setTab] = useState("csv");

  const fields = [
    "Price change allowed",
    "Using default quantity",
    "Service (not using stock)",
    "Enabled",
    "Description",
    "Quantity",
    "Supplier",
    "Reorder point",
    "Preferred quantity",
    "Low stock warning",
    "Low stock warning quantity",
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
      <div className="w-[1200px] h-[720px] bg-slate-800 text-slate-100 rounded shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-lg">←</span>
            <h2 className="font-medium">Import</h2>
          </div>
          <button className="text-xl text-slate-300 hover:text-white">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 px-4">
          {["csv", "xml"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-2 text-sm font-medium uppercase
                ${
                  tab === t
                    ? "bg-sky-600 text-white"
                    : "text-slate-300 hover:text-white"
                }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Info box */}
        <div className="m-4 border border-sky-600 bg-slate-700/40 p-4 flex gap-3">
          <span className="text-sky-400 text-xl">ℹ</span>
          <p className="text-sm text-slate-200">
            Use CSV import to load products using custom CSV file or a CSV
            exported from other application. You can read more about importing
            products using CSV files on our{" "}
            <span className="text-sky-400 underline cursor-pointer">
              support center
            </span>
            .
          </p>
        </div>

        {/* Body */}
        <div className="flex flex-1 px-4 pb-4 gap-4 overflow-hidden">
          {/* Left mapping panel */}
          <div className="w-[420px] border-r border-slate-700 pr-4 overflow-y-auto">
            {fields.map((field) => (
              <div key={field} className="mb-3">
                <label className="text-xs text-slate-400 block mb-1">
                  {field}
                </label>
                <select className="w-full bg-slate-700 border border-slate-600 text-sm px-2 py-2 rounded focus:outline-none focus:border-sky-500">
                  <option />
                </select>
              </div>
            ))}

            <p className="text-xs text-slate-400 mt-4">
              <span className="text-red-500">*</span> Indicates required field
            </p>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button className="flex items-center gap-2 bg-slate-700 px-4 py-2 text-sm border border-slate-600 hover:bg-slate-600">
                👁 Preview
              </button>

              <button className="flex items-center gap-2 bg-slate-600 px-4 py-2 text-sm text-slate-300 cursor-not-allowed">
                ⬇ Import
              </button>
            </div>
          </div>

          {/* Right empty area */}
          <div className="flex-1 bg-slate-800 border border-slate-700 rounded" />
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-700 flex justify-end">
          <button className="px-6 py-2 bg-slate-700 border border-slate-600 text-sm hover:bg-slate-600">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
