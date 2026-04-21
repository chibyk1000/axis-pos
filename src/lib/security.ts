export type PermissionId =
  | "dashboard"
  | "documents"
  | "products"
  | "price-lists"
  | "stock"
  | "reporting"
  | "customers"
  | "promotions-mgmt"
  | "users-security"
  | "payment-types"
  | "countries"
  | "taxes"
  | "company"
  | "settings"
  | "pos"
  | "open-sales"
  | "sales-history"
  | "refund"
  | "cash-drawer"
  | "credit-payments"
  | "payment"
  | "view-open-orders"
  | "view-sales-history"
  | "end-of-day"
  | "import-stock"
  | "data-export"
  | "user-profile"
  | "dashboard-access"
  | "close-application"
  | "view-stock"
  | "edit-stock"
  | "stock-count"
  | "receive-stock"
  | "write-off";

export type PermissionItem = {
  id: PermissionId;
  label: string;
  value: number;
  hasHelp?: boolean;
  helpText?: string;
};

export type Section = {
  id: string;
  label: string;
  color: string;
  items: PermissionItem[];
};

export const DEFAULT_SECURITY_SECTIONS: Section[] = [
  {
    id: "general",
    label: "General",
    color: "bg-sky-600",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        value: 0,
        hasHelp: true,
        helpText: "Access to the main dashboard screen.",
      },
      {
        id: "settings",
        label: "Settings",
        value: 0,
        hasHelp: true,
        helpText: "Required level to modify application settings.",
      },
      {
        id: "end-of-day",
        label: "End of day",
        value: 0,
        hasHelp: true,
        helpText:
          "Level required to run the end-of-day report and close the register.",
      },
      { id: "user-profile", label: "User profile", value: 0 },
      { id: "close-application", label: "Close application", value: 0 },
      { id: "data-export", label: "Data export", value: 0 },
    ],
  },
  {
    id: "pos",
    label: "POS",
    color: "bg-emerald-600",
    items: [
      {
        id: "pos",
        label: "Point of sale",
        value: 0,
        hasHelp: true,
        helpText: "Required level to use the POS sales screen.",
      },
      {
        id: "open-sales",
        label: "Open sales",
        value: 0,
        hasHelp: true,
        helpText: "Allows user to view open sales and continue them.",
      },
      {
        id: "sales-history",
        label: "Sales history",
        value: 0,
        hasHelp: true,
        helpText: "Allows viewing past sales history.",
      },
      {
        id: "refund",
        label: "Refund",
        value: 0,
        hasHelp: true,
        helpText: "Level required to process refunds.",
      },
      {
        id: "cash-drawer",
        label: "Cash drawer",
        value: 0,
        hasHelp: true,
        helpText: "Allows cash drawer operations.",
      },
      { id: "payment", label: "Process payment", value: 0 },
      { id: "credit-payments", label: "Credit payments", value: 0 },
    ],
  },
  {
    id: "dashboard-pages",
    label: "Dashboard pages",
    color: "bg-violet-600",
    items: [
      { id: "documents", label: "Documents", value: 0 },
      { id: "products", label: "Products", value: 0 },
      { id: "price-lists", label: "Price lists", value: 0 },
      { id: "stock", label: "Stock", value: 0 },
      { id: "reporting", label: "Reporting", value: 0 },
      { id: "customers", label: "Customer & suppliers", value: 0 },
      { id: "promotions-mgmt", label: "Promotions", value: 0 },
      { id: "users-security", label: "Users & security", value: 0 },
      { id: "payment-types", label: "Payment types", value: 0 },
      { id: "countries", label: "Countries", value: 0 },
      { id: "taxes", label: "Tax rates", value: 0 },
      { id: "company", label: "My company", value: 0 },
    ],
  },
  {
    id: "stock",
    label: "Stock",
    color: "bg-amber-600",
    items: [
      { id: "view-stock", label: "View stock levels", value: 0 },
      { id: "edit-stock", label: "Edit stock quantity", value: 0 },
      { id: "stock-count", label: "Stock count / audit", value: 0 },
      { id: "receive-stock", label: "Receive stock", value: 0 },
      {
        id: "write-off",
        label: "Write off stock",
        value: 0,
        hasHelp: true,
        helpText: "Level required to mark stock as damaged or lost.",
      },
      { id: "import-stock", label: "Import stock", value: 0 },
    ],
  },
];

export const PERMISSION_FOR_PATH: Record<string, PermissionId> = {
  "/": "pos",
  "/documents": "documents",
  "/price-tags": "products",
  "/sorting": "products",
  "/moving-average-price": "price-lists",
  "/cash-in-out": "cash-drawer",
  "/credit-payments": "credit-payments",
  "/end-of-day": "end-of-day",
  "/payment": "payment",
  "/open-sales": "open-sales",
  "/sales-history": "sales-history",
  "/import": "import-stock",
  "/settings": "settings",
  "/dashboard": "dashboard",
  "/dashboard/documents": "documents",
  "/dashboard/products": "products",
  "/dashboard/price-lists": "price-lists",
  "/dashboard/stocks": "stock",
  "/dashboard/reporting": "reporting",
  "/dashboard/customer-supplies": "customers",
  "/dashboard/promotions": "promotions-mgmt",
  "/dashboard/users-security": "users-security",
  "/dashboard/user-info": "user-profile",
  "/dashboard/payments": "payment-types",
  "/dashboard/countries": "countries",
  "/dashboard/company": "company",
  "/dashboard/tax-rates": "taxes",
};

const defaultLevelMap: Record<PermissionId, number> = {} as Record<
  PermissionId,
  number
>;
for (const section of DEFAULT_SECURITY_SECTIONS) {
  for (const item of section.items) {
    defaultLevelMap[item.id as PermissionId] = item.value;
  }
}

export function getRequiredAccessLevel(permission: PermissionId): number {
  return defaultLevelMap[permission] ?? 0;
}

export function hasPermission(
  accessLevel: number,
  permission: PermissionId | undefined,
): boolean {
  if (!permission) return true;
  return accessLevel >= getRequiredAccessLevel(permission);
}

export function permissionForUrl(url: string): PermissionId | undefined {
  return PERMISSION_FOR_PATH[url as keyof typeof PERMISSION_FOR_PATH];
}
