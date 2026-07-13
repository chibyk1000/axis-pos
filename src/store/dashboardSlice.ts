import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface DocumentType {
  code: number;
  label: string;
  category?: string;
}

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface DocumentFilters {
  product: string;
  user: string;
  register: string;
  customer: string;
  documentType: string;
  paid: string;
  number: string;
  external: string;
  search: string;
  period?: DateRange;
}

const defaultFilters: DocumentFilters = {
  product: "all",
  user: "all",
  register: "all",
  customer: "all",
  documentType: "all",
  paid: "all",
  number: "",
  external: "",
  search: "",
  period: undefined,
};

export interface DashboardState {
  documentsView: {
    open: boolean;
    documents: DocumentType[];
    selectedDocument: DocumentType | null;
    editingDocument: any | null;
    filters: DocumentFilters;
    selectedSavedDocument: any | null;
    confirmDeleteOpen: boolean;
  };
  customerSupplies: {
    searchQuery: string;
    open: boolean;
    selectedCustomer: any | null;
  };
  taxRates: {
    selected: string | null;
    open: boolean;
    switchOpen: boolean;
  };
  countries: {
    selected: string | null;
    drawerOpen: boolean;
  };
  paymentTypes: {
    activeRow: string | null;
    drawerOpen: boolean;
  };
  reporting: {
    selectedReport: string | null;
    searchQuery: string;
    customerId: string | null;
    dateFrom: string; // ISO date string (yyyy-mm-dd) or ""
    dateTo: string; // ISO date string (yyyy-mm-dd) or ""
  };
  promotions: {
    selectedId: string | null;
    panelMode: "idle" | "create" | "edit" | "delete";
    search: string;
    filterType: string;
  };
  priceLists: {
    selectedLabel: string;
    selectedNodeId: string | null;
    searchTerm: string;
    bulkModalOpen: boolean;
  };
  usersTab: {
    selectedId: number | null;
    panelMode: "idle" | "add" | "edit" | "delete";
    showInactive: boolean;
  };
  usersSecurity: {
    activeTab: "users" | "security";
  };
  dashboardMain: {
    showAll: boolean;
    modalOpen: boolean;
    rangeFrom: string;
    rangeTo: string;
  };
}

const now = new Date();
const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

const initialState: DashboardState = {
  documentsView: {
    open: false,
    documents: [],
    selectedDocument: null,
    editingDocument: null,
    filters: defaultFilters,
    selectedSavedDocument: null,
    confirmDeleteOpen: false,
  },
  customerSupplies: {
    searchQuery: "",
    open: false,
    selectedCustomer: null,
  },
  taxRates: {
    selected: null,
    open: false,
    switchOpen: false,
  },
  countries: {
    selected: null,
    drawerOpen: false,
  },
  paymentTypes: {
    activeRow: null,
    drawerOpen: false,
  },
  reporting: {
    selectedReport: null,
    searchQuery: "",
    customerId: null,
    dateFrom: "",
    dateTo: "",
  },
  promotions: {
    selectedId: null,
    panelMode: "idle",
    search: "",
    filterType: "all",
  },
  priceLists: {
    selectedLabel: "Retail",
    selectedNodeId: null,
    searchTerm: "",
    bulkModalOpen: false,
  },
  usersTab: {
    selectedId: null,
    panelMode: "idle",
    showInactive: false,
  },
  usersSecurity: {
    activeTab: "users",
  },
  dashboardMain: {
    showAll: false,
    modalOpen: false,
    rangeFrom: firstOfMonth.toISOString(),
    rangeTo: now.toISOString(),
  },
};

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    // ── Documents View ────────────────────────────────────────────────────────
    setDocOpen(state, action: PayloadAction<boolean>) {
      state.documentsView.open = action.payload;
    },
    setDocTabs(state, action: PayloadAction<DocumentType[]>) {
      state.documentsView.documents = action.payload;
    },
    setSelectedDocTab(state, action: PayloadAction<DocumentType | null>) {
      state.documentsView.selectedDocument = action.payload;
    },
    setEditingDocument(state, action: PayloadAction<any | null>) {
      state.documentsView.editingDocument = action.payload;
    },
    setFilters(state, action: PayloadAction<DocumentFilters>) {
      state.documentsView.filters = action.payload;
    },
    setSelectedSavedDocument(state, action: PayloadAction<any | null>) {
      state.documentsView.selectedSavedDocument = action.payload;
    },
    setConfirmDeleteOpen(state, action: PayloadAction<boolean>) {
      state.documentsView.confirmDeleteOpen = action.payload;
    },
    resetDocFilters(state) {
      state.documentsView.filters = defaultFilters;
    },

    // ── Customer Supplies ─────────────────────────────────────────────────────
    setCustSearchQuery(state, action: PayloadAction<string>) {
      state.customerSupplies.searchQuery = action.payload;
    },
    setCustOpen(state, action: PayloadAction<boolean>) {
      state.customerSupplies.open = action.payload;
    },
    setSelectedCustomer(state, action: PayloadAction<any | null>) {
      state.customerSupplies.selectedCustomer = action.payload;
    },

    // ── Tax Rates ─────────────────────────────────────────────────────────────
    setTaxRatesSelected(state, action: PayloadAction<string | null>) {
      state.taxRates.selected = action.payload;
    },
    setTaxRatesOpen(state, action: PayloadAction<boolean>) {
      state.taxRates.open = action.payload;
    },
    setTaxRatesSwitchOpen(state, action: PayloadAction<boolean>) {
      state.taxRates.switchOpen = action.payload;
    },

    // ── Countries ─────────────────────────────────────────────────────────────
    setCountriesSelected(state, action: PayloadAction<string | null>) {
      state.countries.selected = action.payload;
    },
    setCountriesDrawerOpen(state, action: PayloadAction<boolean>) {
      state.countries.drawerOpen = action.payload;
    },

    // ── Payment Types ─────────────────────────────────────────────────────────
    setPaymentTypesActiveRow(state, action: PayloadAction<string | null>) {
      state.paymentTypes.activeRow = action.payload;
    },
    setPaymentTypesDrawerOpen(state, action: PayloadAction<boolean>) {
      state.paymentTypes.drawerOpen = action.payload;
    },

    // ── Reporting ─────────────────────────────────────────────────────────────
    setReportingSelectedReport(state, action: PayloadAction<string | null>) {
      state.reporting.selectedReport = action.payload;
    },
    setReportingSearchQuery(state, action: PayloadAction<string>) {
      state.reporting.searchQuery = action.payload;
    },
    setReportingCustomerId(state, action: PayloadAction<string | null>) {
      state.reporting.customerId = action.payload;
    },
    setReportingDateFrom(state, action: PayloadAction<string>) {
      state.reporting.dateFrom = action.payload;
    },
    setReportingDateTo(state, action: PayloadAction<string>) {
      state.reporting.dateTo = action.payload;
    },

    // ── Promotions ────────────────────────────────────────────────────────────
    setPromotionsSelectedId(state, action: PayloadAction<string | null>) {
      state.promotions.selectedId = action.payload;
    },
    setPromotionsPanelMode(
      state,
      action: PayloadAction<"idle" | "create" | "edit" | "delete">,
    ) {
      state.promotions.panelMode = action.payload;
    },
    setPromotionsSearch(state, action: PayloadAction<string>) {
      state.promotions.search = action.payload;
    },
    setPromotionsFilterType(state, action: PayloadAction<string>) {
      state.promotions.filterType = action.payload;
    },

    // ── Price Lists ───────────────────────────────────────────────────────────
    setPriceListsLabel(state, action: PayloadAction<string>) {
      state.priceLists.selectedLabel = action.payload;
    },
    setPriceListsNodeId(state, action: PayloadAction<string | null>) {
      state.priceLists.selectedNodeId = action.payload;
    },
    setPriceListsSearchTerm(state, action: PayloadAction<string>) {
      state.priceLists.searchTerm = action.payload;
    },
    setPriceListsBulkModalOpen(state, action: PayloadAction<boolean>) {
      state.priceLists.bulkModalOpen = action.payload;
    },

    // ── Users Tab ─────────────────────────────────────────────────────────────
    setUsersTabSelectedId(state, action: PayloadAction<number | null>) {
      state.usersTab.selectedId = action.payload;
    },
    setUsersTabPanelMode(
      state,
      action: PayloadAction<"idle" | "add" | "edit" | "delete">,
    ) {
      state.usersTab.panelMode = action.payload;
    },
    setUsersTabShowInactive(state, action: PayloadAction<boolean>) {
      state.usersTab.showInactive = action.payload;
    },

    // ── Users & Security Screen ───────────────────────────────────────────────
    setUsersSecurityActiveTab(
      state,
      action: PayloadAction<"users" | "security">,
    ) {
      state.usersSecurity.activeTab = action.payload;
    },

    // ── Dashboard Main ────────────────────────────────────────────────────────
    setDashboardShowAll(state, action: PayloadAction<boolean>) {
      state.dashboardMain.showAll = action.payload;
    },
    setDashboardModalOpen(state, action: PayloadAction<boolean>) {
      state.dashboardMain.modalOpen = action.payload;
    },
    setDashboardRange(
      state,
      action: PayloadAction<{ from: string; to: string }>,
    ) {
      state.dashboardMain.rangeFrom = action.payload.from;
      state.dashboardMain.rangeTo = action.payload.to;
    },
  },
});

export const {
  setDocOpen,
  setDocTabs,
  setSelectedDocTab,
  setEditingDocument,
  setFilters,
  setSelectedSavedDocument,
  setConfirmDeleteOpen,
  resetDocFilters,
  setCustSearchQuery,
  setCustOpen,
  setSelectedCustomer,
  setTaxRatesSelected,
  setTaxRatesOpen,
  setTaxRatesSwitchOpen,
  setCountriesSelected,
  setCountriesDrawerOpen,
  setPaymentTypesActiveRow,
  setPaymentTypesDrawerOpen,
  setReportingSelectedReport,
  setReportingSearchQuery,
  setReportingCustomerId,
  setReportingDateFrom,
  setReportingDateTo,
  setPromotionsSelectedId,
  setPromotionsPanelMode,
  setPromotionsSearch,
  setPromotionsFilterType,
  setPriceListsLabel,
  setPriceListsNodeId,
  setPriceListsSearchTerm,
  setPriceListsBulkModalOpen,
  setUsersTabSelectedId,
  setUsersTabPanelMode,
  setUsersTabShowInactive,
  setUsersSecurityActiveTab,
  setDashboardShowAll,
  setDashboardModalOpen,
  setDashboardRange,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
