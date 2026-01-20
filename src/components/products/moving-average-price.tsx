import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { addDays } from "date-fns";

import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subWeeks,
  subMonths,
  subYears,
} from "date-fns";
import { useNavigate } from "react-router";

const presets = {
  Today: () => new Date(),
  Yesterday: () => subDays(new Date(), 1),
  "This week": () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  "Last week": () => startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }),
  "This month": () => startOfMonth(new Date()),
  "Last month": () => startOfMonth(subMonths(new Date(), 1)),
  "This year": () => startOfYear(new Date()),
  "Last year": () => startOfYear(subYears(new Date(), 1)),
};


export default function MovingAveragePrice() {
    const [date, setDate] = useState<Date | undefined>(new Date());
  const [mode, setMode] = useState("groups");
  const [updateType, setUpdateType] = useState("markup");
    const [selectedDate, setSelectedDate] = useState(19);
    const navigate = useNavigate()

  return (
    <div className="min-h-screen w-screen bg-slate-900 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button className="text-xl" onClick={()=> navigate(-1)}>←</button>
          <h1 className="text-lg font-medium">Moving average price</h1>
        </div>
        <button className="text-xl">✕</button>
      </div>

      {/* Warning Banner */}
      <div className="flex items-start gap-3 bg-[#3a3a00] border border-yellow-500 p-4 mb-3">
        <span className="text-yellow-400 text-xl">⚠</span>
        <div>
          <p className="text-sm">
            Moving average price is disabled. Enable moving average price to
            start tracking cost prices automatically.
          </p>
          <button className="text-blue-400 text-sm mt-1">
            Click here to enable moving average price
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 bg-[#00394d] border border-blue-500 p-4 mb-6">
        <span className="text-blue-400 text-xl">ℹ</span>
        <p className="text-sm">
          Select products or product groups you wish to recalculate moving
          average price for. Moving average price will be calculated and will
          update all documents in selected period. This operation may take some
          time, depending on number of products and selected time period.
          <span className="text-blue-400 ml-1 cursor-pointer">Learn more</span>
        </p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-[260px_1fr] gap-6">
        {/* Left Panel */}
        <div className="border border-gray-600">
          <div className="p-3 border-b border-gray-600">
            <div className="flex gap-4 mb-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={mode === "groups"}
                  onChange={() => setMode("groups")}
                />
                Product groups
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={mode === "products"}
                  onChange={() => setMode("products")}
                />
                Products
              </label>
            </div>
          </div>

          <div className="p-3 text-sm">
            <div className="font-medium mb-2">Products</div>
            <div className="pl-4 space-y-1">
              <div className="flex items-center gap-2">
                <span>📁</span>
                <span>group one</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div>
          {/* Start of Period */}
          <h2 className="text-sm mb-2">Start of period</h2>

          <div className="flex gap-6 mb-6">
            {/* Calendar */}
            <div className="border border-slate-600 bg-slate-800 p-4 rounded-lg">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                weekStartsOn={1}
                className="slate-calendar text-white"
                classNames={{
                  months: "flex flex-col",
                  month: "space-y-4",
                  caption:
                    "flex justify-center relative items-center text-slate-200",
                  caption_label: "text-sm font-medium",
                  nav_button:
                    "h-7 w-7 bg-slate-700 text-slate-200 hover:bg-slate-600 rounded-md",
                  table: "w-full border-collapse",
                  head_cell: "text-slate-400 text-xs",
                  cell: "h-9 w-9 text-center text-sm",
                  day: "hover:bg-slate-700 rounded-md transition",
                  day_selected: "bg-sky-500 text-white hover:bg-sky-500",
                  day_today: "border border-sky-400",
                  day_outside: "text-slate-500 opacity-50",
                }}
              />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                "Today",
                "Yesterday",
                "This week",
                "Last week",
                "This month",
                "Last month",
                "This year",
                "Last year",
              ].map((label) => (
                <button
                  key={label}
                  onClick={() => setDate(presets[label]())}
                  className="border border-slate-600 rounded-md px-4 py-2
                   bg-slate-800 hover:bg-slate-700 transition"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Update Options */}
          <div className="mb-6">
            <p className="text-sm mb-2">
              What should be updated when cost price is changed?
            </p>
            <div className="flex gap-6 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={updateType === "markup"}
                  onChange={() => setUpdateType("markup")}
                />
                Markup
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={updateType === "sale"}
                  onChange={() => setUpdateType("sale")}
                />
                Sale price
              </label>
            </div>
          </div>

          {/* Start Button */}
          <button className="bg-green-600 px-6 py-2 flex items-center gap-2 hover:bg-green-700">
            ▶ Start
          </button>
        </div>
      </div>
    </div>
  );
}
