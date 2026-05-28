import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Product } from "@/db/schema";

const DEFAULT_COL_WIDTHS: Record<string, number> = {
  code: 80,
  name: 200,
  group: 120,
  barcode: 130,
  cost: 90,
  salePrice: 100,
  taxes: 130,
  stock: 70,
  active: 70,
  unit: 70,
  created: 90,
  updated: 90,
};

export interface ProductsState {
  searchQuery: string;
  drawerOpen: boolean;
  selectedId: string;
  selectedProductId: string;
  selectedSingleProductId: string;
  selectedProduct: Product | undefined;
  isDuplicate: boolean;
  addProductDrawerOpen: boolean;
  editingGroup: any | null;
  importOpen: boolean;
  sortingOpen: boolean;
  colWidths: Record<string, number>;
}

const initialState: ProductsState = {
  searchQuery: "",
  drawerOpen: false,
  selectedId: "root",
  selectedProductId: "",
  selectedSingleProductId: "",
  selectedProduct: undefined,
  isDuplicate: false,
  addProductDrawerOpen: false,
  editingGroup: null,
  importOpen: false,
  sortingOpen: false,
  colWidths: DEFAULT_COL_WIDTHS,
};

const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    setDrawerOpen(state, action: PayloadAction<boolean>) {
      state.drawerOpen = action.payload;
    },
    setSelectedId(state, action: PayloadAction<string>) {
      state.selectedId = action.payload;
    },
    setSelectedProductId(state, action: PayloadAction<string>) {
      state.selectedProductId = action.payload;
    },
    setSelectedSingleProductId(state, action: PayloadAction<string>) {
      state.selectedSingleProductId = action.payload;
    },
    setSelectedProduct(state, action: PayloadAction<Product | undefined>) {
      state.selectedProduct = action.payload as any;
    },
    setIsDuplicate(state, action: PayloadAction<boolean>) {
      state.isDuplicate = action.payload;
    },
    setAddProductDrawerOpen(state, action: PayloadAction<boolean>) {
      state.addProductDrawerOpen = action.payload;
    },
    setEditingGroup(state, action: PayloadAction<any | null>) {
      state.editingGroup = action.payload;
    },
    setImportOpen(state, action: PayloadAction<boolean>) {
      state.importOpen = action.payload;
    },
    setSortingOpen(state, action: PayloadAction<boolean>) {
      state.sortingOpen = action.payload;
    },
    setColWidth(state, action: PayloadAction<{ key: string; width: number }>) {
      state.colWidths[action.payload.key] = action.payload.width;
    },
  },
});

export const {
  setSearchQuery,
  setDrawerOpen,
  setSelectedId,
  setSelectedProductId,
  setSelectedSingleProductId,
  setSelectedProduct,
  setIsDuplicate,
  setAddProductDrawerOpen,
  setEditingGroup,
  setImportOpen,
  setSortingOpen,
  setColWidth,
} = productsSlice.actions;

export default productsSlice.reducer;
