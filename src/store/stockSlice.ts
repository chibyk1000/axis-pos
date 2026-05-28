import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type PriceLabel = "Retail" | "Wholesale";

export interface StockState {
  selectedLabel: PriceLabel;
  searchQuery: string;
  selectedNodeId: string | null;
  showHistory: boolean;
  quickInventoryProduct: any | null;
  showProductPicker: boolean;
  savingPdf: boolean;
  savingExcel: boolean;
}

const initialState: StockState = {
  selectedLabel: "Retail",
  searchQuery: "",
  selectedNodeId: null,
  showHistory: false,
  quickInventoryProduct: null,
  showProductPicker: false,
  savingPdf: false,
  savingExcel: false,
};

const stockSlice = createSlice({
  name: "stock",
  initialState,
  reducers: {
    setSelectedLabel(state, action: PayloadAction<PriceLabel>) {
      state.selectedLabel = action.payload;
    },
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    setSelectedNodeId(state, action: PayloadAction<string | null>) {
      state.selectedNodeId = action.payload;
    },
    setShowHistory(state, action: PayloadAction<boolean>) {
      state.showHistory = action.payload;
    },
    setQuickInventoryProduct(state, action: PayloadAction<any | null>) {
      state.quickInventoryProduct = action.payload;
    },
    setShowProductPicker(state, action: PayloadAction<boolean>) {
      state.showProductPicker = action.payload;
    },
    setSavingPdf(state, action: PayloadAction<boolean>) {
      state.savingPdf = action.payload;
    },
    setSavingExcel(state, action: PayloadAction<boolean>) {
      state.savingExcel = action.payload;
    },
  },
});

export const {
  setSelectedLabel,
  setSearchQuery,
  setSelectedNodeId,
  setShowHistory,
  setQuickInventoryProduct,
  setShowProductPicker,
  setSavingPdf,
  setSavingExcel,
} = stockSlice.actions;

export default stockSlice.reducer;
