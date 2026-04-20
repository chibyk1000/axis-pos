"use client";

import { useState } from "react";
import { ChevronLeft, X, Search, Printer, Download, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReportList from "@/components/report-list";
import FilterPanel from "@/components/filter-panel";
import { useReportData, type ReportType } from "@/hooks/controllers/reporting";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const Reporting = () => {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const reportQuery = useReportData(selectedReport as ReportType);

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
    <div className="flex-1 flex overflow-hidden bg-slate-900 text-slate-200">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedReport && (
              <button
                onClick={handleClearSelection}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-slate-100">
              {selectedReport
                ? `${selectedReport} (${reportQuery.data?.length ?? 0} rows)`
                : "Select report to view or print"}
            </h2>
          </div>
          {selectedReport && (
            <button
              onClick={handleClearSelection}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Main Content */}
        {!selectedReport ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Left / Main Panel */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {/* Search Bar */}
              <div className="mb-6 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input
                  placeholder="Search reports"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:border-sky-500"
                />
              </div>

              {/* Reports List */}
              <ReportList
                searchQuery={searchQuery}
                onSelectReport={handleReportSelect}
              />
            </div>

            {/* Right Sidebar - Filters */}
            <FilterPanel />
          </div>
        ) : (
          /* Report View */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Action Buttons */}
            <div className="border-b border-slate-800 px-6 py-4 flex gap-2">
              <Button
                onClick={handlePrint}
                variant="outline"
                className="gap-2 bg-transparent border-slate-700 text-slate-200 hover:border-sky-500 hover:text-sky-500"
              >
                <Printer className="w-4 h-4" />
                Print
              </Button>
              <Button
                onClick={exportToExcel}
                disabled={reportQuery.isLoading || !reportQuery.data?.length}
                variant="outline"
                className="gap-2 bg-transparent border-slate-700 text-slate-200 hover:border-sky-500 hover:text-sky-500 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Excel
              </Button>
              <Button
                onClick={exportToPDF}
                disabled={reportQuery.isLoading || !reportQuery.data?.length}
                variant="outline"
                className="gap-2 bg-transparent border-slate-700 text-slate-200 hover:border-sky-500 hover:text-sky-500 disabled:opacity-50"
              >
                <File className="w-4 h-4" />
                PDF
              </Button>
            </div>

            {/* Report Data Table */}
            <div className="flex-1 overflow-auto p-6">
              {reportQuery.isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-slate-400">Loading report...</p>
                </div>
              ) : reportQuery.data && reportQuery.data.length > 0 ? (
                <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-700 border-b border-slate-600">
                      <tr>
                        {Object.keys(reportQuery.data[0]).map((key) => (
                          <th
                            key={key}
                            className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider"
                          >
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {reportQuery.data
                        .slice(0, 100)
                        .map((row: any, idx: any) => (
                          <tr
                            key={idx}
                            className="hover:bg-slate-700/50 transition-colors"
                          >
                            {Object.values(row).map((val: any, vidx) => (
                              <td
                                key={vidx}
                                className="px-4 py-2 text-slate-200"
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
                    <div className="px-4 py-3 bg-slate-700/50 text-xs text-slate-400 border-t border-slate-700">
                      Showing 100 of {reportQuery.data.length} rows
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-slate-400">
                    No data available for this report
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reporting;
