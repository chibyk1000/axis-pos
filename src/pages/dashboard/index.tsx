import { useState } from "react";
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
  useTopProducts,
  useHourlySales,
  useTopProductGroups,
  useTotalSales,
  useTopCustomers,
} from "@/hooks/controllers/dashboard";
import type {
  TopProductRow,
  HourlySalesRow,
  TopGroupRow,
  TopCustomerRow,
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
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl p-6 shadow-xl">
        <h3 className="text-base font-semibold mb-4">Select date range</h3>

        <div className="grid grid-cols-12 gap-6">
          {/* Presets */}
          <div className="col-span-4 grid grid-cols-2 gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                variant="outline"
                size="sm"
                className="justify-start bg-transparent hover:bg-slate-800 hover:text-white text-slate-300 text-xs"
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
              className="rounded-xl border border-slate-700 bg-slate-900"
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
      className={`bg-slate-800 rounded-2xl border border-slate-700 p-5 ${className}`}
    >
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Empty() {
  return (
    <div className="flex-1 flex items-center justify-center text-sm text-slate-500 py-6">
      No data to display
    </div>
  );
}

function LoadingRows({ n = 4 }: { n?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="h-5 bg-slate-700/60 rounded animate-pulse" />
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
                <span className="text-slate-300 truncate max-w-[65%]">
                  {row.name}
                </span>
                <span className="text-slate-400 font-mono">
                  {row.total.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full"
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
                  backgroundColor: "#020617",
                  border: "1px solid #334155",
                  borderRadius: 6,
                  color: "#e5e7eb",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="sales" radius={[3, 3, 0, 0]}>
                {visible.map((entry: HourlySalesRow, i) => (
                  <Cell
                    key={i}
                    fill={entry.sales > 0 ? "#38bdf8" : "#1e293b"}
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
                <span className="text-slate-300 truncate max-w-[65%]">
                  {row.name}
                </span>
                <span className="text-slate-400 font-mono">
                  {row.total.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full"
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
        <div className="h-12 w-32 bg-slate-700/60 rounded animate-pulse mx-auto" />
      ) : (
        <>
          <p className="text-5xl font-bold tabular-nums">
            {total.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="text-xs text-slate-500 mt-1">
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
      <p className="text-xs text-slate-400 mb-3">
        Top 5 customers in selected period
      </p>
      {isLoading ? (
        <LoadingRows />
      ) : data.length === 0 ? (
        <Empty />
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 border-b border-slate-700">
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
                className="border-b border-slate-700/40 last:border-0"
              >
                <td className="py-2 text-slate-500">{i + 1}</td>
                <td className="py-2 text-slate-200">{row.name}</td>
                <td className="py-2 text-right text-slate-400 tabular-nums">
                  {row.count}
                </td>
                <td className="py-2 text-right text-slate-200 font-medium tabular-nums">
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
/*                              MAIN DASHBOARD                                */
/* -------------------------------------------------------------------------- */

export default function Dashboard() {
  const currentYear = new Date().getFullYear();
  const [showAll, setShowAll] = useState(false); // Switch: show all vs posted
  const [modalOpen, setModalOpen] = useState(false);
  const [range, setRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  const {
    data: monthlySales = [],
    isLoading: loadingMonthly,
    refetch: refetchMonthly,
  } = useMonthlySales(currentYear);

  const rangeLabel = `${format(range.from, "MM/dd/yyyy")} – ${format(range.to, "MM/dd/yyyy")}`;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {modalOpen && (
        <DateRangeModal
          range={range}
          onSelect={(r) =>
            setRange({ from: r.from ?? range.from, to: r.to ?? range.to })
          }
          onClose={() => setModalOpen(false)}
        />
      )}

      <main className="p-6 space-y-8">
        {/* ── Monthly Sales Chart ─────────────────────────────── */}
        <section className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">
                Monthly sales — {currentYear}
              </h2>
              <p className="text-sm text-slate-400">
                Sales grouped by month (posted documents only)
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">All docs</span>
              <Switch checked={showAll} onCheckedChange={setShowAll} />
              <button
                onClick={() => refetchMonthly()}
                className="p-2 rounded-lg hover:bg-slate-700 transition text-slate-400 hover:text-white"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="h-64 w-full">
            {loadingMonthly ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm animate-pulse">
                Loading chart…
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySales}>
                  <XAxis
                    dataKey="month"
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
                      backgroundColor: "#020617",
                      border: "1px solid #334155",
                      borderRadius: 8,
                      color: "#e5e7eb",
                    }}
                  />
                  <Bar dataKey="sales" radius={[6, 6, 0, 0]}>
                    {monthlySales.map((_, i) => (
                      <Cell
                        key={i}
                        fill={_.sales > 0 ? "#38bdf8" : "#1e293b"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <p className="text-center text-xs text-slate-500 mt-3">Month</p>
        </section>

        {/* ── Periodic Reports ────────────────────────────────── */}
        <section className="space-y-4">
          {/* Range header */}
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Periodic reports</h2>
            <span className="text-sm text-slate-400">{rangeLabel}</span>
            <button
              onClick={() => setModalOpen(true)}
              className="p-1.5 rounded-lg hover:bg-slate-800 transition text-slate-400 hover:text-white"
            >
              <CalendarIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <TopProductsCard from={range.from} to={range.to} />
            <HourlySalesCard from={range.from} to={range.to} />
            <TopGroupsCard from={range.from} to={range.to} />
            <TotalSalesCard from={range.from} to={range.to} />
            <TopCustomersCard from={range.from} to={range.to} />
          </div>
        </section>
      </main>
    </div>
  );
}
