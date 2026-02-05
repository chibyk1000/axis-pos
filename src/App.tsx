

// import { invoke } from "@tauri-apps/api/core";
import { Route, Routes } from "react-router";
import Home from "./pages/home";
 import { ToastContainer, } from "react-toastify";
// import * as schema from "./db/schema";
import Applayout from "./layouts/app-layout";
import Dashboard from "./pages/dashboard";
import { DocumentsView } from "./pages/dashboard/documents";
import { ProductsView } from "./pages/dashboard/products";
import { PriceListsView } from "./pages/dashboard/price-lists";
import Stock from "./pages/dashboard/stock";
import Reporting from "./pages/dashboard/reporting";
import CustomerSupplies from "./pages/dashboard/customer-supplies";
import Promotions from "./pages/dashboard/promotions";
import UsersSecurity from "./pages/dashboard/users-security";
import PaymentTypes from "./pages/dashboard/payment-types";
import Countries from "./pages/dashboard/countries";
import Mycompany from "./pages/dashboard/my-company";
import TaxRates from "./pages/dashboard/tax-rates";
import PriceTagsPage from "./components/products/price-tag";
import SortingScreen from "./components/products/sorting";
import MovingAveragePrice from "./components/products/moving-average-price";
import ImportModal from "./components/products/import";
import CashInOut from "./pages/cash-in-out";
import CreditPaymentsModal from "./pages/credit-payments";
import EndOfDayModal from "./pages/endofday";
import SalesHistory from "./pages/sales-history";
import ViewOpenSales from "./pages/open-sales";
import { ensureRootNode, } from "./hooks/controllers/nodes";
import { useEffect, useRef } from "react";
import { seedCountriesIfEmpty } from "./hooks/controllers/countries";

function App() {
const initialized = useRef(false);

  


  useEffect(() => {
      if (initialized.current) return;
      initialized.current = true;

    async function init() {
      await ensureRootNode()
      await seedCountriesIfEmpty()


    }
    init();
  }, []);




  return (
    <main className="container">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/price-tags" element={<PriceTagsPage />} />
        <Route path="/sorting" element={<SortingScreen />} />
        <Route path="/moving-average-price" element={<MovingAveragePrice />} />
        <Route path="/cash-in-out" element={<CashInOut />} />
        <Route path="/credit-payments" element={<CreditPaymentsModal />} />
        <Route path="/end-of-day" element={<EndOfDayModal />} />
        <Route path="/open-sales" element={<ViewOpenSales />} />
        <Route path="/sales-history" element={<SalesHistory />} />
        <Route path="/import" element={<ImportModal />} />
        <Route path="/dashboard" element={<Applayout />}>
          <Route path="" element={<Dashboard />} />
          <Route path="documents" element={<DocumentsView />} />
          <Route path="products" element={<ProductsView />} />
          <Route path="stocks" element={<Stock />} />
          <Route path="reporting" element={<Reporting />} />
          <Route path="price-lists" element={<PriceListsView />} />
          <Route path="customer-supplies" element={<CustomerSupplies />} />
          <Route path="promotions" element={<Promotions />} />
          <Route path="users-security" element={<UsersSecurity />} />
          <Route path="payments" element={<PaymentTypes />} />
          <Route path="countries" element={<Countries />} />
          <Route path="company" element={<Mycompany />} />
          <Route path="tax-rates" element={<TaxRates />} />
        </Route>
      </Routes>
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss={false}
       
        pauseOnHover={false}
      />
    </main>
  );
}

export default App;
