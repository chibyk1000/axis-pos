import { useState } from "react";

import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  HelpCircle,
  Check,
  X,
} from "lucide-react";

import {
  usePaymentTypes,
  useCreatePaymentType,
  useUpdatePaymentType,
  useDeletePaymentType,
} from "@/hooks/controllers/paymentTypes";
import { confirm } from "@tauri-apps/plugin-dialog";
import PaymentTypeDrawer from "@/components/payment-types-drawer";

export default function PaymentTypesClient() {
  const [activeRow, setActiveRow] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data: paymentTypes = [], refetch, isFetching } = usePaymentTypes();
  const createType = useCreatePaymentType();
  const updateType = useUpdatePaymentType();
  const deleteType = useDeletePaymentType();

  const selected = paymentTypes.find((p) => p.id === activeRow);

  const handleSave = async (data: any) => {
    if (selected) {
      await updateType.mutateAsync({ id: selected.id, data });
    } else {
      await createType.mutateAsync(data);
    }
    refetch();
  };

  const handleDelete = async () => {
    if (!selected) return;
    const ok = await confirm(`Delete ${selected.name}?`);
    if (!ok) return;
    await deleteType.mutateAsync(selected.id);
    setActiveRow(null);
    refetch();
  };

  // Open drawer for new entry — clear selection first
  const handleNew = () => {
    setActiveRow(null);
    setDrawerOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <PaymentTypeDrawer
        open={drawerOpen}
        setOpen={setDrawerOpen}
        initialData={selected}
        onSave={handleSave}
      />

      {/* Toolbar */}
      <div className="border-b border-slate-300 dark:border-slate-800 px-6 py-4 flex items-center gap-2 bg-slate-50 dark:bg-slate-900">
        <button
          onClick={() => refetch()}
          className="
            flex items-center gap-2 px-3 py-2 rounded-md
            text-slate-500 dark:text-slate-400
            hover:bg-white dark:bg-slate-800 hover:text-slate-900 dark:text-slate-100
            active:bg-slate-100 dark:bg-slate-700
            transition-colors
          "
        >
          <RefreshCw
            className={`w-5 h-5 ${isFetching ? "animate-spin" : ""}`}
          />
          <span className="text-sm">Refresh</span>
        </button>

        <button
          onClick={handleNew}
          className="
            flex items-center gap-2 px-3 py-2 rounded-md
            text-slate-500 dark:text-slate-400
            hover:bg-white dark:bg-slate-800 hover:text-slate-900 dark:text-slate-100
            active:bg-slate-100 dark:bg-slate-700
            transition-colors
          "
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm">New payment type</span>
        </button>

        <button
          disabled={!selected}
          onClick={() => setDrawerOpen(true)}
          className="
            flex items-center gap-2 px-3 py-2 rounded-md
            text-slate-500 dark:text-slate-400
            hover:bg-white dark:bg-slate-800 hover:text-slate-900 dark:text-slate-100
            active:bg-slate-100 dark:bg-slate-700
            transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed
          "
        >
          <Pencil className="w-5 h-5" />
          <span className="text-sm">Edit</span>
        </button>

        <button
          disabled={!selected}
          onClick={handleDelete}
          className="
            flex items-center gap-2 px-3 py-2 rounded-md
            text-slate-500 dark:text-slate-400
            hover:bg-white dark:bg-slate-800 hover:text-red-400
            active:bg-slate-100 dark:bg-slate-700
            transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed
          "
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-sm">Delete</span>
        </button>

        <div className="flex-1" />

        <button
          className="
            flex items-center gap-2 px-3 py-2 rounded-md
            text-slate-500 dark:text-slate-400
            hover:bg-white dark:bg-slate-800 hover:text-slate-900 dark:text-slate-100
            active:bg-slate-100 dark:bg-slate-700
            transition-colors
          "
        >
          <HelpCircle className="w-5 h-5" />
          <span className="text-sm">Help</span>
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="border border-slate-300 dark:border-slate-800 rounded-lg overflow-hidden p-4">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
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
                    className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-left"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {paymentTypes.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-xs text-slate-500"
                  >
                    No payment types yet. Click "New payment type" to add one.
                  </td>
                </tr>
              ) : (
                paymentTypes.map((type, index, arr) => (
                  <tr
                    key={type.id}
                    onClick={() =>
                      setActiveRow(activeRow === type.id ? null : type.id)
                    }
                    className={`cursor-pointer transition-colors
                      ${activeRow === type.id ? "bg-slate-100 dark:bg-slate-700" : "hover:bg-white dark:bg-slate-800/50"}
                      ${index === arr.length - 1 ? "" : "border-b border-slate-200 dark:border-slate-700"}`}
                  >
                    <td className="px-4 py-2.5 text-sm">
                      {activeRow === type.id && (
                        <span className="inline-block w-1 h-3 bg-sky-500 rounded mr-2 align-middle" />
                      )}
                      {type.name}
                    </td>
                    <td className="px-4 py-2.5 text-sm tabular-nums">
                      {type.position}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-500 dark:text-slate-400">
                      {type.code || "—"}
                    </td>
                    {[
                      type.enabled,
                      type.quickPayment,
                      type.customerRequired,
                      type.changeAllowed,
                      type.markTransactionAsPaid,
                      type.printReceipt,
                    ].map((v, i) => (
                      <td key={i} className="px-4 py-2.5 text-center">
                        {v ? (
                          <Check className="w-4 h-4 mx-auto text-emerald-400" />
                        ) : (
                          <X className="w-4 h-4 mx-auto text-slate-600" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
