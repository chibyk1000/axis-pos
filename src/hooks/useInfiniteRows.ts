import { useEffect, useRef, useState } from "react";

/**
 * Client-side incremental rendering for tables whose data hook already
 * loads every row at once: only the first `chunkSize` rows are rendered,
 * and scrolling near the bottom of the container reveals the next chunk.
 *
 * This keeps the DOM small on unbounded tables (documents, sales history,
 * stock) without rewriting each controller into DB-level pagination the way
 * the Products page does. Usage:
 *
 * ```tsx
 * const { visibleRows, containerRef, sentinelRef, hasMore } =
 *   useInfiniteRows(filteredRows, 50);
 * // <div ref={containerRef} className="flex-1 min-h-0 overflow-auto">
 * //   <table>… {visibleRows.map(…)} …</table>
 * //   {hasMore && <div ref={sentinelRef} />}
 * // </div>
 * ```
 *
 * The visible count resets whenever the row array identity changes (new
 * filter/search results), so a fresh result set starts from the top again.
 */
export function useInfiniteRows<T>(rows: T[], chunkSize = 50) {
  const [visibleCount, setVisibleCount] = useState(chunkSize);
  const containerRef = useRef<HTMLDivElement>(null);
  // Sentinel is typed loosely so it can sit on a <tr>, <div>, etc.
  const sentinelRef = useRef<any>(null);

  useEffect(() => {
    setVisibleCount(chunkSize);
  }, [rows, chunkSize]);

  const hasMore = visibleCount < rows.length;

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    const root = containerRef.current;
    if (!sentinel || !root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + chunkSize, rows.length));
        }
      },
      { root, rootMargin: "300px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, rows.length, chunkSize, visibleCount]);

  return {
    visibleRows: rows.slice(0, visibleCount),
    containerRef,
    sentinelRef,
    hasMore,
  };
}
