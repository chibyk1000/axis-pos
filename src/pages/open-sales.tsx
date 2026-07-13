"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { useNavigate } from "react-router";
import { useDocuments } from "@/hooks/controllers/documents";
import { useAuth } from "@/providers/auth-provider";

export default function ViewOpenSales() {
  const navigate = useNavigate();
  const { data: documents = [] } = useDocuments();
  const { user } = useAuth();

  const openSales = useMemo(
    () => documents.filter((d) => d.status === "draft"),
    [documents],
  );

  const totalAmount = useMemo(
    () => openSales.reduce((sum, s) => sum + (s.total || 0), 0),
    [openSales],
  );

  // Group sales by user (for now grouping all by current user as per screenshot)
  const groupedSales = useMemo(() => {
    if (openSales.length === 0) return {};
    return {
      [user?.username || "Admin"]: {
        sales: openSales,
        total: totalAmount,
      },
    };
  }, [openSales, user, totalAmount]);

  return (
    <div className="h-screen w-screen bg-[#1a1a1a] text-white flex flex-col font-sans select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#252525] border-b border-[#333]">
        <h1 className="text-sm font-medium">View open sales</h1>
        <button
          className="text-stone-400 hover:text-white transition-colors"
          onClick={() => navigate(-1)}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto bg-[#1a1a1a]">
        {openSales.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-stone-500">
            <span className="text-sm italic">No open sales</span>
          </div>
        ) : (
          Object.entries(groupedSales).map(([groupName, group]) => (
            <div key={groupName} className="mb-8">
              <div className="flex items-center gap-4 mb-5">
                <h2 className="text-sm font-bold whitespace-nowrap text-stone-100">
                  {groupName}
                </h2>
                <div className="h-[1px] flex-1 bg-[#333]"></div>
                <span className="text-sm font-bold tabular-nums text-stone-100">
                  {group.total.toLocaleString("en-NG", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>

              <div className="flex flex-wrap gap-4">
                {group.sales.map((sale) => (
                  <div
                    key={sale.id}
                    className="bg-[#262626] border border-[#333] w-28 h-28 p-3 flex flex-col justify-center items-center gap-2 hover:border-[#38bdf8] cursor-pointer transition-all active:scale-95 group"
                    onClick={() => {
                      // Logic to restore sale could go here
                    }}
                  >
                    <span className="text-sm font-bold text-stone-100 group-hover:text-[#38bdf8] text-center break-words w-full">
                      {sale.customer?.name || "Walk-in"}
                    </span>
                    <span className="text-[11px] text-stone-400 tabular-nums">
                      {sale.total?.toLocaleString("en-NG", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-[#1a1a1a] border-t border-[#333] flex items-center justify-between">
        <div className="text-lg font-bold uppercase tracking-tight">
          TOTAL AMOUNT:{" "}
          <span className="text-[#38bdf8] ml-2">
            {totalAmount.toLocaleString("en-NG", {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="px-10 py-2 border border-[#444] bg-[#262626] hover:bg-[#333] text-xs font-medium text-stone-300 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
