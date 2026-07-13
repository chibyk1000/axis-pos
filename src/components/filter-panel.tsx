"use client";

import { Calendar, X } from "lucide-react";
import { useCustomers } from "@/hooks/controllers/customers";
import { REPORT_FILTER_SUPPORT, type ReportType } from "@/hooks/controllers/reporting";

interface FilterPanelProps {
  reportType?: ReportType | null;
  customerId: string | null;
  dateFrom: string;
  dateTo: string;
  onCustomerIdChange: (id: string | null) => void;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onClear: () => void;
}

export default function FilterPanel({
  reportType,
  customerId,
  dateFrom,
  dateTo,
  onCustomerIdChange,
  onDateFromChange,
  onDateToChange,
  onClear,
}: FilterPanelProps) {
  const { data: customers = [] } = useCustomers();

  // Before a report is picked we don't know which filters will apply yet,
  // so show everything enabled. Once a report is selected, only show the
  // controls that report actually uses.
  const support = reportType
    ? REPORT_FILTER_SUPPORT[reportType]
    : { dateRange: true, customer: true };

  const hasActiveFilters = !!customerId || !!dateFrom || !!dateTo;

  return (
    <div className="w-80 bg-white dark:bg-stone-900 border-l border-stone-200 dark:border-stone-800 flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
        <h3 className="font-semibold text-sm text-stone-900 dark:text-stone-200">
          Filter
        </h3>
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400 hover:text-amber-500 transition-colors"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Customer */}
        <div className={!support.customer ? "opacity-40 pointer-events-none" : ""}>
          <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wide mb-2 block">
            Customer
          </label>
          <select
            value={customerId ?? ""}
            onChange={(e) => onCustomerIdChange(e.target.value || null)}
            className="w-full bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-md px-3 py-2 text-sm text-stone-900 dark:text-stone-200 hover:border-stone-400 dark:hover:border-stone-500 transition-colors"
          >
            <option value="">All customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div className={!support.dateRange ? "opacity-40 pointer-events-none" : ""}>
          <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wide mb-2 block">
            Date range
          </label>
          <div className="flex items-center gap-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-md px-3 py-2 hover:border-stone-400 dark:hover:border-stone-500 transition-colors mb-2">
            <Calendar className="w-4 h-4 text-stone-600 dark:text-stone-400 shrink-0" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="flex-1 bg-transparent text-sm text-stone-900 dark:text-stone-200 outline-none"
            />
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-md px-3 py-2 hover:border-stone-400 dark:hover:border-stone-500 transition-colors">
            <Calendar className="w-4 h-4 text-stone-600 dark:text-stone-400 shrink-0" />
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => onDateToChange(e.target.value)}
              className="flex-1 bg-transparent text-sm text-stone-900 dark:text-stone-200 outline-none"
            />
          </div>
        </div>

        {reportType && !support.dateRange && !support.customer && (
          <p className="text-xs text-stone-500 dark:text-stone-500 italic">
            "{reportType}" doesn't support filtering — it always shows the
            full list.
          </p>
        )}
      </div>
    </div>
  );
}
