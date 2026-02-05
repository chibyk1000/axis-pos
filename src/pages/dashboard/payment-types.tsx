import { useState } from "react";

import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  HelpCircle,
  Check,
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

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-100">
      {/* Toolbar */}
      <PaymentTypeDrawer
        open={drawerOpen}
        setOpen={setDrawerOpen}
        initialData={selected}
        onSave={handleSave}
      />
      <div className="border-b border-slate-800 px-6 py-4 flex items-center gap-2 bg-slate-900">
        <button
          onClick={() => refetch()}
          className="
            flex items-center gap-2 px-3 py-2 rounded-md
            text-slate-400
            hover:bg-slate-800 hover:text-slate-100
            active:bg-slate-700
            transition-colors
          "
        >
          <RefreshCw
            className={`w-5 h-5 ${isFetching ? "animate-spin" : ""}`}
          />
          <span className="text-sm">Refresh</span>
        </button>

        <button
          onClick={() => {
            setDrawerOpen(true);
          }}
          className="
            flex items-center gap-2 px-3 py-2 rounded-md
            text-slate-400
            hover:bg-slate-800 hover:text-slate-100
            active:bg-slate-700
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
            text-slate-400
            hover:bg-slate-800 hover:text-slate-100
            active:bg-slate-700
            transition-colors
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
            text-slate-400
            hover:bg-slate-800 hover:text-red-400
            active:bg-slate-700
            transition-colors
          "
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-sm">Delete</span>
        </button>

        <div className="flex-1" />

        <button
          className="
            flex items-center gap-2 px-3 py-2 rounded-md
            text-slate-400
            hover:bg-slate-800 hover:text-slate-100
            active:bg-slate-700
            transition-colors
          "
        >
          <HelpCircle className="w-5 h-5" />
          <span className="text-sm">Help</span>
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="border border-slate-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900">
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
                    className="px-4 py-3 text-xs font-semibold text-slate-400 text-left"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {paymentTypes.map((type) => (
                <tr
                  key={type.id}
                  onClick={() => setActiveRow(type.id)}
                  className={`cursor-pointer ${activeRow === type.id ? "bg-slate-700" : ""}`}
                >
                  <td>{type.name}</td>
                  <td>{type.position}</td>
                  <td>{type.code || "-"}</td>
                  {[
                    type.enabled,
                    type.quickPayment,
                    type.customerRequired,
                    type.changeAllowed,
                    type.markTransactionAsPaid,
                    type.printReceipt,
                  ].map((v, i) => (
                    <td key={i} className="text-center">
                      {v && <Check className="w-4 h-4 mx-auto text-primary" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>

            <tbody>
              {/* {paymentTypes.map((type, index) => {
                return (
                  <tr
                    key={index}
                    onClick={() => setActiveRow(type.id)}
                    className={`
                      border-b border-slate-800 cursor-pointer transition-colors
                      hover:bg-slate-800
                      ${isActive ? "bg-slate-700" : ""}
                    `}
                  >
                   
                    <td className="relative px-4 py-3 text-sm">
                      {isActive && (
                        <span className="absolute left-0 top-0 h-full w-1 bg-primary" />
                      )}
                      {type.name}
                    </td>

                    <td className="px-4 py-3 text-sm">{type.position}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {type.code || "-"}
                    </td>

                    {[
                      type.enabled,
                      type.quickPayment,
                      type.customerRequired,
                      type.changeAllowed,
                      type.markTransactionAsPaid,
                      type.printReceipt,
                    ].map((value, i) => (
                      <td key={i} className="px-4 py-3 text-center">
                        {value && (
                          <Check className="w-5 h-5 text-primary mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })} */}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
