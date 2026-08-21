"use client";

import { useState, useMemo } from "react";
import {
  X,
  User,
  Calendar,
  Clock,
  Trash2,
  Printer,
  ArrowRight,
  Receipt,
  Package,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useDispatch } from "react-redux";
import { useDocuments, useDeleteDocument } from "@/hooks/controllers/documents";
import { useAuth } from "@/providers/auth-provider";
import {
  setItems,
  setSelectedCustomer,
  setOrderNote,
  setContinuePaymentDoc,
  type CartItem,
} from "@/store/posSlice";
import { toast } from "react-toastify";
import { format } from "date-fns";

export default function ViewOpenSales() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { data: documents = [] } = useDocuments();
  const deleteDocument = useDeleteDocument();
  const { user } = useAuth();

  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const openSales = useMemo(
    () => documents.filter((d) => d.status === "draft"),
    [documents],
  );

  const selectedSale = useMemo(
    () => openSales.find((s) => s.id === selectedSaleId) ?? null,
    [openSales, selectedSaleId],
  );

  const totalAmount = useMemo(
    () => openSales.reduce((sum, s) => sum + (s.total || 0), 0),
    [openSales],
  );

  // Group sales by user / cashier
  const groupedSales = useMemo(() => {
    if (openSales.length === 0) return {};
    return {
      [user?.username || "Admin"]: {
        sales: openSales,
        total: totalAmount,
      },
    };
  }, [openSales, user, totalAmount]);

  // Load sale into POS
  const handleOpenInPos = (sale: any) => {
    if (!sale) return;

    const cartItems: CartItem[] = (sale.items || []).map((i: any) => {
      const unitPrice =
        i.price ??
        (i.priceBeforeTax
          ? Number((i.priceBeforeTax * (1 + (i.taxRate || 0) / 100)).toFixed(2))
          : i.quantity > 0
            ? Number((i.total / i.quantity).toFixed(2))
            : 0);

      return {
        id: i.productId || i.id,
        title: i.name || "Product",
        cost: unitPrice,
        unit: i.unit || "pcs",
        qty: i.quantity || 1,
        discount: i.discount || 0,
        taxRate: i.taxRate || 0,
        priceLabel: "Retail" as const,
        availablePrices: [
          {
            label: "Retail" as const,
            price: unitPrice,
          },
        ],
      };
    });

    dispatch(setItems(cartItems));

    if (sale.customer) {
      dispatch(setSelectedCustomer(sale.customer));
    } else {
      dispatch(setSelectedCustomer(null));
    }

    if (sale.note) {
      dispatch(setOrderNote(sale.note));
    } else {
      dispatch(setOrderNote(""));
    }

    dispatch(setContinuePaymentDoc(sale));
    toast.success(`Loaded sale #${sale.number || sale.id.slice(0, 8)} into POS`);
    navigate("/pos");
  };

  const handleDeleteSale = async () => {
    if (!selectedSale) return;
    try {
      await deleteDocument.mutateAsync(selectedSale.id);
      toast.success("Draft sale deleted");
      setSelectedSaleId(null);
      setShowDeleteConfirm(false);
    } catch (err) {
      toast.error("Failed to delete draft sale");
    }
  };

  return (
    <div className="h-screen w-screen bg-[#1a1a1a] text-white flex flex-col font-sans select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#252525] border-b border-[#333] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <h1 className="text-sm font-semibold tracking-wide uppercase">
            View Open Sales
          </h1>
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-[#333] text-stone-300 font-mono">
            {openSales.length} open
          </span>
        </div>
        <button
          className="text-stone-400 hover:text-white p-1 rounded-md hover:bg-[#333] transition-colors"
          onClick={() => navigate(-1)}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Body with Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sales Grid Area */}
        <div className="flex-1 p-6 overflow-y-auto bg-[#1a1a1a] scrollbar-thin">
          {openSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-stone-500">
              <Receipt className="w-12 h-12 opacity-30 text-amber-500" />
              <span className="text-sm font-medium">No open sales found</span>
              <p className="text-xs text-stone-600">
                Sales saved as draft in the POS will appear here.
              </p>
            </div>
          ) : (
            Object.entries(groupedSales).map(([groupName, group]) => (
              <div key={groupName} className="mb-8">
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-stone-400" />
                    <h2 className="text-sm font-bold text-stone-100 uppercase tracking-wide">
                      {groupName}
                    </h2>
                  </div>
                  <div className="h-[1px] flex-1 bg-[#333]" />
                  <span className="text-sm font-bold tabular-nums text-amber-400">
                    ₦
                    {group.total.toLocaleString("en-NG", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
                  {group.sales.map((sale) => {
                    const isSelected = selectedSaleId === sale.id;
                    const itemsCount = sale.items?.length || 0;

                    return (
                      <div
                        key={sale.id}
                        className={`relative rounded-xl p-3.5 flex flex-col justify-between border cursor-pointer transition-all duration-150 active:scale-95 group h-32 ${
                          isSelected
                            ? "bg-[#2d2922] border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500"
                            : "bg-[#252525] border-[#383838] hover:border-stone-500 hover:bg-[#2a2a2a]"
                        }`}
                        onClick={() => setSelectedSaleId(sale.id)}
                        onDoubleClick={() => handleOpenInPos(sale)}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span
                            className={`text-xs font-bold leading-tight truncate w-full ${
                              isSelected
                                ? "text-amber-400"
                                : "text-stone-100 group-hover:text-stone-50"
                            }`}
                          >
                            {sale.customer?.name || "Walk-in"}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-stone-400">
                            <span>
                              #{sale.number || sale.id.slice(0, 6)}
                            </span>
                            <span className="tabular-nums">
                              {itemsCount} {itemsCount === 1 ? "item" : "items"}
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between pt-1 border-t border-[#383838]/60">
                            <span className="text-[10px] text-stone-500">
                              Total
                            </span>
                            <span
                              className={`text-xs font-bold tabular-nums ${
                                isSelected ? "text-amber-400" : "text-stone-200"
                              }`}
                            >
                              ₦
                              {(sale.total || 0).toLocaleString("en-NG", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* DETAILS SIDEBAR */}
        {selectedSale && (
          <aside className="w-80 sm:w-96 bg-[#222222] border-l border-[#333] flex flex-col h-full shadow-2xl shrink-0 animate-in slide-in-from-right duration-200">
            {/* Sidebar Header */}
            <div className="p-4 bg-[#282828] border-b border-[#383838] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
                    Draft Sale
                  </span>
                  <h3 className="text-sm font-bold text-stone-100">
                    Doc #{selectedSale.number || selectedSale.id.slice(0, 8)}
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-stone-400 mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-stone-500" />
                    {selectedSale.date
                      ? format(new Date(selectedSale.date), "dd MMM yyyy")
                      : "Today"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-stone-500" />
                    {selectedSale.date
                      ? format(new Date(selectedSale.date), "HH:mm")
                      : "Now"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedSaleId(null)}
                className="text-stone-400 hover:text-white p-1 rounded hover:bg-[#333] transition-colors"
                title="Close Details"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Customer Info Card */}
            <div className="p-3 bg-[#1e1e1e] border-b border-[#333] flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-stone-100 truncate">
                  {selectedSale.customer?.name || "Walk-in Customer"}
                </p>
                <p className="text-[11px] text-stone-400 truncate">
                  {selectedSale.customer?.phone ||
                    selectedSale.customer?.email ||
                    "General customer"}
                </p>
              </div>
            </div>

            {/* Items List (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 scrollbar-thin">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-stone-400 pb-1">
                <span>Items ({selectedSale.items?.length || 0})</span>
                <span>Amount</span>
              </div>

              {(selectedSale.items || []).map((item: any, idx: number) => {
                const qty = item.quantity || 1;
                const unitPrice =
                  item.price ??
                  (item.priceBeforeTax
                    ? item.priceBeforeTax * (1 + (item.taxRate || 0) / 100)
                    : item.total / qty);
                const lineTotal = item.total ?? qty * unitPrice;

                return (
                  <div
                    key={item.id || idx}
                    className="p-2.5 rounded-lg bg-[#292929] border border-[#383838] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <Package className="w-3.5 h-3.5 text-stone-400 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-stone-100 truncate">
                          {item.name || "Product"}
                        </p>
                        <p className="text-[11px] text-stone-400 tabular-nums">
                          {qty} {item.unit || "pcs"} × ₦
                          {unitPrice.toLocaleString("en-NG", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-semibold tabular-nums text-stone-100">
                        ₦
                        {lineTotal.toLocaleString("en-NG", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}

              {(!selectedSale.items || selectedSale.items.length === 0) && (
                <div className="py-6 text-center text-xs text-stone-500 italic">
                  No line items in this draft
                </div>
              )}

              {(selectedSale as any).note && (
                <div className="mt-3 p-2.5 rounded-lg bg-[#1e1e1e] border border-[#333] text-xs">
                  <span className="text-[10px] font-semibold uppercase text-stone-400 block mb-1">
                    Note:
                  </span>
                  <p className="text-stone-300 italic">{(selectedSale as any).note}</p>
                </div>
              )}
            </div>

            {/* Financial Summary */}
            <div className="p-4 bg-[#1e1e1e] border-t border-[#333] space-y-1.5 text-xs">
              <div className="flex justify-between text-stone-400">
                <span>Subtotal before tax:</span>
                <span className="tabular-nums font-mono">
                  ₦
                  {(selectedSale.totalBeforeTax || 0).toLocaleString("en-NG", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>

              {(selectedSale.taxTotal || 0) > 0 && (
                <div className="flex justify-between text-stone-400">
                  <span>Tax:</span>
                  <span className="tabular-nums font-mono">
                    ₦
                    {(selectedSale.taxTotal || 0).toLocaleString("en-NG", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-sm font-bold text-stone-100 pt-2 border-t border-[#333]">
                <span>Total Amount:</span>
                <span className="tabular-nums text-amber-400 font-mono text-base">
                  ₦
                  {(selectedSale.total || 0).toLocaleString("en-NG", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 bg-[#252525] border-t border-[#383838] space-y-2">
              <button
                onClick={() => handleOpenInPos(selectedSale)}
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
              >
                <span>Resume in POS</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2 px-3 bg-[#333] hover:bg-[#3d3d3d] text-stone-200 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-[#444]"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>

                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="py-2 px-3 bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-red-800/50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Discard</span>
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3.5 bg-[#252525] border-t border-[#333] flex items-center justify-between shrink-0">
        <div className="text-sm font-bold uppercase tracking-tight flex items-center gap-2">
          <span className="text-stone-400">TOTAL OPEN AMOUNT:</span>
          <span className="text-amber-400 text-base tabular-nums">
            ₦
            {totalAmount.toLocaleString("en-NG", {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="px-8 py-1.5 border border-[#444] bg-[#2e2e2e] hover:bg-[#3a3a3a] text-xs font-medium text-stone-200 rounded-md transition-colors"
        >
          Close
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-[#242424] border border-[#383838] rounded-xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-stone-100">
                Discard Open Sale?
              </h3>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed">
              Are you sure you want to delete this open sale? This action cannot
              be undone.
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-1.5 rounded-lg bg-[#333] hover:bg-[#404040] text-xs font-medium text-stone-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSale}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
