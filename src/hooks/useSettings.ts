import { useEffect, useState } from "react";

export interface Settings {
  language: string;
  writingDirection: string;
  zoom: number;

  showCloseButton: boolean;
  clickToClose: boolean;
  slideIn: boolean;
  messageDuration: number;
  messagePosition: string;

  showCashInOnStart: boolean;
  selectBusinessDayOnStart: boolean;

  enableAutoBackup: boolean;
  backupOnStart: boolean;
  backupOnClose: boolean;
  backupLocation: string;
  removeOldBackups: boolean;
  keepOldBackupsDays: number;

  smtpServer: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  smtpSsl: boolean;
  emailDisplayName: string;
  emailAddress: string;
  emailDefaultSubject: string;
  emailDefaultMessage: string;
  emailBccRecipients: string;

  printReceipt: boolean;
  printReceiptPrinter: string;
  printCreditPayments: boolean;
  printCreditPaymentsPrinter: string;
  printLockedSale: boolean;
  printLockedSalePrinter: string;
  printKitchenTicket: boolean;
  printKitchenTicketPrinter: string;
  printServiceMessages: boolean;
  printServiceMessagesPrinter: string;

  useSystemCurrencyFormat: boolean;
  printTaxTotals: boolean;
  printTaxName: boolean;
  printItemsCount: boolean;
  printTotalQuantity: boolean;
  printMeasurementUnit: boolean;
  shortReceiptNumber: boolean;
  printOrderNumber: boolean;
  printOutstandingBalance: boolean;
  decimalPlaces: number;
  customerDetailsName: boolean;
  customerDetailsCode: boolean;

  useCustomLabels: boolean;
  labelCompanyTaxNumber: string;
  labelReceiptNumber: string;
  labelRefundNumber: string;
  labelOrderNumber: string;
  labelUser: string;
  labelItemsCount: string;
  labelDiscount: string;
  labelSubtotal: string;
  labelTaxRate: string;
  labelTotal: string;
  labelPaidAmount: string;
  labelAmountDue: string;
  labelChange: string;

  printTemplateFont: string;
  invoiceTitle: string;
  invoicePrintA5: boolean;
  invoiceTaxColumn: boolean;
  invoiceDiscountColumn: boolean;
  invoiceCustomerTaxNumber: boolean;
  invoiceCustomerCode: boolean;
  invoiceCustomerPhoneNumber: boolean;
  invoiceCustomerEmail: boolean;
  invoicePaymentMethods: boolean;

  displayTaxIncluded: boolean;
  discountApplyRule: string;
  productSorting: string;
  allowNegativePrice: boolean;
  defaultTaxRates: string[];
  costPriceBasedMarkup: boolean;
  autoUpdateCostPrice: boolean;
  updateSalePriceBasedOnMarkup: boolean;
  enableMovingAveragePrice: boolean;

  // LAN Sync Settings
  isStoreServer: boolean;
  syncServerUrl: string;
  syncEnabled: boolean;
  deviceName: string;
  storeName: string;
  storeId: string;

  // Order & payment
  defaultOrderType: string;
  askOrderTypeOnSale: boolean;
  enableTips: boolean;
  tipSuggestions: string;
  enableServiceCharge: boolean;
  serviceChargeName: string;
  serviceChargeRate: number;
  roundTotalAmount: boolean;
  roundingIncrement: number;
  allowSplitPayment: boolean;
  allowPartialPayment: boolean;
  defaultPaymentType: string;
  requireCustomerForCreditSale: boolean;
  confirmBeforeVoidingItem: boolean;
  confirmBeforeCancelingSale: boolean;

  // Documents
  defaultDocumentType: string;
  autoPrintOnSave: boolean;
  autoEmailOnSave: boolean;
  documentNumberPrefix: string;
  documentNumberPadding: number;
  resetDocumentNumberYearly: boolean;
  allowEditingClosedDocuments: boolean;
  requireApprovalForRefunds: boolean;
  defaultInvoiceDueDays: number;

  // Weighing scale
  weighingScaleEnabled: boolean;
  weighingScalePort: string;
  weighingScaleBaudRate: string;
  weighingScaleProtocol: string;
  weighingScaleUnit: string;
  weighingScaleAutoRead: boolean;

  // Customer display
  customerDisplayEnabled: boolean;
  customerDisplayType: string;
  customerDisplayPort: string;
  customerDisplayWelcomeMessage: string;
  customerDisplayShowLineItems: boolean;
  customerDisplayShowLogo: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  language: "English",
  writingDirection: "Left to right",
  zoom: 100,

  showCloseButton: true,
  clickToClose: true,
  slideIn: true,
  messageDuration: 5,
  messagePosition: "Top",

  showCashInOnStart: false,
  selectBusinessDayOnStart: false,

  enableAutoBackup: false,
  backupOnStart: true,
  backupOnClose: false,
  backupLocation: "",
  removeOldBackups: true,
  keepOldBackupsDays: 10,

  smtpServer: "",
  smtpPort: "465",
  smtpUser: "",
  smtpPass: "",
  smtpSsl: true,
  emailDisplayName: "",
  emailAddress: "",
  emailDefaultSubject: "",
  emailDefaultMessage: "",
  emailBccRecipients: "",

  printReceipt: false,
  printReceiptPrinter: "",
  printCreditPayments: false,
  printCreditPaymentsPrinter: "",
  printLockedSale: false,
  printLockedSalePrinter: "",
  printKitchenTicket: false,
  printKitchenTicketPrinter: "",
  printServiceMessages: false,
  printServiceMessagesPrinter: "",

  useSystemCurrencyFormat: true,
  printTaxTotals: true,
  printTaxName: false,
  printItemsCount: true,
  printTotalQuantity: false,
  printMeasurementUnit: true,
  shortReceiptNumber: false,
  printOrderNumber: true,
  printOutstandingBalance: false,
  decimalPlaces: 2,
  customerDetailsName: true,
  customerDetailsCode: false,

  useCustomLabels: false,
  labelCompanyTaxNumber: "Tax No.",
  labelReceiptNumber: "Receipt No.",
  labelRefundNumber: "Refund No.",
  labelOrderNumber: "Order No.",
  labelUser: "User",
  labelItemsCount: "Items count",
  labelDiscount: "Cart discount",
  labelSubtotal: "Subtotal",
  labelTaxRate: "Tax",
  labelTotal: "TOTAL",
  labelPaidAmount: "Paid amount",
  labelAmountDue: "Amount due",
  labelChange: "Change",

  printTemplateFont: "(None)",
  invoiceTitle: "Invoice",
  invoicePrintA5: false,
  invoiceTaxColumn: true,
  invoiceDiscountColumn: true,
  invoiceCustomerTaxNumber: true,
  invoiceCustomerCode: false,
  invoiceCustomerPhoneNumber: false,
  invoiceCustomerEmail: false,
  invoicePaymentMethods: true,

  displayTaxIncluded: true,
  discountApplyRule: "After tax",
  productSorting: "Name",
  allowNegativePrice: true,
  defaultTaxRates: [],
  costPriceBasedMarkup: false,
  autoUpdateCostPrice: false,
  updateSalePriceBasedOnMarkup: false,
  enableMovingAveragePrice: true,

  // LAN Sync Default Settings
  isStoreServer: false,
  syncServerUrl: "",
  syncEnabled: false,
  deviceName: "POS Terminal",
  storeName: "Axis POS Store",
  storeId: "store-001",

  // Order & payment
  defaultOrderType: "Dine in",
  askOrderTypeOnSale: false,
  enableTips: false,
  tipSuggestions: "5,10,15,20",
  enableServiceCharge: false,
  serviceChargeName: "Service charge",
  serviceChargeRate: 0,
  roundTotalAmount: false,
  roundingIncrement: 0.05,
  allowSplitPayment: true,
  allowPartialPayment: true,
  defaultPaymentType: "Cash",
  requireCustomerForCreditSale: true,
  confirmBeforeVoidingItem: true,
  confirmBeforeCancelingSale: true,

  // Documents
  defaultDocumentType: "Receipt",
  autoPrintOnSave: true,
  autoEmailOnSave: false,
  documentNumberPrefix: "",
  documentNumberPadding: 6,
  resetDocumentNumberYearly: false,
  allowEditingClosedDocuments: false,
  requireApprovalForRefunds: true,
  defaultInvoiceDueDays: 14,

  // Weighing scale
  weighingScaleEnabled: false,
  weighingScalePort: "",
  weighingScaleBaudRate: "9600",
  weighingScaleProtocol: "Generic",
  weighingScaleUnit: "kg",
  weighingScaleAutoRead: true,

  // Customer display
  customerDisplayEnabled: false,
  customerDisplayType: "Secondary monitor",
  customerDisplayPort: "",
  customerDisplayWelcomeMessage: "Welcome!",
  customerDisplayShowLineItems: true,
  customerDisplayShowLogo: true,
};

const SETTINGS_KEY = "axis_lite_settings";
const SETTINGS_EVENT = "axis_lite_settings_updated";

const persistSettings = (settings: Settings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: settings }));
};

export function useSettings() {
  const [settings, setSettingsState] = useState<Settings>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    const handleSettingsUpdated = (event: Event) => {
      const next = (event as CustomEvent<Settings>).detail;
      if (next) {
        setSettingsState({ ...DEFAULT_SETTINGS, ...next });
      }
    };

    window.addEventListener(SETTINGS_EVENT, handleSettingsUpdated);
    return () => window.removeEventListener(SETTINGS_EVENT, handleSettingsUpdated);
  }, []);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettingsState((prev) => {
      const next = { ...prev, [key]: value };
      persistSettings(next);
      return next;
    });
  };

  const saveSettings = (nextSettings?: Settings) => {
    if (nextSettings) {
      persistSettings(nextSettings);
      return;
    }

    if (!localStorage.getItem(SETTINGS_KEY)) {
      persistSettings(settings);
    }
  };

  return { settings, updateSetting, saveSettings };
}
