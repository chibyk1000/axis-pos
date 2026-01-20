"use client";

import { ArrowDown, ArrowUp, X, Save, Archive } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

export default function CashInOut() {
  const [mode, setMode] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState("0");
  const [description, setDescription] = useState("");
  const navigate =  useNavigate()

  return (
    <div className="h-screen w-screen bg-slate-800 text-slate-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
        <h1 className="text-sm font-medium">Cash In / Out</h1>
        <button
          className="hover:text-white"
          onClick={() => {
            navigate(-1);
          }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Top actions */}
      <div className="flex items-start justify-between px-4 py-4">
        <div className="flex gap-3">
          <ActionTile
            active={mode === "in"}
            label="Add cash"
            icon={<ArrowDown className="w-6 h-6" />}
            onClick={() => setMode("in")}
            activeColor="bg-sky-500"
          />

          <ActionTile
            active={mode === "out"}
            label="Remove cash"
            icon={<ArrowUp className="w-6 h-6" />}
            onClick={() => setMode("out")}
          />
        </div>

        <button className="flex flex-col items-center justify-center w-28 h-24 border border-slate-600 hover:border-slate-400 transition">
          <Archive className="w-8 h-8 mb-2" />
          <span className="text-xs">Cash drawer</span>
        </button>
      </div>

      {/* Form */}
      <div className="px-4 space-y-4">
        <div className="w-40">
          <label className="text-xs text-slate-400">Amount</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 focus:border-sky-500 outline-none px-2 py-1 text-right text-lg"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter the reason for adding or removing cash..."
            className="w-full bg-slate-900 border border-slate-600 focus:border-sky-500 outline-none px-3 py-2 h-20 resize-none text-sm"
          />
        </div>
      </div>

      {/* Entries */}
      <div className="flex-1 px-4 mt-6">
        <div className="text-sm mb-2">Cash entries (0)</div>

        <div className="border border-slate-700 h-full flex items-center justify-center text-slate-500 text-sm">
          No records
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-slate-700 bg-slate-900">
        <button className="px-6 py-2 bg-slate-600 text-slate-300 cursor-not-allowed flex items-center gap-2">
          <Save className="w-4 h-4" />
          Save
        </button>

        <button className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white flex items-center gap-2">
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ---------- Components ---------- */

function ActionTile({
  active,
  label,
  icon,
  onClick,
  activeColor = "bg-slate-700",
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  activeColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-28 h-24 flex flex-col items-center justify-center border transition
        ${
          active
            ? `${activeColor} border-transparent text-white`
            : "border-slate-600 hover:border-slate-400"
        }`}
    >
      {icon}
      <span className="text-xs mt-2">{label}</span>
    </button>
  );
}
