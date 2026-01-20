"use client";

import { useState } from "react";
import {
  Search,
  RotateCw,
  Plus,
  Pencil,
  Trash2,
  Download,
  Upload,
  HelpCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface Customer {
  code: string;
  name: string;
  taxNumber: string;
  address: string;
  country: string;
  phoneNumber: string;
  email: string;
}

const mockCustomers: Customer[] = [
  {
    code: "",
    name: "Walk-in customer",
    taxNumber: "(none)",
    address: "(none)",
    country: "",
    phoneNumber: "(none)",
    email: "(none)",
  },
];

export default function CustomersSuppliersClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const filteredCustomers = mockCustomers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-900 text-slate-200">
      {/* Header */}
      <div className="border-b border-slate-800 px-6 py-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold text-slate-100">
          Customers & Suppliers
        </h2>
      </div>

      {/* Toolbar */}
      <div className="border-b border-slate-800 px-6 py-3 flex items-center gap-2 bg-slate-800">
        {[
          { icon: RotateCw, label: "Refresh" },
          { icon: Plus, label: "Add" },
          { icon: Pencil, label: "Edit", disabled: true },
          { icon: Trash2, label: "Delete", disabled: true },
          { icon: Download, label: "Import" },
          { icon: Upload, label: "Export" },
          { icon: HelpCircle, label: "Help", mlAuto: true },
        ].map(({ icon: Icon, label, disabled, mlAuto }, idx) => (
          <button
            key={idx}
            disabled={disabled}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded text-sm transition-colors
              ${
                disabled
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:text-slate-100 hover:bg-slate-700"
              }
              ${mlAuto ? "ml-auto" : ""}
            `}
            title={label}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search Bar */}
        <div className="px-6 py-4 border-b border-slate-800">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search customers & suppliers"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:border-sky-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-slate-800 border-b border-slate-700">
              <tr>
                {[
                  "Code",
                  "Name",
                  "Tax number",
                  "Address",
                  "Country",
                  "Phone number",
                  "Email",
                  "Actions",
                ].map((col) => (
                  <th
                    key={col}
                    className="px-6 py-3 text-left text-sm font-medium text-slate-400 border-r last:border-r-0 border-slate-700"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer, index) => (
                  <tr
                    key={index}
                    className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors"
                  >
                    <td className="px-6 py-3 text-sm text-slate-400 border-r border-slate-700">
                      {customer.code}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-200 border-r border-slate-700">
                      {customer.name}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-400 border-r border-slate-700">
                      {customer.taxNumber}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-400 border-r border-slate-700">
                      {customer.address}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-400 border-r border-slate-700">
                      {customer.country}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-400 border-r border-slate-700">
                      {customer.phoneNumber}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-400 border-r border-slate-700">
                      {customer.email}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-400">
                      <button className="hover:text-sky-500 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-8 text-center text-slate-400"
                  >
                    No customers or suppliers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
