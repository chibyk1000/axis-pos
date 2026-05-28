import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface CustomerFormData {
  name: string;
  code: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  isDefault: boolean;
}

export interface CreateCustomerState {
  form: CustomerFormData;
  errors: Partial<Record<keyof CustomerFormData, string>>;
  loading: boolean;
  createdCount: number;
}

const EMPTY_FORM: CustomerFormData = {
  name: "",
  code: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
  isDefault: true,
};

const initialState: CreateCustomerState = {
  form: EMPTY_FORM,
  errors: {},
  loading: false,
  createdCount: 0,
};

const createCustomerSlice = createSlice({
  name: "createCustomer",
  initialState,
  reducers: {
    setFormField(
      state,
      action: PayloadAction<{ key: keyof CustomerFormData; value: any }>,
    ) {
      (state.form as Record<string, unknown>)[action.payload.key] = action.payload.value;
      if (state.errors[action.payload.key]) {
        state.errors[action.payload.key] = undefined;
      }
    },
    setForm(state, action: PayloadAction<CustomerFormData>) {
      state.form = action.payload;
    },
    setErrors(
      state,
      action: PayloadAction<Partial<Record<keyof CustomerFormData, string>>>,
    ) {
      state.errors = action.payload;
    },
    setErrorField(
      state,
      action: PayloadAction<{
        key: keyof CustomerFormData;
        value: string | undefined;
      }>,
    ) {
      state.errors[action.payload.key] = action.payload.value;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setCreatedCount(state, action: PayloadAction<number>) {
      state.createdCount = action.payload;
    },
    incrementCreatedCount(state) {
      state.createdCount += 1;
    },
    resetForm(
      state,
      action: PayloadAction<Partial<CustomerFormData> | undefined>,
    ) {
      state.form = { ...EMPTY_FORM, ...action.payload };
      state.errors = {};
    },
  },
});

export const {
  setFormField,
  setForm,
  setErrors,
  setErrorField,
  setLoading,
  setCreatedCount,
  incrementCreatedCount,
  resetForm,
} = createCustomerSlice.actions;

export default createCustomerSlice.reducer;
