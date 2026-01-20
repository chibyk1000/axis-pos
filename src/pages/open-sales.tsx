"use client";

import { EyeOff, X } from "lucide-react";
import { useNavigate } from "react-router";

export default function ViewOpenSales() {
    const navigate = useNavigate();
  return (
    <div className="h-screen w-screen bg-slate-800 text-slate-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
        <h1 className="text-sm font-medium">View open sales</h1>
        <button
          className="hover:text-white"
          onClick={() => {
            navigate(-1);
          }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <EyeOff className="w-16 h-16 text-slate-500" />
        <span className="text-sm text-slate-300">No open sales</span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700 bg-slate-900">
        <div className="text-sm font-medium">
          TOTAL AMOUNT: <span className="text-sky-400 ml-1">0.00</span>
        </div>

        <button className="px-6 py-2 border border-slate-600 hover:border-slate-400 bg-slate-800 text-sm">
          Close
        </button>
      </div>
    </div>
  );
}
