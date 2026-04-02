import { useState } from "react";
import { X, RefreshCw, EyeOff, Info, Check, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router";
import { nanoid } from "nanoid";
import { format } from "date-fns";
import { useCustomers } from "@/hooks/controllers/customers";
import { usePaymentTypes } from "@/hooks/controllers/paymentTypes";
import {
  useCustomerBalance,
  useUnpaidDocuments,
  useCreditPaymentHistory,
  useRecordCreditPayment,
} from "@/hooks/controllers/pos";

/* -------------------------------------------------------------------------- */

export default function CreditPaymentsModal() {
  const navigate = useNavigate();

  const [customerId, setCustomerId] = useState("");
  const [paymentTypeId, setPaymentTypeId] = useState("");
  const [amount, setAmount] = useState("0");
  const [note, setNote] = useState("");
  const [savedMsg, setSavedMsg] = useState(false);

  // Existing hooks
  const { data: customers = [] } = useCustomers();
  const { data: paymentTypes = [] } = usePaymentTypes();

  // Data driven by selected customer
  const { data: balance = 0, refetch: refetchBalance } =
    useCustomerBalance(customerId);
  const { data: unpaidDocs = [], refetch: refetchUnpaid } =
    useUnpaidDocuments(customerId);
  const { data: history = [], refetch: refetchHistory } =
    useCreditPaymentHistory(customerId);

  const recordMutation = useRecordCreditPayment();

  const amountNum = parseFloat(amount) || 0;
  const canSubmit = !!customerId && !!paymentTypeId && amountNum > 0;
  const totalUnpaid = unpaidDocs.reduce((s, d) => s + (d.total ?? 0), 0);

  function handleRefreshAll() {
    refetchBalance();
    refetchUnpaid();
    refetchHistory();
  }

  function handleOk() {
    if (!canSubmit) return;
    recordMutation.mutate(
      {
        id: nanoid(),
        customerId,
        paymentTypeId,
        amount: amountNum,
        note: note.trim() || null,
        createdAt: new Date(),
      },
      {
        onSuccess: () => {
          setAmount("0");
          setNote("");
          setSavedMsg(true);
          setTimeout(() => setSavedMsg(false), 2500);
        },
      },
    );
  }

  return (
    <div className="min-h-screen w-screen bg-slate-950 flex p-4 font-sans text-slate-200">
      <div className="w-full bg-slate-900 border border-slate-700 shadow-2xl rounded-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700">
          <h2 className="text-base font-medium text-slate-100">
            Credit payments
          </h2>
          <button
            className="text-slate-400 hover:text-white transition-colors"
            onClick={() => navigate(-1)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Success bar */}
        {savedMsg && (
          <div className="bg-emerald-600/90 text-white px-4 py-2 flex items-center gap-2 text-sm shrink-0">
            <Check size={15} />
            Payment of {amountNum.toFixed(2)} recorded successfully
          </div>
        )}

        {/* Content */}
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
          {/* Top section */}
          <div className="flex flex-col md:flex-row gap-4 min-h-[260px]">
            {/* Left: form */}
            <div className="w-full md:w-1/3 flex flex-col gap-3">
              {/* Customer */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">Customer</label>
                <select
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(e.target.value);
                    setAmount("0");
                  }}
                  className="w-full bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-sm px-3 py-2 focus:outline-none focus:border-sky-500"
                >
                  <option value="">Select customer…</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment type */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">Payment type</label>
                <select
                  value={paymentTypeId}
                  onChange={(e) => setPaymentTypeId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-sm px-3 py-2 focus:outline-none focus:border-sky-500"
                >
                  <option value="">Select type…</option>
                  {paymentTypes.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">Amount</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-sm px-3 py-2 focus:outline-none focus:border-sky-500 text-right font-mono"
                />
              </div>

              {/* Note */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Reference, memo…"
                  className="w-full bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-sm px-3 py-2 focus:outline-none focus:border-sky-500 placeholder:text-slate-600"
                />
              </div>

              {/* Refresh */}
              <button
                onClick={handleRefreshAll}
                disabled={!customerId}
                className="flex items-center justify-center gap-2 w-full py-2 border border-slate-600 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-sm rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <RefreshCw size={13} />
                Load unpaid documents
              </button>
            </div>

            {/* Right: summary */}
            <div className="w-full md:w-2/3 flex flex-col">
              <div className="text-xs text-slate-400 mb-1">Summary</div>

              {!customerId ? (
                <div className="flex-1 bg-slate-800/50 border border-slate-700 rounded-sm flex flex-col items-center justify-center text-slate-500 gap-3">
                  <EyeOff size={40} strokeWidth={1.5} />
                  <div className="text-center text-sm">
                    <p>No customer selected.</p>
                    <p className="text-xs mt-0.5">
                      Select a customer to view their balance.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 bg-slate-800/50 border border-slate-700 rounded-sm overflow-auto">
                  {/* Balance row */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                    <span className="text-xs text-slate-400">
                      Current balance
                    </span>
                    <span
                      className={`font-mono text-sm font-medium ${balance >= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {balance >= 0 ? "+" : ""}
                      {balance.toFixed(2)}
                    </span>
                  </div>

                  {/* Unpaid docs */}
                  <div className="px-4 py-2 border-b border-slate-700">
                    <p className="text-xs text-slate-400 mb-2">
                      Unpaid documents ({unpaidDocs.length})
                      {unpaidDocs.length > 0 && (
                        <span className="ml-2 text-red-400 font-mono">
                          −{totalUnpaid.toFixed(2)}
                        </span>
                      )}
                    </p>
                    {unpaidDocs.length === 0 ? (
                      <p className="text-xs text-slate-600">
                        No unpaid documents
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {unpaidDocs.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex justify-between text-xs"
                          >
                            <span className="text-slate-400 font-mono">
                              {doc.number}
                            </span>
                            <span className="text-slate-300">
                              {(doc.total ?? 0).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Payment history */}
                  <div className="px-4 py-2">
                    <p className="text-xs text-slate-400 mb-2">
                      Recent payments
                    </p>
                    {history.length === 0 ? (
                      <p className="text-xs text-slate-600">
                        No payment history
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {history.slice(0, 5).map((p) => (
                          <div
                            key={p.id}
                            className="flex justify-between text-xs"
                          >
                            <span className="text-slate-500">
                              {format(
                                new Date(p.createdAt),
                                "dd/MM/yyyy HH:mm",
                              )}
                            </span>
                            <span className="text-emerald-400 font-mono">
                              +{p.amount.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Info banner */}
          <div className="border border-slate-700 rounded-sm bg-slate-800/30 flex items-center gap-4 px-4 py-3 text-sm text-slate-400">
            <div className="w-10 h-10 rounded-full bg-sky-600/20 border border-sky-600/30 flex items-center justify-center text-sky-400 shrink-0">
              <Info size={18} />
            </div>
            <p>
              Recording a payment increases the customer's credit balance by the
              entered amount. Use "Load unpaid documents" to see what they
              currently owe.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-700 flex justify-end gap-3 bg-slate-800/50">
          <button
            onClick={handleOk}
            disabled={!canSubmit || recordMutation.isPending}
            className="px-6 py-2 text-sm rounded-sm flex items-center gap-2 transition-colors
              bg-sky-600 hover:bg-sky-500 text-white
              disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed"
          >
            {recordMutation.isPending ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            OK
          </button>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
