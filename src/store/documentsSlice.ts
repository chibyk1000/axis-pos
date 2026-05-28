import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type DocStatus = "posted" | "draft" | "cancelled" | "refund" | "void" | "split";

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
}

export interface DocumentItem {
  id: string;
  documentId: string;
  productId: string;
  name: string;
  unit?: string;
  quantity: number;
  priceBeforeTax: number;
  taxRate: number;
  discount: number;
  total: number;
}

export interface DocumentPayment {
  id: string;
  documentId: string;
  paymentId: string;
  paymentType: string;
  amount: number;
  status: string;
  date: Date | string;
}

export interface Document {
  id: string;
  number: string;
  customerId?: string;
  customer?: Customer | null;
  date: Date | string;
  status: DocStatus;
  paid: boolean;
  totalBeforeTax: number;
  taxTotal: number;
  total: number;
  totalPaid: number;
  outstandingBalance: number;
  externalNumber?: string;
  items?: DocumentItem[];
  payments?: DocumentPayment[];
  createdAt: Date | string;
}

export type FilterStatus = "all" | "paid" | "unpaid" | "refund" | "draft";
export type DateRange = "today" | "week" | "month" | "all";

export interface DocumentsState {
  search: string;
  filterStatus: FilterStatus;
  dateRange: DateRange;
  selectedDoc: Document | null;
  page: number;
  selectedIds: string[];
  confirmModal: {
    type: "void" | "refund" | "bulkVoid";
    doc?: Document;
  } | null;
  splitPaymentDoc: Document | null;
  showTaxManagement: boolean;
  showDiscountManagement: boolean;
  showCustomerManagement: boolean;
  customers: Customer[];
}

const initialState: DocumentsState = {
  search: "",
  filterStatus: "all",
  dateRange: "all",
  selectedDoc: null,
  page: 1,
  selectedIds: [],
  confirmModal: null,
  splitPaymentDoc: null,
  showTaxManagement: false,
  showDiscountManagement: false,
  showCustomerManagement: false,
  customers: [
    {
      id: "1",
      name: "John Doe",
      email: "john@example.com",
      phoneNumber: "08012345678",
    },
    {
      id: "2",
      name: "Jane Smith",
      email: "jane@example.com",
      phoneNumber: "08087654321",
    },
    { id: "3", name: "Bob Johnson", phoneNumber: "08098765432" },
  ],
};

const documentsSlice = createSlice({
  name: "documents",
  initialState,
  reducers: {
    setSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
    },
    setFilterStatus(state, action: PayloadAction<FilterStatus>) {
      state.filterStatus = action.payload;
    },
    setDateRange(state, action: PayloadAction<DateRange>) {
      state.dateRange = action.payload;
    },
    setSelectedDoc(state, action: PayloadAction<Document | null>) {
      state.selectedDoc = action.payload;
    },
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    setSelectedIds(state, action: PayloadAction<string[]>) {
      state.selectedIds = action.payload;
    },
    setConfirmModal(
      state,
      action: PayloadAction<{ type: "void" | "refund" | "bulkVoid"; doc?: Document } | null>,
    ) {
      state.confirmModal = action.payload;
    },
    setSplitPaymentDoc(state, action: PayloadAction<Document | null>) {
      state.splitPaymentDoc = action.payload;
    },
    setShowTaxManagement(state, action: PayloadAction<boolean>) {
      state.showTaxManagement = action.payload;
    },
    setShowDiscountManagement(state, action: PayloadAction<boolean>) {
      state.showDiscountManagement = action.payload;
    },
    setShowCustomerManagement(state, action: PayloadAction<boolean>) {
      state.showCustomerManagement = action.payload;
    },
    setCustomers(state, action: PayloadAction<Customer[]>) {
      state.customers = action.payload;
    },
    addCustomer(state, action: PayloadAction<Customer>) {
      state.customers.push(action.payload);
    },
    removeCustomer(state, action: PayloadAction<string>) {
      state.customers = state.customers.filter((c) => c.id !== action.payload);
    },
  },
});

export const {
  setSearch,
  setFilterStatus,
  setDateRange,
  setSelectedDoc,
  setPage,
  setSelectedIds,
  setConfirmModal,
  setSplitPaymentDoc,
  setShowTaxManagement,
  setShowDiscountManagement,
  setShowCustomerManagement,
  setCustomers,
  addCustomer,
  removeCustomer,
} = documentsSlice.actions;

export default documentsSlice.reducer;
