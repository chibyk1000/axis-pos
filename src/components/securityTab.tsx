import  { useState } from "react";
import { RefreshCw, Check, HelpCircle, Minus, Plus } from "lucide-react";

interface PermissionItem {
  id: string;
  label: string;
  value: number;
  hasHelp?: boolean;
}

export default function AccessLevelSettings() {
  const [generalPermissions, setGeneralPermissions] = useState<
    PermissionItem[]
  >([
    { id: "management", label: "Management", value: 0, hasHelp: true },
    { id: "settings", label: "Settings", value: 0 },
    { id: "end-of-day", label: "End of day", value: 0, hasHelp: true },
    { id: "user-profile", label: "User profile", value: 0 },
    { id: "design-floor-plans", label: "Design floor plans", value: 0 },
  ]);

  const [salesPermissions, setSalesPermissions] = useState<PermissionItem[]>([
    {
      id: "view-open-orders",
      label: "View all open orders",
      value: 0,
      hasHelp: true,
    },
    { id: "void-order", label: "Void order", value: 0, hasHelp: true },
    { id: "void-item", label: "Void item", value: 0, hasHelp: true },
    { id: "lock-sale", label: "Lock sale", value: 0 },
    { id: "unlock-sale", label: "Unlock sale", value: 0 },
    { id: "split-order", label: "Split order", value: 0, hasHelp: true },
    { id: "apply-discount", label: "Apply discount", value: 0 },
    { id: "delete-document", label: "Delete document", value: 0 },
    { id: "refund", label: "Refund", value: 0, hasHelp: true },
    { id: "view-sales-history", label: "View sales history", value: 0 },
    {
      id: "reprint-receipt",
      label: "Reprint receipt",
      value: 0,
      hasHelp: true,
    },
    { id: "credit-payments", label: "Credit payments", value: 0 },
    { id: "starting-cash", label: "Starting cash", value: 0, hasHelp: true },
    { id: "open-cash-drawer", label: "Open cash drawer", value: 0 },
    {
      id: "zero-stock",
      label: "Zero stock quantity sale",
      value: 0,
      hasHelp: true,
    },
  ]);

  const updatePermission = (
    section: "general" | "sales",
    id: string,
    delta: number,
  ) => {
    const updater = (items: PermissionItem[]) =>
      items.map((item) =>
        item.id === id
          ? { ...item, value: Math.max(0, item.value + delta) }
          : item,
      );

    if (section === "general") {
      setGeneralPermissions(updater(generalPermissions));
    } else {
      setSalesPermissions(updater(salesPermissions));
    }
  };

  const PermissionRow = ({
    item,
    section,
  }: {
    item: PermissionItem;
    section: "general" | "sales";
  }) => (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-200">{item.label}</span>
        {item.hasHelp && <HelpCircle size={14} className="text-blue-400" />}
      </div>
      <div className="flex items-center bg-slate-800 border border-slate-600 rounded-sm">
        <button
          onClick={() => updatePermission(section, item.id, -1)}
          className="w-8 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors border-r border-slate-600"
        >
          <Minus size={14} />
        </button>
        <div className="w-10 h-7 flex items-center justify-center text-sm font-medium text-slate-200">
          {item.value}
        </div>
        <button
          onClick={() => updatePermission(section, item.id, 1)}
          className="w-8 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors border-l border-slate-600"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200">
      {/* Toolbar */}
      <div className="flex items-center gap-6 px-4 py-3 bg-slate-900 border-b border-slate-800">
        <button className="flex flex-col items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors">
          <RefreshCw size={20} />
          <span className="text-xs">Refresh</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-300 hover:text-white transition-colors">
          <Check size={20} />
          <span className="text-xs">Save</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-300 hover:text-white transition-colors">
          <HelpCircle size={20} />
          <span className="text-xs">Help</span>
        </button>
      </div>

      {/* Header */}
      <div className="px-6 py-4">
        <h1 className="text-xl font-light text-slate-100 mb-1">
          Set access level for predefined operations
        </h1>
        <p className="text-sm text-slate-400">
          Select access level for each action in order to set required user
          permissions.
        </p>
      </div>

      {/* Content */}
      <div className="px-6 pb-8 space-y-6">
        {/* General Section */}
        <div className="border border-slate-700 rounded-sm overflow-hidden">
          <div className="bg-blue-500 px-4 py-2 text-sm font-medium text-white">
            General
          </div>
          <div className="bg-slate-900 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-1">
            {generalPermissions.map((item) => (
              <PermissionRow key={item.id} item={item} section="general" />
            ))}
          </div>
        </div>

        {/* Sales Section */}
        <div className="border border-slate-700 rounded-sm overflow-hidden">
          <div className="bg-blue-500 px-4 py-2 text-sm font-medium text-white">
            Sales
          </div>
          <div className="bg-slate-900 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-1">
            {salesPermissions.map((item) => (
              <PermissionRow key={item.id} item={item} section="sales" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
