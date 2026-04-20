"use client";

import {
  ReactNode,
  Suspense,
  createContext,
  lazy,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router";
import { ToastContainer } from "react-toastify";
import { ensureRootNode } from "./hooks/controllers/nodes";
import { seedCountriesIfEmpty } from "./hooks/controllers/countries";
import DocumentsPage from "./pages/documents";
import LoginPage from "./pages/login";
import CreateCustomerPage, { CustomerFormData } from "./pages/create-customer";
import { useCustomers } from "@/hooks/controllers/customers";
import { useCreateCustomer } from "@/hooks/controllers/customers";


/* -------------------------------------------------------------------------- */
/* AUTH CONTEXT                                                                */
/* -------------------------------------------------------------------------- */

interface AuthUser {
  username: string;
}

interface AuthCtx {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside <AuthProvider>");
  return ctx;
}

const SESSION_KEY = "axis_lite_session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const login = async (username: string, password: string) => {
    // Replace with your real auth API call:
    // const res = await fetch("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
    // if (!res.ok) throw new Error("Invalid credentials");
    await new Promise((r) => setTimeout(r, 700));
    if (!username || !password)
      throw new Error("Username and password required.");
    const u = { username };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(u));
    setUser(u);
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/* ROUTE GUARDS                                                                */
/* -------------------------------------------------------------------------- */

/** Redirects unauthenticated users to /login, preserving the intended path. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

/**
 * Redirects to /setup/customers when no customers exist in the DB.
 * Skips the check when already on a /setup/* path to prevent redirect loops.
 */
function RequireCustomers({ children }: { children: ReactNode }) {
  const customersQuery = useCustomers();
  const location = useLocation();

  if (location.pathname.startsWith("/setup")) return <>{children}</>;
  if (customersQuery.isLoading) return <AppLoader />;

  const hasCustomers = (customersQuery.data ?? []).length > 0;
  if (!hasCustomers) return <Navigate to="/setup/customers" replace />;

  return <>{children}</>;
}

/* -------------------------------------------------------------------------- */
/* SCREEN WRAPPERS                                                             */
/* -------------------------------------------------------------------------- */

function LoginScreen() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname ?? "/";

  if (isAuthenticated) return <Navigate to={from} replace />;

  return (
    <LoginPage
      onLogin={async ({ username, password }) => {
        await login(username, password);
        navigate(from, { replace: true });
      }}
    />
  );
}

function CustomerSetupScreen() {
  const navigate = useNavigate();
  const createCustomer = useCreateCustomer?.();

  const handleCreate = async (data: CustomerFormData) => {
    await createCustomer?.mutateAsync({
      id: crypto.randomUUID(),
      name: data.name,
      code: data.code || null,
      email: data.email || null,
      // @ts-ignore
      address: data.address || null,
      notes: data.notes || null,
      isDefault: data.isDefault,
      createdAt: new Date(),
    });
  };

  return (
    <CreateCustomerPage
      onCreateCustomer={handleCreate}
      onSkip={() => navigate("/", { replace: true })}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* LAZY PAGES                                                                  */
/* -------------------------------------------------------------------------- */

const Pos = lazy(() => import("./pages/pos"));
const Applayout = lazy(() => import("./layouts/app-layout"));
const Dashboard = lazy(() => import("./pages/dashboard"));

const DocumentsView = lazy(() =>
  import("./pages/dashboard/documents").then((m) => ({
    default: m.DocumentsView,
  })),
);
const ProductsView = lazy(() =>
  import("./pages/dashboard/products").then((m) => ({
    default: m.ProductsView,
  })),
);
const PriceListsView = lazy(() =>
  import("./pages/dashboard/price-lists").then((m) => ({
    default: m.PriceListsView,
  })),
);

const Stock = lazy(() => import("./pages/dashboard/stock"));
const Reporting = lazy(() => import("./pages/dashboard/reporting"));
const CustomerSupplies = lazy(
  () => import("./pages/dashboard/customer-supplies"),
);
const Promotions = lazy(() => import("./pages/dashboard/promotions"));
const UsersSecurity = lazy(() => import("./pages/dashboard/users-security"));
const PaymentTypes = lazy(() => import("./pages/dashboard/payment-types"));
const Countries = lazy(() => import("./pages/dashboard/countries"));
const Mycompany = lazy(() => import("./pages/dashboard/my-company"));
const TaxRates = lazy(() => import("./pages/dashboard/tax-rates"));
const UserInfo = lazy(() => import("./pages/dashboard/user-info"));
const Settings = lazy(() => import("./pages/dashboard/settings"));

const PriceTagsPage = lazy(() => import("./components/products/price-tag"));
const SortingScreen = lazy(() => import("./components/products/sorting"));
const MovingAveragePrice = lazy(
  () => import("./components/products/moving-average-price"),
);
const ImportModal = lazy(() => import("./components/products/import"));

const CashInOut = lazy(() => import("./pages/cash-in-out"));
const CreditPaymentsModal = lazy(() => import("./pages/credit-payments"));
const EndOfDayModal = lazy(() => import("./pages/endofday"));
const SalesHistory = lazy(() => import("./pages/sales-history"));
const ViewOpenSales = lazy(() => import("./pages/open-sales"));
const PaymentScreen = lazy(() => import("./pages/payment"));

/* -------------------------------------------------------------------------- */
/* LOADERS                                                                     */
/* -------------------------------------------------------------------------- */

function AppLoader() {
  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500 flex items-center justify-center text-black font-bold text-xl animate-pulse">
          A
        </div>
        <p className="text-sm text-slate-600">Loading…</p>
      </div>
    </div>
  );
}

const Loader = () => (
  <div className="flex items-center justify-center h-[60vh]">
    <div className="flex flex-col items-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-600 border-t-white" />
      <p className="text-sm text-slate-400">Loading...</p>
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/* APP                                                                         */
/* -------------------------------------------------------------------------- */

function App() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function init() {
      await ensureRootNode();
      await seedCountriesIfEmpty();
    }

    init();
  }, []);

  return (
    <AuthProvider>
      <main className="container">
        <Suspense fallback={<Loader />}>
          <Routes>
            {/* ── Public ──────────────────────────────────────────────── */}
            <Route path="/login" element={<LoginScreen />} />

            {/* ── First-run setup (auth required, no customer check) ─── */}
            <Route
              path="/setup/customers"
              element={
                <RequireAuth>
                  <CustomerSetupScreen />
                </RequireAuth>
              }
            />

            {/* ── All protected routes ─────────────────────────────────
                RequireAuth  → must be logged in
                RequireCustomers → must have ≥1 customer in DB          */}
            <Route
              path="/*"
              element={
                <RequireAuth>
                  <RequireCustomers>
                    <Routes>
                      {/* POS */}
                      <Route path="/" element={<Pos />} />
                      <Route path="/documents" element={<DocumentsPage />} />
                      <Route path="/price-tags" element={<PriceTagsPage />} />
                      <Route path="/sorting" element={<SortingScreen />} />
                      <Route
                        path="/moving-average-price"
                        element={<MovingAveragePrice />}
                      />
                      <Route path="/cash-in-out" element={<CashInOut />} />
                      <Route
                        path="/credit-payments"
                        element={<CreditPaymentsModal />}
                      />
                      <Route path="/end-of-day" element={<EndOfDayModal />} />
                      <Route path="/payment" element={<PaymentScreen />} />
                      <Route path="/open-sales" element={<ViewOpenSales />} />
                      <Route path="/sales-history" element={<SalesHistory />} />
                      <Route path="/import" element={<ImportModal />} />

                      {/* Dashboard */}
                      <Route path="/dashboard" element={<Applayout />}>
                        <Route path="" element={<Dashboard />} />
                        <Route path="documents" element={<DocumentsView />} />
                        <Route path="products" element={<ProductsView />} />
                        <Route path="stocks" element={<Stock />} />
                        <Route path="reporting" element={<Reporting />} />
                        <Route
                          path="price-lists"
                          element={<PriceListsView />}
                        />
                        <Route
                          path="customer-supplies"
                          element={<CustomerSupplies />}
                        />
                        <Route path="promotions" element={<Promotions />} />
                        <Route
                          path="users-security"
                          element={<UsersSecurity />}
                        />
                        <Route path="user-info" element={<UserInfo />} />
                        <Route path="settings" element={<Settings />} />
                        <Route path="payments" element={<PaymentTypes />} />
                        <Route path="countries" element={<Countries />} />
                        <Route path="company" element={<Mycompany />} />
                        <Route path="tax-rates" element={<TaxRates />} />
                      </Route>

                      {/* Fallback */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </RequireCustomers>
                </RequireAuth>
              }
            />
          </Routes>
        </Suspense>

        <ToastContainer
          position="top-right"
          autoClose={4000}
          hideProgressBar={false}
          pauseOnFocusLoss={false}
          pauseOnHover={false}
        />
      </main>
    </AuthProvider>
  );
}

export default App;
