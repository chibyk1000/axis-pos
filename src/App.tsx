"use client";

import {
  ReactNode,
  Suspense,
  lazy,
  useEffect,
  useRef,
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
import { ThemeProvider } from "./providers/theme-provider";

import {
  getRequiredAccessLevel,
  hasPermission,
  PermissionId,
} from "@/lib/security";
import { AuthProvider, useAuth } from "./providers/auth-provider";
/* -------------------------------------------------------------------------- */

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

function RequirePermission({
  permission,
  children,
}: {
  permission?: PermissionId;
  children: ReactNode;
}) {
  const { user } = useAuth();
  if (!user) return <Unauthorized />;
  if (!hasPermission(user.accessLevel, permission)) {
    return (
      <Unauthorized permission={permission} accessLevel={user.accessLevel} />
    );
  }
  return <>{children}</>;
}

function Unauthorized({
  permission,
  accessLevel,
}: {
  permission?: PermissionId;
  accessLevel?: number;
}) {
  const required = permission ? getRequiredAccessLevel(permission) : 0;
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 rounded-full bg-red-100 text-red-700 w-16 h-16 flex items-center justify-center text-2xl">
        !
      </div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
        Access denied
      </h1>
      <p className="max-w-lg text-sm text-slate-600 dark:text-slate-300">
        You don&apos;t have permission to view this page.
        {permission ? (
          <span>
            {` Required access level ${required}. Your level is ${accessLevel ?? 0}.`}
          </span>
        ) : null}
      </p>
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-full bg-slate-900 text-white px-5 py-2 text-sm hover:bg-slate-700 transition-colors"
        >
          Back to home
        </a>
      </div>
    </div>
  );
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
    <div className="min-h-screen bg-white dark:bg-[#020617] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500 flex items-center justify-center text-black font-bold text-xl animate-pulse">
          A
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">Loading…</p>
      </div>
    </div>
  );
}

const Loader = () => (
  <div className="flex items-center justify-center h-[60vh]">
    <div className="flex flex-col items-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 dark:border-slate-600 border-t-slate-900 dark:border-t-white" />
      <p className="text-sm text-slate-600 dark:text-slate-400">Loading...</p>
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
    <ThemeProvider>
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
                        {/* Home / Documents */}
                        <Route
                          path="/"
                          element={
                            <RequirePermission permission="documents">
                              <DocumentsPage />
                            </RequirePermission>
                          }
                        />
                        {/* POS */}
                        <Route
                          path="/pos"
                          element={
                            <RequirePermission permission="pos">
                              <Pos />
                            </RequirePermission>
                          }
                        />
                        <Route
                          path="/price-tags"
                          element={
                            <RequirePermission permission="products">
                              <PriceTagsPage />
                            </RequirePermission>
                          }
                        />
                        <Route
                          path="/sorting"
                          element={
                            <RequirePermission permission="products">
                              <SortingScreen />
                            </RequirePermission>
                          }
                        />
                        <Route
                          path="/moving-average-price"
                          element={
                            <RequirePermission permission="price-lists">
                              <MovingAveragePrice />
                            </RequirePermission>
                          }
                        />
                        <Route
                          path="/cash-in-out"
                          element={
                            <RequirePermission permission="cash-drawer">
                              <CashInOut />
                            </RequirePermission>
                          }
                        />
                        <Route
                          path="/credit-payments"
                          element={
                            <RequirePermission permission="credit-payments">
                              <CreditPaymentsModal />
                            </RequirePermission>
                          }
                        />
                        <Route
                          path="/end-of-day"
                          element={
                            <RequirePermission permission="end-of-day">
                              <EndOfDayModal />
                            </RequirePermission>
                          }
                        />
                        <Route
                          path="/payment"
                          element={
                            <RequirePermission permission="payment">
                              <PaymentScreen />
                            </RequirePermission>
                          }
                        />
                        <Route
                          path="/open-sales"
                          element={
                            <RequirePermission permission="open-sales">
                              <ViewOpenSales />
                            </RequirePermission>
                          }
                        />
                        <Route
                          path="/sales-history"
                          element={
                            <RequirePermission permission="sales-history">
                              <SalesHistory />
                            </RequirePermission>
                          }
                        />
                        <Route
                          path="/import"
                          element={
                            <RequirePermission permission="import-stock">
                              <ImportModal />
                            </RequirePermission>
                          }
                        />
                        <Route
                          path="settings"
                          element={
                            <RequirePermission permission="settings">
                              <Settings />
                            </RequirePermission>
                          }
                        />
                        {/* Dashboard */}
                        <Route path="/dashboard" element={<Applayout />}>
                          <Route
                            path=""
                            element={
                              <RequirePermission permission="dashboard">
                                <Dashboard />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="documents"
                            element={
                              <RequirePermission permission="documents">
                                <DocumentsView />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="products"
                            element={
                              <RequirePermission permission="products">
                                <ProductsView />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="stocks"
                            element={
                              <RequirePermission permission="stock">
                                <Stock />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="reporting"
                            element={
                              <RequirePermission permission="reporting">
                                <Reporting />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="price-lists"
                            element={
                              <RequirePermission permission="price-lists">
                                <PriceListsView />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="customer-supplies"
                            element={
                              <RequirePermission permission="customers">
                                <CustomerSupplies />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="promotions"
                            element={
                              <RequirePermission permission="promotions-mgmt">
                                <Promotions />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="users-security"
                            element={
                              <RequirePermission permission="users-security">
                                <UsersSecurity />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="user-info"
                            element={
                              <RequirePermission permission="user-profile">
                                <UserInfo />
                              </RequirePermission>
                            }
                          />

                          <Route
                            path="payments"
                            element={
                              <RequirePermission permission="payment-types">
                                <PaymentTypes />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="countries"
                            element={
                              <RequirePermission permission="countries">
                                <Countries />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="company"
                            element={
                              <RequirePermission permission="company">
                                <Mycompany />
                              </RequirePermission>
                            }
                          />
                          <Route
                            path="tax-rates"
                            element={
                              <RequirePermission permission="taxes">
                                <TaxRates />
                              </RequirePermission>
                            }
                          />
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
    </ThemeProvider>
  );
}

export default App;
