
import {
  addDays,
  subWeeks,
  subMonths,
  subYears,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";

import { Button } from "@/components/ui/button";
import { Calendar as ShadCalendar } from "@/components/ui/calendar";

export type DateRange = {
  from?: Date;
  to?: Date;
};

interface DateRangeModalProps {
  open: boolean;
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  onClose: () => void;
  onApply?: (range: DateRange | undefined) => void;
  title?: string;
}

export function DateRangeModal({
  open,
  value,
  onChange,
  onClose,
  onApply,
  title = "Select Date Range",
}: DateRangeModalProps) {
  if (!open) return null;

  const presets = [
    { label: "Today", range: () => ({ from: new Date(), to: new Date() }) },
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
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl
                      w-full max-w-4xl p-6 shadow-xl"
      >
        {/* Header */}
        <h3 className="text-lg font-semibold mb-4">{title}</h3>

        {/* Body */}
        <div className="grid grid-cols-12 gap-6">
          {/* Presets */}
          <div className="col-span-12 md:col-span-4 grid grid-cols-2 gap-2">
            {presets.map((item) => (
              <Button
                key={item.label}
                variant="outline"
                className="justify-start bg-transparent hover:bg-slate-800 hover:text-white"
                onClick={() => onChange(item.range())}
              >
                {item.label}
              </Button>
            ))}
          </div>

          {/* Calendar */}
          <div className="col-span-12 md:col-span-8">
            <ShadCalendar
              mode="range"
              selected={value as any}
              onSelect={onChange}
              numberOfMonths={2}
              pagedNavigation
              className="rounded-xl border border-slate-700 bg-slate-900"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onApply?.(value);
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
