import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface EndOfDayState {
  activeTab: "end-of-day" | "history";
  selectedOption: string | null;
  confirmed: boolean;
}

const initialState: EndOfDayState = {
  activeTab: "end-of-day",
  selectedOption: null,
  confirmed: false,
};

const endOfDaySlice = createSlice({
  name: "endOfDay",
  initialState,
  reducers: {
    setActiveTab(state, action: PayloadAction<"end-of-day" | "history">) {
      state.activeTab = action.payload;
    },
    setSelectedOption(state, action: PayloadAction<string | null>) {
      state.selectedOption = action.payload;
    },
    setConfirmed(state, action: PayloadAction<boolean>) {
      state.confirmed = action.payload;
    },
    resetEod(state) {
      state.selectedOption = null;
      state.confirmed = false;
    },
  },
});

export const { setActiveTab, setSelectedOption, setConfirmed, resetEod } = endOfDaySlice.actions;
export default endOfDaySlice.reducer;
