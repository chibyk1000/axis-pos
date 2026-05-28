import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const today = new Date();
today.setHours(0, 0, 0, 0);
const endToday = new Date();
endToday.setHours(23, 59, 59, 999);

interface SalesHistoryState {
  dateRangeFrom: string;
  dateRangeTo: string;
  numberPrefix: string;
  customerId: string | null;
  dateModalOpen: boolean;
  selectedDocId: string | null;
  deleteModal: boolean;
  refundModal: boolean;
}

const initialState: SalesHistoryState = {
  dateRangeFrom: today.toISOString(),
  dateRangeTo: endToday.toISOString(),
  numberPrefix: "POS",
  customerId: null,
  dateModalOpen: false,
  selectedDocId: null,
  deleteModal: false,
  refundModal: false,
};

const salesHistorySlice = createSlice({
  name: "salesHistory",
  initialState,
  reducers: {
    setSalesDateRange(
      state,
      action: PayloadAction<{ from: string; to: string }>,
    ) {
      state.dateRangeFrom = action.payload.from;
      state.dateRangeTo = action.payload.to;
    },
    setSalesNumberPrefix(state, action: PayloadAction<string>) {
      state.numberPrefix = action.payload;
    },
    setSalesCustomerId(state, action: PayloadAction<string | null>) {
      state.customerId = action.payload;
    },
    setSalesDateModalOpen(state, action: PayloadAction<boolean>) {
      state.dateModalOpen = action.payload;
    },
    setSalesSelectedDocId(state, action: PayloadAction<string | null>) {
      state.selectedDocId = action.payload;
    },
    setSalesDeleteModal(state, action: PayloadAction<boolean>) {
      state.deleteModal = action.payload;
    },
    setSalesRefundModal(state, action: PayloadAction<boolean>) {
      state.refundModal = action.payload;
    },
  },
});

export const {
  setSalesDateRange,
  setSalesNumberPrefix,
  setSalesCustomerId,
  setSalesDateModalOpen,
  setSalesSelectedDocId,
  setSalesDeleteModal,
  setSalesRefundModal,
} = salesHistorySlice.actions;

export default salesHistorySlice.reducer;
