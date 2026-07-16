import { nanoid } from "nanoid";
import { useCreateProduct, useNextProductCode } from "@/hooks/controllers/products";
import { useUpsertProductPrice } from "@/hooks/controllers/priceLists";
import { useCreateBarcode } from "@/hooks/controllers/barcodes";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ROOT_NODE_ID } from "@/db/constants";

/** Splits one CSV line into fields, respecting double-quoted values so a
 * quoted comma (e.g. a product name like "Bag, Small") doesn't get treated
 * as a column separator. Handles the `""` escaped-quote convention too. */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export default function ImportModal({ onClose }: { onClose?: () => void }) {
  const [tab, setTab] = useState("csv");
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>(
    {},
  );
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    failed: number;
  } | null>(null);

  const createProduct = useCreateProduct();
  const upsertPrice = useUpsertProductPrice();
  const createBarcode = useCreateBarcode();
  const queryClient = useQueryClient();
  const { data: nextCodeBase } = useNextProductCode();

  const fields = [
    { key: "code", label: "Code" },
    { key: "title", label: "Name", required: true },
    { key: "cost", label: "Cost" },
    { key: "salePrice", label: "Sale Price" },
    { key: "unit", label: "Unit" },
    { key: "active", label: "Active" },
    { key: "barcode", label: "Barcode" },
    { key: "tax", label: "Tax Name" },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (tab === "csv") {
        parseCSV(text);
      }
    };
    reader.readAsText(selectedFile);
  };

  const parseCSV = (text: string) => {
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length < 2) return;
    const headers = parseCSVLine(lines[0]);
    const rows = lines.slice(1).map((line) => {
      const values = parseCSVLine(line);
      const obj: any = {};
      headers.forEach((h, i) => (obj[h] = values[i] ?? ""));
      return obj;
    });
    setParsedData(rows);
    setImportResult(null);

    // Auto-map common columns. Order matters: "Barcode" contains "code" and
    // "Sale Price" contains "price", so the more specific keyword has to be
    // checked first or it gets swallowed by the broader one below it —
    // "Code" and "Cost" would otherwise silently end up mapped to the
    // Barcode/Sale Price columns instead (which is exactly what happened
    // before this fix, corrupting every imported product's code and cost).
    const mapping: Record<string, string> = {};
    headers.forEach((h) => {
      const lower = h.toLowerCase();
      if (lower.includes("barcode")) mapping.barcode = h;
      else if (lower.includes("code")) mapping.code = h;
      else if (lower.includes("name") || lower.includes("title"))
        mapping.title = h;
      else if (lower.includes("sale")) mapping.salePrice = h;
      else if (lower.includes("cost") || lower.includes("price"))
        mapping.cost = h;
      else if (lower.includes("unit")) mapping.unit = h;
      else if (lower.includes("active")) mapping.active = h;
      else if (lower.includes("tax")) mapping.tax = h;
    });
    setColumnMapping(mapping);
  };

  const handleImport = async () => {
    if (!parsedData.length || !columnMapping.title) return;
    setIsImporting(true);
    setImportResult(null);
    let currentCode = parseInt(nextCodeBase || "1", 10);
    let imported = 0;
    let failed = 0;

    for (const row of parsedData) {
      try {
        const title = row[columnMapping.title]?.trim();
        if (!title) {
          failed++;
          continue;
        }

        let code = columnMapping.code ? row[columnMapping.code]?.trim() : "";
        if (!code) {
          code = currentCode.toString();
          currentCode++;
        }

        // `X.toLowerCase() === "yes" || true` used to always evaluate to
        // `true` no matter what the CSV said — every imported row came in
        // active regardless of the "Active" column's value.
        const activeRaw = columnMapping.active
          ? row[columnMapping.active]?.trim().toLowerCase()
          : undefined;
        const active = activeRaw
          ? ["yes", "true", "1"].includes(activeRaw)
          : true;

        const productData = {
          id: nanoid(),
          title,
          code,
          unit: columnMapping.unit
            ? row[columnMapping.unit]?.trim() || "pcs"
            : "pcs",
          active,
          nodeId: ROOT_NODE_ID,
        };
        const product = await createProduct.mutateAsync(productData);

        if (columnMapping.cost || columnMapping.salePrice) {
          await upsertPrice.mutateAsync({
            id: nanoid(),
            productId: product.id,
            cost: parseFloat(row[columnMapping.cost]) || 0,
            salePrice: parseFloat(row[columnMapping.salePrice]) || 0,
            markup: 0,
            isDefault: true,
            label: "Retail",
          });
        }

        // Only create a barcode when the row actually has one — inserting
        // blank values for rows without a barcode would collide on the
        // column's unique constraint as soon as a second blank row came in.
        const barcodeValue = columnMapping.barcode
          ? row[columnMapping.barcode]?.trim()
          : "";
        if (barcodeValue) {
          await createBarcode.mutateAsync({
            id: nanoid(),
            productId: product.id,
            value: barcodeValue,
            type: "CODE128",
          });
        }
        // Tax would need more logic, skip for now

        imported++;
      } catch (error) {
        // A single bad row (duplicate code/barcode, etc.) used to throw out
        // of the loop entirely and abandon the rest of the import with only
        // a console.error — no indication to the user that anything failed.
        console.error("Failed to import row", row, error);
        failed++;
      }
    }

    queryClient.invalidateQueries();
    setImportResult({ imported, failed });
    setIsImporting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-1000 flex items-center justify-center p-4">
      <div className="w-full max-w-[1200px] h-full max-h-[720px] bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-700">
          <div className="flex items-center gap-2">
            <span className="text-lg">←</span>
            <h2 className="font-medium">Import</h2>
          </div>
          <button
            className="text-xl text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:text-white"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200 dark:border-stone-700 px-4">
          {["csv", "xml"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-2 text-sm font-medium uppercase
                ${
                  tab === t
                    ? "bg-amber-600 text-stone-900 dark:text-white"
                    : "text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:text-white"
                }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Info box */}
        {tab === "csv" ? (
          <div className="m-4 border border-amber-600 bg-stone-100 dark:bg-stone-700/40 p-4 flex gap-3">
            <span className="text-amber-400 text-xl">ℹ</span>
            <p className="text-sm text-stone-800 dark:text-stone-200">
              Use CSV import to load products using custom CSV file or a CSV
              exported from other application. You can read more about importing
              products using CSV files on our{" "}
              <span className="text-amber-400 underline cursor-pointer">
                support center
              </span>
              .
            </p>
          </div>
        ) : (
          <div className="m-4 border border-stone-400 dark:border-stone-600 bg-stone-100 dark:bg-stone-700/40 p-4 flex gap-3">
            <span className="text-stone-500 text-xl">ℹ</span>
            <p className="text-sm text-stone-800 dark:text-stone-200">
              XML import isn't available yet — please use the CSV tab.
            </p>
          </div>
        )}

        {/* File upload */}
        {tab === "csv" && (
          <div className="px-4 py-2 border-b border-stone-200 dark:border-stone-700">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
            />
          </div>
        )}

        {/* Body */}
        <div className="flex flex-1 px-4 pb-4 gap-4 overflow-hidden">
          {/* Left mapping panel */}
          <div className="w-[420px] border-r border-stone-200 dark:border-stone-700 pr-4 overflow-y-auto">
            {fields.map((field) => (
              <div key={field.key} className="mb-3">
                <label className="text-xs text-stone-500 dark:text-stone-400 block mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500"> *</span>}
                </label>
                <select
                  value={columnMapping[field.key] || ""}
                  onChange={(e) =>
                    setColumnMapping((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                  className="w-full bg-stone-100 dark:bg-stone-700 border border-stone-600 text-sm px-2 py-2 rounded focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Select Column --</option>
                  {parsedData.length > 0 &&
                    Object.keys(parsedData[0]).map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                </select>
              </div>
            ))}

            <p className="text-xs text-stone-500 dark:text-stone-400 mt-4">
              <span className="text-red-500">*</span> Indicates required field
            </p>

            {importResult && (
              <div className="mt-4 p-3 rounded border border-stone-600 text-sm">
                <p className="text-emerald-500">
                  Imported {importResult.imported} row
                  {importResult.imported === 1 ? "" : "s"}
                </p>
                {importResult.failed > 0 && (
                  <p className="text-red-500">
                    Failed {importResult.failed} row
                    {importResult.failed === 1 ? "" : "s"}
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleImport}
                disabled={!parsedData.length || !columnMapping.title || isImporting}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 px-4 py-2 text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? "Importing..." : "⬇ Import"}
              </button>
            </div>
          </div>

          {/* Right preview area */}
          <div className="flex-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded p-4 overflow-auto">
            <h3 className="text-sm font-medium mb-2">
              Preview ({parsedData.length} rows)
            </h3>
            {parsedData.length > 0 ? (
              <table className="w-full text-xs border-collapse border border-stone-300 dark:border-stone-600">
                <thead>
                  <tr>
                    {Object.keys(parsedData[0]).map((col) => (
                      <th
                        key={col}
                        className="border border-stone-300 dark:border-stone-600 p-1 bg-stone-100 dark:bg-stone-700"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 10).map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((val, j) => (
                        <td
                          key={j}
                          className="border border-stone-300 dark:border-stone-600 p-1"
                        >
                          {String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-stone-500">Upload a file to see preview</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-stone-200 dark:border-stone-700 flex justify-end">
          <button
            className="px-6 py-2 bg-stone-100 dark:bg-stone-700 border border-stone-600 text-sm hover:bg-stone-600"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
