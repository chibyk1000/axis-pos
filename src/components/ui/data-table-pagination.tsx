import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface DataTablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function DataTablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className = "",
}: DataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div
      className={`flex items-center justify-between px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400 shrink-0 ${className}`}
    >
      {/* Row count info */}
      <span className="shrink-0">
        {total === 0 ? "No results" : `${from}-${to} of ${total}`}
      </span>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Per-page selector */}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Rows</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-sky-500"
            >
              {pageSizeOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Page buttons */}
        <div className="flex items-center gap-0.5">
          <PaginationButton
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            title="First page"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </PaginationButton>
          <PaginationButton
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            title="Previous page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </PaginationButton>

          {/* Page number chips */}
          <PageChips page={page} totalPages={totalPages} onPageChange={onPageChange} />

          <PaginationButton
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            title="Next page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </PaginationButton>
          <PaginationButton
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
            title="Last page"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </PaginationButton>
        </div>
      </div>
    </div>
  );
}

function PaginationButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-1 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed
        text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700
        hover:text-slate-900 dark:hover:text-slate-100"
    >
      {children}
    </button>
  );
}

function PageChips({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  // Show at most 5 page chips with ellipses
  const pages: (number | "...")[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i++
    ) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center gap-0.5">
      {pages.map((p, idx) =>
        p === "..." ? (
          <span key={`ellipsis-${idx}`} className="px-1 text-slate-500">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`min-w-[24px] h-6 px-1.5 rounded text-xs transition-colors font-medium ${
              p === page
                ? "bg-sky-600 text-white"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            {p}
          </button>
        ),
      )}
    </div>
  );
}
