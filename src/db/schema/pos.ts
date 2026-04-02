import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations, InferInsertModel, InferSelectModel } from "drizzle-orm";

/* -------------------------------------------------------------------------- */
/*                              CASH ENTRIES                                  */
/* Tracks every cash-in / cash-out movement per user session                  */
/* -------------------------------------------------------------------------- */

export const cashEntries = sqliteTable("cash_entries", {
  id: text("id").primaryKey(),
  userId: integer("user_id"), // FK → users.id (nullable = untracked session)
  type: text("type").$type<"in" | "out">().notNull(),
  amount: real("amount").notNull(),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .defaultNow(),
});

export type CashEntry = InferSelectModel<typeof cashEntries>;
export type NewCashEntry = InferInsertModel<typeof cashEntries>;

/* -------------------------------------------------------------------------- */
/*                              OPEN SALES                                    */
/* A sale started but not yet completed at the POS (parked mid-transaction)   */
/* -------------------------------------------------------------------------- */

export const openSales = sqliteTable("open_sales", {
  id: text("id").primaryKey(),
  userId: integer("user_id"), // who started it
  name: text("name"), // optional label e.g. "Table 4"
  customerId: text("customer_id"), // optional attached customer
  note: text("note"),
  total: real("total").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$onUpdate(
    () => new Date(),
  ),
});

export const openSaleItems = sqliteTable("open_sale_items", {
  id: text("id").primaryKey(),
  openSaleId: text("open_sale_id")
    .notNull()
    .references(() => openSales.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull(),
  name: text("name").notNull(),
  unit: text("unit"),
  quantity: real("quantity").notNull().default(1),
  unitPrice: real("unit_price").notNull(),
  discount: real("discount").default(0),
  total: real("total").notNull(),
});

export const openSalesRelations = relations(openSales, ({ many }) => ({
  items: many(openSaleItems),
}));

export const openSaleItemsRelations = relations(openSaleItems, ({ one }) => ({
  openSale: one(openSales, {
    fields: [openSaleItems.openSaleId],
    references: [openSales.id],
  }),
}));

export type OpenSale = InferSelectModel<typeof openSales>;
export type NewOpenSale = InferInsertModel<typeof openSales>;
export type OpenSaleItem = InferSelectModel<typeof openSaleItems>;
export type NewOpenSaleItem = InferInsertModel<typeof openSaleItems>;

export type OpenSaleWithItems = OpenSale & { items: OpenSaleItem[] };

/* -------------------------------------------------------------------------- */
/*                          CUSTOMER BALANCE                                  */
/* Running credit balance per customer — debited by credit payments           */
/* -------------------------------------------------------------------------- */

export const customerBalances = sqliteTable("customer_balances", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().unique(), // FK → customers.id
  balance: real("balance").notNull().default(0), // negative = owes money
  updatedAt: integer("updated_at", { mode: "timestamp" }).$onUpdate(
    () => new Date(),
  ),
});

export const creditPayments = sqliteTable("credit_payments", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull(),
  paymentTypeId: text("payment_type_id").notNull(),
  amount: real("amount").notNull(),
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .defaultNow(),
});

export type CustomerBalance = InferSelectModel<typeof customerBalances>;
export type CreditPayment = InferSelectModel<typeof creditPayments>;
export type NewCreditPayment = InferInsertModel<typeof creditPayments>;
