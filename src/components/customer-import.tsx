import { nanoid } from "nanoid";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateCustomer, useNextCustomerCode } from "@/hooks/controllers/customers";
import type { NewCustomer } from "@/db/schema";

export default function CustomerImportModal({
  onClose,
}: {
  onClose?: () => void;
}) {
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>(
    {},
  );
  const [defaultType, setDefaultType] = useState<"customer" | "supplier">(
    "customer",
  );
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    failed: number;
  } | null>(null);

  const createCustomer = useCreateCustomer();
  const queryClient = useQueryClient();
  const { data: nextCodeBase } = useNextCustomerCode();

  const fields = [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "taxNumber", label: "Tax Number" },
    { key: "address", label: "Address" },
    { key: "country", label: "Country" },
    { key: "phoneNumber", label: "Phone Number" },
    { key: "email", label: "Email" },
    { key: "type", label: "Type (customer/supplier)" },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
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
    setImportResult(null);

    // Auto-map common columns
    const mapping: Record<string, string> = {};
    headers.forEach((h) => {
      const lower = h.toLowerCase();
      if (lower.includes("code")) mapping.code = h;
      else if (lower.includes("name")) mapping.name = h;
      else if (lower.includes("tax")) mapping.taxNumber = h;
      else if (lower.includes("address") || lower.includes("street"))
        mapping.address = h;
      else if (lower.includes("country")) mapping.country = h;
      else if (lower.includes("phone")) mapping.phoneNumber = h;
      else if (lower.includes("email")) mapping.email = h;
      else if (lower.includes("type") || lower.includes("supplier"))
        mapping.type = h;
    });
    setColumnMapping(mapping);
  };

  const handleImport = async () => {
    if (!parsedData.length || !columnMapping.name) return;
    setIsImporting(true);
    setImportResult(null);
    let currentCode = parseInt(nextCodeBase || "1", 10);
    let imported = 0;
    let failed = 0;

    for (const row of parsedData) {
      const name = row[columnMapping.name]?.trim();
      if (!name) {
        failed++;
        continue;
      }

      let code = columnMapping.code ? row[columnMapping.code]?.trim() : "";
      if (!code) {
        code = currentCode.toString();
        currentCode++;
      }

      const typeRaw = (
        columnMapping.type ? row[columnMapping.type] : ""
      )
        ?.toString()
        .trim()
        .toLowerCase();
      const isCustomer =
        typeRaw === "supplier"
          ? false
          : typeRaw === "customer"
            ? true
            : defaultType === "customer";

      const customerData: NewCustomer = {
        id: nanoid(),
        name,
        code,
        taxNumber: columnMapping.taxNumber
          ? row[columnMapping.taxNumber] || null
          : null,
        streetName: columnMapping.address
          ? row[columnMapping.address] || null
          : null,
        country: columnMapping.country
          ? row[columnMapping.country] || null
          : null,
        phoneNumber: columnMapping.phoneNumber
          ? row[columnMapping.phoneNumber] || null
          : null,
        email: columnMapping.email ? row[columnMapping.email] || null : null,
        active: true,
        customer: isCustomer,
        createdAt: new Date(),
      };

      try {
        await createCustomer.mutateAsync(customerData);
        imported++;
      } catch (error) {
        console.error("Failed to import row", row, error);
        failed++;
      }
    }

    queryClient.invalidateQueries({ queryKey: ["customers"] });
    setImportResult({ imported, failed });
    setIsImporting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-1000 flex items-center justify-center p-4">
      <div className="w-full max-w-[1200px] h-full max-h-[720px] bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-700">
          <h2 className="font-medium">Import Customers &amp; Suppliers</h2>
          <button
            className="text-xl text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:text-white"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Info box */}
        <div className="m-4 border border-amber-600 bg-stone-100 dark:bg-stone-700/40 p-4 flex gap-3">
          <span className="text-amber-500 text-xl">ℹ</span>
          <p className="text-sm text-stone-800 dark:text-stone-200">
            Import customers and suppliers from a CSV file. Map the columns
            below, then choose a default type for rows that don't specify one.
          </p>
        </div>

        {/* File upload + default type */}
        <div className="px-4 py-2 border-b border-stone-200 dark:border-stone-700 flex items-center gap-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
          />
          <div className="flex items-center gap-2 ml-auto">
            <label className="text-xs text-stone-500 dark:text-stone-400">
              Default type
            </label>
            <select
              value={defaultType}
              onChange={(e) =>
                setDefaultType(e.target.value as "customer" | "supplier")
              }
              className="bg-stone-100 dark:bg-stone-700 border border-stone-600 text-sm px-2 py-1.5 rounded focus:outline-none focus:border-amber-500"
            >
              <option value="customer">Customer</option>
              <option value="supplier">Supplier</option>
            </select>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 px-4 pb-4 gap-4 overflow-hidden">
          {/* Left mapping panel */}
          <div className="w-[420px] border-r border-stone-200 dark:border-stone-700 pr-4 overflow-y-auto">
            {fields.map((field) => (
              <div key={field.key} className="mb-3">
                <label className="text-xs text-stone-500 dark:text-stone-400 block mb-1">
                  {field.label}
                  {field.key === "name" && (
                    <span className="text-red-500"> *</span>
                  )}
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
                disabled={
                  !parsedData.length || !columnMapping.name || isImporting
                }
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
              <p className="text-stone-500">Upload a CSV file to see preview</p>
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
