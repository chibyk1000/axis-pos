import  { useState } from "react";
import { X, RefreshCw, EyeOff, Info, Check } from "lucide-react";
import { useNavigate } from "react-router";

export default function CreditPaymentsModal() {
  const [customer, setCustomer] = useState("");
  const [paymentType, setPaymentType] = useState("Cash");
  const [amount, setAmount] = useState("0");
  const [autoDistribution, setAutoDistribution] = useState(true);
  const navigate  = useNavigate()

  return (
    <div className="min-h-screen w-screen bg-slate-950 flex p-4 font-sans text-slate-200">
      {/* Modal Container */}
      <div className="w-full  bg-slate-900 border border-slate-700 shadow-2xl rounded-sm overflow-hidden flex flex-col ">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700">
          <h2 className="text-lg font-medium text-slate-100">
            Credit payments
          </h2>
          
          <button className="text-slate-400 hover:text-white transition-colors" onClick={() => {
            navigate(-1)
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
          {/* Top Section */}
          <div className="flex flex-col md:flex-row gap-4 h-1/3 min-h-[280px]">
            {/* Left Form Panel */}
            <div className="w-full md:w-1/3 flex flex-col gap-4">
              {/* Customer Select */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400 block">Customer</label>
                <div className="relative">
                  <select
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-sm px-3 py-2 focus:outline-none focus:border-blue-500 appearance-none"
                  >
                    <option value="" disabled>
                      Select customer
                    </option>
                    <option value="cust1">Customer 1</option>
                    <option value="cust2">Customer 2</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-2 h-2 fill-slate-400" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Payment Type Select */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400 block">
                  Payment type
                </label>
                <div className="relative">
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-sm px-3 py-2 focus:outline-none focus:border-blue-500 appearance-none"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Transfer">Transfer</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-2 h-2 fill-slate-400" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400 block">Amount</label>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-sm px-3 py-2 focus:outline-none focus:border-blue-500 text-right"
                />
              </div>

              {/* Automatic Distribution Toggle */}
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => setAutoDistribution(!autoDistribution)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${autoDistribution ? "bg-green-500" : "bg-slate-600"}`}
                >
                  <div
                    className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${autoDistribution ? "left-6" : "left-1"}`}
                  ></div>
                </button>
                <span className="text-sm text-slate-300">
                  Automatic distribution
                </span>
              </div>

              {/* Load Unpaid Documents Button */}
              <button className="mt-2 flex items-center justify-center gap-2 w-full py-2 border border-slate-600 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-sm rounded-sm transition-colors">
                <RefreshCw size={14} />
                <span>Load unpaid documents</span>
              </button>
            </div>

            {/* Right Summary Panel */}
            <div className="w-full md:w-2/3 flex flex-col h-full">
              <div className="text-xs text-slate-400 mb-1">Summary</div>
              <div className="flex-1 bg-slate-800/50 border border-slate-700 rounded-sm flex flex-col items-center justify-center text-slate-500 gap-3">
                <EyeOff size={48} strokeWidth={1.5} />
                <div className="text-center text-sm">
                  <p>Customer not selected.</p>
                  <p>Please select customer for reconciliation.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="flex-1 border border-slate-700 rounded-sm bg-slate-800/30 flex flex-col items-center justify-center text-slate-400 gap-4 min-h-[200px]">
            <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Info size={32} />
            </div>
            <p className="text-sm">
              Paid amount will be automatically distributed across all unpaid
              sales
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-700 flex justify-end gap-3 bg-slate-800/50">
          <button className="px-6 py-2 bg-slate-700 text-slate-400 text-sm rounded-sm flex items-center gap-2 cursor-not-allowed opacity-70">
            <Check size={16} />
            <span>OK</span>
          </button>
          <button className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-sm transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
