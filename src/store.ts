import { configureStore } from "@reduxjs/toolkit";
import posReducer from "./store/posSlice";
import stockReducer from "./store/stockSlice";
import productsReducer from "./store/productsSlice";
import salesHistoryReducer from "./store/salesHistorySlice";
import settingsReducer from "./store/settingsSlice";
import documentsReducer from "./store/documentsSlice";
import cashInOutReducer from "./store/cashInOutSlice";
import endOfDayReducer from "./store/endofDaySlice";
import paymentReducer from "./store/paymentSlice";
import createCustomerReducer from "./store/createCustomerSlice";
import dashboardReducer from "./store/dashboardSlice";

export const store = configureStore({
  reducer: {
    pos: posReducer,
    stock: stockReducer,
    products: productsReducer,
    salesHistory: salesHistoryReducer,
    settings: settingsReducer,
    documents: documentsReducer,
    cashInOut: cashInOutReducer,
    endOfDay: endOfDayReducer,
    payment: paymentReducer,
    createCustomer: createCustomerReducer,
    dashboard: dashboardReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Allow non-serializable values in pos.calcProduct (CartItem with optional fields)
        ignoredPaths: [
          "pos.calcProduct",
          "pos.selectedCustomer",
          "pos.continuePaymentDoc",
          "pos.selectedTax",
          "pos.appliedDiscount",
          "pos.transferSource",
          "pos.transferStaged",
          "pos.newCustomerData",
          "documents.selectedDoc",
          "documents.splitPaymentDoc",
          "documents.confirmModal.doc",
          "dashboard.documentsView.editingDocument",
          "dashboard.documentsView.selectedSavedDocument",
          "dashboard.customerSupplies.selectedCustomer",
        ],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
