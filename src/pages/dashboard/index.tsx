import { Switch } from "@/components/ui/switch";
import { Calendar, ChevronLeft, RefreshCw, X } from "lucide-react";
import React, { useState } from "react";
import { Calendar as ShadCalendar } from "@/components/ui/calendar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { DayPicker } from "react-day-picker";
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
// import "react-day-picker/dist/style.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
const monthlySales = [
  { month: "Jan", sales: 1200 },
  { month: "Feb", sales: 1800 },
  { month: "Mar", sales: 950 },
  { month: "Apr", sales: 2200 },
  { month: "May", sales: 3100 },
  { month: "Jun", sales: 2800 },
  { month: "Jul", sales: 3500 },
  { month: "Aug", sales: 3000 },
  { month: "Sep", sales: 2600 },
  { month: "Oct", sales: 4200 },
  { month: "Nov", sales: 3900 },
  { month: "Dec", sales: 4800 },
];


const Dashboard = () => {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<{ from?: Date; to?: Date }>({
    from: new Date(),
    to: new Date(),
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
          {/* Modal Card */}
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl
                    w-full max-w-4xl p-6 shadow-xl"
          >
            {/* Header */}
            <h3 className="text-lg font-semibold mb-4">Select Date Range</h3>

            {/* Content */}
            <div className="grid grid-cols-12 gap-6">
              {/* Presets */}
              <div className="col-span-12 md:col-span-4 grid grid-cols-2 gap-2">
                {[
                  {
                    label: "Today",
                    range: () => ({ from: new Date(), to: new Date() }),
                  },
                  {
                    label: "Yesterday",
                    range: () => {
                      const d = addDays(new Date(), -1);
                      return { from: d, to: d };
                    },
                  },
                  {
                    label: "This Week",
                    range: () => ({
                      from: startOfWeek(new Date()),
                      to: endOfWeek(new Date()),
                    }),
                  },
                  {
                    label: "Last Week",
                    range: () => {
                      const d = subWeeks(new Date(), 1);
                      return { from: startOfWeek(d), to: endOfWeek(d) };
                    },
                  },
                  {
                    label: "This Month",
                    range: () => ({
                      from: startOfMonth(new Date()),
                      to: endOfMonth(new Date()),
                    }),
                  },
                  {
                    label: "Last Month",
                    range: () => {
                      const d = subMonths(new Date(), 1);
                      return { from: startOfMonth(d), to: endOfMonth(d) };
                    },
                  },
                  {
                    label: "This Year",
                    range: () => ({
                      from: startOfYear(new Date()),
                      to: endOfYear(new Date()),
                    }),
                  },
                  {
                    label: "Last Year",
                    range: () => {
                      const d = subYears(new Date(), 1);
                      return { from: startOfYear(d), to: endOfYear(d) };
                    },
                  },
                ].map((item) => (
                  <Button
                    key={item.label}
                    variant="outline"
                    
                    className="justify-start bg-transparent hover:bg-slate-800 hover:text-white"
                    onClick={() => setRange(item.range())}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>

              {/* Calendar */}
              <div className="col-span-12 md:col-span-8">
                <ShadCalendar
                  mode="range"
                  selected={range}
                  onSelect={setRange}
                  numberOfMonths={2}
                  pagedNavigation
                  className="rounded-xl border border-slate-700 bg-slate-900"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" className="text-slate-900" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setOpen(false)}>OK</Button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="p-6 space-y-8">
        {/* Monthly Sales Chart */}
        {/* Monthly Sales Chart */}
        <section className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">Monthly Sales – 2026</h2>
              <p className="text-sm text-slate-400">Sales grouped by month</p>
            </div>

            <div className="flex items-center gap-2">
              <Switch />
              <button className="p-2 rounded-lg hover:bg-slate-700 transition">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chart */}
          <div className="h-64 w-full">
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
                <Bar dataKey="sales" radius={[6, 6, 0, 0]} fill="#38bdf8" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-center text-sm text-slate-400 mt-4">Month</p>
        </section>

        {/* Periodic Reports */}
        <section className="space-y-4">
          <div className="flex items-center  gap-x-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">Periodic Reports</h2>
              <span className="text-sm text-slate-400">
                {range.from && range.to
                  ? `${format(range.from, "MM/dd/yyyy")} – ${format(range.to, "MM/dd/yyyy")}`
                  : "Select range"}
              </span>
            </div>

            <button
              onClick={() => setOpen(true)}
              className="p-2 rounded-lg hover:bg-slate-800 transition"
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cards */}
            {["Top Products", "Hourly Sales", "Top Product Groups"].map(
              (title) => (
                <div
                  key={title}
                  className="bg-slate-800 rounded-2xl border border-slate-700 p-6 min-h-[260px]"
                >
                  <h3 className="text-sm font-semibold mb-4">{title}</h3>
                  <div className="h-full flex items-center justify-center text-sm text-slate-500">
                    No data to display
                  </div>
                </div>
              ),
            )}

            {/* Total Sales Amount */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 min-h-[260px] flex flex-col items-center justify-center">
              <p className="text-sm text-slate-400 mb-2">
                Total Sales (Amount)
              </p>
              <p className="text-6xl font-bold">0</p>
            </div>

            {/* Top Customers */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 min-h-[260px] md:col-span-2">
              <h3 className="text-sm font-semibold mb-2">Top Customers</h3>
              <p className="text-xs text-slate-400 mb-4">
                Top 5 customers in selected period
              </p>
              <div className="h-full flex items-center justify-center text-sm text-slate-500">
                No data to display
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
