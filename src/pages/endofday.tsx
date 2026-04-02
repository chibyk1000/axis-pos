import { useState } from "react";
import {
  X,
  User,
  Users,
  LogOut,
  AlertCircle,
  Check,
  RefreshCw,
  TrendingUp,
  FileText,
  DollarSign,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { useNavigate } from "react-router";
import { format } from "date-fns";
import { useEodSummary } from "@/hooks/controllers/pos";

/* -------------------------------------------------------------------------- */
/*                            SUMMARY CARD                                    */
/* -------------------------------------------------------------------------- */

function SummaryCard({
  icon: Icon,
  label,
  value,
  color = "text-slate-200",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-sm px-4 py-3 flex items-center gap-3">
      <Icon className="w-5 h-5 text-slate-500 shrink-0" />
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className={`text-sm font-mono font-medium ${color}`}>{value}</p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                            MAIN COMPONENT                                  */
/* -------------------------------------------------------------------------- */

const EOD_OPTIONS = [
  { id: "cash-out", label: "Cash out", Icon: User },
  { id: "cash-out-all", label: "Cash out all users", Icon: Users },
  { id: "close-register", label: "Close register", Icon: LogOut },
];

export default function EndOfDayModal() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"end-of-day" | "history">(
    "end-of-day",
  );
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const { data: summary, isLoading, refetch } = useEodSummary();

  function handleContinue() {
    if (!selectedOption) return;
    // TODO: dispatch the actual action based on selectedOption
    // e.g. "cash-out" → clear current user's cash session
    //      "close-register" → lock the POS
    setConfirmed(true);
  }

  return (
    <div className="min-h-screen bg-slate-950 w-screen flex p-4 font-sans text-slate-200">
      <div className="w-full bg-slate-900 border border-slate-700 shadow-2xl rounded-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700">
          <h2 className="text-base font-medium text-slate-100">End of day</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <RefreshCw size={15} />
            </button>
            <button
              className="text-slate-400 hover:text-white transition-colors"
              onClick={() => navigate(-1)}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Alert bar */}
        <div className="bg-red-500/90 text-white px-4 py-2 flex items-center gap-3 text-xs shrink-0">
          <AlertCircle size={15} className="shrink-0" />
          Printer is disabled or not selected. Reports may not be printed.
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 bg-slate-800/30 shrink-0">
          {(["end-of-day", "history"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium transition-colors relative capitalize ${
                activeTab === tab
                  ? "text-sky-400 bg-slate-800/50"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
              }`}
            >
              {tab === "end-of-day" ? "End of day" : "History"}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-sky-400" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {activeTab === "end-of-day" && (
            <div className="p-5 flex flex-col gap-5">
              {/* Today's summary */}
              <div>
                <p className="text-xs text-slate-400 mb-3">
                  Today's summary — {format(new Date(), "dd MMM yyyy")}
                </p>

                {isLoading ? (
                  <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Loading
                    summary…
                  </div>
                ) : summary ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <SummaryCard
                      icon={TrendingUp}
                      label="Total sales"
                      value={summary.totalSales.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      color="text-emerald-400"
                    />
                    <SummaryCard
                      icon={FileText}
                      label="Documents"
                      value={String(summary.totalDocuments)}
                    />
                    <SummaryCard
                      icon={DollarSign}
                      label="Tax collected"
                      value={summary.totalTax.toFixed(2)}
                    />
                    <SummaryCard
                      icon={ArrowDown}
                      label="Cash in"
                      value={summary.cashIn.toFixed(2)}
                      color="text-sky-400"
                    />
                    <SummaryCard
                      icon={ArrowUp}
                      label="Cash out"
                      value={summary.cashOut.toFixed(2)}
                      color="text-amber-400"
                    />
                    <SummaryCard
                      icon={DollarSign}
                      label="Net cash"
                      value={summary.netCash.toFixed(2)}
                      color={
                        summary.netCash >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }
                    />
                  </div>
                ) : null}
              </div>

              {/* Cash-out option selector */}
              <div>
                <p className="text-sm text-slate-300 mb-3">
                  Select cash out option
                </p>

                <div className="flex flex-wrap gap-3">
                  {EOD_OPTIONS.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      onClick={() => {
                        setSelectedOption(id);
                        setConfirmed(false);
                      }}
                      className={`w-32 h-28 border rounded-sm flex flex-col items-center justify-center gap-2 transition-all ${
                        selectedOption === id
                          ? "bg-sky-500/20 border-sky-500 text-sky-300"
                          : "bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-800 hover:border-slate-500"
                      }`}
                    >
                      <Icon size={40} strokeWidth={1.5} />
                      <span className="text-xs font-medium text-center leading-tight">
                        {label}
                      </span>
                    </button>
                  ))}

                  {/* Report button */}
                  <button
                    onClick={() => {
                      setSelectedOption("report");
                      setConfirmed(false);
                    }}
                    className={`w-32 h-28 border rounded-sm flex flex-col items-center justify-center gap-2 transition-all ${
                      selectedOption === "report"
                        ? "bg-sky-500/20 border-sky-500 text-sky-300"
                        : "bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-800 hover:border-slate-500"
                    }`}
                  >
                    <FileText size={40} strokeWidth={1.5} />
                    <span className="text-xs font-medium uppercase">
                      Report only
                    </span>
                  </button>
                </div>
              </div>

              {/* Prompt / confirmed state */}
              {confirmed ? (
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <Check className="w-4 h-4" />
                  {selectedOption === "cash-out" &&
                    "Current user cashed out successfully."}
                  {selectedOption === "cash-out-all" &&
                    "All users cashed out successfully."}
                  {selectedOption === "close-register" && "Register closed."}
                  {selectedOption === "report" && "Report generated."}
                </div>
              ) : !selectedOption ? (
                <div className="text-slate-500 text-sm text-center py-4">
                  <p className="font-medium mb-1">
                    Cash out option not selected
                  </p>
                  <p className="text-xs">
                    Choose one of the above options to continue
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {activeTab === "history" && (
            <div className="p-5">
              <p className="text-xs text-slate-400 mb-3">End-of-day history</p>
              {/* TODO: persist EOD runs to a table and list them here */}
              <div className="border border-slate-700 rounded-sm flex items-center justify-center py-12 text-slate-600 text-sm">
                No history recorded yet
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-700 flex justify-end gap-3 bg-slate-800/50 shrink-0">
          <button
            disabled={!selectedOption || confirmed}
            onClick={handleContinue}
            className={`px-6 py-2 text-sm rounded-sm flex items-center gap-2 transition-colors ${
              selectedOption && !confirmed
                ? "bg-sky-600 hover:bg-sky-500 text-white"
                : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
            }`}
          >
            <Check size={15} />
            Continue
          </button>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-sm transition-colors flex items-center gap-2"
          >
            <X size={15} />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
