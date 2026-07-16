import { ReactNode, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store";
import {
  setActiveTab as setActiveTabAction,
  setEmailTab as setEmailTabAction,
  setPrintTab as setPrintTabAction,
} from "../../store/settingsSlice";
import {
  Settings,
  ShoppingCart,
  Box,
  FileText,
  Scale,
  Monitor,
  Mail,
  Printer,
  Database,
  ChevronLeft,
  HardDrive,
  Info,
  AlertCircle,
  Upload,
  Radio,
  Trash2,
} from "lucide-react";
import { useTheme } from "@/providers/theme-provider";
import { useNavigate } from "react-router";
import { useSettings } from "@/hooks/useSettings";
import { useSync } from "@/hooks/useSync";
import { save, open as dialogOpen } from "@tauri-apps/plugin-dialog";
import { copyFile } from "@tauri-apps/plugin-fs";
import { appDataDir, join } from "@tauri-apps/api/path";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { invoke } from "@tauri-apps/api/core";
import { useTaxes } from "@/hooks/controllers/taxes";
import { importAroniumDatabase } from "../../helpers/aroniumImporter";
import {
  resetDatabase,
  previewResetTables,
  TABLE_CATEGORIES,
} from "../../helpers/resetDatabase";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function SettingsPage() {
  const { isDarkMode: dark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { activeTab, emailTab, printTab } = useSelector(
    (state: RootState) => state.settings,
  );
  const setActiveTab = (v: string) => dispatch(setActiveTabAction(v));
  const setEmailTab = (v: string) => dispatch(setEmailTabAction(v));
  const setPrintTab = (v: string) => dispatch(setPrintTabAction(v));
  const { settings, updateSetting, saveSettings } = useSettings();
  const {
    serverRunning,
    serverStats,
    discoveredServers,
    isSearching,
    connectionStatus,
    discoverServers,
    startServer,
    stopServer,
    connectToServer,
  } = useSync();
  const { data: taxes } = useTaxes();
  const queryClient = useQueryClient();
  const [isImportingAronium, setIsImportingAronium] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingFilePath, setPendingFilePath] = useState<string | null>(null);
  const [resetTyped, setResetTyped] = useState("");
  const [isResettingDb, setIsResettingDb] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState(false);
  const [resetMode, setResetMode] = useState<"all" | "selected">("all");
  const [selectedResetCategories, setSelectedResetCategories] = useState<
    Set<string>
  >(new Set());

  // SQL Server detection state (used in Database tab)
  const [sqlServerStatus, setSqlServerStatus] = useState<{
    installed: boolean;
    variant: string;
    description: string;
  } | null>(null);
  const [isCheckingSqlServer, setIsCheckingSqlServer] = useState(false);

  // Official Microsoft download URL for the en-US, x64 SqlLocalDB.msi
  // installer — kept in sync with src-tauri/src/commands/sql_server.rs.
  const SQL_LOCALDB_DOWNLOAD_URL =
    "https://download.microsoft.com/download/3/8/d/38de7036-2433-4207-8eae-06e247e17b25/SqlLocalDB.msi";

  const checkSqlServer = async () => {
    setIsCheckingSqlServer(true);
    try {
      const status = await invoke<{
        installed: boolean;
        variant: string;
        description: string;
      }>("check_sql_server_installation");
      setSqlServerStatus(status);
    } catch (err) {
      setSqlServerStatus({
        installed: false,
        variant: "",
        description: String(err),
      });
    } finally {
      setIsCheckingSqlServer(false);
    }
  };

  const handleDownloadSqlServer = async () => {
    try {
      await shellOpen(SQL_LOCALDB_DOWNLOAD_URL);
    } catch (err) {
      console.error(err);
      toast.error("Failed to open download link: " + err);
    }
  };

  // Check SQL Server whenever the Database tab is opened
  useEffect(() => {
    if (
      activeTab === "Database" &&
      sqlServerStatus === null &&
      !isCheckingSqlServer
    ) {
      checkSqlServer();
    }
  }, [activeTab]);

  const handleImportAroniumDb = async () => {
    try {
      const filePath = await dialogOpen({
        multiple: false,
        filters: [
          {
            name: "Aronium Database",
            extensions: ["db", "sqlite", "bak", "sql"],
          },
        ],
      });

      if (filePath && typeof filePath === "string") {
        setPendingFilePath(filePath);
        setConfirmOpen(true);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to select database file: " + err);
    }
  };

  const executeImport = async () => {
    // Capture and clear the pending path SYNCHRONOUSLY so a double-click on
    // the confirm button can't start two concurrent imports — the second
    // run's setup drops/re-restores the temp SQL Server database out from
    // under the first, making every table read come back empty.
    const filePath = pendingFilePath;
    if (!filePath || isImportingAronium) return;
    setPendingFilePath(null);

    const toastId = toast.loading("Importing Aronium database…");
    try {
      setIsImportingAronium(true);
      const result = await importAroniumDatabase(filePath, (stage) =>
        toast.update(toastId, { render: stage, isLoading: true }),
      );
      setIsImportingAronium(false);

      if (result.success) {
        await queryClient.invalidateQueries();
        const hasWarnings = (result.warnings?.length ?? 0) > 0;
        toast.update(toastId, {
          render: (
            <div>
              <p className="font-medium mb-1">Database imported successfully!</p>
              <ul className="text-xs space-y-0.5">
                <li>{result.counts.taxes} Taxes</li>
                <li>{result.counts.groups} Groups</li>
                <li>{result.counts.products} Products</li>
                <li>{result.counts.barcodes} Barcodes</li>
                <li>{result.counts.productTaxes} Product tax mappings</li>
                <li>{result.counts.customers} Customers</li>
                <li>{result.counts.documents} Documents</li>
                <li>{result.counts.documentItems} Document items</li>
                <li>{result.counts.documentPayments} Document payments</li>
                <li>{result.counts.stockEntries} Stock entries</li>
              </ul>
              {hasWarnings && (
                <>
                  <p className="font-medium text-amber-500 mt-2 mb-1">
                    {result.warnings!.length} table(s) failed to fetch from the
                    backup and were skipped:
                  </p>
                  <ul className="text-xs space-y-0.5 text-amber-400">
                    {result.warnings!.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ),
          type: hasWarnings ? "warning" : "success",
          isLoading: false,
          autoClose: hasWarnings ? false : 10000,
          closeOnClick: true,
        });
      } else {
        toast.update(toastId, {
          render: "Import failed: " + result.message,
          type: "error",
          isLoading: false,
          autoClose: 10000,
        });
      }
    } catch (err) {
      setIsImportingAronium(false);
      console.error(err);
      toast.update(toastId, {
        render: "Failed to import database: " + String(err),
        type: "error",
        isLoading: false,
        autoClose: 10000,
      });
    }
  };

  const theme = dark
    ? "bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100"
    : "bg-white text-stone-900";

  const card = dark
    ? "bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700"
    : "bg-stone-100 border-stone-200";

  const input = dark
    ? "bg-stone-100 dark:bg-stone-700 border-stone-600 text-stone-900 dark:text-white"
    : "bg-white border-stone-300 text-black";

  const menuItems = [
    { label: "General", icon: Settings },
    { label: "Order & payment", icon: ShoppingCart },
    { label: "Products", icon: Box },
    { label: "Documents", icon: FileText },
    { label: "Weighing scale", icon: Scale },
    { label: "Customer display", icon: Monitor },
    { label: "Email", icon: Mail },
    { label: "Print", icon: Printer },
    { label: "Database", icon: Database },
    { label: "LAN Sync", icon: Radio },
  ];

  const handleExportDb = async () => {
    try {
      const savePath = await save({
        filters: [{ name: "Database", extensions: ["db", "sqlite"] }],
        defaultPath: "axis-lite-backup.db",
      });

      if (savePath) {
        const dataDir = await appDataDir();
        const dbPath = await join(dataDir, "data.db");
        await copyFile(dbPath, savePath);
        toast.success("Database exported successfully!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to export database: " + err);
    }
  };

  const handleSelectBackupFolder = async () => {
    try {
      const folderPath = await dialogOpen({
        directory: true,
        multiple: false,
      });
      if (folderPath && typeof folderPath === "string") {
        updateSetting("backupLocation", folderPath);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenDbLocation = async () => {
    try {
      const dataDir = await appDataDir();
      await shellOpen(dataDir);
    } catch (err) {
      console.error(err);
    }
  };

  const selectedResetTables = TABLE_CATEGORIES.filter((c) =>
    selectedResetCategories.has(c.label),
  ).flatMap((c) => c.tables);

  const resetPreviewTables =
    resetMode === "all"
      ? previewResetTables()
      : previewResetTables(selectedResetTables);

  const toggleResetCategory = (label: string) => {
    setSelectedResetCategories((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
    setResetDone(false);
    setResetError(null);
  };

  const handleResetDb = async () => {
    setIsResettingDb(true);
    setResetError(null);
    try {
      const { cleared } = await resetDatabase(
        resetMode === "all" ? undefined : selectedResetTables,
      );
      await queryClient.invalidateQueries();
      setResetDone(true);
      setResetTyped("");
      console.info("[reset] cleared tables:", cleared);
    } catch (err) {
      console.error(err);
      setResetError("Failed to reset database: " + String(err));
    } finally {
      setIsResettingDb(false);
    }
  };

  return (
    <div className={`min-h-screen w-full flex ${theme}`}>
      {/* Sidebar */}
      <aside className={`w-64 p-4 border-r ${card}`}>
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-bold">Settings</h2>
        </div>
        <nav className="space-y-2">
          {menuItems.map((item, i) => {
            const Icon = item.icon;
            const isActive = activeTab === item.label;
            return (
              <div
                key={i}
                onClick={() => setActiveTab(item.label)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  isActive
                    ? "bg-orange-500 text-white"
                    : `hover:bg-stone-200 dark:hover:bg-stone-700 ${dark ? "text-stone-100 hover:text-white" : "text-stone-900"}`
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 overflow-y-auto">
        {/* Section */}
        {activeTab === "General" && (
          <div className={`p-6 rounded-2xl border ${card} space-y-6`}>
            <Section title="Application style">
              <Field label="Language">
                <select
                  className={`w-full p-2 rounded ${input}`}
                  value={settings.language}
                  onChange={(e) => updateSetting("language", e.target.value)}
                >
                  <option value="English">English</option>
                  <option value="French">French</option>
                  <option value="Spanish">Spanish</option>
                </select>
              </Field>

              <Field label="Writing direction">
                <select
                  className={`w-full p-2 rounded ${input}`}
                  value={settings.writingDirection}
                  onChange={(e) =>
                    updateSetting("writingDirection", e.target.value)
                  }
                >
                  <option value="Left to right">Left to right</option>
                  <option value="Right to left">Right to left</option>
                </select>
              </Field>

              <Field label="Color scheme">
                <select
                  className={`w-full p-2 rounded ${input}`}
                  value={dark ? "Dark" : "Light"}
                  onChange={toggleTheme}
                >
                  <option value="Dark">Dark</option>
                  <option value="Light">Light</option>
                </select>
              </Field>

              <Field label="Zoom">
                <input
                  type="number"
                  onFocus={(e) => e.target.select()}
                  value={settings.zoom}
                  onChange={(e) =>
                    updateSetting("zoom", parseInt(e.target.value) || 100)
                  }
                  className={`w-full p-2 rounded ${input}`}
                />
              </Field>
            </Section>

            <Section title="Messages">
              <Toggle
                label="Show Close Button"
                enabled={settings.showCloseButton}
                onChange={(val) => updateSetting("showCloseButton", val)}
              />
              <Toggle
                label="Click to close"
                enabled={settings.clickToClose}
                onChange={(val) => updateSetting("clickToClose", val)}
              />
              <Toggle
                label="Slide in"
                enabled={settings.slideIn}
                onChange={(val) => updateSetting("slideIn", val)}
              />

              <Field label="Message duration (sec)">
                <input
                  type="number"
                  onFocus={(e) => e.target.select()}
                  value={settings.messageDuration}
                  onChange={(e) =>
                    updateSetting(
                      "messageDuration",
                      parseInt(e.target.value) || 5,
                    )
                  }
                  className={`w-full p-2 rounded ${input}`}
                />
              </Field>

              <Field label="Position">
                <select
                  className={`w-full p-2 rounded ${input}`}
                  value={settings.messagePosition}
                  onChange={(e) =>
                    updateSetting("messagePosition", e.target.value)
                  }
                >
                  <option value="Top">Top</option>
                  <option value="Bottom">Bottom</option>
                </select>
              </Field>
            </Section>

            <Section title="Business day">
              <Toggle
                label="Show cash in on start"
                enabled={settings.showCashInOnStart}
                onChange={(val) => updateSetting("showCashInOnStart", val)}
              />
              <Toggle
                label="Select business day on start"
                enabled={settings.selectBusinessDayOnStart}
                onChange={(val) =>
                  updateSetting("selectBusinessDayOnStart", val)
                }
              />
            </Section>
          </div>
        )}

        {activeTab === "Order & payment" && (
          <div className="space-y-8 max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-2xl font-light">Order & payment</h2>
              <a
                href="#"
                className="text-sm text-amber-500 hover:text-amber-400 mt-1"
              >
                Learn more
              </a>
            </div>

            <div className="pt-2">
              <h3 className="text-xl font-light text-stone-200 mb-4">Orders</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-[280px_1fr] items-center gap-4">
                  <span className="text-[14px] text-stone-200">
                    Default order type
                  </span>
                  <select
                    className="w-64 p-1.5 bg-transparent border border-stone-700 focus:outline-none text-sm text-stone-300"
                    value={settings.defaultOrderType}
                    onChange={(e) =>
                      updateSetting("defaultOrderType", e.target.value)
                    }
                  >
                    <option value="Dine in">Dine in</option>
                    <option value="Takeaway">Takeaway</option>
                    <option value="Delivery">Delivery</option>
                  </select>
                </div>

                <div className="grid grid-cols-[280px_1fr] items-center gap-4">
                  <span className="text-[14px] text-stone-200">
                    Ask order type on every sale
                  </span>
                  <div>
                    <Toggle
                      label=""
                      enabled={settings.askOrderTypeOnSale}
                      onChange={(val) =>
                        updateSetting("askOrderTypeOnSale", val)
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[280px_1fr] items-center gap-4">
                  <span className="text-[14px] text-stone-200">
                    Confirm before voiding an item
                  </span>
                  <div>
                    <Toggle
                      label=""
                      enabled={settings.confirmBeforeVoidingItem}
                      onChange={(val) =>
                        updateSetting("confirmBeforeVoidingItem", val)
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[280px_1fr] items-center gap-4">
                  <span className="text-[14px] text-stone-200">
                    Confirm before canceling a sale
                  </span>
                  <div>
                    <Toggle
                      label=""
                      enabled={settings.confirmBeforeCancelingSale}
                      onChange={(val) =>
                        updateSetting("confirmBeforeCancelingSale", val)
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-700">
              <h3 className="text-xl font-light text-stone-200 mb-4 mt-4">
                Tips & service charge
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-[280px_1fr] items-center gap-4">
                  <span className="text-[14px] text-stone-200">
                    Enable tips
                  </span>
                  <div>
                    <Toggle
                      label=""
                      enabled={settings.enableTips}
                      onChange={(val) => updateSetting("enableTips", val)}
                    />
                  </div>
                </div>

                <div
                  className={`grid grid-cols-[280px_1fr] items-center gap-4 pl-4 border-l-2 border-stone-700 ml-1 transition-opacity ${!settings.enableTips ? "opacity-40 pointer-events-none" : ""}`}
                >
                  <span className="text-[14px] text-stone-400">
                    Tip suggestions (%)
                  </span>
                  <input
                    type="text"
                    className="w-64 p-1.5 bg-transparent border border-stone-700 focus:outline-none text-sm text-stone-300"
                    placeholder="5,10,15,20"
                    value={settings.tipSuggestions}
                    onChange={(e) =>
                      updateSetting("tipSuggestions", e.target.value)
                    }
                  />
                </div>

                <div className="grid grid-cols-[280px_1fr] items-center gap-4">
                  <span className="text-[14px] text-stone-200">
                    Enable service charge
                  </span>
                  <div>
                    <Toggle
                      label=""
                      enabled={settings.enableServiceCharge}
                      onChange={(val) =>
                        updateSetting("enableServiceCharge", val)
                      }
                    />
                  </div>
                </div>

                <div
                  className={`grid grid-cols-[280px_1fr] items-center gap-4 pl-4 border-l-2 border-stone-700 ml-1 transition-opacity ${!settings.enableServiceCharge ? "opacity-40 pointer-events-none" : ""}`}
                >
                  <span className="text-[14px] text-stone-400">
                    Service charge name
                  </span>
                  <input
                    type="text"
                    className="w-64 p-1.5 bg-transparent border border-stone-700 focus:outline-none text-sm text-stone-300"
                    value={settings.serviceChargeName}
                    onChange={(e) =>
                      updateSetting("serviceChargeName", e.target.value)
                    }
                  />
                </div>

                <div
                  className={`grid grid-cols-[280px_1fr] items-center gap-4 pl-4 border-l-2 border-stone-700 ml-1 transition-opacity ${!settings.enableServiceCharge ? "opacity-40 pointer-events-none" : ""}`}
                >
                  <span className="text-[14px] text-stone-400">
                    Service charge rate (%)
                  </span>
                  <input
                    type="number"
                    onFocus={(e) => e.target.select()}
                    className="w-64 p-1.5 bg-transparent border border-stone-700 focus:outline-none text-sm text-stone-300"
                    value={settings.serviceChargeRate}
                    onChange={(e) =>
                      updateSetting(
                        "serviceChargeRate",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-700">
              <h3 className="text-xl font-light text-stone-200 mb-4 mt-4">
                Payment
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-[280px_1fr] items-center gap-4">
                  <span className="text-[14px] text-stone-200">
                    Default payment type
                  </span>
                  <select
                    className="w-64 p-1.5 bg-transparent border border-stone-700 focus:outline-none text-sm text-stone-300"
                    value={settings.defaultPaymentType}
                    onChange={(e) =>
                      updateSetting("defaultPaymentType", e.target.value)
                    }
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Bank transfer">Bank transfer</option>
                  </select>
                </div>

                <div className="grid grid-cols-[280px_1fr] items-center gap-4">
                  <span className="text-[14px] text-stone-200">
                    Allow split payment
                  </span>
                  <div>
                    <Toggle
                      label=""
                      enabled={settings.allowSplitPayment}
                      onChange={(val) =>
                        updateSetting("allowSplitPayment", val)
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[280px_1fr] items-center gap-4">
                  <span className="text-[14px] text-stone-200">
                    Allow partial payment
                  </span>
                  <div>
                    <Toggle
                      label=""
                      enabled={settings.allowPartialPayment}
                      onChange={(val) =>
                        updateSetting("allowPartialPayment", val)
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[280px_1fr] items-center gap-4">
                  <span className="text-[14px] text-stone-200">
                    Require customer for credit sales
                  </span>
                  <div>
                    <Toggle
                      label=""
                      enabled={settings.requireCustomerForCreditSale}
                      onChange={(val) =>
                        updateSetting("requireCustomerForCreditSale", val)
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[280px_1fr] items-center gap-4">
                  <span className="text-[14px] text-stone-200">
                    Round total amount
                  </span>
                  <div>
                    <Toggle
                      label=""
                      enabled={settings.roundTotalAmount}
                      onChange={(val) =>
                        updateSetting("roundTotalAmount", val)
                      }
                    />
                  </div>
                </div>

                <div
                  className={`grid grid-cols-[280px_1fr] items-center gap-4 pl-4 border-l-2 border-stone-700 ml-1 transition-opacity ${!settings.roundTotalAmount ? "opacity-40 pointer-events-none" : ""}`}
                >
                  <span className="text-[14px] text-stone-400">
                    Rounding increment
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    onFocus={(e) => e.target.select()}
                    className="w-64 p-1.5 bg-transparent border border-stone-700 focus:outline-none text-sm text-stone-300"
                    value={settings.roundingIncrement}
                    onChange={(e) =>
                      updateSetting(
                        "roundingIncrement",
                        parseFloat(e.target.value) || 0.05,
                      )
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Email" && (
          <div className="space-y-6 max-w-4xl">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-light">Email</h2>
              <a
                href="#"
                className="text-sm text-amber-500 hover:text-amber-400 mt-1"
              >
                Learn more
              </a>
            </div>

            {/* Inner Tabs */}
            <div className="flex border-b border-amber-700">
              <button
                className={`px-6 py-2 text-sm transition-colors ${
                  emailTab === "General"
                    ? "bg-amber-600 text-white"
                    : "text-stone-300 hover:text-white"
                }`}
                onClick={() => setEmailTab("General")}
              >
                General
              </button>
              <button
                className={`px-6 py-2 text-sm transition-colors ${
                  emailTab === "Reporting"
                    ? "bg-amber-600 text-white"
                    : "text-stone-300 hover:text-white"
                }`}
                onClick={() => setEmailTab("Reporting")}
              >
                Reporting
              </button>
            </div>

            {emailTab === "General" && (
              <div className="space-y-8 pt-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                    <span className="text-[14px] text-stone-300">Host</span>
                    <input
                      type="text"
                      className="w-80 p-1.5 bg-transparent border border-stone-700 focus:outline-none text-sm text-stone-200"
                      value={settings.smtpServer}
                      onChange={(e) =>
                        updateSetting("smtpServer", e.target.value)
                      }
                    />
                  </div>

                  <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                    <span className="text-[14px] text-stone-300">Port</span>
                    <div className="flex items-center w-32 border border-stone-700 rounded-sm">
                      <button
                        onClick={() =>
                          updateSetting(
                            "smtpPort",
                            String(
                              Math.max(1, parseInt(settings.smtpPort) - 1),
                            ),
                          )
                        }
                        className="px-3 py-1 text-stone-400 hover:text-stone-200 border-r border-stone-700"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        onFocus={(e) => e.target.select()}
                        className="w-full p-1 bg-transparent text-center focus:outline-none text-sm text-stone-200 appearance-none"
                        value={settings.smtpPort}
                        onChange={(e) =>
                          updateSetting("smtpPort", e.target.value)
                        }
                      />
                      <button
                        onClick={() =>
                          updateSetting(
                            "smtpPort",
                            String(parseInt(settings.smtpPort) + 1),
                          )
                        }
                        className="px-3 py-1 text-stone-400 hover:text-stone-200 border-l border-stone-700"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                    <span className="text-[14px] text-stone-300">
                      SSL enabled
                    </span>
                    <Toggle
                      label=""
                      enabled={settings.smtpSsl}
                      onChange={(val) => updateSetting("smtpSsl", val)}
                    />
                  </div>

                  <div className="grid grid-cols-[200px_1fr] items-center gap-4 pt-2">
                    <span className="text-[14px] text-stone-300">
                      Display name
                    </span>
                    <input
                      type="text"
                      className="w-80 p-1.5 bg-transparent border border-stone-700 focus:outline-none text-sm text-stone-200"
                      value={settings.emailDisplayName}
                      onChange={(e) =>
                        updateSetting("emailDisplayName", e.target.value)
                      }
                    />
                  </div>

                  <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                    <span className="text-[14px] text-stone-300">
                      Email address
                    </span>
                    <input
                      type="email"
                      className="w-80 p-1.5 bg-transparent border border-stone-700 focus:outline-none text-sm text-stone-200"
                      value={settings.emailAddress}
                      onChange={(e) =>
                        updateSetting("emailAddress", e.target.value)
                      }
                    />
                  </div>

                  <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                    <span className="text-[14px] text-stone-300">Username</span>
                    <input
                      type="text"
                      className="w-80 p-1.5 bg-transparent border border-stone-700 focus:outline-none text-sm text-stone-200"
                      value={settings.smtpUser}
                      onChange={(e) =>
                        updateSetting("smtpUser", e.target.value)
                      }
                    />
                  </div>

                  <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                    <span className="text-[14px] text-stone-300">Password</span>
                    <input
                      type="password"
                      className="w-80 p-1.5 bg-transparent border border-stone-700 focus:outline-none text-sm text-stone-200"
                      value={settings.smtpPass}
                      onChange={(e) =>
                        updateSetting("smtpPass", e.target.value)
                      }
                    />
                  </div>
                </div>

                {/* Default email message values section */}
                <div className="pt-6">
                  <h3 className="text-xl font-light mb-4 text-stone-200">
                    Default email message values
                  </h3>

                  <div className="flex items-center gap-4 p-4 border border-amber-600 mb-6 bg-transparent">
                    <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center shrink-0">
                      <Info className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-sm text-stone-200">
                      If you decide to leave these fields blank, automatically
                      generated subject and message for the customer will be
                      used. You can change them before message is sent.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                      <span className="text-[14px] text-stone-300">
                        Subject
                      </span>
                      <input
                        type="text"
                        className="w-80 p-1.5 bg-transparent border border-stone-700 focus:outline-none text-sm text-stone-200"
                        value={settings.emailDefaultSubject}
                        onChange={(e) =>
                          updateSetting("emailDefaultSubject", e.target.value)
                        }
                      />
                    </div>

                    <div className="grid grid-cols-[200px_1fr] items-start gap-4">
                      <span className="text-[14px] text-stone-300 mt-2">
                        Message
                      </span>
                      <textarea
                        className="w-full h-32 p-2 bg-transparent border border-stone-700 focus:outline-none text-sm text-stone-200 resize-none"
                        value={settings.emailDefaultMessage}
                        onChange={(e) =>
                          updateSetting("emailDefaultMessage", e.target.value)
                        }
                      />
                    </div>

                    <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                      <span className="text-[14px] text-stone-300">
                        Bcc recipients
                      </span>
                      <input
                        type="text"
                        className="w-80 p-1.5 bg-transparent border border-stone-700 focus:outline-none text-sm text-stone-200"
                        value={settings.emailBccRecipients}
                        onChange={(e) =>
                          updateSetting("emailBccRecipients", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {emailTab === "Reporting" && (
              <div className="p-4 text-stone-400">
                Reporting configurations are not yet configured.
              </div>
            )}
          </div>
        )}

        {activeTab === "Print" && (
          <div className="space-y-6 max-w-4xl">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-light">Print</h2>
              <a
                href="#"
                className="text-sm text-amber-500 hover:text-amber-400 mt-1"
              >
                Learn more
              </a>
            </div>

            {/* Inner Tabs */}
            <div className="flex border-b border-amber-700">
              {[
                "Printer selection",
                "Customize receipt",
                "Localize receipt text",
                "Print templates",
              ].map((tab) => (
                <button
                  key={tab}
                  className={`px-4 py-2 text-sm transition-colors ${
                    printTab === tab
                      ? "bg-amber-600 text-white"
                      : "text-stone-300 hover:text-white"
                  }`}
                  onClick={() => setPrintTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Print -> Printer selection */}
            {printTab === "Printer selection" && (
              <div className="space-y-6 pt-4">
                {[
                  {
                    label: "Print receipt",
                    keyToggle: "printReceipt",
                    keySelect: "printReceiptPrinter",
                  },
                  {
                    label: "Print credit payments",
                    keyToggle: "printCreditPayments",
                    keySelect: "printCreditPaymentsPrinter",
                  },
                  {
                    label: "Print locked sale",
                    keyToggle: "printLockedSale",
                    keySelect: "printLockedSalePrinter",
                  },
                  {
                    label: "Print kitchen ticket",
                    keyToggle: "printKitchenTicket",
                    keySelect: "printKitchenTicketPrinter",
                  },
                  {
                    label: "Print service messages",
                    keyToggle: "printServiceMessages",
                    keySelect: "printServiceMessagesPrinter",
                  },
                ].map((item) => (
                  <div key={item.keyToggle} className="flex items-center gap-4">
                    <div className="w-56 flex items-center gap-2">
                      <Toggle
                        label=""
                        enabled={
                          settings[
                            item.keyToggle as keyof typeof settings
                          ] as boolean
                        }
                        onChange={(val) =>
                          updateSetting(
                            item.keyToggle as keyof typeof settings,
                            val,
                          )
                        }
                      />
                      <span className="text-[14px] text-stone-300">
                        {item.label}
                      </span>
                    </div>
                    <select
                      className="w-64 p-1.5 bg-transparent border border-stone-700 text-sm text-stone-200 focus:outline-none"
                      value={
                        settings[
                          item.keySelect as keyof typeof settings
                        ] as string
                      }
                      onChange={(e) =>
                        updateSetting(
                          item.keySelect as keyof typeof settings,
                          e.target.value,
                        )
                      }
                    >
                      <option value="">Select printer...</option>
                    </select>
                    {!settings[item.keySelect as keyof typeof settings] && (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Print -> Customize receipt */}
            {printTab === "Customize receipt" && (
              <div className="space-y-6 pt-4">
                <div className="flex items-center gap-4">
                  <span className="text-[14px] text-stone-300 w-52">
                    Use system currency format
                  </span>
                  <Toggle
                    label=""
                    enabled={settings.useSystemCurrencyFormat}
                    onChange={(val) =>
                      updateSetting("useSystemCurrencyFormat", val)
                    }
                  />
                  <a
                    href="#"
                    className="text-sm text-amber-500 hover:text-amber-400"
                  >
                    What's this?
                  </a>
                </div>

                <div className="flex items-center gap-4 p-3 border border-amber-600 bg-transparent">
                  <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center shrink-0">
                    <Info className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-sm text-stone-200">
                    Your currency symbol is set to "$". Use Windows Control
                    Panel to change currency symbol.{" "}
                    <a href="#" className="text-amber-500 hover:text-amber-400">
                      Open regional settings
                    </a>
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    { label: "Print tax totals", key: "printTaxTotals" },
                    { label: "Print tax name", key: "printTaxName" },
                    { label: "Print items count", key: "printItemsCount" },
                    {
                      label: "Print total quantity",
                      key: "printTotalQuantity",
                      indent: true,
                    },
                    {
                      label: "Print measurement unit",
                      key: "printMeasurementUnit",
                    },
                    {
                      label: "Short receipt number",
                      key: "shortReceiptNumber",
                    },
                    { label: "Print order number", key: "printOrderNumber" },
                    {
                      label: "Print outstanding balance",
                      key: "printOutstandingBalance",
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className={`flex items-center gap-4 ${item.indent ? "pl-6 border-l border-stone-700 ml-1" : ""}`}
                    >
                      <span className="text-[14px] text-stone-300 w-48">
                        {item.label}
                      </span>
                      <Toggle
                        label=""
                        enabled={
                          settings[item.key as keyof typeof settings] as boolean
                        }
                        onChange={(val) =>
                          updateSetting(item.key as keyof typeof settings, val)
                        }
                      />
                    </div>
                  ))}

                  <div className="flex items-center gap-4">
                    <span className="text-[14px] text-stone-300 w-48">
                      Decimal places
                    </span>
                    <div className="flex items-center w-24 border border-stone-700 rounded-sm">
                      <button
                        onClick={() =>
                          updateSetting(
                            "decimalPlaces",
                            Math.max(0, settings.decimalPlaces - 1),
                          )
                        }
                        className="px-2 py-1 text-stone-400 hover:text-stone-200 border-r border-stone-700"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        onFocus={(e) => e.target.select()}
                        className="w-full p-1 bg-transparent text-center focus:outline-none text-sm text-stone-200 appearance-none"
                        value={settings.decimalPlaces}
                        onChange={(e) =>
                          updateSetting(
                            "decimalPlaces",
                            parseInt(e.target.value) || 2,
                          )
                        }
                      />
                      <button
                        onClick={() =>
                          updateSetting(
                            "decimalPlaces",
                            settings.decimalPlaces + 1,
                          )
                        }
                        className="px-2 py-1 text-stone-400 hover:text-stone-200 border-l border-stone-700"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <span className="text-[14px] text-stone-300 w-48">
                      Receipt counter
                    </span>
                    <a
                      href="#"
                      className="text-[14px] text-amber-500 hover:text-amber-400"
                    >
                      11
                    </a>
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-700">
                  <h3 className="text-lg font-light text-stone-200 mb-2">
                    Customer details
                  </h3>
                  <p className="text-sm text-stone-400 mb-4">
                    Choose what customer details are printed in receipt
                  </p>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.customerDetailsName}
                        onChange={(e) =>
                          updateSetting("customerDetailsName", e.target.checked)
                        }
                        className="w-4 h-4 rounded border-stone-600 bg-transparent text-amber-500 focus:ring-amber-500 focus:ring-offset-stone-900"
                      />
                      <span className="text-sm text-stone-300">Name</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.customerDetailsCode}
                        onChange={(e) =>
                          updateSetting("customerDetailsCode", e.target.checked)
                        }
                        className="w-4 h-4 rounded border-stone-600 bg-transparent text-amber-500 focus:ring-amber-500 focus:ring-offset-stone-900"
                      />
                      <span className="text-sm text-stone-300">Code</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Print -> Localize receipt text */}
            {printTab === "Localize receipt text" && (
              <div className="space-y-6 pt-4">
                <div className="flex items-start gap-4 p-4 border border-amber-600 bg-transparent">
                  <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center shrink-0">
                    <Info className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-stone-200 mb-2">
                      Use this form to translate or modify the labels printed on
                      receipts.
                    </p>
                    <div className="flex items-center gap-2">
                      <Toggle
                        label=""
                        enabled={settings.useCustomLabels}
                        onChange={(val) =>
                          updateSetting("useCustomLabels", val)
                        }
                      />
                      <span className="text-sm text-stone-200">
                        Use custom labels in reports and invoices
                      </span>
                      <Info className="w-4 h-4 text-amber-500" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    {
                      label: "Company tax number",
                      key: "labelCompanyTaxNumber",
                    },
                    { label: "Receipt number", key: "labelReceiptNumber" },
                    { label: "Refund number", key: "labelRefundNumber" },
                    { label: "Order number", key: "labelOrderNumber" },
                    { label: "User", key: "labelUser" },
                    { label: "Items count", key: "labelItemsCount" },
                    { label: "Discount", key: "labelDiscount" },
                    { label: "Subtotal", key: "labelSubtotal" },
                    { label: "Tax rate", key: "labelTaxRate" },
                    { label: "Total", key: "labelTotal" },
                    { label: "Paid amount", key: "labelPaidAmount" },
                    { label: "Amount due", key: "labelAmountDue" },
                    { label: "Change", key: "labelChange" },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="grid grid-cols-[200px_1fr] items-center gap-4"
                    >
                      <span className="text-[14px] text-stone-300">
                        {item.label}
                      </span>
                      <input
                        type="text"
                        className="w-80 p-1 bg-transparent border border-stone-700 focus:outline-none text-sm text-stone-400"
                        value={
                          settings[item.key as keyof typeof settings] as string
                        }
                        onChange={(e) =>
                          updateSetting(
                            item.key as keyof typeof settings,
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Print -> Print templates */}
            {printTab === "Print templates" && (
              <div className="space-y-6 pt-4">
                <div className="flex items-center gap-4 p-3 border border-amber-600 bg-transparent">
                  <div className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center shrink-0">
                    <Info className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-sm text-stone-200">
                    Font selected here will be used in invoice, reports and
                    other print templates. If none is selected, default font
                    will be used.
                  </p>
                </div>

                <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                  <span className="text-[14px] text-stone-300">Font</span>
                  <select
                    className="w-64 p-1.5 bg-transparent border border-stone-700 text-sm text-stone-200 focus:outline-none"
                    value={settings.printTemplateFont}
                    onChange={(e) =>
                      updateSetting("printTemplateFont", e.target.value)
                    }
                  >
                    <option value="(None)">(None)</option>
                    <option value="Arial">Arial</option>
                    <option value="Times New Roman">Times New Roman</option>
                  </select>
                </div>

                <div className="pt-2">
                  <h3 className="text-lg font-light text-stone-200 mb-4 border-b border-stone-700 pb-2">
                    Invoice settings
                  </h3>

                  <div className="space-y-4">
                    <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                      <span className="text-[14px] text-stone-300">Title</span>
                      <input
                        type="text"
                        className="w-64 p-1.5 bg-transparent border border-stone-700 focus:outline-none text-sm text-stone-400"
                        value={settings.invoiceTitle}
                        onChange={(e) =>
                          updateSetting("invoiceTitle", e.target.value)
                        }
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-[14px] text-stone-300 w-[184px]">
                        Print in A5 size
                      </span>
                      <Toggle
                        label=""
                        enabled={settings.invoicePrintA5}
                        onChange={(val) => updateSetting("invoicePrintA5", val)}
                      />
                    </div>

                    <div className="pt-2 space-y-3">
                      <h4 className="text-[15px] text-stone-300 font-medium">
                        Columns selection
                      </h4>
                      <div className="flex items-center gap-4">
                        <span className="text-[14px] text-stone-300 w-[184px]">
                          Tax column
                        </span>
                        <Toggle
                          label=""
                          enabled={settings.invoiceTaxColumn}
                          onChange={(val) =>
                            updateSetting("invoiceTaxColumn", val)
                          }
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[14px] text-stone-300 w-[184px]">
                          Discount column
                        </span>
                        <Toggle
                          label=""
                          enabled={settings.invoiceDiscountColumn}
                          onChange={(val) =>
                            updateSetting("invoiceDiscountColumn", val)
                          }
                        />
                      </div>
                    </div>

                    <div className="pt-2 space-y-3">
                      <h4 className="text-[15px] text-stone-300 font-medium">
                        Customer details
                      </h4>
                      <div className="flex items-center gap-4">
                        <span className="text-[14px] text-stone-300 w-[184px]">
                          Tax number
                        </span>
                        <Toggle
                          label=""
                          enabled={settings.invoiceCustomerTaxNumber}
                          onChange={(val) =>
                            updateSetting("invoiceCustomerTaxNumber", val)
                          }
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[14px] text-stone-300 w-[184px]">
                          Code
                        </span>
                        <Toggle
                          label=""
                          enabled={settings.invoiceCustomerCode}
                          onChange={(val) =>
                            updateSetting("invoiceCustomerCode", val)
                          }
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[14px] text-stone-300 w-[184px]">
                          Phone number
                        </span>
                        <Toggle
                          label=""
                          enabled={settings.invoiceCustomerPhoneNumber}
                          onChange={(val) =>
                            updateSetting("invoiceCustomerPhoneNumber", val)
                          }
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[14px] text-stone-300 w-[184px]">
                          Email
                        </span>
                        <Toggle
                          label=""
                          enabled={settings.invoiceCustomerEmail}
                          onChange={(val) =>
                            updateSetting("invoiceCustomerEmail", val)
                          }
                        />
                      </div>
                    </div>

                    <div className="pt-2 space-y-3">
                      <h4 className="text-[15px] text-stone-300 font-medium">
                        Other settings
                      </h4>
                      <div className="flex items-center gap-4">
                        <span className="text-[14px] text-stone-300 w-[184px]">
                          Payment methods
                        </span>
                        <Toggle
                          label=""
                          enabled={settings.invoicePaymentMethods}
                          onChange={(val) =>
                            updateSetting("invoicePaymentMethods", val)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "Database" && (
          <div className="space-y-8 max-w-3xl">
            {/* Top section */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-2xl font-light">Database</h2>
                <a
                  href="#"
                  className="text-sm text-amber-500 hover:text-amber-400 mt-1"
                >
                  Learn more
                </a>
              </div>

              <div className="flex flex-wrap gap-4">
                <button
                  className="flex items-center gap-3 px-6 py-3 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded text-stone-100 font-medium transition-colors"
                  onClick={handleExportDb}
                >
                  <HardDrive className="w-5 h-5" />
                  Backup database
                </button>

                {/* Import Aronium — gated on SQL Server LocalDB detection */}
                {isCheckingSqlServer ? (
                  <div className="flex items-center gap-2 px-4 py-3 text-stone-400 text-sm">
                    <div className="w-4 h-4 border-2 border-stone-500 border-t-transparent rounded-full animate-spin" />
                    Checking SQL Server...
                  </div>
                ) : sqlServerStatus?.installed ? (
                  <button
                    className="flex items-center gap-3 px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed border border-orange-500 rounded text-white font-medium transition-colors"
                    onClick={handleImportAroniumDb}
                    disabled={isImportingAronium}
                  >
                    <Upload className="w-5 h-5" />
                    {isImportingAronium
                      ? "Importing Aronium..."
                      : "Import Aronium Database"}
                  </button>
                ) : (
                  <div className="flex flex-col gap-2 w-full max-w-md">
                    <div className="flex items-start gap-2 px-4 py-3 bg-amber-950/40 border border-amber-700/50 rounded text-sm max-w-md">
                      <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                      <span className="text-amber-200">
                        {sqlServerStatus?.description ??
                          "SQL Server LocalDB is required to import .bak files."}
                      </span>
                    </div>
                    <button
                      className="flex items-center gap-2 px-4 py-2.5 bg-stone-700 hover:bg-stone-600 border border-stone-600 rounded text-stone-100 text-sm font-medium transition-colors self-start"
                      onClick={handleDownloadSqlServer}
                    >
                      <Database className="w-4 h-4" />
                      Download SQL Server LocalDB
                    </button>
                    <p className="text-xs text-stone-500">
                      Opens the official Microsoft download page in your
                      browser. Run the downloaded installer, then come back
                      here — this page will detect it automatically.
                    </p>
                  </div>
                )}
              </div>

              <button
                className="text-sm text-amber-500 hover:text-amber-400 mt-4 block"
                onClick={handleOpenDbLocation}
              >
                Open database location
              </button>
            </div>

            {/* Auto backup section */}
            <div>
              <h2 className="text-2xl font-light mb-6">Auto backup</h2>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[15px]">
                    Enable auto backup
                  </span>
                  <Toggle
                    label=""
                    enabled={settings.enableAutoBackup}
                    onChange={(val) => updateSetting("enableAutoBackup", val)}
                  />
                </div>

                <div
                  className={`flex items-center justify-between transition-opacity duration-200 ${!settings.enableAutoBackup ? "opacity-40 pointer-events-none" : ""}`}
                >
                  <span className="text-[15px] text-stone-400">
                    Backup database on application start
                  </span>
                  <Toggle
                    label=""
                    enabled={settings.backupOnStart}
                    onChange={(val) => updateSetting("backupOnStart", val)}
                  />
                </div>

                <div
                  className={`flex items-center justify-between transition-opacity duration-200 ${!settings.enableAutoBackup ? "opacity-40 pointer-events-none" : ""}`}
                >
                  <span className="text-[15px] text-stone-400">
                    Backup database on application close
                  </span>
                  <Toggle
                    label=""
                    enabled={settings.backupOnClose}
                    onChange={(val) => updateSetting("backupOnClose", val)}
                  />
                </div>

                <div
                  className={`flex items-center justify-between transition-opacity duration-200 ${!settings.enableAutoBackup ? "opacity-40 pointer-events-none" : ""}`}
                >
                  <span className="text-[15px] text-stone-400">
                    Backup location
                  </span>
                  <div className="flex items-center">
                    <input
                      type="text"
                      readOnly
                      value={settings.backupLocation || "---"}
                      className="w-80 p-2 bg-stone-800 border border-stone-700 text-stone-300 text-sm focus:outline-none"
                    />
                    <button
                      onClick={handleSelectBackupFolder}
                      className="px-3 py-2 bg-stone-800 hover:bg-stone-700 border-y border-r border-stone-700 text-stone-400"
                    >
                      ...
                    </button>
                  </div>
                </div>

                <div
                  className={`flex items-center justify-between transition-opacity duration-200 ${!settings.enableAutoBackup ? "opacity-40 pointer-events-none" : ""}`}
                >
                  <span className="text-[15px] text-stone-400">
                    Remove old backup files
                  </span>
                  <Toggle
                    label=""
                    enabled={settings.removeOldBackups}
                    onChange={(val) => updateSetting("removeOldBackups", val)}
                  />
                </div>

                <div
                  className={`flex items-center justify-between transition-opacity duration-200 ${!settings.enableAutoBackup || !settings.removeOldBackups ? "opacity-40 pointer-events-none" : ""}`}
                >
                  <span className="text-[15px] text-stone-400">
                    Number of days to keep old backup files
                  </span>
                  <div className="flex items-center w-32 bg-stone-800 border border-stone-700 rounded-sm">
                    <button
                      onClick={() =>
                        updateSetting(
                          "keepOldBackupsDays",
                          Math.max(1, settings.keepOldBackupsDays - 1),
                        )
                      }
                      className="px-3 py-1.5 hover:bg-stone-700 text-stone-400 border-r border-stone-700"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      onFocus={(e) => e.target.select()}
                      value={settings.keepOldBackupsDays}
                      onChange={(e) =>
                        updateSetting(
                          "keepOldBackupsDays",
                          parseInt(e.target.value) || 10,
                        )
                      }
                      className="w-full p-1.5 bg-transparent text-center text-sm text-stone-300 focus:outline-none appearance-none"
                    />
                    <button
                      onClick={() =>
                        updateSetting(
                          "keepOldBackupsDays",
                          settings.keepOldBackupsDays + 1,
                        )
                      }
                      className="px-3 py-1.5 hover:bg-stone-700 text-stone-400 border-l border-stone-700"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Danger zone */}
            <div>
              <h2 className="text-2xl font-light mb-4 text-red-500">
                Danger zone
              </h2>
              <div className="max-w-lg flex flex-col gap-4 p-4 rounded-lg border border-red-700/50 bg-red-900/10">
                <p className="text-sm text-stone-600 dark:text-stone-400">
                  Resetting the database permanently deletes data from the
                  local database. This action cannot be undone. Consider
                  backing up the database first.
                </p>

                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={resetMode === "all"}
                      onChange={() => {
                        setResetMode("all");
                        setResetDone(false);
                        setResetError(null);
                      }}
                    />
                    <span className="text-stone-700 dark:text-stone-300">
                      All tables
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={resetMode === "selected"}
                      onChange={() => {
                        setResetMode("selected");
                        setResetDone(false);
                        setResetError(null);
                      }}
                    />
                    <span className="text-stone-700 dark:text-stone-300">
                      Selected tables only
                    </span>
                  </label>
                </div>

                {resetMode === "selected" && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {TABLE_CATEGORIES.map((cat) => (
                      <label
                        key={cat.label}
                        className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedResetCategories.has(cat.label)}
                          onChange={() => toggleResetCategory(cat.label)}
                        />
                        {cat.label}
                      </label>
                    ))}
                  </div>
                )}

                <p className="text-xs text-stone-500 dark:text-stone-500">
                  {resetMode === "all" ? (
                    <>
                      Will clear <span className="text-red-400">every</span>{" "}
                      table — products, customers, documents, stock, users,
                      everything.
                    </>
                  ) : resetPreviewTables.length === 0 ? (
                    "Select at least one category above."
                  ) : (
                    <>
                      Will clear:{" "}
                      <span className="font-mono text-stone-400">
                        {resetPreviewTables.join(", ")}
                      </span>
                      {resetPreviewTables.length >
                        selectedResetTables.length && (
                        <>
                          {" "}
                          — some tables were added automatically because other
                          selected tables reference them.
                        </>
                      )}
                    </>
                  )}
                </p>

                <div className="flex flex-col gap-2">
                  <label className="text-xs text-stone-500 dark:text-stone-400">
                    Type <span className="font-mono text-red-400">RESET</span>{" "}
                    to confirm
                  </label>
                  <input
                    type="text"
                    value={resetTyped}
                    onChange={(e) => {
                      setResetTyped(e.target.value);
                      setResetDone(false);
                      setResetError(null);
                    }}
                    placeholder="RESET"
                    className={`w-full p-2 rounded ${input}`}
                  />
                </div>

                <button
                  disabled={
                    resetTyped !== "RESET" ||
                    isResettingDb ||
                    (resetMode === "selected" && resetPreviewTables.length === 0)
                  }
                  onClick={handleResetDb}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded w-fit transition-colors"
                >
                  <Trash2
                    size={14}
                    className={isResettingDb ? "animate-pulse" : ""}
                  />
                  {isResettingDb ? "Resetting..." : "Reset database"}
                </button>

                {resetDone && (
                  <p className="text-xs text-emerald-500">
                    Database reset.
                  </p>
                )}
                {resetError && (
                  <p className="text-xs text-red-500">{resetError}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "LAN Sync" && (
          <div className="space-y-8 max-w-3xl">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-2xl font-light">LAN Synchronization</h2>
              </div>
              <p className="text-sm text-stone-600 dark:text-stone-400 max-w-2xl mb-6">
                Connect multiple POS terminals together on your local network
                (LAN) without external backend services. Designate one machine
                as the central "Store Server" (Admin Host) and others as
                "Cashier Terminals".
              </p>

              <div className="space-y-6 bg-stone-800/10 p-6 rounded-2xl border border-stone-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[15px] block text-stone-800 dark:text-stone-100">
                      Enable LAN Sync
                    </span>
                    <span className="text-xs text-stone-500">
                      Allows synchronization of sales, inventory, and product
                      changes.
                    </span>
                  </div>
                  <Toggle
                    label=""
                    enabled={settings.syncEnabled}
                    onChange={(val) => updateSetting("syncEnabled", val)}
                  />
                </div>

                <div className="flex items-center justify-between border-t border-stone-700/30 pt-4">
                  <div>
                    <span className="font-semibold text-[15px] block text-stone-800 dark:text-stone-100">
                      Run as Store Server (Host)
                    </span>
                    <span className="text-xs text-stone-500">
                      Host the central database and allow cashier terminals to
                      connect.
                    </span>
                  </div>
                  <Toggle
                    label=""
                    enabled={settings.isStoreServer}
                    onChange={(val) => {
                      updateSetting("isStoreServer", val);
                      if (val) {
                        updateSetting("syncEnabled", true); // Server must have sync enabled
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {settings.isStoreServer ? (
              /* ADMIN SERVER SETTINGS */
              <div className="space-y-6">
                <h3 className="text-xl font-light">
                  Store Server Configuration
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Store Name">
                    <input
                      type="text"
                      value={settings.storeName}
                      onChange={(e) =>
                        updateSetting("storeName", e.target.value)
                      }
                      className={`w-full p-2 rounded ${input}`}
                    />
                  </Field>
                  <Field label="Store ID">
                    <input
                      type="text"
                      value={settings.storeId}
                      onChange={(e) => updateSetting("storeId", e.target.value)}
                      className={`w-full p-2 rounded ${input}`}
                    />
                  </Field>
                  <Field label="Device / Server Name">
                    <input
                      type="text"
                      value={settings.deviceName}
                      onChange={(e) =>
                        updateSetting("deviceName", e.target.value)
                      }
                      className={`w-full p-2 rounded ${input}`}
                    />
                  </Field>
                </div>

                <div className="p-4 bg-stone-900/60 border border-stone-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-stone-400">
                      Server Status:
                    </span>
                    <span
                      className={`text-sm font-bold ${serverRunning ? "text-emerald-500 animate-pulse" : "text-rose-500"}`}
                    >
                      {serverRunning ? "Active & Advertising" : "Stopped"}
                    </span>
                  </div>
                  {serverRunning && (
                    <div className="flex items-center justify-between text-xs text-stone-300">
                      <span>Server URL:</span>
                      <span className="font-mono text-amber-400">
                        http://{serverStats.ip}:{serverStats.port}
                      </span>
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    {!serverRunning ? (
                      <button
                        onClick={startServer}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-stone-900 dark:text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Start Server
                      </button>
                    ) : (
                      <button
                        onClick={stopServer}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-stone-900 dark:text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Stop Server
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* CASHIER TERMINAL SETTINGS */
              <div className="space-y-6">
                <h3 className="text-xl font-light">
                  Cashier Terminal Configuration
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Device Name">
                    <input
                      type="text"
                      value={settings.deviceName}
                      onChange={(e) =>
                        updateSetting("deviceName", e.target.value)
                      }
                      className={`w-full p-2 rounded ${input}`}
                    />
                  </Field>
                  <Field label="Manual Server URL">
                    <input
                      type="text"
                      placeholder="http://192.168.x.x:8080"
                      value={settings.syncServerUrl}
                      onChange={(e) =>
                        updateSetting("syncServerUrl", e.target.value)
                      }
                      className={`w-full p-2 rounded ${input}`}
                    />
                  </Field>
                </div>

                {settings.syncEnabled && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-stone-400">
                        Discovered Store Servers
                      </span>
                      <button
                        onClick={discoverServers}
                        disabled={isSearching}
                        className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-xs rounded text-stone-300 cursor-pointer disabled:opacity-50 transition-colors"
                      >
                        {isSearching ? "Searching..." : "Scan network"}
                      </button>
                    </div>

                    <div className="space-y-2">
                      {discoveredServers.length === 0 ? (
                        <div className="p-4 border border-dashed border-stone-700/60 rounded-xl text-center text-xs text-stone-500">
                          {isSearching
                            ? "Scanning local network for servers..."
                            : "No servers discovered. Try scanning or enter URL manually."}
                        </div>
                      ) : (
                        discoveredServers.map((srv, idx) => {
                          const serverUrl = `http://${srv.ip}:${srv.port}`;
                          const isSelectedServer =
                            settings.syncServerUrl === serverUrl;
                          const isConnected =
                            isSelectedServer &&
                            connectionStatus === "connected";
                          const isConnecting =
                            isSelectedServer &&
                            connectionStatus === "connecting";

                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-3 bg-stone-800/20 border border-stone-700/50 rounded-xl"
                            >
                              <div>
                                <span className="font-semibold text-sm text-stone-200 block">
                                  {srv.storeName}
                                </span>
                                <span className="text-xs text-stone-500">
                                  Host: {srv.name} | {srv.ip}:{srv.port}
                                </span>
                              </div>
                              <button
                                onClick={() => connectToServer(serverUrl)}
                                disabled={isConnected || isConnecting}
                                className={`px-3 py-1.5 text-xs text-white rounded font-medium transition-colors ${
                                  isConnected
                                    ? "bg-emerald-600 cursor-default"
                                    : isConnecting
                                      ? "bg-amber-600 cursor-wait"
                                      : "bg-orange-600 hover:bg-orange-700 cursor-pointer"
                                }`}
                              >
                                {isConnected
                                  ? "Connected"
                                  : isConnecting
                                    ? "Connecting..."
                                    : "Connect"}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "Products" && (
          <div className="space-y-8 max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-2xl font-light">Products</h2>
              <a
                href="#"
                className="text-sm text-amber-500 hover:text-amber-400 mt-1"
              >
                Learn more
              </a>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-[280px_1fr] items-center gap-4">
                <span className="text-[14px] text-stone-200">
                  Display and print items with tax included
                </span>
                <div>
                  <Toggle
                    label=""
                    enabled={settings.displayTaxIncluded}
                    onChange={(val) => updateSetting("displayTaxIncluded", val)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-[280px_1fr] items-center gap-4">
                <span className="text-[14px] text-stone-200">
                  Discount apply rule
                </span>
                <select
                  className="w-64 p-1.5 bg-transparent border border-stone-700 focus:outline-none text-sm text-stone-300"
                  value={settings.discountApplyRule}
                  onChange={(e) =>
                    updateSetting("discountApplyRule", e.target.value)
                  }
                >
                  <option value="After tax">After tax</option>
                  <option value="Before tax">Before tax</option>
                </select>
              </div>

              <div className="grid grid-cols-[280px_1fr] items-center gap-4">
                <span className="text-[14px] text-stone-200">Sorting</span>
                <select
                  className="w-64 p-1.5 bg-transparent border border-stone-700 focus:outline-none text-sm text-stone-300"
                  value={settings.productSorting}
                  onChange={(e) =>
                    updateSetting("productSorting", e.target.value)
                  }
                >
                  <option value="Name">Name</option>
                  <option value="Code">Code</option>
                  <option value="Price">Price</option>
                </select>
              </div>

              <div className="grid grid-cols-[280px_1fr] items-center gap-4">
                <span className="text-[14px] text-stone-200">
                  Allow negative price
                </span>
                <div>
                  <Toggle
                    label=""
                    enabled={settings.allowNegativePrice}
                    onChange={(val) => updateSetting("allowNegativePrice", val)}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <h3 className="text-xl font-light text-stone-200 mb-4">
                Product defaults
              </h3>

              <div className="space-y-6">
                <div className="grid grid-cols-[280px_1fr] items-start gap-4">
                  <span className="text-[14px] text-stone-200">
                    Default tax rate
                  </span>
                  <div className="space-y-2">
                    {taxes?.map((tax) => (
                      <label
                        key={tax.id}
                        className="flex items-center gap-2 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          checked={settings.defaultTaxRates.includes(tax.id)}
                          onChange={() => {
                            const current = settings.defaultTaxRates;
                            if (current.includes(tax.id)) {
                              updateSetting(
                                "defaultTaxRates",
                                current.filter((id) => id !== tax.id),
                              );
                            } else {
                              updateSetting("defaultTaxRates", [
                                ...current,
                                tax.id,
                              ]);
                            }
                          }}
                          className="w-4 h-4 rounded-sm border-stone-600 bg-transparent text-amber-500 focus:ring-amber-500 focus:ring-offset-stone-900"
                        />
                        <span className="text-[14px] text-stone-300 group-hover:text-stone-200">
                          {tax.name} ({tax.rate}%)
                        </span>
                      </label>
                    ))}
                    {(!taxes || taxes.length === 0) && (
                      <span className="text-[14px] text-stone-500 italic">
                        No taxes found in database
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-[280px_1fr] items-center gap-4">
                  <span className="text-[14px] text-stone-200">
                    Cost price based markup
                  </span>
                  <div>
                    <Toggle
                      label=""
                      enabled={settings.costPriceBasedMarkup}
                      onChange={(val) =>
                        updateSetting("costPriceBasedMarkup", val)
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[280px_1fr] items-center gap-4">
                  <span className="text-[14px] text-stone-200">
                    Automatically update cost price on purchase
                  </span>
                  <div>
                    <Toggle
                      label=""
                      enabled={settings.autoUpdateCostPrice}
                      onChange={(val) =>
                        updateSetting("autoUpdateCostPrice", val)
                      }
                    />
                  </div>
                </div>

                <div
                  className={`grid grid-cols-[280px_1fr] items-center gap-4 pl-4 border-l-2 border-stone-700 ml-1 transition-opacity ${!settings.autoUpdateCostPrice ? "opacity-40 pointer-events-none" : ""}`}
                >
                  <span className="text-[14px] text-stone-400">
                    Update sale price based on markup
                  </span>
                  <div>
                    <Toggle
                      label=""
                      enabled={settings.updateSalePriceBasedOnMarkup}
                      onChange={(val) =>
                        updateSetting("updateSalePriceBasedOnMarkup", val)
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <h3 className="text-xl font-light text-stone-200 mb-4">
                Moving average price
              </h3>

              <div className="grid grid-cols-[280px_1fr] items-center gap-4">
                <span className="text-[14px] text-stone-200">
                  Enable moving average price
                </span>
                <div className="flex items-center gap-3">
                  <Toggle
                    label=""
                    enabled={settings.enableMovingAveragePrice}
                    onChange={(val) =>
                      updateSetting("enableMovingAveragePrice", val)
                    }
                  />
                  <a
                    href="#"
                    className="text-sm text-amber-500 hover:text-amber-400"
                  >
                    What's this?
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Documents" && (
          <div className="space-y-8 max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-2xl font-light">Documents</h2>
              <a
                href="#"
                className="text-sm text-amber-500 hover:text-amber-400 mt-1"
              >
                Learn more
              </a>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-[280px_1fr] items-center gap-4">
                <span className="text-[14px] text-stone-200">
                  Default document type
                </span>
                <select
                  className="w-64 p-1.5 bg-transparent border border-stone-700 focus:outline-none text-sm text-stone-300"
                  value={settings.defaultDocumentType}
                  onChange={(e) =>
                    updateSetting("defaultDocumentType", e.target.value)
                  }
                >
                  <option value="Receipt">Receipt</option>
                  <option value="Invoice">Invoice</option>
                  <option value="Order">Order</option>
                </select>
              </div>

              <div className="grid grid-cols-[280px_1fr] items-center gap-4">
                <span className="text-[14px] text-stone-200">
                  Automatically print on save
                </span>
                <div>
                  <Toggle
                    label=""
                    enabled={settings.autoPrintOnSave}
                    onChange={(val) => updateSetting("autoPrintOnSave", val)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-[280px_1fr] items-center gap-4">
                <span className="text-[14px] text-stone-200">
                  Automatically email on save
                </span>
                <div>
                  <Toggle
                    label=""
                    enabled={settings.autoEmailOnSave}
                    onChange={(val) => updateSetting("autoEmailOnSave", val)}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-700">
              <h3 className="text-xl font-light text-stone-200 mb-4 mt-4">
                Numbering
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-[280px_1fr] items-center gap-4">
                  <span className="text-[14px] text-stone-200">
                    Document number prefix
                  </span>
                  <input
                    type="text"
                    className="w-64 p-1.5 bg-transparent border border-stone-700 focus:outline-none text-sm text-stone-300"
                    placeholder="e.g. INV-"
                    value={settings.documentNumberPrefix}
                    onChange={(e) =>
                      updateSetting("documentNumberPrefix", e.target.value)
                    }
                  />
                </div>

                <div className="grid grid-cols-[280px_1fr] items-center gap-4">
                  <span className="text-[14px] text-stone-200">
                    Number of digits
                  </span>
                  <input
                    type="number"
                    onFocus={(e) => e.target.select()}
                    className="w-64 p-1.5 bg-transparent border border-stone-700 focus:outline-none text-sm text-stone-300"
                    value={settings.documentNumberPadding}
                    onChange={(e) =>
                      updateSetting(
                        "documentNumberPadding",
                        parseInt(e.target.value) || 6,
                      )
                    }
                  />
                </div>

                <div className="grid grid-cols-[280px_1fr] items-center gap-4">
                  <span className="text-[14px] text-stone-200">
                    Reset document number every year
                  </span>
                  <div>
                    <Toggle
                      label=""
                      enabled={settings.resetDocumentNumberYearly}
                      onChange={(val) =>
                        updateSetting("resetDocumentNumberYearly", val)
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-700">
              <h3 className="text-xl font-light text-stone-200 mb-4 mt-4">
                Behavior
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-[280px_1fr] items-center gap-4">
                  <span className="text-[14px] text-stone-200">
                    Allow editing closed documents
                  </span>
                  <div>
                    <Toggle
                      label=""
                      enabled={settings.allowEditingClosedDocuments}
                      onChange={(val) =>
                        updateSetting("allowEditingClosedDocuments", val)
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[280px_1fr] items-center gap-4">
                  <span className="text-[14px] text-stone-200">
                    Require approval for refunds
                  </span>
                  <div>
                    <Toggle
                      label=""
                      enabled={settings.requireApprovalForRefunds}
                      onChange={(val) =>
                        updateSetting("requireApprovalForRefunds", val)
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[280px_1fr] items-center gap-4">
                  <span className="text-[14px] text-stone-200">
                    Default invoice due days
                  </span>
                  <input
                    type="number"
                    onFocus={(e) => e.target.select()}
                    className="w-64 p-1.5 bg-transparent border border-stone-700 focus:outline-none text-sm text-stone-300"
                    value={settings.defaultInvoiceDueDays}
                    onChange={(e) =>
                      updateSetting(
                        "defaultInvoiceDueDays",
                        parseInt(e.target.value) || 14,
                      )
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Weighing scale" && (
          <div className="space-y-8 max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-2xl font-light">Weighing scale</h2>
              <a
                href="#"
                className="text-sm text-amber-500 hover:text-amber-400 mt-1"
              >
                Learn more
              </a>
            </div>

            <div className="flex items-center gap-4 p-3 border border-amber-600 bg-transparent">
              <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center shrink-0">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm text-stone-200">
                Connect a serial or USB weighing scale to automatically read
                item weight when selling weighed products.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-[280px_1fr] items-center gap-4">
                <span className="text-[14px] text-stone-200">
                  Enable weighing scale
                </span>
                <div>
                  <Toggle
                    label=""
                    enabled={settings.weighingScaleEnabled}
                    onChange={(val) =>
                      updateSetting("weighingScaleEnabled", val)
                    }
                  />
                </div>
              </div>

              <div
                className={`grid grid-cols-[280px_1fr] items-center gap-4 pl-4 border-l-2 border-stone-700 ml-1 transition-opacity ${!settings.weighingScaleEnabled ? "opacity-40 pointer-events-none" : ""}`}
              >
                <span className="text-[14px] text-stone-400">Port</span>
                <select
                  className="w-64 p-1.5 bg-transparent border border-stone-700 focus:outline-none text-sm text-stone-300"
                  value={settings.weighingScalePort}
                  onChange={(e) =>
                    updateSetting("weighingScalePort", e.target.value)
                  }
                >
                  <option value="">Select port...</option>
                  <option value="COM1">COM1</option>
                  <option value="COM2">COM2</option>
                  <option value="COM3">COM3</option>
                  <option value="COM4">COM4</option>
                </select>
                {!settings.weighingScalePort && (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
              </div>

              <div
                className={`grid grid-cols-[280px_1fr] items-center gap-4 pl-4 border-l-2 border-stone-700 ml-1 transition-opacity ${!settings.weighingScaleEnabled ? "opacity-40 pointer-events-none" : ""}`}
              >
                <span className="text-[14px] text-stone-400">Baud rate</span>
                <select
                  className="w-64 p-1.5 bg-transparent border border-stone-700 focus:outline-none text-sm text-stone-300"
                  value={settings.weighingScaleBaudRate}
                  onChange={(e) =>
                    updateSetting("weighingScaleBaudRate", e.target.value)
                  }
                >
                  <option value="1200">1200</option>
                  <option value="2400">2400</option>
                  <option value="4800">4800</option>
                  <option value="9600">9600</option>
                  <option value="19200">19200</option>
                </select>
              </div>

              <div
                className={`grid grid-cols-[280px_1fr] items-center gap-4 pl-4 border-l-2 border-stone-700 ml-1 transition-opacity ${!settings.weighingScaleEnabled ? "opacity-40 pointer-events-none" : ""}`}
              >
                <span className="text-[14px] text-stone-400">Protocol</span>
                <select
                  className="w-64 p-1.5 bg-transparent border border-stone-700 focus:outline-none text-sm text-stone-300"
                  value={settings.weighingScaleProtocol}
                  onChange={(e) =>
                    updateSetting("weighingScaleProtocol", e.target.value)
                  }
                >
                  <option value="Generic">Generic</option>
                  <option value="Dibal">Dibal</option>
                  <option value="CAS">CAS</option>
                  <option value="Toledo">Toledo</option>
                </select>
              </div>

              <div
                className={`grid grid-cols-[280px_1fr] items-center gap-4 pl-4 border-l-2 border-stone-700 ml-1 transition-opacity ${!settings.weighingScaleEnabled ? "opacity-40 pointer-events-none" : ""}`}
              >
                <span className="text-[14px] text-stone-400">Unit</span>
                <select
                  className="w-64 p-1.5 bg-transparent border border-stone-700 focus:outline-none text-sm text-stone-300"
                  value={settings.weighingScaleUnit}
                  onChange={(e) =>
                    updateSetting("weighingScaleUnit", e.target.value)
                  }
                >
                  <option value="kg">Kilograms (kg)</option>
                  <option value="g">Grams (g)</option>
                  <option value="lb">Pounds (lb)</option>
                </select>
              </div>

              <div
                className={`grid grid-cols-[280px_1fr] items-center gap-4 pl-4 border-l-2 border-stone-700 ml-1 transition-opacity ${!settings.weighingScaleEnabled ? "opacity-40 pointer-events-none" : ""}`}
              >
                <span className="text-[14px] text-stone-400">
                  Automatically read weight
                </span>
                <div>
                  <Toggle
                    label=""
                    enabled={settings.weighingScaleAutoRead}
                    onChange={(val) =>
                      updateSetting("weighingScaleAutoRead", val)
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Customer display" && (
          <div className="space-y-8 max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-2xl font-light">Customer display</h2>
              <a
                href="#"
                className="text-sm text-amber-500 hover:text-amber-400 mt-1"
              >
                Learn more
              </a>
            </div>

            <div className="flex items-center gap-4 p-3 border border-amber-600 bg-transparent">
              <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center shrink-0">
                <Monitor className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm text-stone-200">
                Show running totals and a welcome message to customers on a
                secondary monitor or pole display.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-[280px_1fr] items-center gap-4">
                <span className="text-[14px] text-stone-200">
                  Enable customer display
                </span>
                <div>
                  <Toggle
                    label=""
                    enabled={settings.customerDisplayEnabled}
                    onChange={(val) =>
                      updateSetting("customerDisplayEnabled", val)
                    }
                  />
                </div>
              </div>

              <div
                className={`grid grid-cols-[280px_1fr] items-center gap-4 pl-4 border-l-2 border-stone-700 ml-1 transition-opacity ${!settings.customerDisplayEnabled ? "opacity-40 pointer-events-none" : ""}`}
              >
                <span className="text-[14px] text-stone-400">
                  Display type
                </span>
                <select
                  className="w-64 p-1.5 bg-transparent border border-stone-700 focus:outline-none text-sm text-stone-300"
                  value={settings.customerDisplayType}
                  onChange={(e) =>
                    updateSetting("customerDisplayType", e.target.value)
                  }
                >
                  <option value="Secondary monitor">Secondary monitor</option>
                  <option value="Serial pole display">
                    Serial pole display
                  </option>
                </select>
              </div>

              <div
                className={`grid grid-cols-[280px_1fr] items-center gap-4 pl-4 border-l-2 border-stone-700 ml-1 transition-opacity ${!settings.customerDisplayEnabled || settings.customerDisplayType !== "Serial pole display" ? "opacity-40 pointer-events-none" : ""}`}
              >
                <span className="text-[14px] text-stone-400">Port</span>
                <select
                  className="w-64 p-1.5 bg-transparent border border-stone-700 focus:outline-none text-sm text-stone-300"
                  value={settings.customerDisplayPort}
                  onChange={(e) =>
                    updateSetting("customerDisplayPort", e.target.value)
                  }
                >
                  <option value="">Select port...</option>
                  <option value="COM1">COM1</option>
                  <option value="COM2">COM2</option>
                  <option value="COM3">COM3</option>
                  <option value="COM4">COM4</option>
                </select>
              </div>

              <div
                className={`grid grid-cols-[280px_1fr] items-center gap-4 pl-4 border-l-2 border-stone-700 ml-1 transition-opacity ${!settings.customerDisplayEnabled ? "opacity-40 pointer-events-none" : ""}`}
              >
                <span className="text-[14px] text-stone-400">
                  Welcome message
                </span>
                <input
                  type="text"
                  className="w-64 p-1.5 bg-transparent border border-stone-700 focus:outline-none text-sm text-stone-300"
                  value={settings.customerDisplayWelcomeMessage}
                  onChange={(e) =>
                    updateSetting(
                      "customerDisplayWelcomeMessage",
                      e.target.value,
                    )
                  }
                />
              </div>

              <div
                className={`grid grid-cols-[280px_1fr] items-center gap-4 pl-4 border-l-2 border-stone-700 ml-1 transition-opacity ${!settings.customerDisplayEnabled ? "opacity-40 pointer-events-none" : ""}`}
              >
                <span className="text-[14px] text-stone-400">
                  Show line items
                </span>
                <div>
                  <Toggle
                    label=""
                    enabled={settings.customerDisplayShowLineItems}
                    onChange={(val) =>
                      updateSetting("customerDisplayShowLineItems", val)
                    }
                  />
                </div>
              </div>

              <div
                className={`grid grid-cols-[280px_1fr] items-center gap-4 pl-4 border-l-2 border-stone-700 ml-1 transition-opacity ${!settings.customerDisplayEnabled ? "opacity-40 pointer-events-none" : ""}`}
              >
                <span className="text-[14px] text-stone-400">
                  Show store logo
                </span>
                <div>
                  <Toggle
                    label=""
                    enabled={settings.customerDisplayShowLogo}
                    onChange={(val) =>
                      updateSetting("customerDisplayShowLogo", val)
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-4 mt-6">
          <button
            className="px-6 py-2 rounded-lg bg-green-600 text-stone-900 dark:text-white hover:bg-green-700 transition-colors"
            onClick={() => {
              saveSettings();
              navigate(-1);
            }}
          >
            Save
          </button>
          <button
            className="px-6 py-2 rounded-lg bg-red-600 text-stone-900 dark:text-white hover:bg-red-700 transition-colors"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
        </div>
      </main>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Import Aronium Database"
        description="Are you sure you want to import data from this Aronium database? This will merge products, taxes, groups, and customers into your current database. This process cannot be undone."
        confirmText="Import"
        cancelText="Cancel"
        onConfirm={executeImport}
        variant="default"
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-4 items-center">
      <label className="text-sm opacity-80">{label}</label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  enabled,
  onChange,
}: {
  label: string;
  enabled: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <button
        onClick={() => onChange(!enabled)}
        className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
          enabled ? "bg-green-500" : "bg-stone-500"
        }`}
      >
        <div
          className={`w-4 h-4 bg-white rounded-full transform transition ${
            enabled ? "translate-x-6" : ""
          }`}
        />
      </button>
    </div>
  );
}
