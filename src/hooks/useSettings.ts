import { useState } from "react";

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
};

export function useSettings() {
  const [settings, setSettingsState] = useState<Settings>(() => {
    try {
      const stored = localStorage.getItem("axis_lite_settings");
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettingsState((prev) => ({ ...prev, [key]: value }));
  };

  const saveSettings = () => {
    localStorage.setItem("axis_lite_settings", JSON.stringify(settings));
  };

  return { settings, updateSetting, saveSettings };
}
