

import {
  X,
  ChevronLeftIcon,
  RefreshCw,
  Search,
  ChevronRight,
  Folder,
  FolderOpen,
  Clock,
  Printer,
  FileText,
  ClipboardList,
  Zap,
  HelpCircle,
  ArrowUpCircle,
  ArrowDownCircle,
  SlidersHorizontal,
  CheckCircle2,
  Sheet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

// PDF
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";

// Excel
import * as XLSX from "xlsx";

// Tauri v2
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { open } from "@tauri-apps/plugin-shell";

import { useProducts } from "@/hooks/controllers/products";
import { useRootNodes } from "@/hooks/controllers/nodes";
import {
  useStockLevels,
  useAllStockHistory,
  useAddStockEntry,
} from "@/hooks/controllers/stocks";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TreeNode {
  id: string;
  name: string;
  displayName?: string | null;
  parentId: string | null;
  children: TreeNode[];
  products: any[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function collectProductIds(node: TreeNode): Set<string> {
  const ids = new Set<string>();
  node.products?.forEach((p: any) => ids.add(p.id));
  node.children?.forEach((child) =>
    collectProductIds(child).forEach((id) => ids.add(id)),
  );
  return ids;
}

// ─── PDF styles ───────────────────────────────────────────────────────────────

const pdfStyles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#1e293b" },
  title: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  subtitle: { fontSize: 9, color: "#64748b", marginBottom: 16 },
  thead: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  trow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  th: { fontWeight: "bold", color: "#475569" },
  c0: { width: "12%" },
  c1: { width: "30%" },
  c2: { width: "10%", textAlign: "right" },
  c3: { width: "8%" },
  c4: { width: "13%", textAlign: "right" },
  c5: { width: "13%", textAlign: "right" },
  c6: { width: "14%", textAlign: "right" },
  footer: {
    marginTop: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 32,
  },
  fblock: { alignItems: "flex-end" },
  flabel: { color: "#64748b", fontSize: 8 },
  fvalue: { fontWeight: "bold", fontSize: 10 },
});

function StockPdfDoc({
  products,
  stockLevels,
  generatedAt,
}: {
  products: any[];
  stockLevels: Record<string, number>;
  generatedAt: string;
}) {
  const N = "\u20A6"; // ₦
  const totalCost = products.reduce(
    (s, p) => s + p.cost * Math.max(0, stockLevels[p.id] ?? 0),
    0,
  );
  const totalSale = products.reduce(
    (s, p) => s + p.salePrice * Math.max(0, stockLevels[p.id] ?? 0),
    0,
  );

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={pdfStyles.page}>
        <Text style={pdfStyles.title}>Stock Report</Text>
        <Text style={pdfStyles.subtitle}>Generated: {generatedAt}</Text>

        <View style={pdfStyles.thead}>
          {[
            { l: "Code", s: pdfStyles.c0 },
            { l: "Name", s: pdfStyles.c1 },
            { l: "Qty", s: pdfStyles.c2 },
            { l: "Unit", s: pdfStyles.c3 },
            { l: "Cost price", s: pdfStyles.c4 },
            { l: "Stock value", s: pdfStyles.c5 },
            { l: "Sale price", s: pdfStyles.c6 },
          ].map(({ l, s }) => (
            <Text key={l} style={[pdfStyles.th, s]}>
              {l}
            </Text>
          ))}
        </View>

        {products.map((p) => {
          const qty = stockLevels[p.id] ?? 0;
          return (
            <View key={p.id} style={pdfStyles.trow}>
              <Text style={pdfStyles.c0}>{p.code}</Text>
              <Text style={pdfStyles.c1}>{p.title}</Text>
              <Text style={pdfStyles.c2}>{qty}</Text>
              <Text style={pdfStyles.c3}>{p.unit}</Text>
              <Text style={pdfStyles.c4}>
                {N}
                {p.cost.toFixed(2)}
              </Text>
              <Text style={pdfStyles.c5}>
                {N}
                {(qty * p.cost).toFixed(2)}
              </Text>
              <Text style={pdfStyles.c6}>
                {N}
                {p.salePrice.toFixed(2)}
              </Text>
            </View>
          );
        })}

        <View style={pdfStyles.footer}>
          <View style={pdfStyles.fblock}>
            <Text style={pdfStyles.flabel}>Stock value (cost)</Text>
            <Text style={pdfStyles.fvalue}>
              {N}
              {totalCost.toFixed(2)}
            </Text>
          </View>
          <View style={pdfStyles.fblock}>
            <Text style={pdfStyles.flabel}>Stock value (sale)</Text>
            <Text style={pdfStyles.fvalue}>
              {N}
              {totalSale.toFixed(2)}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

// ─── Tree Node ────────────────────────────────────────────────────────────────

function TreeItem({
  node,
  depth,
  selectedId,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = node.children?.length > 0;
  const isSelected = selectedId === node.id;

  return (
    <div>
      <div
        onClick={() => {
          onSelect(node.id);
          if (hasChildren) setExpanded((e) => !e);
        }}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        className={`flex items-center gap-1.5 pr-3 py-1.5 cursor-pointer rounded mx-1 transition-colors text-xs
          ${isSelected ? "bg-sky-600/25 text-sky-400" : "hover:bg-slate-700 text-slate-300"}`}
      >
        <span className="w-3 shrink-0">
          {hasChildren && (
            <ChevronRight
              className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`}
            />
          )}
        </span>
        {expanded && hasChildren ? (
          <FolderOpen className="w-3.5 h-3.5 shrink-0 text-amber-400" />
        ) : (
          <Folder className="w-3.5 h-3.5 shrink-0 text-amber-500/70" />
        )}
        <span className="truncate flex-1">{node.displayName || node.name}</span>
        {node.products?.length > 0 && (
          <span className="text-[10px] text-slate-500 shrink-0">
            {node.products.length}
          </span>
        )}
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Stock History Dialog ─────────────────────────────────────────────────────

function StockHistoryDialog({
  history,
  isLoading,
  onClose,
}: {
  history: any[];
  isLoading: boolean;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return history;
    return history.filter(
      (e) =>
        e.product?.title?.toLowerCase().includes(q) ||
        e.product?.code?.toLowerCase().includes(q) ||
        (e.note ?? "").toLowerCase().includes(q),
    );
  }, [history, search]);

  const typeConfig: Record<
    string,
    { icon: React.ReactNode; label: string; cls: string }
  > = {
    in: {
      icon: <ArrowUpCircle className="w-3.5 h-3.5" />,
      label: "Stock In",
      cls: "text-emerald-400",
    },
    out: {
      icon: <ArrowDownCircle className="w-3.5 h-3.5" />,
      label: "Stock Out",
      cls: "text-red-400",
    },
    adjustment: {
      icon: <SlidersHorizontal className="w-3.5 h-3.5" />,
      label: "Adjustment",
      cls: "text-amber-400",
    },
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-180 max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            <span className="font-semibold text-slate-100">Stock History</span>
            <span className="text-xs text-slate-500 ml-1">
              ({filtered.length} entries)
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 border border-slate-700">
            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product or note…"
              className="flex-1 bg-transparent text-sm outline-none placeholder-slate-500 text-slate-100"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-slate-500 gap-2 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm py-16">
              No stock entries found
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-800 border-b border-slate-700">
                <tr>
                  {["Date", "Product", "Type", "Qty", "Note"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-xs font-medium text-slate-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => {
                  const cfg = typeConfig[entry.type] ?? typeConfig.adjustment;
                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="text-xs font-medium text-slate-200">
                          {entry.product?.title ?? "—"}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {entry.product?.code}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className={`flex items-center gap-1.5 ${cfg.cls}`}>
                          {cfg.icon}
                          <span className="text-xs">{cfg.label}</span>
                        </div>
                      </td>
                      <td
                        className={`px-4 py-2.5 font-mono tabular-nums font-semibold text-sm ${entry.quantity > 0 ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {entry.quantity > 0 ? "+" : ""}
                        {entry.quantity}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-400">
                        {entry.note ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg px-4 py-1.5 text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Quick Inventory Calculator ───────────────────────────────────────────────

function QuickInventoryDialog({
  product,
  currentStock,
  onConfirm,
  onClose,
}: {
  product: any;
  currentStock: number;
  onConfirm: (
    qty: number,
    type: "in" | "out" | "adjustment",
    note: string,
  ) => void;
  onClose: () => void;
}) {
  const [display, setDisplay] = useState("0");
  const [expr, setExpr] = useState("");
  const [hasResult, setHasResult] = useState(false);
  const [type, setType] = useState<"in" | "out" | "adjustment">("in");
  const [note, setNote] = useState("");

  const handle = (val: string) => {
    if (val === "C") {
      setDisplay("0");
      setExpr("");
      setHasResult(false);
      return;
    }
    if (val === "⌫") {
      if (hasResult) {
        setDisplay("0");
        setExpr("");
        setHasResult(false);
        return;
      }
      setDisplay((p) => (p.length > 1 ? p.slice(0, -1) : "0"));
      return;
    }
    if (val === "=") {
      try {
        // eslint-disable-next-line no-eval
        const result = eval(display.replace(/×/g, "*").replace(/÷/g, "/"));
        setExpr(display + " =");
        setDisplay(String(parseFloat(result.toFixed(4))));
        setHasResult(true);
      } catch {
        setDisplay("Error");
        setHasResult(true);
      }
      return;
    }
    if (["+", "-", "×", "÷"].includes(val)) {
      if (hasResult) {
        setDisplay(display + val);
        setExpr("");
        setHasResult(false);
        return;
      }
      setDisplay((p) =>
        ["+", "-", "×", "÷"].includes(p.slice(-1))
          ? p.slice(0, -1) + val
          : p + val,
      );
      return;
    }
    if (val === ".") {
      const parts = display.split(/[+\-×÷]/);
      if (parts[parts.length - 1].includes(".")) return;
      setDisplay((p) => p + ".");
      return;
    }
    if (hasResult) {
      setDisplay(val);
      setExpr("");
      setHasResult(false);
      return;
    }
    setDisplay((p) => (p === "0" ? val : p + val));
  };

  const confirm = () => {
    const qty = parseFloat(display);
    if (isNaN(qty) || qty === 0) return;
    onConfirm(qty, type, note);
  };

  const btnCls = (v: string) => {
    if (v === "C") return "bg-red-700/70 hover:bg-red-600 text-white";
    if (v === "⌫")
      return "bg-slate-700 hover:bg-slate-600 text-amber-400 text-lg";
    if (["+", "-", "×", "÷"].includes(v))
      return "bg-slate-700 hover:bg-slate-600 text-cyan-300 font-bold text-xl";
    return "bg-slate-800 hover:bg-slate-700 text-slate-100 text-lg";
  };

  const types = [
    {
      key: "in" as const,
      label: "Stock In",
      icon: ArrowUpCircle,
      active: "border-emerald-500 bg-emerald-950 text-emerald-300",
    },
    {
      key: "out" as const,
      label: "Stock Out",
      icon: ArrowDownCircle,
      active: "border-red-500 bg-red-950 text-red-300",
    },
    {
      key: "adjustment" as const,
      label: "Adjust",
      icon: SlidersHorizontal,
      active: "border-amber-500 bg-amber-950 text-amber-300",
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-90 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-slate-100 text-sm">
                Quick Inventory
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-65">
              {product.title}
              <span className="text-slate-600 ml-2">stock: {currentStock}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Type toggle */}
        <div className="px-4 pt-4 grid grid-cols-3 gap-2">
          {types.map(({ key, label, icon: Icon, active }) => (
            <button
              key={key}
              onClick={() => setType(key)}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                type === key
                  ? active
                  : "border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Display */}
        <div className="mx-4 mt-3 bg-slate-950 rounded-xl px-4 py-3 border border-slate-800">
          {expr && (
            <div className="text-slate-500 text-xs text-right h-4 truncate">
              {expr}
            </div>
          )}
          <div
            className={`text-right font-mono font-semibold tracking-tight leading-none truncate mt-0.5
            ${display.length > 10 ? "text-2xl" : display.length > 7 ? "text-3xl" : "text-4xl"}
            ${display === "Error" ? "text-red-400" : "text-slate-100"}`}
          >
            {display}
          </div>
        </div>

        {/* Keypad */}
        <div className="px-4 pt-3 grid grid-cols-4 gap-2">
          {["C", "⌫", "÷", "×"].map((v) => (
            <button
              key={v}
              onClick={() => handle(v)}
              className={`rounded-xl h-12 font-semibold transition-colors ${btnCls(v)}`}
            >
              {v}
            </button>
          ))}
          {["7", "8", "9"].map((v) => (
            <button
              key={v}
              onClick={() => handle(v)}
              className={`rounded-xl h-12 font-semibold transition-colors ${btnCls(v)}`}
            >
              {v}
            </button>
          ))}
          <button
            onClick={() => handle("-")}
            className={`rounded-xl h-12 font-semibold transition-colors ${btnCls("-")}`}
          >
            −
          </button>
          {["4", "5", "6"].map((v) => (
            <button
              key={v}
              onClick={() => handle(v)}
              className={`rounded-xl h-12 font-semibold transition-colors ${btnCls(v)}`}
            >
              {v}
            </button>
          ))}
          <button
            onClick={() => handle("+")}
            className={`rounded-xl h-12 font-semibold transition-colors ${btnCls("+")}`}
          >
            +
          </button>
          {["1", "2", "3"].map((v) => (
            <button
              key={v}
              onClick={() => handle(v)}
              className={`rounded-xl h-12 font-semibold transition-colors ${btnCls(v)}`}
            >
              {v}
            </button>
          ))}
          {/* confirm spans 2 rows */}
          <button
            onClick={confirm}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors flex items-center justify-center"
            style={{ gridRow: "span 2", minHeight: "104px" }}
          >
            <CheckCircle2 className="w-7 h-7" />
          </button>
          {[".", "0", "00"].map((v) => (
            <button
              key={v}
              onClick={() => handle(v)}
              className={`rounded-xl h-12 font-semibold transition-colors ${btnCls(v)}`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Note */}
        <div className="px-4 py-4">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note…"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 placeholder-slate-500"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Product Picker ───────────────────────────────────────────────────────────

function ProductPickerDialog({
  products,
  stockLevels,
  onSelect,
  onClose,
}: {
  products: any[];
  stockLevels: Record<string, number>;
  onSelect: (p: any) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = products.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-120 max-h-[70vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-slate-100 text-sm">
              Quick Inventory — Select Product
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 border border-slate-700">
            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product…"
              className="flex-1 bg-transparent text-sm outline-none placeholder-slate-500 text-slate-100"
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {filtered.map((p) => {
            const stock = stockLevels[p.id] ?? 0;
            return (
              <button
                key={p.id}
                onClick={() => onSelect(p)}
                className="w-full px-4 py-3 text-left hover:bg-slate-800 border-b border-slate-800/60 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      {p.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {p.code} · {p.unit}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-mono font-semibold ${stock < 0 ? "text-red-400" : stock === 0 ? "text-slate-500" : "text-emerald-400"}`}
                  >
                    {stock}
                  </span>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-center text-slate-500 text-sm py-8">
              No products found
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function StockView() {
  const navigate = useNavigate();
  const productsQuery = useProducts();
  const nodesQuery = useRootNodes();
  const stockLevelsQuery = useStockLevels();
  const stockHistoryQuery = useAllStockHistory();
  const addStockEntry = useAddStockEntry();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [quickInventoryProduct, setQuickInventoryProduct] = useState<
    any | null
  >(null);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [savingPdf, setSavingPdf] = useState(false);
  const [savingExcel, setSavingExcel] = useState(false);

  const allProducts = productsQuery.data ?? [];
  const rootNodes = (nodesQuery.data ?? []) as TreeNode[];
  const stockLevels = stockLevelsQuery.data ?? {};

  const nodeMap = useMemo(() => {
    const map = new Map<string, TreeNode>();
    function walk(nodes: TreeNode[]) {
      nodes.forEach((n) => {
        map.set(n.id, n);
        if (n.children?.length) walk(n.children);
      });
    }
    walk(rootNodes);
    return map;
  }, [rootNodes]);

  const filteredByNode = useMemo(() => {
    if (!selectedNodeId) return allProducts;
    const node = nodeMap.get(selectedNodeId);
    if (!node) return allProducts;
    const ids = collectProductIds(node);
    return allProducts.filter((p) => ids.has(p.id));
  }, [allProducts, selectedNodeId, nodeMap]);

  const visibleProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return filteredByNode;
    return filteredByNode.filter(
      (p) =>
        p.title.toLowerCase().includes(q) || p.code.toLowerCase().includes(q),
    );
  }, [filteredByNode, searchQuery]);

  const getStock = (p: any) => stockLevels[p.id] ?? 0;

  const negativeCount = visibleProducts.filter((p) => getStock(p) < 0).length;
  const nonZeroCount = visibleProducts.filter((p) => getStock(p) !== 0).length;
  const zeroCount = visibleProducts.filter((p) => getStock(p) === 0).length;

  const totalCostValue = useMemo(
    () =>
      visibleProducts.reduce(
        (s, p) => s + p.cost * Math.max(0, getStock(p)),
        0,
      ),
    [visibleProducts, stockLevels],
  );
  const totalSaleValue = useMemo(
    () =>
      visibleProducts.reduce(
        (s, p) => s + p.salePrice * Math.max(0, getStock(p)),
        0,
      ),
    [visibleProducts, stockLevels],
  );

  const isLoading =
    productsQuery.isLoading ||
    nodesQuery.isLoading ||
    stockLevelsQuery.isLoading;

  // ── Actions ──

  const handleSavePdf = async () => {
    if (savingPdf) return;
    setSavingPdf(true);
    try {
      const filePath = await save({
        defaultPath: `stock-report-${Date.now()}.pdf`,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });
      if (!filePath) return;
      const blob = await pdf(
        <StockPdfDoc
          products={visibleProducts}
          stockLevels={stockLevels}
          generatedAt={new Date().toLocaleString()}
        />,
      ).toBlob();
      const buffer = await blob.arrayBuffer();
      await writeFile(filePath, new Uint8Array(buffer));
      await open(filePath);
    } catch (e) {
      console.error("PDF export failed:", e);
    } finally {
      setSavingPdf(false);
    }
  };

  const handleSaveExcel = async () => {
    if (savingExcel) return;
    setSavingExcel(true);
    try {
      const filePath = await save({
        defaultPath: `stock-report-${Date.now()}.xlsx`,
        filters: [{ name: "Excel Workbook", extensions: ["xlsx"] }],
      });
      if (!filePath) return;

      const rows = visibleProducts.map((p) => {
        const qty = getStock(p);
        return {
          Code: p.code,
          Name: p.title,
          Quantity: qty,
          Unit: p.unit,
          "Cost Price": p.cost,
          "Stock Value (Cost)": parseFloat((qty * p.cost).toFixed(2)),
          "Sale Price": p.salePrice,
          "Stock Value (Sale)": parseFloat((qty * p.salePrice).toFixed(2)),
          Active: p.active ? "Yes" : "No",
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 12 },
        { wch: 30 },
        { wch: 10 },
        { wch: 8 },
        { wch: 12 },
        { wch: 18 },
        { wch: 12 },
        { wch: 18 },
        { wch: 8 },
      ];

      const summaryWs = XLSX.utils.json_to_sheet([
        { Metric: "Total products", Value: visibleProducts.length },
        { Metric: "Stock value (cost)", Value: totalCostValue.toFixed(2) },
        { Metric: "Stock value (sale)", Value: totalSaleValue.toFixed(2) },
        { Metric: "Negative stock items", Value: negativeCount },
        { Metric: "Zero stock items", Value: zeroCount },
        { Metric: "Generated", Value: new Date().toLocaleString() },
      ]);
      summaryWs["!cols"] = [{ wch: 24 }, { wch: 20 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Stock");
      XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

      const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      await writeFile(filePath, new Uint8Array(buffer));
      await open(filePath);
    } catch (e) {
      console.error("Excel export failed:", e);
    } finally {
      setSavingExcel(false);
    }
  };

  const handlePrint = () => {
    const N = "₦";
    const rows = visibleProducts
      .map((p) => {
        const qty = getStock(p);
        const cls = qty < 0 ? "neg" : qty === 0 ? "zero" : "pos";
        return `<tr>
          <td>${p.code}</td><td>${p.title}</td>
          <td class="num ${cls}">${qty}</td>
          <td>${p.unit}</td>
          <td class="num">${N}${p.cost.toFixed(2)}</td>
          <td class="num">${N}${(qty * p.cost).toFixed(2)}</td>
          <td class="num">${N}${p.salePrice.toFixed(2)}</td>
        </tr>`;
      })
      .join("");

    const html = `<!DOCTYPE html><html><head><title>Stock Report</title>
<style>
  body{font-family:sans-serif;font-size:11px;color:#1e293b;margin:24px}
  h1{font-size:18px;margin-bottom:2px}
  .sub{color:#64748b;font-size:10px;margin-bottom:16px}
  table{width:100%;border-collapse:collapse}
  th{background:#f1f5f9;text-align:left;padding:6px 8px;font-size:10px;color:#475569;border-bottom:1px solid #e2e8f0}
  td{padding:5px 8px;border-bottom:1px solid #f1f5f9}
  .num{text-align:right;font-variant-numeric:tabular-nums}
  .neg{color:#ef4444}.zero{color:#94a3b8}.pos{color:#22c55e}
  .footer{margin-top:16px;display:flex;gap:32px;justify-content:flex-end;border-top:1px solid #e2e8f0;padding-top:12px}
  .fb{text-align:right}.fl{color:#64748b;font-size:9px}.fv{font-weight:bold;font-size:13px}
</style></head><body>
<h1>Stock Report</h1>
<div class="sub">Generated: ${new Date().toLocaleString()}</div>
<table>
  <thead><tr><th>Code</th><th>Name</th><th>Quantity</th><th>Unit</th><th>Cost price</th><th>Stock value</th><th>Sale price</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer">
  <div class="fb"><div class="fl">Stock value (cost)</div><div class="fv">₦${totalCostValue.toFixed(2)}</div></div>
  <div class="fb"><div class="fl">Stock value (sale)</div><div class="fv">₦${totalSaleValue.toFixed(2)}</div></div>
</div>
<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script>
</body></html>`;

    const win = window.open("", "_blank", "width=900,height=700");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  const handleQuickInventoryConfirm = async (
    qty: number,
    type: "in" | "out" | "adjustment",
    note: string,
  ) => {
    if (!quickInventoryProduct) return;
    const finalQty = type === "out" ? -Math.abs(qty) : Math.abs(qty);
    await addStockEntry.mutateAsync({
      productId: quickInventoryProduct.id,
      type,
      quantity: finalQty,
      note: note || null,
      createdAt: new Date(),
    });
    setQuickInventoryProduct(null);
  };

  const tbtn =
    "flex items-center gap-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700 px-2.5 py-1.5 rounded transition-colors whitespace-nowrap shrink-0 disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-200 h-full overflow-hidden">
      {/* Dialogs */}
      {showHistory && (
        <StockHistoryDialog
          history={stockHistoryQuery.data ?? []}
          isLoading={stockHistoryQuery.isLoading}
          onClose={() => setShowHistory(false)}
        />
      )}
      {showProductPicker && (
        <ProductPickerDialog
          products={allProducts}
          stockLevels={stockLevels}
          onSelect={(p) => {
            setShowProductPicker(false);
            setQuickInventoryProduct(p);
          }}
          onClose={() => setShowProductPicker(false)}
        />
      )}
      {quickInventoryProduct && (
        <QuickInventoryDialog
          product={quickInventoryProduct}
          currentStock={stockLevels[quickInventoryProduct.id] ?? 0}
          onConfirm={handleQuickInventoryConfirm}
          onClose={() => setQuickInventoryProduct(null)}
        />
      )}

      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1 rounded hover:bg-slate-700 transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <span className="text-sm">
            <span className="text-slate-400">Management •</span> Stock
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              productsQuery.refetch();
              nodesQuery.refetch();
              stockLevelsQuery.refetch();
            }}
            className="p-1.5 rounded hover:bg-slate-700 transition-colors"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-slate-800 border-b border-slate-700 px-3 py-2 flex items-center gap-0.5 overflow-x-auto shrink-0">
        <button
          onClick={() => {
            productsQuery.refetch();
            nodesQuery.refetch();
            stockLevelsQuery.refetch();
          }}
          className={tbtn}
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
        <div className="w-px h-5 bg-slate-700 mx-1.5 shrink-0" />
        <button onClick={() => setShowHistory(true)} className={tbtn}>
          <Clock className="w-3.5 h-3.5" /> Stock history
        </button>
        <div className="w-px h-5 bg-slate-700 mx-1.5 shrink-0" />
        <button onClick={handlePrint} className={tbtn}>
          <Printer className="w-3.5 h-3.5" /> Print
        </button>
        <button onClick={handleSavePdf} disabled={savingPdf} className={tbtn}>
          <FileText className="w-3.5 h-3.5" />
          {savingPdf ? "Saving…" : "Save as PDF"}
        </button>
        <button
          onClick={handleSaveExcel}
          disabled={savingExcel}
          className={tbtn}
        >
          <Sheet className="w-3.5 h-3.5" />
          {savingExcel ? "Saving…" : "Excel"}
        </button>
        <div className="w-px h-5 bg-slate-700 mx-1.5 shrink-0" />
        <button className={tbtn}>
          <ClipboardList className="w-3.5 h-3.5" /> Inventory count report
        </button>
        <button onClick={() => setShowProductPicker(true)} className={tbtn}>
          <Zap className="w-3.5 h-3.5" /> Quick inventory
        </button>
        <button className={`${tbtn} ml-auto`}>
          <HelpCircle className="w-3.5 h-3.5" /> Help
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <div className="w-56 bg-slate-800 border-r border-slate-700 flex flex-col overflow-hidden shrink-0">
          <div className="px-3 py-2.5 border-b border-slate-700 shrink-0">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Product Groups
            </span>
          </div>
          <div className="flex-1 overflow-y-auto py-1.5">
            <div
              onClick={() => setSelectedNodeId(null)}
              className={`flex items-center gap-1.5 px-3 py-1.5 mx-1 cursor-pointer rounded transition-colors text-xs
                ${selectedNodeId === null ? "bg-sky-600/25 text-sky-400" : "hover:bg-slate-700 text-slate-300"}`}
            >
              <span className="w-3 shrink-0" />
              <Folder className="w-3.5 h-3.5 shrink-0 text-sky-400/70" />
              <span className="flex-1">All products</span>
              <span className="text-[10px] text-slate-500">
                {allProducts.length}
              </span>
            </div>
            {nodesQuery.isLoading ? (
              <div className="px-4 py-3 text-xs text-slate-500">Loading…</div>
            ) : rootNodes.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-500">No groups</div>
            ) : (
              rootNodes.map((node) => (
                <TreeItem
                  key={node.id}
                  node={node}
                  depth={0}
                  selectedId={selectedNodeId}
                  onSelect={setSelectedNodeId}
                />
              ))
            )}
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Filter bar */}
          <div className="bg-slate-800 border-b border-slate-700 px-5 py-3 space-y-2.5 shrink-0">
            <div className="flex items-center gap-5 flex-wrap">
              <StatusBadge
                color="bg-red-500"
                label="Negative quantity"
                count={negativeCount}
              />
              <StatusBadge
                color="bg-sky-500"
                label="Non zero quantity"
                count={nonZeroCount}
              />
              <StatusBadge
                color="bg-emerald-500"
                label="Zero quantity"
                count={zeroCount}
              />
            </div>
            <div className="flex items-center gap-2 bg-slate-900 rounded px-3 py-2 border border-slate-700">
              <Search className="w-4 h-4 text-slate-500 shrink-0" />
              <input
                type="text"
                placeholder="Search by name or code…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none placeholder-slate-500 min-w-0"
              />
              <span className="text-xs text-slate-500 shrink-0">
                {visibleProducts.length} product
                {visibleProducts.length !== 1 ? "s" : ""}
              </span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            {productsQuery.isLoading ? (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Loading products…
              </div>
            ) : productsQuery.isError ? (
              <div className="flex items-center justify-center h-full text-sm gap-1">
                <span className="text-red-400">Failed to load.</span>
                <button
                  onClick={() => productsQuery.refetch()}
                  className="text-red-400 underline"
                >
                  Retry
                </button>
              </div>
            ) : visibleProducts.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                No products found
              </div>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-800 border-b border-slate-700">
                  <tr>
                    {[
                      "Code",
                      "Name",
                      "Quantity",
                      "Unit",
                      "Cost price",
                      "Stock value",
                      "Sale price",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left text-xs font-medium text-slate-400"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleProducts.map((p) => {
                    const stock = getStock(p);
                    return (
                      <tr
                        key={p.id}
                        className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors group"
                      >
                        <td className="px-4 py-2.5 text-xs text-slate-400 font-mono">
                          {p.code}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-medium text-slate-200">
                            {p.title}
                          </span>
                          {!p.active && (
                            <span className="ml-2 text-[10px] bg-slate-700 text-slate-400 rounded px-1.5 py-0.5 align-middle">
                              inactive
                            </span>
                          )}
                        </td>
                        <td
                          className={`px-4 py-2.5 text-right font-mono tabular-nums font-semibold ${stock < 0 ? "text-red-400" : stock === 0 ? "text-slate-500" : "text-emerald-400"}`}
                        >
                          {stock}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-400">
                          {p.unit}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-300">
                          ₦{p.cost.toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-300">
                          ₦{(stock * p.cost).toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-300">
                          ₦{p.salePrice.toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 w-12">
                          <button
                            onClick={() => setQuickInventoryProduct(p)}
                            title="Quick inventory"
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-600 text-amber-400"
                          >
                            <Zap className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="bg-slate-800 border-t border-slate-700 px-6 py-3 shrink-0">
            <div className="flex justify-end gap-12">
              <SummaryBlock
                title="Cost"
                rows={[
                  ["Stock value (cost):", `₦${totalCostValue.toFixed(2)}`],
                ]}
              />
              <SummaryBlock
                title="Sale"
                rows={[
                  ["Stock value (sale):", `₦${totalSaleValue.toFixed(2)}`],
                ]}
              />
              <SummaryBlock
                title="Filtered"
                rows={[
                  [
                    "Products shown:",
                    `${visibleProducts.length} / ${allProducts.length}`,
                  ],
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function StatusBadge({
  color,
  label,
  count,
}: {
  color: string;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-6 h-6 ${color} rounded flex items-center justify-center text-xs text-white font-bold shrink-0`}
      >
        {count}
      </span>
      <span className="text-xs text-slate-300">{label}</span>
    </div>
  );
}

function SummaryBlock({
  title,
  rows,
}: {
  title: string;
  rows: [string, string][];
}) {
  return (
    <div>
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
        {title}
      </div>
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-8">
          <span className="text-xs text-slate-400">{label}</span>
          <span className="text-xs font-medium text-slate-200 font-mono tabular-nums">
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}
