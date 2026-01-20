import  { useState } from "react";
import { X, User, Users, LogOut, AlertCircle, Check } from "lucide-react";
import { useNavigate } from "react-router";

export default function EndOfDayModal() {
  const [activeTab, setActiveTab] = useState("end-of-day");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
const navigate = useNavigate()
  const options = [
    { id: "cash-out", label: "Cash out", icon: User },
    { id: "cash-out-all", label: "Cash out all users", icon: Users },
    { id: "close-register", label: "Close register", icon: LogOut },
  ];

  return (
    <div className="min-h-screen bg-slate-950 w-screen flex p-4 font-sans text-slate-200">
      {/* Modal Container */}
      <div className="w-full  bg-slate-900 border border-slate-700 shadow-2xl rounded-sm overflow-hidden flex flex-col ">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700">
          <h2 className="text-lg font-medium text-slate-100">End of day</h2>
          <button className="text-slate-400 hover:text-white transition-colors" onClick={() => {
            navigate(-1)
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Alert Bar */}
        <div className="bg-red-500/90 text-white px-4 py-2 flex items-center gap-3 text-sm">
          <AlertCircle size={18} className="shrink-0" />
          <span>
            Printer is disabled or not selected. Reports may not be printed.
          </span>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 bg-slate-800/30">
          <button
            onClick={() => setActiveTab("end-of-day")}
            className={`px-6 py-3 text-sm font-medium transition-colors relative ${
              activeTab === "end-of-day"
                ? "text-blue-400 bg-slate-800/50"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
            }`}
          >
            End of day
            {activeTab === "end-of-day" && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-400"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-6 py-3 text-sm font-medium transition-colors relative ${
              activeTab === "history"
                ? "text-blue-400 bg-slate-800/50"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
            }`}
          >
            History
            {activeTab === "history" && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-400"></div>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 flex flex-col">
          <div className="text-sm text-slate-300 mb-4">
            Select cash out option
          </div>

          <div className="flex justify-between items-start gap-4">
            {/* Left Options */}
            <div className="flex gap-4">
              {options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedOption(option.id)}
                  className={`w-32 h-32 border rounded-sm flex flex-col items-center justify-center gap-3 transition-all ${
                    selectedOption === option.id
                      ? "bg-blue-500/20 border-blue-500 text-blue-400"
                      : "bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-800 hover:border-slate-500"
                  }`}
                >
                  <option.icon size={48} strokeWidth={1.5} />
                  <span className="text-xs font-medium">{option.label}</span>
                </button>
              ))}
            </div>

            {/* Right Option (Report) */}
            <button
              onClick={() => setSelectedOption("report")}
              className={`w-32 h-32 border rounded-sm flex flex-col items-center justify-center gap-3 transition-all ${
                selectedOption === "report"
                  ? "bg-blue-500/20 border-blue-500 text-blue-400"
                  : "bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-800 hover:border-slate-500"
              }`}
            >
              <X size={64} strokeWidth={2.5} />
              <span className="text-xs font-medium uppercase">Report</span>
            </button>
          </div>

          {/* Center Message */}
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center mt-8">
            <p className="text-lg font-medium mb-1">
              Cash out option not selected
            </p>
            <p className="text-sm">
              Choose one of the above listed options to continue
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-700 flex justify-end gap-3 bg-slate-800/50">
          <button
            disabled={!selectedOption}
            className={`px-6 py-2 text-sm rounded-sm flex items-center gap-2 transition-colors ${
              selectedOption
                ? "bg-slate-700 text-white hover:bg-slate-600"
                : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
            }`}
          >
            <Check size={16} />
            <span>Continue</span>
          </button>
          <button className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-sm transition-colors flex items-center gap-2">
            <X size={16} />
            <span>Cancel</span>
          </button>
        </div>
      </div>
    </div>
  );
}
