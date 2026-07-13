import { useCallback, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Folder, Loader2 } from "lucide-react";
import { getNodeChildren, useNodeChildren } from "@/hooks/controllers/nodes";
import { cn } from "@/lib/utils";
import type { Node } from "@/db/schema";

type ProductGroupTreeProps = {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  allValue?: string | null;
  allLabel?: string;
  className?: string;
  height?: number | string;
};

type VisibleRow =
  | { type: "all"; id: string; depth: 0; label: string }
  | { type: "node"; node: Node; depth: number }
  | { type: "loading"; id: string; depth: number };

const ROW_HEIGHT = 30;
const OVERSCAN = 8;

export function ProductGroupTree({
  selectedId,
  onSelect,
  allValue = null,
  allLabel = "All groups",
  className,
  height = "100%",
}: ProductGroupTreeProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [childrenByParent, setChildrenByParent] = useState<
    Record<string, Node[]>
  >({});
  const [loading, setLoading] = useState<Set<string>>(new Set());

  const rootsQuery = useNodeChildren(null);
  const roots = rootsQuery.data ?? [];

  const loadChildren = useCallback(async (nodeId: string) => {
    if (childrenByParent[nodeId] || loading.has(nodeId)) return;
    setLoading((prev) => new Set(prev).add(nodeId));
    try {
      const children = await getNodeChildren(nodeId);
      setChildrenByParent((prev) => ({ ...prev, [nodeId]: children }));
    } finally {
      setLoading((prev) => {
        const next = new Set(prev);
        next.delete(nodeId);
        return next;
      });
    }
  }, [childrenByParent, loading]);

  const toggle = useCallback(
    async (nodeId: string) => {
      if (expanded.has(nodeId)) {
        setExpanded((prev) => {
          const next = new Set(prev);
          next.delete(nodeId);
          return next;
        });
        return;
      }

      setExpanded((prev) => new Set(prev).add(nodeId));
      await loadChildren(nodeId);
    },
    [expanded, loadChildren],
  );

  const rows = useMemo(() => {
    const visible: VisibleRow[] = [
      { type: "all", id: "__all__", depth: 0, label: allLabel },
    ];

    function append(nodes: Node[], depth: number) {
      for (const node of nodes) {
        visible.push({ type: "node", node, depth });
        if (expanded.has(node.id)) {
          if (loading.has(node.id)) {
            visible.push({ type: "loading", id: node.id, depth: depth + 1 });
          }
          const children = childrenByParent[node.id] ?? [];
          append(children, depth + 1);
        }
      }
    }

    append(roots, 0);
    return visible;
  }, [allLabel, childrenByParent, expanded, loading, roots]);

  const viewportHeight =
    typeof height === "number" ? height : scrollRef.current?.clientHeight ?? 420;
  const totalHeight = rows.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN * 2;
  const endIndex = Math.min(rows.length, startIndex + visibleCount);
  const virtualRows = rows.slice(startIndex, endIndex);

  if (rootsQuery.isLoading) {
    return (
      <div className={cn("px-3 py-2 text-xs text-stone-500", className)}>
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading groups
        </span>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className={cn("overflow-auto", className)}
      style={{ height }}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div className="relative" style={{ height: totalHeight }}>
        <div
          className="absolute left-0 right-0 top-0"
          style={{ transform: `translateY(${startIndex * ROW_HEIGHT}px)` }}
        >
          {virtualRows.map((row) => {
            if (row.type === "all") {
              const isSelected = selectedId === allValue;
              return (
                <button
                  key={row.id}
                  onClick={() => onSelect(allValue)}
                  className={cn(
                    "flex h-[30px] w-full items-center gap-1.5 rounded px-2 text-left text-xs transition-colors",
                    isSelected
                      ? "bg-amber-600/20 text-amber-400"
                      : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100",
                  )}
                >
                  <span className="w-3 shrink-0" />
                  <Folder className="h-3.5 w-3.5 shrink-0 text-amber-400/70" />
                  <span className="truncate">{row.label}</span>
                </button>
              );
            }

            if (row.type === "loading") {
              return (
                <div
                  key={`loading-${row.id}`}
                  className="flex h-[30px] items-center gap-2 px-2 text-xs text-stone-500"
                  style={{ paddingLeft: 8 + row.depth * 14 }}
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Loading group</span>
                </div>
              );
            }

            const isOpen = expanded.has(row.node.id);
            const isNodeLoading = loading.has(row.node.id);
            const isSelected = selectedId === row.node.id;

            return (
              <button
                key={row.node.id}
                onClick={() => onSelect(row.node.id)}
                onDoubleClick={() => void toggle(row.node.id)}
                className={cn(
                  "flex h-[30px] w-full items-center gap-1.5 rounded pr-2 text-left text-xs transition-colors",
                  isSelected
                    ? "bg-amber-600/20 text-amber-400"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100",
                )}
                style={{ paddingLeft: 8 + row.depth * 14 }}
              >
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(event) => {
                    event.stopPropagation();
                    void toggle(row.node.id);
                  }}
                  className="inline-flex h-4 w-4 shrink-0 items-center justify-center"
                >
                  {isNodeLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </span>
                <Folder className="h-3.5 w-3.5 shrink-0 text-amber-400/70" />
                <span className="truncate">{row.node.displayName || row.node.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
