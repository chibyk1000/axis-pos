import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import {
  setDashboardShowAll,
  setDashboardModalOpen,
  setDashboardRange,
  setDashboardChartMode,
  setDashboardChartModalOpen,
  setDashboardChartRange,
} from "@/store/dashboardSlice";
import { Switch } from "@/components/ui/switch";
import { Calendar as CalendarIcon, RefreshCw } from "lucide-react";
import { Calendar as ShadCalendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  format,
  startOfWeek,
  endOfWeek,
  subWeeks,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  subYears,
  addDays,
} from "date-fns";
import {
  useMonthlySales,
  useWeeklySales,
  useSalesByRange,
  useTopProducts,
  useHourlySales,
  useTopProductGroups,
  useTotalSales,
  useTopCustomers,
  useOrderCount,
  useRefundsSummary,
  useOutstandingBalance,
  useNewCustomersCount,
  usePaymentMethodBreakdown,
} from "@/hooks/controllers/dashboard";
import type {
  TopProductRow,
  HourlySalesRow,
  TopGroupRow,
  TopCustomerRow,
  SalesTrendRow,
  PaymentMethodRow,
} from "@/hooks/controllers/dashboard";

/* -------------------------------------------------------------------------- */
/*                              DATE RANGE MODAL                              */
/* -------------------------------------------------------------------------- */

const PRESETS = [
  {
    label: "Today",
    range: () => {
      const d = new Date();
      return { from: d, to: d };
    },
  },
  {
    label: "Yesterday",
    range: () => {
      const d = addDays(new Date(), -1);
      return { from: d, to: d };
    },
  },
  {
    label: "This week",
    range: () => ({ from: startOfWeek(new Date()), to: endOfWeek(new Date()) }),
  },
  {
    label: "Last week",
    range: () => {
      const d = subWeeks(new Date(), 1);
      return { from: startOfWeek(d), to: endOfWeek(d) };
    },
  },
  {
    label: "This month",
    range: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  {
    label: "Last month",
    range: () => {
      const d = subMonths(new Date(), 1);
      return { from: startOfMonth(d), to: endOfMonth(d) };
    },
  },
  {
    label: "This year",
    range: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }),
  },
  {
    label: "Last year",
    range: () => {
      const d = subYears(new Date(), 1);
      return { from: startOfYear(d), to: endOfYear(d) };
    },
  },
];

function DateRangeModal({
  range,
  onSelect,
  onClose,
}: {
  range: { from?: Date; to?: Date };
  onSelect: (r: { from?: Date; to?: Date }) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(range);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
      <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl w-full max-w-3xl p-6 shadow-xl">
        <h3 className="text-sm font-semibold mb-4">Select date range</h3>

        <div className="grid grid-cols-12 gap-6">
          {/* Presets */}
          <div className="col-span-4 grid grid-cols-2 gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                variant="outline"
                size="sm"
                className="justify-start bg-transparent hover:bg-white dark:bg-stone-800 hover:text-stone-900 dark:text-white text-stone-700 dark:text-stone-300 text-xs"
                onClick={() => setDraft(p.range())}
              >
                {p.label}
              </Button>
            ))}
          </div>

          {/* Calendar */}
          <div className="col-span-8">
            <ShadCalendar
              required
              mode="range"
              selected={draft as any}
              onSelect={setDraft}
              numberOfMonths={2}
              pagedNavigation
              className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onSelect(draft);
              onClose();
            }}
          >
            OK
          </Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                           SMALL HELPERS                                    */
/* -------------------------------------------------------------------------- */

function CardShell({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-5 ${className}`}
    >
      <h3 className="text-xs font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Empty() {
  return (
    <div className="flex-1 flex items-center justify-center text-xs text-stone-500 py-6">
      No data to display
    </div>
  );
}

function LoadingRows({ n = 4 }: { n?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="h-5 bg-stone-100 dark:bg-stone-700/60 rounded animate-pulse" />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                          PERIODIC REPORT CARDS                             */
/* -------------------------------------------------------------------------- */

function TopProductsCard({ from, to }: { from: Date; to: Date }) {
  const { data = [], isLoading } = useTopProducts(from, to);
  const max = Math.max(...data.map((d) => d.total), 1);

  return (
    <CardShell title="Top products">
      {isLoading ? (
        <LoadingRows />
      ) : data.length === 0 ? (
        <Empty />
      ) : (
        <div className="flex flex-col gap-2">
          {data.map((row: TopProductRow, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <div className="flex justify-between text-xs">
                <span className="text-stone-700 dark:text-stone-300 truncate max-w-[65%]">
                  {row.name}
                </span>
                <span className="text-stone-500 dark:text-stone-400 font-mono">
                  {row.total.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${(row.total / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </CardShell>
  );
}

function HourlySalesCard({ from, to }: { from: Date; to: Date }) {
  const { data = [], isLoading } = useHourlySales(from, to);
  // Only show hours 06:00–22:00 for readability
  const visible = data.filter((_, i) => i >= 6 && i <= 22);

  return (
    <CardShell title="Hourly sales">
      {isLoading ? (
        <LoadingRows n={3} />
      ) : data.every((d) => d.sales === 0) ? (
        <Empty />
      ) : (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={visible}
              margin={{ top: 0, right: 0, left: -24, bottom: 0 }}
            >
              <XAxis
                dataKey="hour"
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                tickFormatter={(v) => v.replace(":00", "")}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(148,163,184,0.1)" }}
                contentStyle={{
                  backgroundColor: "#1c1917",
                  border: "1px solid #44403c",
                  borderRadius: 6,
                  color: "#e5e7eb",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="sales" radius={[3, 3, 0, 0]}>
                {visible.map((entry: HourlySalesRow, i) => (
                  <Cell
                    key={i}
                    fill={entry.sales > 0 ? "#f59e0b" : "#44403c"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </CardShell>
  );
}

function TopGroupsCard({ from, to }: { from: Date; to: Date }) {
  const { data = [], isLoading } = useTopProductGroups(from, to);
  const max = Math.max(...data.map((d) => d.total), 1);

  return (
    <CardShell title="Top product groups">
      {isLoading ? (
        <LoadingRows />
      ) : data.length === 0 ? (
        <Empty />
      ) : (
        <div className="flex flex-col gap-2">
          {data.map((row: TopGroupRow, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <div className="flex justify-between text-xs">
                <span className="text-stone-700 dark:text-stone-300 truncate max-w-[65%]">
                  {row.name}
                </span>
                <span className="text-stone-500 dark:text-stone-400 font-mono">
                  {row.total.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full"
                  style={{ width: `${(row.total / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </CardShell>
  );
}

function TotalSalesCard({ from, to }: { from: Date; to: Date }) {
  const { data: total = 0, isLoading } = useTotalSales(from, to);

  return (
    <CardShell
      title="Total sales amount"
      className="flex flex-col items-center justify-center text-center"
    >
      {isLoading ? (
        <div className="h-12 w-32 bg-stone-100 dark:bg-stone-700/60 rounded animate-pulse mx-auto" />
      ) : (
        <>
          <p className="text-4xl font-bold tabular-nums">
            {total.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="text-xs text-stone-500 mt-1">
            {format(from, "MM/dd/yyyy")} – {format(to, "MM/dd/yyyy")}
          </p>
        </>
      )}
    </CardShell>
  );
}

function TopCustomersCard({ from, to }: { from: Date; to: Date }) {
  const { data = [], isLoading } = useTopCustomers(from, to);

  return (
    <CardShell title="Top customers" className="md:col-span-2">
      <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
        Top 5 customers in selected period
      </p>
      {isLoading ? (
        <LoadingRows />
      ) : data.length === 0 ? (
        <Empty />
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-stone-500 border-b border-stone-200 dark:border-stone-700">
              <th className="text-left pb-2 font-medium">#</th>
              <th className="text-left pb-2 font-medium">Customer</th>
              <th className="text-right pb-2 font-medium">Orders</th>
              <th className="text-right pb-2 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row: TopCustomerRow, i) => (
              <tr
                key={i}
                className="border-b border-stone-200 dark:border-stone-700/40 last:border-0"
              >
                <td className="py-2 text-stone-500">{i + 1}</td>
                <td className="py-2 text-stone-800 dark:text-stone-200">{row.name}</td>
                <td className="py-2 text-right text-stone-500 dark:text-stone-400 tabular-nums">
                  {row.count}
                </td>
                <td className="py-2 text-right text-stone-800 dark:text-stone-200 font-medium tabular-nums">
                  {row.total.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </CardShell>
  );
}

/* -------------------------------------------------------------------------- */
/*                              STAT TILES                                    */
/* -------------------------------------------------------------------------- */

function StatTile({
  label,
  value,
  isLoading,
  accent = "text-stone-900 dark:text-stone-100",
}: {
  label: string;
  value: string;
  isLoading: boolean;
  accent?: string;
}) {
  return (
    <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-4">
      <p className="text-xs text-stone-500 dark:text-stone-400 mb-1.5">
        {label}
      </p>
      {isLoading ? (
        <div className="h-7 w-20 bg-stone-100 dark:bg-stone-700/60 rounded animate-pulse" />
      ) : (
        <p className={`text-2xl font-bold tabular-nums ${accent}`}>{value}</p>
      )}
    </div>
  );
}

function money(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function OrderCountTile({ from, to }: { from: Date; to: Date }) {
  const { data: count = 0, isLoading } = useOrderCount(from, to);
  return (
    <StatTile label="Orders" value={count.toLocaleString()} isLoading={isLoading} />
  );
}

function AvgOrderValueTile({ from, to }: { from: Date; to: Date }) {
  const { data: total = 0, isLoading: loadingTotal } = useTotalSales(from, to);
  const { data: count = 0, isLoading: loadingCount } = useOrderCount(from, to);
  const avg = count > 0 ? total / count : 0;
  return (
    <StatTile
      label="Average order value"
      value={money(avg)}
      isLoading={loadingTotal || loadingCount}
    />
  );
}

function RefundsTile({ from, to }: { from: Date; to: Date }) {
  const { data, isLoading } = useRefundsSummary(from, to);
  return (
    <StatTile
      label="Refunds"
      value={`${money(data?.total ?? 0)} (${data?.count ?? 0})`}
      isLoading={isLoading}
      accent="text-rose-600 dark:text-rose-400"
    />
  );
}

function OutstandingBalanceTile({ from, to }: { from: Date; to: Date }) {
  const { data: total = 0, isLoading } = useOutstandingBalance(from, to);
  return (
    <StatTile
      label="Outstanding balance"
      value={money(total)}
      isLoading={isLoading}
      accent="text-amber-600 dark:text-amber-400"
    />
  );
}

function NewCustomersTile({ from, to }: { from: Date; to: Date }) {
  const { data: count = 0, isLoading } = useNewCustomersCount(from, to);
  return (
    <StatTile label="New customers" value={count.toLocaleString()} isLoading={isLoading} />
  );
}

function PaymentMethodsCard({ from, to }: { from: Date; to: Date }) {
  const { data = [], isLoading } = usePaymentMethodBreakdown(from, to);
  const max = Math.max(...data.map((d) => d.total), 1);

  return (
    <CardShell title="Payment methods">
      {isLoading ? (
        <LoadingRows />
      ) : data.length === 0 ? (
        <Empty />
      ) : (
        <div className="flex flex-col gap-2">
          {data.map((row: PaymentMethodRow, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <div className="flex justify-between text-xs">
                <span className="text-stone-700 dark:text-stone-300 truncate max-w-[65%]">
                  {row.paymentType}
                </span>
                <span className="text-stone-500 dark:text-stone-400 font-mono">
                  {money(row.total)}
                </span>
              </div>
              <div className="h-1.5 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${(row.total / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </CardShell>
  );
}

/* -------------------------------------------------------------------------- */
/*                              MAIN DASHBOARD                                */
/* -------------------------------------------------------------------------- */

const CHART_MODES: { key: "monthly" | "weekly" | "custom"; label: string }[] = [
  { key: "monthly", label: "Monthly" },
  { key: "weekly", label: "Weekly" },
  { key: "custom", label: "Custom" },
];

export default function Dashboard() {
  const currentYear = new Date().getFullYear();
  const dispatch = useDispatch();
  const {
    showAll,
    modalOpen,
    rangeFrom,
    rangeTo,
    chartMode,
    chartModalOpen,
    chartRangeFrom,
    chartRangeTo,
  } = useSelector((state: RootState) => state.dashboard.dashboardMain);
  const range = {
    from: new Date(rangeFrom),
    to: new Date(rangeTo),
  };
  const chartRange = {
    from: new Date(chartRangeFrom),
    to: new Date(chartRangeTo),
  };
  const setShowAll = (val: boolean) => dispatch(setDashboardShowAll(val));
  const setModalOpen = (val: boolean) => dispatch(setDashboardModalOpen(val));
  const setRange = (val: { from: Date; to: Date }) =>
    dispatch(setDashboardRange({ from: val.from.toISOString(), to: val.to.toISOString() }));
  const setChartMode = (val: "monthly" | "weekly" | "custom") =>
    dispatch(setDashboardChartMode(val));
  const setChartModalOpen = (val: boolean) =>
    dispatch(setDashboardChartModalOpen(val));
  const setChartRange = (val: { from: Date; to: Date }) =>
    dispatch(
      setDashboardChartRange({
        from: val.from.toISOString(),
        to: val.to.toISOString(),
      }),
    );

  // All three are fetched unconditionally (hooks can't be called
  // conditionally) — we just render whichever one matches `chartMode`.
  const monthlyQuery = useMonthlySales(currentYear, showAll);
  const weeklyQuery = useWeeklySales(12, showAll);
  const customQuery = useSalesByRange(chartRange.from, chartRange.to, showAll);

  const chartData: SalesTrendRow[] =
    chartMode === "monthly"
      ? monthlyQuery.data?.map((r) => ({ label: r.month, sales: r.sales })) ?? []
      : chartMode === "weekly"
        ? weeklyQuery.data ?? []
        : customQuery.data ?? [];

  const loadingChart =
    chartMode === "monthly"
      ? monthlyQuery.isLoading
      : chartMode === "weekly"
        ? weeklyQuery.isLoading
        : customQuery.isLoading;

  const refetchChart =
    chartMode === "monthly"
      ? monthlyQuery.refetch
      : chartMode === "weekly"
        ? weeklyQuery.refetch
        : customQuery.refetch;

  const chartTitle =
    chartMode === "monthly"
      ? `Monthly sales — ${currentYear}`
      : chartMode === "weekly"
        ? "Weekly sales — last 12 weeks"
        : `Sales — ${format(chartRange.from, "MM/dd/yyyy")} – ${format(chartRange.to, "MM/dd/yyyy")}`;

  const chartSubtitle =
    chartMode === "monthly"
      ? "Sales grouped by month"
      : chartMode === "weekly"
        ? "Sales grouped by week, starting Monday"
        : "Sales grouped by day, week, or month depending on the range";

  const rangeLabel = `${format(range.from, "MM/dd/yyyy")} – ${format(range.to, "MM/dd/yyyy")}`;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100">
      {modalOpen && (
        <DateRangeModal
          range={range}
          onSelect={(r) =>
            setRange({ from: r.from ?? range.from, to: r.to ?? range.to })
          }
          onClose={() => setModalOpen(false)}
        />
      )}

      {chartModalOpen && (
        <DateRangeModal
          range={chartRange}
          onSelect={(r) =>
            setChartRange({
              from: r.from ?? chartRange.from,
              to: r.to ?? chartRange.to,
            })
          }
          onClose={() => setChartModalOpen(false)}
        />
      )}

      <main className="p-6 space-y-8">
        {/* ── Sales Chart ─────────────────────────────── */}
        <section className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-semibold">{chartTitle}</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {chartSubtitle}
                {!showAll && " (posted documents only)"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Monthly / Weekly / Custom toggle */}
              <div className="flex items-center bg-stone-100 dark:bg-stone-700 rounded-lg p-0.5">
                {CHART_MODES.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => {
                      setChartMode(m.key);
                      if (m.key === "custom") setChartModalOpen(true);
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      chartMode === m.key
                        ? "bg-amber-500 text-black"
                        : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {chartMode === "custom" && (
                <button
                  onClick={() => setChartModalOpen(true)}
                  className="p-2 rounded-lg hover:bg-stone-100 dark:bg-stone-700 transition text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:text-white"
                  title="Change date range"
                >
                  <CalendarIcon className="w-4 h-4" />
                </button>
              )}

              <span className="text-xs text-stone-500">All docs</span>
              <Switch checked={showAll} onCheckedChange={setShowAll} />
              <button
                onClick={() => refetchChart()}
                className="p-2 rounded-lg hover:bg-stone-100 dark:bg-stone-700 transition text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:text-white"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="h-64 w-full">
            {loadingChart ? (
              <div className="h-full flex items-center justify-center text-stone-500 text-sm animate-pulse">
                Loading chart…
              </div>
            ) : chartData.every((d) => d.sales === 0) ? (
              <div className="h-full flex items-center justify-center text-stone-500 text-sm">
                No sales in this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(148,163,184,0.1)" }}
                    contentStyle={{
                      backgroundColor: "#1c1917",
                      border: "1px solid #44403c",
                      borderRadius: 8,
                      color: "#e5e7eb",
                    }}
                  />
                  <Bar dataKey="sales" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={_.sales > 0 ? "#f59e0b" : "#44403c"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* ── Periodic Reports ────────────────────────────────── */}
        <section className="space-y-4">
          {/* Range header */}
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold">Periodic reports</h2>
            <span className="text-xs text-stone-500 dark:text-stone-400">{rangeLabel}</span>
            <button
              onClick={() => setModalOpen(true)}
              className="p-1.5 rounded-lg hover:bg-white dark:bg-stone-800 transition text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:text-white"
            >
              <CalendarIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Key metric tiles */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <OrderCountTile from={range.from} to={range.to} />
            <AvgOrderValueTile from={range.from} to={range.to} />
            <RefundsTile from={range.from} to={range.to} />
            <OutstandingBalanceTile from={range.from} to={range.to} />
            <NewCustomersTile from={range.from} to={range.to} />
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <TopProductsCard from={range.from} to={range.to} />
            <HourlySalesCard from={range.from} to={range.to} />
            <TopGroupsCard from={range.from} to={range.to} />
            <TotalSalesCard from={range.from} to={range.to} />
            <PaymentMethodsCard from={range.from} to={range.to} />
            <TopCustomersCard from={range.from} to={range.to} />
          </div>
        </section>
      </main>
    </div>
  );
}
