import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import {
  setReportingSelectedReport,
  setReportingSearchQuery,
  setReportingCustomerId,
  setReportingDateFrom,
  setReportingDateTo,
} from "@/store/dashboardSlice";
import { ChevronLeft, X, Search, Printer, Download, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReportList from "@/components/report-list";
import FilterPanel from "@/components/filter-panel";
import { useReportData, type ReportType } from "@/hooks/controllers/reporting";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/** Parse a `yyyy-mm-dd` date-input value as a local-time Date, anchored to
 * the start or end of that day so range comparisons are inclusive. */
function parseLocalDate(
  dateStr: string,
  endOfDay: boolean,
): Date | undefined {
  if (!dateStr) return undefined;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return endOfDay
    ? new Date(y, m - 1, d, 23, 59, 59, 999)
    : new Date(y, m - 1, d, 0, 0, 0, 0);
}

const Reporting = () => {
  const dispatch = useDispatch();
  const { selectedReport, searchQuery, customerId, dateFrom, dateTo } =
    useSelector((state: RootState) => state.dashboard.reporting);
  const setSelectedReport = (val: string | null) =>
    dispatch(setReportingSelectedReport(val));
  const setSearchQuery = (val: string) =>
    dispatch(setReportingSearchQuery(val));
  const setCustomerId = (val: string | null) =>
    dispatch(setReportingCustomerId(val));
  const setDateFrom = (val: string) => dispatch(setReportingDateFrom(val));
  const setDateTo = (val: string) => dispatch(setReportingDateTo(val));
  const clearFilters = () => {
    setCustomerId(null);
    setDateFrom("");
    setDateTo("");
  };

  const filters = {
    customerId: customerId ?? undefined,
    from: parseLocalDate(dateFrom, false),
    to: parseLocalDate(dateTo, true),
  };

  const reportQuery = useReportData(selectedReport as ReportType, filters);

  const handleReportSelect = (reportName: string) =>
    setSelectedReport(reportName as ReportType);
  const handleClearSelection = () => setSelectedReport(null);

  const exportToExcel = () => {
    if (!reportQuery.data || reportQuery.data.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(reportQuery.data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, selectedReport || "Report");
    XLSX.writeFile(wb, `${selectedReport}-${Date.now()}.xlsx`);
  };

  const exportToPDF = () => {
    if (!reportQuery.data || reportQuery.data.length === 0) return;
    const pdf = new jsPDF();
    const columns = Object.keys(reportQuery.data[0] || {});
    const rows = reportQuery.data.map((item: any) =>
      columns.map((col) => item[col] ?? "—"),
    );
    autoTable(pdf, {
      head: [columns],
      body: rows,
      headStyles: { fillColor: [52, 73, 94] },
      margin: { top: 10 },
      didDrawPage: () => {
        pdf.text(`${selectedReport}`, 14, 15);
      },
    });
    pdf.save(`${selectedReport}-${Date.now()}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-200">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-stone-300 dark:border-stone-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedReport && (
              <button
                onClick={handleClearSelection}
                className="text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:text-stone-200 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
              {selectedReport
                ? `${selectedReport} (${reportQuery.data?.length ?? 0} rows)`
                : "Select report to view or print"}
            </h2>
          </div>
          {selectedReport && (
            <button
              onClick={handleClearSelection}
              className="text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:text-stone-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {!selectedReport ? (
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {/* Search Bar */}
              <div className="mb-6 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-stone-500" />
                <Input
                  placeholder="Search reports"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 placeholder-stone-500 focus:border-amber-500"
                />
              </div>

              {/* Reports List */}
              <ReportList
                searchQuery={searchQuery}
                onSelectReport={handleReportSelect}
              />
            </div>
          ) : (
            /* Report View */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Action Buttons */}
              <div className="border-b border-stone-300 dark:border-stone-800 px-6 py-4 flex gap-2">
                <Button
                  onClick={handlePrint}
                  variant="outline"
                  className="gap-2 bg-transparent border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:border-amber-500 hover:text-amber-500"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
                <Button
                  onClick={exportToExcel}
                  disabled={reportQuery.isLoading || !reportQuery.data?.length}
                  variant="outline"
                  className="gap-2 bg-transparent border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:border-amber-500 hover:text-amber-500 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Excel
                </Button>
                <Button
                  onClick={exportToPDF}
                  disabled={reportQuery.isLoading || !reportQuery.data?.length}
                  variant="outline"
                  className="gap-2 bg-transparent border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:border-amber-500 hover:text-amber-500 disabled:opacity-50"
                >
                  <File className="w-4 h-4" />
                  PDF
                </Button>
              </div>

              {/* Report Data Table */}
              <div className="flex-1 overflow-auto p-6">
                {reportQuery.isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-stone-500 dark:text-stone-400">
                      Loading report...
                    </p>
                  </div>
                ) : reportQuery.data && reportQuery.data.length > 0 ? (
                  <div className="bg-white dark:bg-stone-800 rounded-lg overflow-hidden border border-stone-200 dark:border-stone-700">
                    <table className="w-full text-sm">
                      <thead className="bg-stone-100 dark:bg-stone-700 border-b border-stone-600">
                        <tr>
                          {Object.keys(reportQuery.data[0]).map((key) => (
                            <th
                              key={key}
                              className="px-4 py-3 text-left text-xs font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wider"
                            >
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-700">
                        {reportQuery.data
                          .slice(0, 100)
                          .map((row: any, idx: any) => (
                            <tr
                              key={idx}
                              className="hover:bg-stone-100 dark:bg-stone-700/50 transition-colors"
                            >
                              {Object.values(row).map((val: any, vidx) => (
                                <td
                                  key={vidx}
                                  className="px-4 py-2 text-stone-800 dark:text-stone-200"
                                >
                                  {typeof val === "boolean"
                                    ? val
                                      ? "✓"
                                      : "—"
                                    : typeof val === "object"
                                      ? "—"
                                      : (val ?? "—")}
                                </td>
                              ))}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {reportQuery.data.length > 100 && (
                      <div className="px-4 py-3 bg-stone-100 dark:bg-stone-700/50 text-xs text-stone-500 dark:text-stone-400 border-t border-stone-200 dark:border-stone-700">
                        Showing 100 of {reportQuery.data.length} rows
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-stone-500 dark:text-stone-400">
                      No data available for this report
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Right Sidebar - Filters (persists across picker + report views) */}
          <FilterPanel
            reportType={selectedReport as ReportType | null}
            customerId={customerId}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onCustomerIdChange={setCustomerId}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onClear={clearFilters}
          />
        </div>
      </div>
    </div>
  );
};

export default Reporting;
