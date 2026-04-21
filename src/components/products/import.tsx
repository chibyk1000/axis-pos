import { nanoid } from "nanoid";
import { useCreateProduct } from "@/hooks/controllers/products";
import { useUpsertProductPrice } from "@/hooks/controllers/priceLists";
import { useCreateBarcode } from "@/hooks/controllers/barcodes";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export default function ImportModal({ onClose }: { onClose?: () => void }) {
  const [tab, setTab] = useState("csv");
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>(
    {},
  );
  const [isImporting, setIsImporting] = useState(false);

  const createProduct = useCreateProduct();
  const upsertPrice = useUpsertProductPrice();
  const createBarcode = useCreateBarcode();
  const queryClient = useQueryClient();

  const fields = [
    { key: "code", label: "Code" },
    { key: "title", label: "Name" },
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
      } else {
        parseXML();
      }
    };
    reader.readAsText(selectedFile);
  };

  const parseCSV = (text: string) => {
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length < 2) return;
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const rows = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
      const obj: any = {};
      headers.forEach((h, i) => (obj[h] = values[i] || ""));
      return obj;
    });
    setParsedData(rows);
    // Auto-map common columns
    const mapping: Record<string, string> = {};
    headers.forEach((h) => {
      const lower = h.toLowerCase();
      if (lower.includes("code")) mapping.code = h;
      else if (lower.includes("name") || lower.includes("title"))
        mapping.title = h;
      else if (lower.includes("cost") || lower.includes("price"))
        mapping.cost = h;
      else if (lower.includes("sale")) mapping.salePrice = h;
      else if (lower.includes("unit")) mapping.unit = h;
      else if (lower.includes("active")) mapping.active = h;
      else if (lower.includes("barcode")) mapping.barcode = h;
      else if (lower.includes("tax")) mapping.tax = h;
    });
    setColumnMapping(mapping);
  };

  const parseXML = () => {
    // Simple XML parsing - assume <products><product>...</product></products>
    // For simplicity, just set empty for now
    setParsedData([]);
  };

  const handleImport = async () => {
    if (!parsedData.length) return;
    setIsImporting(true);
    try {
      for (const row of parsedData) {
        const productData = {
          id: nanoid(),
          title: row[columnMapping.title] || "Unnamed",
          code: row[columnMapping.code] || "",
          unit: row[columnMapping.unit] || "pcs",
          active: row[columnMapping.active]?.toLowerCase() === "yes" || true,
          nodeId: "root", // Assume root group
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
        if (columnMapping.barcode) {
          await createBarcode.mutateAsync({
            id: nanoid(),
            productId: product.id,
            value: row[columnMapping.barcode],
            type: "CODE128",
          });
        }
        // Tax would need more logic, skip for now
      }
      queryClient.invalidateQueries();
      onClose?.();
    } catch (error) {
      console.error("Import failed", error);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-1000 flex items-center justify-center p-4">
      <div className="w-full max-w-[1200px] h-full max-h-[720px] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-lg">←</span>
            <h2 className="font-medium">Import</h2>
          </div>
          <button
            className="text-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 px-4">
          {["csv", "xml"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-2 text-sm font-medium uppercase
                ${
                  tab === t
                    ? "bg-sky-600 text-slate-900 dark:text-white"
                    : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white"
                }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Info box */}
        <div className="m-4 border border-sky-600 bg-slate-100 dark:bg-slate-700/40 p-4 flex gap-3">
          <span className="text-sky-400 text-xl">ℹ</span>
          <p className="text-sm text-slate-800 dark:text-slate-200">
            Use CSV import to load products using custom CSV file or a CSV
            exported from other application. You can read more about importing
            products using CSV files on our{" "}
            <span className="text-sky-400 underline cursor-pointer">
              support center
            </span>
            .
          </p>
        </div>

        {/* File upload */}
        <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700">
          <input
            type="file"
            accept={tab === "csv" ? ".csv" : ".xml"}
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
          />
        </div>

        {/* Body */}
        <div className="flex flex-1 px-4 pb-4 gap-4 overflow-hidden">
          {/* Left mapping panel */}
          <div className="w-[420px] border-r border-slate-200 dark:border-slate-700 pr-4 overflow-y-auto">
            {fields.map((field) => (
              <div key={field.key} className="mb-3">
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                  {field.label}
                </label>
                <select
                  value={columnMapping[field.key] || ""}
                  onChange={(e) =>
                    setColumnMapping((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                  className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-600 text-sm px-2 py-2 rounded focus:outline-none focus:border-sky-500"
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

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
              <span className="text-red-500">*</span> Indicates required field
            </p>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 px-4 py-2 text-sm border border-slate-600 hover:bg-slate-600">
                👁 Preview
              </button>

              <button
                onClick={handleImport}
                disabled={!parsedData.length || isImporting}
                className="flex items-center gap-2 bg-slate-600 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? "Importing..." : "⬇ Import"}
              </button>
            </div>
          </div>

          {/* Right preview area */}
          <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-4 overflow-auto">
            <h3 className="text-sm font-medium mb-2">
              Preview ({parsedData.length} rows)
            </h3>
            {parsedData.length > 0 ? (
              <table className="w-full text-xs border-collapse border border-slate-300 dark:border-slate-600">
                <thead>
                  <tr>
                    {Object.keys(parsedData[0]).map((col) => (
                      <th
                        key={col}
                        className="border border-slate-300 dark:border-slate-600 p-1 bg-slate-100 dark:bg-slate-700"
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
                          className="border border-slate-300 dark:border-slate-600 p-1"
                        >
                          {String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-slate-500">Upload a file to see preview</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button
            className="px-6 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-600 text-sm hover:bg-slate-600"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
