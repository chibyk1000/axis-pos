import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface CartItem {
  id: string;
  title: string;
  cost: number; // current sale price
  unit: string;
  qty: number;
  discount: number;
  taxRate: number;
  priceLabel: "Retail" | "Wholesale";
  availablePrices: { label: "Retail" | "Wholesale"; price: number }[];
  isLocked?: boolean;
}

export type ModalKind =
  | "none"
  | "qty"
  | "discount"
  | "customer"
  | "payment"
  | "refund"
  | "transfer"
  | "void"
  | "comment"
  | "cashDrawer";

export interface PosState {
  items: CartItem[];
  selectedItemId: string | null;
  cartDiscount: number;
  selectedCustomer: any | null;
  dineIn: boolean;
  orderNote: string;

  drawerOpen: boolean;
  modal: ModalKind;
  showCashDrawer: boolean;
  showSaveToast: boolean;
  warning: string;
  calcProduct: CartItem | null;
  calcInitialQty: number;
  continuePaymentDoc: any | null;

  // Payment Screen States
  paidInput: string;
  showTaxManagement: boolean;
  showDiscountManagement: boolean;
  showCustomerManagement: boolean;
  selectedPaymentType: string;
  selectedTax: any | null;
  appliedDiscount: { type: "percent" | "amount"; value: number } | null;

  // Split Payment Screen States
  splitPaidInput: string;
  splitSelectedTypeId: string;

  // Tax Management States
  taxSearchTerm: string;
  selectedTaxId: string;

  // Discount Management States
  discountType: "percent" | "amount";
  discountInput: string;
  selectedPreset: string;

  // Customer Management States
  customerSearchTerm: string;
  selectedCustomerId: string;
  showAddCustomerForm: boolean;
  newCustomerData: {
    name: string;
    email: string;
    phone: string;
  };

  // Refund Screen States
  refundReceipt: string;
  refundPaymentType: string;
  refundError: string;

  // Transfer Screen States
  transferSource: CartItem[];
  transferStaged: CartItem[];
  transferSrcSel: string | null;
  transferStageSel: string | null;
  transferTargetDocId: string | null;
  showOrderPicker: boolean;

  // Comment Modal States
  commentNote: string;

  // Calc Modal States
  calcDisplay: string;
  calcExpr: string;
  calcHasResult: boolean;

  // Discount Modal States
  discountModalTab: "item" | "cart";
  discountModalValue: string;

  // Customer Modal States
  customerModalSearch: string;
}

const POS_STATE_KEY = "pos_cart_state";

const loadSavedState = () => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(POS_STATE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
  }
  return null;
};

const savedState = loadSavedState();

const initialState: PosState = {
  items: savedState?.items || [],
  selectedItemId: savedState?.selectedItemId || null,
  cartDiscount: savedState?.cartDiscount || 0,
  selectedCustomer: savedState?.selectedCustomer || null,
  dineIn: savedState?.dineIn || false,
  orderNote: savedState?.orderNote || "",

  drawerOpen: false,
  modal: "none",
  showCashDrawer: false,
  showSaveToast: false,
  warning: "",
  calcProduct: null,
  calcInitialQty: 1,
  continuePaymentDoc: null,

  // Payment Screen States
  paidInput: "0.00",
  showTaxManagement: false,
  showDiscountManagement: false,
  showCustomerManagement: false,
  selectedPaymentType: "",
  selectedTax: null,
  appliedDiscount: null,

  // Split Payment Screen States
  splitPaidInput: "0.00",
  splitSelectedTypeId: "",

  // Tax Management States
  taxSearchTerm: "",
  selectedTaxId: "",

  // Discount Management States
  discountType: "percent",
  discountInput: "0",
  selectedPreset: "",

  // Customer Management States
  customerSearchTerm: "",
  selectedCustomerId: "",
  showAddCustomerForm: false,
  newCustomerData: {
    name: "",
    email: "",
    phone: "",
  },

  // Refund Screen States
  refundReceipt: "",
  refundPaymentType: "",
  refundError: "",

  // Transfer Screen States
  transferSource: [],
  transferStaged: [],
  transferSrcSel: null,
  transferStageSel: null,
  transferTargetDocId: null,
  showOrderPicker: false,

  // Comment Modal States
  commentNote: "",

  // Calc Modal States
  calcDisplay: "0",
  calcExpr: "",
  calcHasResult: false,

  // Discount Modal States
  discountModalTab: "item",
  discountModalValue: "0",

  // Customer Modal States
  customerModalSearch: "",
};

const posSlice = createSlice({
  name: "pos",
  initialState,
  reducers: {
    setItems(state, action: PayloadAction<CartItem[]>) {
      state.items = action.payload;
    },
    setSelectedItemId(state, action: PayloadAction<string | null>) {
      state.selectedItemId = action.payload;
    },
    setCartDiscount(state, action: PayloadAction<number>) {
      state.cartDiscount = action.payload;
    },
    setSelectedCustomer(state, action: PayloadAction<any | null>) {
      state.selectedCustomer = action.payload;
    },
    setDineIn(state, action: PayloadAction<boolean>) {
      state.dineIn = action.payload;
    },
    setOrderNote(state, action: PayloadAction<string>) {
      state.orderNote = action.payload;
    },
    setDrawerOpen(state, action: PayloadAction<boolean>) {
      state.drawerOpen = action.payload;
    },
    setModal(state, action: PayloadAction<ModalKind>) {
      state.modal = action.payload;
    },
    setShowCashDrawer(state, action: PayloadAction<boolean>) {
      state.showCashDrawer = action.payload;
    },
    setShowSaveToast(state, action: PayloadAction<boolean>) {
      state.showSaveToast = action.payload;
    },
    setWarning(state, action: PayloadAction<string>) {
      state.warning = action.payload;
    },
    setCalcProduct(state, action: PayloadAction<CartItem | null>) {
      state.calcProduct = action.payload;
    },
    setCalcInitialQty(state, action: PayloadAction<number>) {
      state.calcInitialQty = action.payload;
    },
    setContinuePaymentDoc(state, action: PayloadAction<any | null>) {
      state.continuePaymentDoc = action.payload;
    },

    // Payment Screen Reducers
    setPaidInput(state, action: PayloadAction<string>) {
      state.paidInput = action.payload;
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
    setSelectedPaymentType(state, action: PayloadAction<string>) {
      state.selectedPaymentType = action.payload;
    },
    setSelectedTax(state, action: PayloadAction<any | null>) {
      state.selectedTax = action.payload;
    },
    setAppliedDiscount(
      state,
      action: PayloadAction<{
        type: "percent" | "amount";
        value: number;
      } | null>,
    ) {
      state.appliedDiscount = action.payload;
    },

    // Split Payment Screen Reducers
    setSplitPaidInput(state, action: PayloadAction<string>) {
      state.splitPaidInput = action.payload;
    },
    setSplitSelectedTypeId(state, action: PayloadAction<string>) {
      state.splitSelectedTypeId = action.payload;
    },

    // Tax Management Reducers
    setTaxSearchTerm(state, action: PayloadAction<string>) {
      state.taxSearchTerm = action.payload;
    },
    setSelectedTaxId(state, action: PayloadAction<string>) {
      state.selectedTaxId = action.payload;
    },

    // Discount Management Reducers
    setDiscountType(state, action: PayloadAction<"percent" | "amount">) {
      state.discountType = action.payload;
    },
    setDiscountInput(state, action: PayloadAction<string>) {
      state.discountInput = action.payload;
    },
    setSelectedPreset(state, action: PayloadAction<string>) {
      state.selectedPreset = action.payload;
    },

    // Customer Management Reducers
    setCustomerSearchTerm(state, action: PayloadAction<string>) {
      state.customerSearchTerm = action.payload;
    },
    setSelectedCustomerId(state, action: PayloadAction<string>) {
      state.selectedCustomerId = action.payload;
    },
    setShowAddCustomerForm(state, action: PayloadAction<boolean>) {
      state.showAddCustomerForm = action.payload;
    },
    setNewCustomerData(
      state,
      action: PayloadAction<{
        name: string;
        email: string;
        phone: string;
      }>,
    ) {
      state.newCustomerData = action.payload;
    },

    // Refund Screen Reducers
    setRefundReceipt(state, action: PayloadAction<string>) {
      state.refundReceipt = action.payload;
    },
    setRefundPaymentType(state, action: PayloadAction<string>) {
      state.refundPaymentType = action.payload;
    },
    setRefundError(state, action: PayloadAction<string>) {
      state.refundError = action.payload;
    },

    // Transfer Screen Reducers
    setTransferSource(state, action: PayloadAction<CartItem[]>) {
      state.transferSource = action.payload;
    },
    setTransferStaged(state, action: PayloadAction<CartItem[]>) {
      state.transferStaged = action.payload;
    },
    setTransferSrcSel(state, action: PayloadAction<string | null>) {
      state.transferSrcSel = action.payload;
    },
    setTransferStageSel(state, action: PayloadAction<string | null>) {
      state.transferStageSel = action.payload;
    },
    setTransferTargetDocId(state, action: PayloadAction<string | null>) {
      state.transferTargetDocId = action.payload;
    },
    setShowOrderPicker(state, action: PayloadAction<boolean>) {
      state.showOrderPicker = action.payload;
    },

    // Comment Modal Reducers
    setCommentNote(state, action: PayloadAction<string>) {
      state.commentNote = action.payload;
    },

    // Calc Modal Reducers
    setCalcDisplay(state, action: PayloadAction<string>) {
      state.calcDisplay = action.payload;
    },
    setCalcExpr(state, action: PayloadAction<string>) {
      state.calcExpr = action.payload;
    },
    setCalcHasResult(state, action: PayloadAction<boolean>) {
      state.calcHasResult = action.payload;
    },

    // Discount Modal Reducers
    setDiscountModalTab(state, action: PayloadAction<"item" | "cart">) {
      state.discountModalTab = action.payload;
    },
    setDiscountModalValue(state, action: PayloadAction<string>) {
      state.discountModalValue = action.payload;
    },

    // Customer Modal Reducers
    setCustomerModalSearch(state, action: PayloadAction<string>) {
      state.customerModalSearch = action.payload;
    },

    clearCart(state) {
      state.items = [];
      state.selectedItemId = null;
      state.cartDiscount = 0;
      state.selectedCustomer = null;
      state.dineIn = false;
      state.orderNote = "";
    },
  },
});

export const {
  setItems,
  setSelectedItemId,
  setCartDiscount,
  setSelectedCustomer,
  setDineIn,
  setOrderNote,
  setDrawerOpen,
  setModal,
  setShowCashDrawer,
  setShowSaveToast,
  setWarning,
  setCalcProduct,
  setCalcInitialQty,
  setContinuePaymentDoc,

  // Payment Screen Actions
  setPaidInput,
  setShowTaxManagement,
  setShowDiscountManagement,
  setShowCustomerManagement,
  setSelectedPaymentType,
  setSelectedTax,
  setAppliedDiscount,

  // Split Payment Screen Actions
  setSplitPaidInput,
  setSplitSelectedTypeId,

  // Tax Management Actions
  setTaxSearchTerm,
  setSelectedTaxId,

  // Discount Management Actions
  setDiscountType,
  setDiscountInput,
  setSelectedPreset,

  // Customer Management Actions
  setCustomerSearchTerm,
  setSelectedCustomerId,
  setShowAddCustomerForm,
  setNewCustomerData,

  // Refund Screen Actions
  setRefundReceipt,
  setRefundPaymentType,
  setRefundError,

  // Transfer Screen Actions
  setTransferSource,
  setTransferStaged,
  setTransferSrcSel,
  setTransferStageSel,
  setTransferTargetDocId,
  setShowOrderPicker,

  // Comment Modal Actions
  setCommentNote,

  // Calc Modal Actions
  setCalcDisplay,
  setCalcExpr,
  setCalcHasResult,

  // Discount Modal Actions
  setDiscountModalTab,
  setDiscountModalValue,

  // Customer Modal Actions
  setCustomerModalSearch,

  clearCart,
} = posSlice.actions;

export default posSlice.reducer;
