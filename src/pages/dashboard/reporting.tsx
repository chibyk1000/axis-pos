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
import { writeFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { openPath } from "@tauri-apps/plugin-opener";
import { tempDir, join } from "@tauri-apps/api/path";

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

/* ─── Print document ────────────────────────────────────────────────────────
   Printing goes through a dedicated, print-formatted HTML document (written
   to temp and opened in the default browser, which pops the print dialog).
   window.print() on the app itself printed the whole UI — sidebar, filters,
   chrome — and the bare auto-generated PDF had no title block, no filter
   summary, no totals and unreadable column names. */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** "totalAmount" / "total_amount" → "Total Amount" */
function prettifyColumn(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function formatCell(val: any): { text: string; numeric: boolean } {
  if (val === null || val === undefined) return { text: "—", numeric: false };
  if (typeof val === "boolean") return { text: val ? "✓" : "—", numeric: false };
  if (typeof val === "number")
    return {
      text: val.toLocaleString(undefined, { maximumFractionDigits: 2 }),
      numeric: true,
    };
  if (val instanceof Date) return { text: val.toLocaleString(), numeric: false };
  if (typeof val === "object") return { text: "—", numeric: false };
  return { text: String(val), numeric: false };
}

/** Columns that are numeric but meaningless to sum (identifiers etc.). */
function isSummableColumn(key: string): boolean {
  return !/(^|_| )(id|no|number|code|year|month|day|date|time)s?$/i.test(
    key.replace(/([a-z0-9])([A-Z])/g, "$1 $2"),
  );
}

function buildReportPrintHtml(
  reportName: string,
  rows: any[],
  meta: { from?: string; to?: string; customerFiltered: boolean },
): string {
  const columns = Object.keys(rows[0] ?? {});
  const numericCols = new Set(
    columns.filter((c) => rows.some((r) => typeof r[c] === "number")),
  );

  const totals = new Map<string, number>();
  for (const col of columns) {
    if (!numericCols.has(col) || !isSummableColumn(col)) continue;
    totals.set(
      col,
      rows.reduce((s, r) => s + (typeof r[col] === "number" ? r[col] : 0), 0),
    );
  }

  const headHtml = columns
    .map(
      (c) =>
        `<th class="${numericCols.has(c) ? "num" : ""}">${escapeHtml(prettifyColumn(c))}</th>`,
    )
    .join("");

  const bodyHtml = rows
    .map((row) => {
      const cells = columns
        .map((c) => {
          const { text, numeric } = formatCell(row[c]);
          return `<td class="${numeric ? "num" : ""}">${escapeHtml(text)}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("\n");

  const footHtml =
    totals.size > 0
      ? `<tfoot><tr>${columns
          .map((c, i) => {
            if (totals.has(c))
              return `<td class="num">${escapeHtml(
                totals
                  .get(c)!
                  .toLocaleString(undefined, { maximumFractionDigits: 2 }),
              )}</td>`;
            return i === 0 ? `<td>Totals</td>` : `<td></td>`;
          })
          .join("")}</tr></tfoot>`
      : "";

  const periodLine =
    meta.from || meta.to
      ? `Period: ${meta.from || "…"} – ${meta.to || "…"}`
      : "Period: all time";

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(reportName)} — Axis POS</title>
<style>
  @page { margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #1c1917; margin: 0; }
  .head { display: flex; justify-content: space-between; align-items: baseline;
          border-bottom: 2px solid #1c1917; padding-bottom: 8px; margin-bottom: 4px; }
  h1 { font-size: 18px; margin: 0; }
  .brand { font-size: 12px; color: #78716c; }
  .meta { font-size: 11px; color: #57534e; margin-bottom: 12px; display: flex; gap: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  thead { display: table-header-group; }
  th { text-align: left; background: #f5f5f4; border-bottom: 1.5px solid #a8a29e;
       padding: 5px 6px; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.03em; }
  td { padding: 4px 6px; border-bottom: 0.5px solid #e7e5e4; vertical-align: top; }
  tr { page-break-inside: avoid; }
  tbody tr:nth-child(even) { background: #fafaf9; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  tfoot td { border-top: 2px solid #1c1917; border-bottom: none; font-weight: 600; padding-top: 6px; }
  .footer { margin-top: 14px; font-size: 10px; color: #a8a29e; text-align: center; }
</style>
</head>
<body>
  <div class="head">
    <h1>${escapeHtml(reportName)}</h1>
    <span class="brand">Axis POS</span>
  </div>
  <div class="meta">
    <span>Generated: ${escapeHtml(new Date().toLocaleString())}</span>
    <span>${escapeHtml(periodLine)}</span>
    ${meta.customerFiltered ? "<span>Filtered to one customer</span>" : ""}
    <span>${rows.length} row${rows.length === 1 ? "" : "s"}</span>
  </div>
  <table>
    <thead><tr>${headHtml}</tr></thead>
    <tbody>
${bodyHtml}
    </tbody>
    ${footHtml}
  </table>
  <div class="footer">End of report — ${escapeHtml(reportName)}</div>
  <script>
    window.addEventListener("load", () => setTimeout(() => window.print(), 300));
  </script>
</body>
</html>`;
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

  const buildReportPdf = (): jsPDF | null => {
    if (!reportQuery.data || reportQuery.data.length === 0) return null;
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
    return pdf;
  };

  const exportToPDF = () => {
    const pdf = buildReportPdf();
    if (!pdf) return;
    pdf.save(`${selectedReport}-${Date.now()}.pdf`);
  };

  // Print via a dedicated print-formatted HTML document (title block,
  // period/filter summary, totals, repeating table headers on every printed
  // page) written to temp and opened in the default browser, which
  // auto-triggers its print dialog.
  const handlePrint = async () => {
    if (!selectedReport || !reportQuery.data || reportQuery.data.length === 0)
      return;
    try {
      const html = buildReportPrintHtml(selectedReport, reportQuery.data, {
        from: dateFrom || undefined,
        to: dateTo || undefined,
        customerFiltered: !!customerId,
      });
      const filename = `report-print-${Date.now()}.html`;
      await writeFile(filename, new TextEncoder().encode(html), {
        baseDir: BaseDirectory.Temp,
      });
      const tmp = await tempDir();
      await openPath(await join(tmp, filename));
    } catch (err) {
      console.error("Failed to print report:", err);
    }
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-200">
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
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
                  disabled={reportQuery.isLoading || !reportQuery.data?.length}
                  variant="outline"
                  className="gap-2 bg-transparent border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:border-amber-500 hover:text-amber-500 disabled:opacity-50"
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
              <div className="flex-1 min-h-0 overflow-auto p-6">
                {reportQuery.isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-stone-500 dark:text-stone-400">
                      Loading report...
                    </p>
                  </div>
                ) : reportQuery.data && reportQuery.data.length > 0 ? (
                  // No overflow-hidden here — it would break the sticky
                  // thead relative to the scroll container above.
                  <div className="bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10 bg-stone-100 dark:bg-stone-700 border-b border-stone-600">
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
