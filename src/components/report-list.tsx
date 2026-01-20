"use client";

interface ReportListProps {
  searchQuery: string;
  onSelectReport: (name: string) => void;
}

export default function ReportList({
  searchQuery,
  onSelectReport,
}: ReportListProps) {
  const reports = [
    "Products",
    "Product groups",
    "Customers",
    "Tax rates",
    "Users",
    "Item list",
    "Payment types",
    "Payment types by users",
    "Payment types by customers",
    "Refunds",
    "Invoice list",
    "Daily sales",
    "Hourly sales",
    "Hourly sales by product groups",
    "Table or order number",
    "Profit & margin",
    "Unpaid sales",
    "Starting cash entries",
  ];

  const filteredReports = reports.filter((report) =>
    report.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-slate-900">
      <h3 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
        Sales
      </h3>

      <div className="space-y-1">
        {filteredReports.map((report, index) => (
          <button
            key={index}
            onClick={() => onSelectReport(report)}
            className="
              w-full flex items-center gap-3 px-3 py-2.5 rounded-md
              text-sm text-slate-300 text-left
              hover:bg-slate-800 hover:text-white
              transition-colors group
            "
          >
            <div
              className="
                w-4 h-4 rounded border border-slate-600
                group-hover:border-sky-400
                group-hover:bg-sky-400/10
                transition-colors
              "
            />
            <span>{report}</span>
          </button>
        ))}
      </div>

      {filteredReports.length === 0 && (
        <div className="px-3 py-6 text-center text-slate-400 text-sm">
          No reports found
        </div>
      )}
    </div>
  );
}
