import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface PaymentState {
  amount: string;
}

const initialState: PaymentState = {
  amount: "500000",
};

const paymentSlice = createSlice({
  name: "payment",
  initialState,
  reducers: {
    setAmount(state, action: PayloadAction<string>) {
      state.amount = action.payload;
    },
  },
});

export const { setAmount } = paymentSlice.actions;
export default paymentSlice.reducer;
