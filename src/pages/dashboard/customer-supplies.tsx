"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import {
  setCustSearchQuery,
  setCustOpen,
  setSelectedCustomer as setSelectedCustomerAction,
} from "@/store/dashboardSlice";
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
import CustomerSupplierDrawer from "@/components/customer-drawer";
import CustomerImportModal from "@/components/customer-import";
import { useCustomers, useDeleteCustomer } from "@/hooks/controllers/customers";
import { confirm, message } from "@tauri-apps/plugin-dialog";
import { Customer } from "@/db/schema";

export default function CustomersSuppliersClient() {
  const dispatch = useDispatch();
  const { searchQuery, open, selectedCustomer } = useSelector(
    (state: RootState) => state.dashboard.customerSupplies,
  );
  const [importOpen, setImportOpen] = useState(false);

  const setSearchQuery = (val: string) => dispatch(setCustSearchQuery(val));
  const setOpen = (val: boolean) => dispatch(setCustOpen(val));
  const setSelectedCustomer = (val: Customer | null) =>
    dispatch(setSelectedCustomerAction(val));

  const { data = [] } = useCustomers();
  const deleteCustomer = useDeleteCustomer();

  console.log("cust", data);
  const filteredCustomers = data?.filter((customer) =>
    JSON.stringify(customer).toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-200">
      <CustomerSupplierDrawer
        onOpenChange={setOpen}
        open={open}
        initialData={selectedCustomer}
        allCustomers={data}
      />
      {importOpen && (
        <CustomerImportModal onClose={() => setImportOpen(false)} />
      )}
      {/* Header */}
      <div className="border-b border-stone-300 dark:border-stone-800 px-6 py-4 flex items-center gap-3">
        <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
          Customers & Suppliers
        </h2>
      </div>

      {/* Toolbar */}
      <div className="border-b border-stone-300 dark:border-stone-800 px-6 py-3 flex items-center gap-2 bg-white dark:bg-stone-800">
        {[
          { icon: RotateCw, label: "Refresh" },
          {
            icon: Plus,
            label: "Add",
            onClick: () => {
              setSelectedCustomer(null);
              setOpen(true);
            },
          },
          {
            icon: Pencil,
            label: "Edit",
            disabled: !selectedCustomer,
            onClick: () => {
              if (!selectedCustomer) return;
              // open drawer and pass selected customer
              const customer = data.find((c) => c.id === selectedCustomer.id);
              if (customer) setOpen(true);
            },
          },
          {
            icon: Trash2,
            label: "Delete",
            disabled: !selectedCustomer,
            onClick: async () => {
              if (!selectedCustomer) return;

              const userConfirmed = await confirm(
                "Are you sure you want to delete this customer?",
                { title: "Confirm Delete" },
              );

              if (!userConfirmed) return;

              try {
                await deleteCustomer.mutateAsync(selectedCustomer.id);
                setSelectedCustomer(null); // clear selection
              } catch (error) {
                console.error(error);
                // Optional: show a Tauri dialog for errors

                await message("Failed to delete customer", {
                  kind: "error",
                });
              }
            },
          },

          {
            icon: Download,
            label: "Import",
            onClick: () => setImportOpen(true),
          },
          { icon: Upload, label: "Export" },
          { icon: HelpCircle, label: "Help", mlAuto: true },
        ].map(({ icon: Icon, label, disabled, mlAuto, onClick }, idx) => (
          <button
            key={idx}
            disabled={disabled}
            onClick={onClick}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded text-xs transition-colors
              ${
                disabled
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:bg-stone-700"
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
        <div className="px-6 py-4 border-b border-stone-300 dark:border-stone-800">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-500 dark:text-stone-400" />
            <Input
              placeholder="Search customers & suppliers"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 placeholder-stone-500 focus:border-amber-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-white dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700">
              <tr>
                {[
                  "Code",
                  "Name",
                  "Tax number",
                  "Address",
                  "Country",
                  "Phone number",
                  "Email",
                  "Active",
                  "Customer",
                  "Tax exempt",
                ].map((col) => (
                  <th
                    key={col}
                    className="px-6 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 border-r last:border-r-0 border-stone-200 dark:border-stone-700"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className={`border-b border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:bg-stone-700/50 transition-colors cursor-pointer ${
                      selectedCustomer?.id === customer.id
                        ? "bg-stone-100 dark:bg-stone-700"
                        : ""
                    }`}
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <td className="px-6 py-3 text-xs text-stone-500 dark:text-stone-400 border-r border-stone-200 dark:border-stone-700">
                      {customer.code}
                    </td>
                    <td className="px-6 py-3 text-xs text-stone-800 dark:text-stone-200 border-r border-stone-200 dark:border-stone-700">
                      {customer.name}
                    </td>
                    <td className="px-6 py-3 text-xs text-stone-500 dark:text-stone-400 border-r border-stone-200 dark:border-stone-700">
                      {customer.taxNumber}
                    </td>
                    <td className="px-6 py-3 text-xs text-stone-500 dark:text-stone-400 border-r border-stone-200 dark:border-stone-700">
                      {customer.streetName}
                    </td>
                    <td className="px-6 py-3 text-xs text-stone-500 dark:text-stone-400 border-r border-stone-200 dark:border-stone-700">
                      {customer.country}
                    </td>
                    <td className="px-6 py-3 text-xs text-stone-500 dark:text-stone-400 border-r border-stone-200 dark:border-stone-700">
                      {customer.phoneNumber}
                    </td>
                    <td className="px-6 py-3 text-xs text-stone-500 dark:text-stone-400 border-r border-stone-200 dark:border-stone-700">
                      {customer.email}
                    </td>
                    <td className="px-6 py-3 text-xs text-stone-500 dark:text-stone-400 border-r border-stone-200 dark:border-stone-700">
                      {customer.active ? "✓" : "X"}
                    </td>
                    <td className="px-6 py-3 text-xs text-stone-500 dark:text-stone-400 border-r border-stone-200 dark:border-stone-700">
                      {customer.customer ? "✓" : "✕"}
                    </td>
                    <td className="px-6 py-3 text-xs text-stone-500 dark:text-stone-400 border-r border-stone-200 dark:border-stone-700">
                      {customer.taxExempt ? "✓" : "✕"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-8 text-center text-stone-500 dark:text-stone-400"
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
