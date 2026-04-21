import  { useState, ReactNode } from "react";
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
} from "lucide-react";
import { useTheme } from "@/providers/theme-provider";
import { useNavigate } from "react-router";
import { useSettings } from "@/hooks/useSettings";
import { save, open as dialogOpen } from "@tauri-apps/plugin-dialog";
import { copyFile } from "@tauri-apps/plugin-fs";
import { appDataDir, join } from "@tauri-apps/api/path";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { useTaxes } from "@/hooks/controllers/taxes";

export default function SettingsPage() {
  const { isDarkMode: dark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("General");
  const [emailTab, setEmailTab] = useState("General");
  const [printTab, setPrintTab] = useState("Printer selection");
  const { settings, updateSetting, saveSettings } = useSettings();
  const { data: taxes } = useTaxes();

  const theme = dark
    ? "bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
    : "bg-white text-slate-900";

  const card = dark
    ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
    : "bg-slate-100 border-slate-200";

  const input = dark
    ? "bg-slate-100 dark:bg-slate-700 border-slate-600 text-slate-900 dark:text-white"
    : "bg-white border-slate-300 text-black";

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
        alert("Database exported successfully!");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to export database: " + err);
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

  return (
    <div className={`min-h-screen w-full flex ${theme}`}>
      {/* Sidebar */}
      <aside className={`w-64 p-4 border-r ${card}`}>
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
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
                    ? "bg-indigo-500 text-white"
                    : `hover:bg-slate-200 dark:hover:bg-slate-700 ${dark ? "text-slate-100 hover:text-white" : "text-slate-900"}`
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

        {activeTab === "Email" && (
          <div className="space-y-6 max-w-4xl">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-light">Email</h2>
              <a
                href="#"
                className="text-sm text-cyan-500 hover:text-cyan-400 mt-1"
              >
                Learn more
              </a>
            </div>

            {/* Inner Tabs */}
            <div className="flex border-b border-cyan-700">
              <button
                className={`px-6 py-2 text-sm transition-colors ${
                  emailTab === "General"
                    ? "bg-sky-600 text-white"
                    : "text-slate-300 hover:text-white"
                }`}
                onClick={() => setEmailTab("General")}
              >
                General
              </button>
              <button
                className={`px-6 py-2 text-sm transition-colors ${
                  emailTab === "Reporting"
                    ? "bg-sky-600 text-white"
                    : "text-slate-300 hover:text-white"
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
                    <span className="text-[14px] text-slate-300">Host</span>
                    <input
                      type="text"
                      className="w-80 p-1.5 bg-transparent border border-slate-700 focus:outline-none text-sm text-slate-200"
                      value={settings.smtpServer}
                      onChange={(e) =>
                        updateSetting("smtpServer", e.target.value)
                      }
                    />
                  </div>

                  <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                    <span className="text-[14px] text-slate-300">Port</span>
                    <div className="flex items-center w-32 border border-slate-700 rounded-sm">
                      <button
                        onClick={() =>
                          updateSetting(
                            "smtpPort",
                            String(
                              Math.max(1, parseInt(settings.smtpPort) - 1),
                            ),
                          )
                        }
                        className="px-3 py-1 text-slate-400 hover:text-slate-200 border-r border-slate-700"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        className="w-full p-1 bg-transparent text-center focus:outline-none text-sm text-slate-200 appearance-none"
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
                        className="px-3 py-1 text-slate-400 hover:text-slate-200 border-l border-slate-700"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                    <span className="text-[14px] text-slate-300">
                      SSL enabled
                    </span>
                    <Toggle
                      label=""
                      enabled={settings.smtpSsl}
                      onChange={(val) => updateSetting("smtpSsl", val)}
                    />
                  </div>

                  <div className="grid grid-cols-[200px_1fr] items-center gap-4 pt-2">
                    <span className="text-[14px] text-slate-300">
                      Display name
                    </span>
                    <input
                      type="text"
                      className="w-80 p-1.5 bg-transparent border border-slate-700 focus:outline-none text-sm text-slate-200"
                      value={settings.emailDisplayName}
                      onChange={(e) =>
                        updateSetting("emailDisplayName", e.target.value)
                      }
                    />
                  </div>

                  <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                    <span className="text-[14px] text-slate-300">
                      Email address
                    </span>
                    <input
                      type="email"
                      className="w-80 p-1.5 bg-transparent border border-slate-700 focus:outline-none text-sm text-slate-200"
                      value={settings.emailAddress}
                      onChange={(e) =>
                        updateSetting("emailAddress", e.target.value)
                      }
                    />
                  </div>

                  <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                    <span className="text-[14px] text-slate-300">Username</span>
                    <input
                      type="text"
                      className="w-80 p-1.5 bg-transparent border border-slate-700 focus:outline-none text-sm text-slate-200"
                      value={settings.smtpUser}
                      onChange={(e) =>
                        updateSetting("smtpUser", e.target.value)
                      }
                    />
                  </div>

                  <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                    <span className="text-[14px] text-slate-300">Password</span>
                    <input
                      type="password"
                      className="w-80 p-1.5 bg-transparent border border-slate-700 focus:outline-none text-sm text-slate-200"
                      value={settings.smtpPass}
                      onChange={(e) =>
                        updateSetting("smtpPass", e.target.value)
                      }
                    />
                  </div>
                </div>

                {/* Default email message values section */}
                <div className="pt-6">
                  <h3 className="text-xl font-light mb-4 text-slate-200">
                    Default email message values
                  </h3>

                  <div className="flex items-center gap-4 p-4 border border-cyan-600 mb-6 bg-transparent">
                    <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center shrink-0">
                      <Info className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-sm text-slate-200">
                      If you decide to leave these fields blank, automatically
                      generated subject and message for the customer will be
                      used. You can change them before message is sent.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                      <span className="text-[14px] text-slate-300">
                        Subject
                      </span>
                      <input
                        type="text"
                        className="w-80 p-1.5 bg-transparent border border-slate-700 focus:outline-none text-sm text-slate-200"
                        value={settings.emailDefaultSubject}
                        onChange={(e) =>
                          updateSetting("emailDefaultSubject", e.target.value)
                        }
                      />
                    </div>

                    <div className="grid grid-cols-[200px_1fr] items-start gap-4">
                      <span className="text-[14px] text-slate-300 mt-2">
                        Message
                      </span>
                      <textarea
                        className="w-full h-32 p-2 bg-transparent border border-slate-700 focus:outline-none text-sm text-slate-200 resize-none"
                        value={settings.emailDefaultMessage}
                        onChange={(e) =>
                          updateSetting("emailDefaultMessage", e.target.value)
                        }
                      />
                    </div>

                    <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                      <span className="text-[14px] text-slate-300">
                        Bcc recipients
                      </span>
                      <input
                        type="text"
                        className="w-80 p-1.5 bg-transparent border border-slate-700 focus:outline-none text-sm text-slate-200"
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
              <div className="p-4 text-slate-400">
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
                className="text-sm text-cyan-500 hover:text-cyan-400 mt-1"
              >
                Learn more
              </a>
            </div>

            {/* Inner Tabs */}
            <div className="flex border-b border-cyan-700">
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
                      ? "bg-sky-600 text-white"
                      : "text-slate-300 hover:text-white"
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
                      <span className="text-[14px] text-slate-300">
                        {item.label}
                      </span>
                    </div>
                    <select
                      className="w-64 p-1.5 bg-transparent border border-slate-700 text-sm text-slate-200 focus:outline-none"
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
                  <span className="text-[14px] text-slate-300 w-52">
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
                    className="text-sm text-cyan-500 hover:text-cyan-400"
                  >
                    What's this?
                  </a>
                </div>

                <div className="flex items-center gap-4 p-3 border border-cyan-600 bg-transparent">
                  <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center shrink-0">
                    <Info className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-sm text-slate-200">
                    Your currency symbol is set to "$". Use Windows Control
                    Panel to change currency symbol.{" "}
                    <a href="#" className="text-cyan-500 hover:text-cyan-400">
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
                      className={`flex items-center gap-4 ${item.indent ? "pl-6 border-l border-slate-700 ml-1" : ""}`}
                    >
                      <span className="text-[14px] text-slate-300 w-48">
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
                    <span className="text-[14px] text-slate-300 w-48">
                      Decimal places
                    </span>
                    <div className="flex items-center w-24 border border-slate-700 rounded-sm">
                      <button
                        onClick={() =>
                          updateSetting(
                            "decimalPlaces",
                            Math.max(0, settings.decimalPlaces - 1),
                          )
                        }
                        className="px-2 py-1 text-slate-400 hover:text-slate-200 border-r border-slate-700"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        className="w-full p-1 bg-transparent text-center focus:outline-none text-sm text-slate-200 appearance-none"
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
                        className="px-2 py-1 text-slate-400 hover:text-slate-200 border-l border-slate-700"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <span className="text-[14px] text-slate-300 w-48">
                      Receipt counter
                    </span>
                    <a
                      href="#"
                      className="text-[14px] text-cyan-500 hover:text-cyan-400"
                    >
                      11
                    </a>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-700">
                  <h3 className="text-lg font-light text-slate-200 mb-2">
                    Customer details
                  </h3>
                  <p className="text-sm text-slate-400 mb-4">
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
                        className="w-4 h-4 rounded border-slate-600 bg-transparent text-sky-500 focus:ring-sky-500 focus:ring-offset-slate-900"
                      />
                      <span className="text-sm text-slate-300">Name</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.customerDetailsCode}
                        onChange={(e) =>
                          updateSetting("customerDetailsCode", e.target.checked)
                        }
                        className="w-4 h-4 rounded border-slate-600 bg-transparent text-sky-500 focus:ring-sky-500 focus:ring-offset-slate-900"
                      />
                      <span className="text-sm text-slate-300">Code</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Print -> Localize receipt text */}
            {printTab === "Localize receipt text" && (
              <div className="space-y-6 pt-4">
                <div className="flex items-start gap-4 p-4 border border-cyan-600 bg-transparent">
                  <div className="w-10 h-10 rounded-full bg-sky-600 flex items-center justify-center shrink-0">
                    <Info className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-200 mb-2">
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
                      <span className="text-sm text-slate-200">
                        Use custom labels in reports and invoices
                      </span>
                      <Info className="w-4 h-4 text-sky-500" />
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
                      <span className="text-[14px] text-slate-300">
                        {item.label}
                      </span>
                      <input
                        type="text"
                        className="w-80 p-1 bg-transparent border border-slate-700 focus:outline-none text-sm text-slate-400"
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
                <div className="flex items-center gap-4 p-3 border border-cyan-600 bg-transparent">
                  <div className="w-6 h-6 rounded-full bg-sky-600 flex items-center justify-center shrink-0">
                    <Info className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-sm text-slate-200">
                    Font selected here will be used in invoice, reports and
                    other print templates. If none is selected, default font
                    will be used.
                  </p>
                </div>

                <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                  <span className="text-[14px] text-slate-300">Font</span>
                  <select
                    className="w-64 p-1.5 bg-transparent border border-slate-700 text-sm text-slate-200 focus:outline-none"
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
                  <h3 className="text-lg font-light text-slate-200 mb-4 border-b border-slate-700 pb-2">
                    Invoice settings
                  </h3>

                  <div className="space-y-4">
                    <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                      <span className="text-[14px] text-slate-300">Title</span>
                      <input
                        type="text"
                        className="w-64 p-1.5 bg-transparent border border-slate-700 focus:outline-none text-sm text-slate-400"
                        value={settings.invoiceTitle}
                        onChange={(e) =>
                          updateSetting("invoiceTitle", e.target.value)
                        }
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-[14px] text-slate-300 w-[184px]">
                        Print in A5 size
                      </span>
                      <Toggle
                        label=""
                        enabled={settings.invoicePrintA5}
                        onChange={(val) => updateSetting("invoicePrintA5", val)}
                      />
                    </div>

                    <div className="pt-2 space-y-3">
                      <h4 className="text-[15px] text-slate-300 font-medium">
                        Columns selection
                      </h4>
                      <div className="flex items-center gap-4">
                        <span className="text-[14px] text-slate-300 w-[184px]">
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
                        <span className="text-[14px] text-slate-300 w-[184px]">
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
                      <h4 className="text-[15px] text-slate-300 font-medium">
                        Customer details
                      </h4>
                      <div className="flex items-center gap-4">
                        <span className="text-[14px] text-slate-300 w-[184px]">
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
                        <span className="text-[14px] text-slate-300 w-[184px]">
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
                        <span className="text-[14px] text-slate-300 w-[184px]">
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
                        <span className="text-[14px] text-slate-300 w-[184px]">
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
                      <h4 className="text-[15px] text-slate-300 font-medium">
                        Other settings
                      </h4>
                      <div className="flex items-center gap-4">
                        <span className="text-[14px] text-slate-300 w-[184px]">
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
                  className="text-sm text-cyan-500 hover:text-cyan-400 mt-1"
                >
                  Learn more
                </a>
              </div>

              <button
                className="flex items-center gap-3 px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-100 font-medium transition-colors"
                onClick={handleExportDb}
              >
                <HardDrive className="w-5 h-5" />
                Backup database
              </button>

              <button
                className="text-sm text-cyan-500 hover:text-cyan-400 mt-4 block"
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
                  <span className="text-[15px] text-slate-400">
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
                  <span className="text-[15px] text-slate-400">
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
                  <span className="text-[15px] text-slate-400">
                    Backup location
                  </span>
                  <div className="flex items-center">
                    <input
                      type="text"
                      readOnly
                      value={settings.backupLocation || "---"}
                      className="w-80 p-2 bg-slate-800 border border-slate-700 text-slate-300 text-sm focus:outline-none"
                    />
                    <button
                      onClick={handleSelectBackupFolder}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border-y border-r border-slate-700 text-slate-400"
                    >
                      ...
                    </button>
                  </div>
                </div>

                <div
                  className={`flex items-center justify-between transition-opacity duration-200 ${!settings.enableAutoBackup ? "opacity-40 pointer-events-none" : ""}`}
                >
                  <span className="text-[15px] text-slate-400">
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
                  <span className="text-[15px] text-slate-400">
                    Number of days to keep old backup files
                  </span>
                  <div className="flex items-center w-32 bg-slate-800 border border-slate-700 rounded-sm">
                    <button
                      onClick={() =>
                        updateSetting(
                          "keepOldBackupsDays",
                          Math.max(1, settings.keepOldBackupsDays - 1),
                        )
                      }
                      className="px-3 py-1.5 hover:bg-slate-700 text-slate-400 border-r border-slate-700"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={settings.keepOldBackupsDays}
                      onChange={(e) =>
                        updateSetting(
                          "keepOldBackupsDays",
                          parseInt(e.target.value) || 10,
                        )
                      }
                      className="w-full p-1.5 bg-transparent text-center text-sm text-slate-300 focus:outline-none appearance-none"
                    />
                    <button
                      onClick={() =>
                        updateSetting(
                          "keepOldBackupsDays",
                          settings.keepOldBackupsDays + 1,
                        )
                      }
                      className="px-3 py-1.5 hover:bg-slate-700 text-slate-400 border-l border-slate-700"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Products" && (
          <div className="space-y-8 max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-2xl font-light">Products</h2>
              <a
                href="#"
                className="text-sm text-cyan-500 hover:text-cyan-400 mt-1"
              >
                Learn more
              </a>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-[280px_1fr] items-center gap-4">
                <span className="text-[14px] text-slate-200">
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
                <span className="text-[14px] text-slate-200">
                  Discount apply rule
                </span>
                <select
                  className="w-64 p-1.5 bg-transparent border border-slate-700 focus:outline-none text-sm text-slate-300"
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
                <span className="text-[14px] text-slate-200">Sorting</span>
                <select
                  className="w-64 p-1.5 bg-transparent border border-slate-700 focus:outline-none text-sm text-slate-300"
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
                <span className="text-[14px] text-slate-200">
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
              <h3 className="text-xl font-light text-slate-200 mb-4">
                Product defaults
              </h3>

              <div className="space-y-6">
                <div className="grid grid-cols-[280px_1fr] items-start gap-4">
                  <span className="text-[14px] text-slate-200">
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
                          className="w-4 h-4 rounded-sm border-slate-600 bg-transparent text-sky-500 focus:ring-sky-500 focus:ring-offset-slate-900"
                        />
                        <span className="text-[14px] text-slate-300 group-hover:text-slate-200">
                          {tax.name} ({tax.rate}%)
                        </span>
                      </label>
                    ))}
                    {(!taxes || taxes.length === 0) && (
                      <span className="text-[14px] text-slate-500 italic">
                        No taxes found in database
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-[280px_1fr] items-center gap-4">
                  <span className="text-[14px] text-slate-200">
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
                  <span className="text-[14px] text-slate-200">
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
                  className={`grid grid-cols-[280px_1fr] items-center gap-4 pl-4 border-l-2 border-slate-700 ml-1 transition-opacity ${!settings.autoUpdateCostPrice ? "opacity-40 pointer-events-none" : ""}`}
                >
                  <span className="text-[14px] text-slate-400">
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
              <h3 className="text-xl font-light text-slate-200 mb-4">
                Moving average price
              </h3>

              <div className="grid grid-cols-[280px_1fr] items-center gap-4">
                <span className="text-[14px] text-slate-200">
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
                    className="text-sm text-cyan-500 hover:text-cyan-400"
                  >
                    What's this?
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-4 mt-6">
          <button
            className="px-6 py-2 rounded-lg bg-green-600 text-slate-900 dark:text-white hover:bg-green-700 transition-colors"
            onClick={() => {
              saveSettings();
              navigate(-1);
            }}
          >
            Save
          </button>
          <button
            className="px-6 py-2 rounded-lg bg-red-600 text-slate-900 dark:text-white hover:bg-red-700 transition-colors"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
        </div>
      </main>
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
          enabled ? "bg-green-500" : "bg-slate-500"
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
