import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface CashInOutState {
  mode: "in" | "out";
  amount: string;
  description: string;
}

const initialState: CashInOutState = {
  mode: "in",
  amount: "0",
  description: "",
};

const cashInOutSlice = createSlice({
  name: "cashInOut",
  initialState,
  reducers: {
    setMode(state, action: PayloadAction<"in" | "out">) {
      state.mode = action.payload;
    },
    setAmount(state, action: PayloadAction<string>) {
      state.amount = action.payload;
    },
    setDescription(state, action: PayloadAction<string>) {
      state.description = action.payload;
    },
    resetForm(state) {
      state.amount = "0";
      state.description = "";
    },
  },
});

export const { setMode, setAmount, setDescription, resetForm } = cashInOutSlice.actions;
export default cashInOutSlice.reducer;
