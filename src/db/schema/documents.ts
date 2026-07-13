import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

import { customers } from ".";

import { documentItems } from "./documentItems";
import { users } from "./users";
import { companies } from "./company";

export const documents = sqliteTable(
  "documents",
  {
    id: text("id").primaryKey(),

    number: text("number").notNull(),
    externalNumber: text("external_number"),

    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id),

    userId: integer("user_id").references(() => users.id),
    companyId: text("company_id").references(() => companies.id),

    date: integer("date", { mode: "timestamp" }).notNull(),
    dueDate: integer("due_date", { mode: "timestamp" }),
    stockDate: integer("stock_date", { mode: "timestamp" }),

    paid: integer("paid", { mode: "boolean" }).default(false),
    type: integer("type").default(200),

    status: text("status")
      .$type<"draft" | "posted" | "cancelled">()
      .default("draft"),

    totalBeforeTax: real("total_before_tax").default(0),
    taxTotal: real("tax_total").default(0),
    total: real("total").default(0),
    totalPaid: real("total_paid").default(0),
    outstandingBalance: real("outstanding_balance").default(0),

    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    // PERF: dashboard.ts filters on status + date range on every chart
    // (monthly sales, hourly sales, total sales...) with no supporting
    // index — full table scan that gets slower every day as `documents` grows.
    customerIdIdx: index("documents_customer_id_idx").on(table.customerId),
    statusDateIdx: index("documents_status_date_idx").on(
      table.status,
      table.date,
    ),
  }),
);

export const documentPayments = sqliteTable("docmentPayments", {
  id: text("id").primaryKey(),

  documentId: text("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  paymentId: text("payment_id").notNull(),

  status: text("status")
    .$type<"pending" | "paid" | "failed">()
    .default("pending"),

  paymentType: text("payment_type"),

  amount: real("amount").notNull(),
  date: integer("date", { mode: "timestamp" }).notNull(),
});

export const documentPaymentsRelations = relations(
  documentPayments,
  ({ one }) => ({
    document: one(documents, {
      fields: [documentPayments.documentId],
      references: [documents.id],
    }),
  }),
);

export const documentRelations = relations(documents, ({ many, one }) => ({
  items: many(documentItems),
  payments: many(documentPayments),
  customer: one(customers, {
    fields: [documents.customerId],
    references: [customers.id],
  }),
  user: one(users, { fields: [documents.userId], references: [users.id] }),
  company: one(companies, {
    fields: [documents.companyId],
    references: [companies.id],
  }),
}));
