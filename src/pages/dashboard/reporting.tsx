"use client";

import { useState } from "react";
import {
  ChevronLeft,
  X,
  Search,
  Eye,
  Printer,
  Download,
  File,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReportList from "@/components/report-list";
import FilterPanel from "@/components/filter-panel";

const Reporting = () => {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleReportSelect = (reportName: string) =>
    setSelectedReport(reportName);
  const handleClearSelection = () => setSelectedReport(null);

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
                ? selectedReport
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
          <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <File className="w-8 h-8 text-sky-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-100">
                {selectedReport}
              </h3>
              <p className="text-slate-400">Report preview would load here</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                variant="outline"
                className="gap-2 bg-transparent border-slate-700 text-slate-200 hover:border-sky-500 hover:text-sky-500"
              >
                <Eye className="w-4 h-4" />
                Show report
              </Button>
              <Button
                variant="outline"
                className="gap-2 bg-transparent border-slate-700 text-slate-200 hover:border-sky-500 hover:text-sky-500"
              >
                <Printer className="w-4 h-4" />
                Print
              </Button>
              <Button
                variant="outline"
                className="gap-2 bg-transparent border-slate-700 text-slate-200 hover:border-sky-500 hover:text-sky-500"
              >
                <Download className="w-4 h-4" />
                Excel
              </Button>
              <Button
                variant="outline"
                className="gap-2 bg-transparent border-slate-700 text-slate-200 hover:border-sky-500 hover:text-sky-500"
              >
                <File className="w-4 h-4" />
                PDF
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reporting;
