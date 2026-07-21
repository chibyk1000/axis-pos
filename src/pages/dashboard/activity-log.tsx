import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, History, X } from "lucide-react";
import {
  useActivityLogsPage,
  useActivityLogsCount,
  type ActivityLogFilters,
} from "@/hooks/controllers/activityLogs";
import { useUsers } from "@/hooks/controllers/users";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { PageLoading } from "@/components/page-loading";

const ENTITY_TYPES = [
  { id: "product", label: "Products" },
  { id: "document", label: "Sales / documents" },
  { id: "user", label: "Users" },
  { id: "stock", label: "Stock" },
];

const ACTION_BADGE: Record<string, string> = {
  create: "text-emerald-400 bg-emerald-400/10",
  update: "text-amber-400 bg-amber-400/10",
  delete: "text-red-400 bg-red-400/10",
  in: "text-emerald-400 bg-emerald-400/10",
  out: "text-red-400 bg-red-400/10",
  adjustment: "text-amber-400 bg-amber-400/10",
};

function actionBadgeClass(action: string) {
  const verb = action.split(".")[1] ?? action;
  return ACTION_BADGE[verb] ?? "text-stone-500 bg-stone-100 dark:bg-stone-700";
}

const DEFAULT_PAGE_SIZE = 25;

export default function ActivityLogScreen() {
  const [userId, setUserId] = useState<string>("all");
  const [entityType, setEntityType] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const { data: allUsers = [] } = useUsers();

  const filters: ActivityLogFilters = useMemo(
    () => ({
      userId: userId !== "all" ? Number(userId) : null,
      entityType: entityType !== "all" ? entityType : null,
      search: search || undefined,
      fromMs: from ? new Date(`${from}T00:00:00`).getTime() : null,
      toMs: to ? new Date(`${to}T23:59:59.999`).getTime() : null,
    }),
    [userId, entityType, search, from, to],
  );

  // Jump back to page 1 whenever the filters change.
  const filterKey = JSON.stringify(filters);
  useEffect(() => {
    setPage(1);
  }, [filterKey]);

  const {
    data: rows = [],
    isLoading,
    refetch,
  } = useActivityLogsPage(filters, page, pageSize);
  const { data: total = 0 } = useActivityLogsCount(filters);

  const clearFilters = () => {
    setUserId("all");
    setEntityType("all");
    setSearch("");
    setFrom("");
    setTo("");
  };

  const hasFilters =
    userId !== "all" || entityType !== "all" || !!search || !!from || !!to;

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-200 overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-stone-300 dark:border-stone-800 px-3 py-2 flex items-center gap-0.5 bg-white dark:bg-stone-800 shrink-0">
        <button
          onClick={() => refetch()}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded text-xs text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
        <div className="flex items-center gap-1.5 ml-2 text-stone-500 dark:text-stone-400">
          <History className="w-4 h-4" />
          <span className="text-sm">
            {total} action{total !== 1 ? "s" : ""} recorded
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 px-5 py-3 space-y-2.5 shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-stone-500 dark:text-stone-400">
              User
            </label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="bg-stone-100 dark:bg-stone-700 border border-stone-600 text-stone-900 dark:text-stone-100 text-sm rounded px-2 py-1.5 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All users</option>
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ?? u.email ?? `User ${u.id}`}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-stone-500 dark:text-stone-400">
              Area
            </label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="bg-stone-100 dark:bg-stone-700 border border-stone-600 text-stone-900 dark:text-stone-100 text-sm rounded px-2 py-1.5 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All areas</option>
              {ENTITY_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-stone-500 dark:text-stone-400">
              From
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="bg-stone-100 dark:bg-stone-700 border border-stone-600 text-stone-900 dark:text-stone-100 text-sm rounded px-2 py-1.5 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-stone-500 dark:text-stone-400">
              To
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="bg-stone-100 dark:bg-stone-700 border border-stone-600 text-stone-900 dark:text-stone-100 text-sm rounded px-2 py-1.5 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 bg-stone-50 dark:bg-stone-900 rounded px-3 py-2 border border-stone-200 dark:border-stone-700">
          <Search className="w-4 h-4 text-stone-500 shrink-0" />
          <input
            type="text"
            placeholder="Search description, action, or user…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder-stone-500 min-w-0"
          />
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-stone-500 hover:text-stone-700 dark:text-stone-300 transition-colors shrink-0 flex items-center gap-1 text-xs"
            >
              <X className="w-3.5 h-3.5" /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <PageLoading label="Loading activity" />
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center h-full text-stone-500 text-sm py-16">
            No activity found
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-white dark:bg-stone-800 sticky top-0 border-b border-stone-200 dark:border-stone-700 z-10">
              <tr>
                {["Date & time", "User", "Action", "Area", "Description"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left py-2.5 px-4 text-xs font-medium text-stone-500 dark:text-stone-400 border-r border-stone-200 dark:border-stone-700/50 last:border-r-0"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-stone-200 dark:border-stone-700/40 hover:bg-stone-100 dark:hover:bg-stone-700/30 transition-colors"
                >
                  <td className="py-2.5 px-4 text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">
                    {row.createdAt
                      ? new Date(row.createdAt).toLocaleString()
                      : "—"}
                  </td>
                  <td className="py-2.5 px-4 font-medium text-stone-900 dark:text-stone-100 whitespace-nowrap">
                    {row.userDisplayName ?? row.userName ?? "System"}
                  </td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${actionBadgeClass(row.action)}`}
                    >
                      {row.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-stone-500 dark:text-stone-400 capitalize whitespace-nowrap">
                    {row.entityType}
                  </td>
                  <td className="py-2.5 px-4 text-stone-700 dark:text-stone-300">
                    {row.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <DataTablePagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
