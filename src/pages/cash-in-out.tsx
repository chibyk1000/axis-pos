import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  X,
  Save,
  Archive,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router";
import { nanoid } from "nanoid";
import { format } from "date-fns";
import {
  useCashEntries,
  useCreateCashEntry,
  useDeleteCashEntry,
} from "@/hooks/controllers/pos";

// ── Replace with your real auth/session hook ───────────────────────────────
// e.g. import { useCurrentUser } from "@/hooks/useCurrentUser";
const CURRENT_USER_ID = 1; // placeholder

/* -------------------------------------------------------------------------- */

function ActionTile({
  active,
  label,
  icon,
  onClick,
  activeColor = "bg-slate-100 dark:bg-slate-700",
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
            ? `${activeColor} border-transparent text-slate-900 dark:text-white`
            : "border-slate-600 hover:border-slate-400 text-slate-700 dark:text-slate-300"
        }`}
    >
      {icon}
      <span className="text-xs mt-2">{label}</span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */

export default function CashInOut() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState("0");
  const [description, setDescription] = useState("");

  const {
    data: entries = [],
    isLoading,
    refetch,
  } = useCashEntries(CURRENT_USER_ID);
  const createMutation = useCreateCashEntry();
  const deleteMutation = useDeleteCashEntry();

  // Summary for today's session
  const cashIn = entries
    .filter((e) => e.type === "in")
    .reduce((s, e) => s + e.amount, 0);
  const cashOut = entries
    .filter((e) => e.type === "out")
    .reduce((s, e) => s + e.amount, 0);
  const netCash = cashIn - cashOut;

  const amountNum = parseFloat(amount) || 0;
  const canSave = amountNum > 0;

  function handleSave() {
    if (!canSave) return;
    createMutation.mutate(
      {
        id: nanoid(),
        userId: CURRENT_USER_ID,
        type: mode,
        amount: amountNum,
        description: description.trim() || null,
        createdAt: new Date(),
      },
      {
        onSuccess: () => {
          setAmount("0");
          setDescription("");
        },
      },
    );
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(id);
  }

  return (
    <div className="h-screen w-screen bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <h1 className="text-sm font-medium">Cash In / Out</h1>
        <button
          className="hover:text-slate-900 dark:text-white text-slate-500 dark:text-slate-400 transition-colors"
          onClick={() => navigate(-1)}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Top actions */}
      <div className="flex items-start justify-between px-4 py-4 shrink-0">
        <div className="flex gap-3">
          <ActionTile
            active={mode === "in"}
            label="Add cash"
            icon={<ArrowDown className="w-6 h-6" />}
            onClick={() => setMode("in")}
            activeColor="bg-sky-600"
          />
          <ActionTile
            active={mode === "out"}
            label="Remove cash"
            icon={<ArrowUp className="w-6 h-6" />}
            onClick={() => setMode("out")}
            activeColor="bg-amber-600"
          />
        </div>

        {/* Session summary */}
        <div className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400 text-right">
          <span>
            Cash in:{" "}
            <span className="text-emerald-400 font-mono">
              {cashIn.toFixed(2)}
            </span>
          </span>
          <span>
            Cash out:{" "}
            <span className="text-red-400 font-mono">{cashOut.toFixed(2)}</span>
          </span>
          <span className="text-slate-700 dark:text-slate-300">
            Net:{" "}
            <span
              className={`font-mono ${netCash >= 0 ? "text-emerald-400" : "text-red-400"}`}
            >
              {netCash.toFixed(2)}
            </span>
          </span>
        </div>

        <button className="flex flex-col items-center justify-center w-28 h-24 border border-slate-600 hover:border-slate-400 transition text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white">
          <Archive className="w-8 h-8 mb-2" />
          <span className="text-xs">Cash drawer</span>
        </button>
      </div>

      {/* Form */}
      <div className="px-4 space-y-3 shrink-0">
        <div className="w-44">
          <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
            Amount
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 focus:border-sky-500 outline-none px-3 py-1.5 text-right text-lg font-mono text-slate-900 dark:text-slate-100 rounded-sm"
          />
        </div>

        <div>
          <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter the reason for adding or removing cash…"
            rows={3}
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 focus:border-sky-500 outline-none px-3 py-2 resize-none text-sm rounded-sm text-slate-900 dark:text-slate-200 placeholder:text-slate-500 dark:placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Entries list */}
      <div className="flex-1 px-4 mt-4 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Cash entries ({entries.length})
          </span>
          <button
            onClick={() => refetch()}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 border border-slate-200 dark:border-slate-700 overflow-auto rounded-sm">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              Loading…
            </div>
          ) : entries.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
              No records
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left text-slate-500 dark:text-slate-400 font-medium">
                    Type
                  </th>
                  <th className="px-3 py-2 text-left text-slate-500 dark:text-slate-400 font-medium">
                    Description
                  </th>
                  <th className="px-3 py-2 text-right text-slate-500 dark:text-slate-400 font-medium">
                    Amount
                  </th>
                  <th className="px-3 py-2 text-left text-slate-500 dark:text-slate-400 font-medium">
                    Time
                  </th>
                  <th className="px-3 py-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr
                    key={entry.id}
                    className={`border-b border-slate-200 dark:border-slate-700/50 ${i % 2 === 0 ? "" : "bg-slate-100 dark:bg-slate-700/20"}`}
                  >
                    <td className="px-3 py-2">
                      {entry.type === "in" ? (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <ArrowDown className="w-3 h-3" /> In
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-400">
                          <ArrowUp className="w-3 h-3" /> Out
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300 max-w-[200px] truncate">
                      {entry.description ?? (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-mono ${entry.type === "in" ? "text-emerald-400" : "text-amber-400"}`}
                    >
                      {entry.type === "out" ? "−" : "+"}
                      {entry.amount.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-slate-500">
                      {format(new Date(entry.createdAt), "HH:mm:ss")}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={deleteMutation.isPending}
                        className="text-slate-600 hover:text-red-400 transition-colors disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
        <button
          onClick={handleSave}
          disabled={!canSave || createMutation.isPending}
          className="px-6 py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-600 disabled:text-slate-500 dark:text-slate-400 disabled:cursor-not-allowed text-slate-900 dark:text-white flex items-center gap-2 text-sm transition-colors rounded-sm"
        >
          {createMutation.isPending ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save
        </button>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-2 bg-red-600 hover:bg-red-700 text-slate-900 dark:text-white flex items-center gap-2 text-sm transition-colors rounded-sm"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </div>
  );
}
